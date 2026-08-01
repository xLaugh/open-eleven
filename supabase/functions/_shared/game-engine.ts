// ============================================================
//  Chargeur de moteur partagé (submit-daily + submit-duel).
//  Récupère data.js + engine.js DÉPLOYÉS et les évalue → le serveur rejoue
//  EXACTEMENT le moteur que le joueur a utilisé (aucune copie à maintenir).
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Moteur chargé, AVEC la version qui l'a produit. Avant, un seul `ENGINE` était
// mémorisé pour toute la vie de l'isolate et le fetch se faisait sans version :
// après un redéploiement, un isolate encore chaud continuait de rejouer avec
// l'ANCIEN moteur pendant qu'un isolate neuf utilisait le nouveau — deux joueurs du
// même défi pouvaient être jugés par des règles différentes, et un duel « pending »
// être départagé avec deux barèmes.
//
// ⚠️ On ne garde qu'UNE version vivante à la fois : data.js pose ses données sur
// globalThis (NATIONALITIES, BALANCE…), donc charger une 2e version ÉCRASE les
// globals dont la 1re a besoin. Un cache multi-versions serait silencieusement faux.
// Quand la version demandée change, on recharge tout (les globals sont re-posés).
let LOADED: { key: string; engine: any } | null = null;

// Format accepté : chiffres et points (ex. « 10.26 »). Toute autre forme est
// refusée — cette valeur entre dans une URL.
const VERSION_RE = /^[0-9]{1,3}(\.[0-9]{1,4}){0,3}$/;

export async function getEngine(version?: string): Promise<any> {
  const v = version && VERSION_RE.test(version) ? version : "";
  const key = v || "unversioned";
  if (LOADED && LOADED.key === key) return LOADED.engine;

  const base = (Deno.env.get("GAME_ORIGIN") || "https://openeleven.laugh.yt").replace(/\/+$/, "");
  const q = v ? `?v=${v}` : "";
  // no-store : sans ça un CDN intermédiaire peut servir un data.js périmé bien
  // après le déploiement, et le serveur note avec un moteur que plus personne n'a.
  const opts: RequestInit = { cache: "no-store" };

  // ⚠️ data.js a été découpé : les gros catalogues (clubs, moments décisifs,
  // événements) vivent dans des fichiers à part. Ils DOIVENT être évalués AVANT
  // lui — son bloc d'export les recense, et sa cale `require()` ne s'active
  // qu'en Node, jamais ici : sans ce chargement, l'export lève un ReferenceError
  // et plus aucun score n'est validé.
  const requis = async (f: string) => {
    const r = await fetch(`${base}/${f}${q}`, opts);
    if (!r.ok) throw new Error(`${f}${q} → HTTP ${r.status}`);
    return r.text();
  };
  // Tolérants au 404 : un déploiement ANTÉRIEUR au découpage n'a qu'un data.js
  // monolithique. Le serveur doit continuer de le rejouer sans broncher, sinon
  // redéployer la fonction et le site dans le mauvais ordre casse la validation.
  const facultatif = async (f: string) => {
    try {
      const r = await fetch(`${base}/${f}${q}`, opts);
      return r.ok ? await r.text() : "";
    } catch { return ""; }
  };
  const [clubsSrc, momentsSrc, eventsSrc, dataSrc, engineSrc] = await Promise.all([
    facultatif("data-clubs.js"), facultatif("data-moments.js"), facultatif("data-events.js"),
    requis("data.js"), requis("engine.js"),
  ]);

  const g: any = globalThis;
  // Chaque fichier reçoit un `module` : son bloc d'export s'active et pose les
  // données sur `global` (= globalThis ici) — NATIONALITIES, LEVELS, BALANCE…
  const evaluer = (src: string) => {
    if (!src) return { exports: {} } as any;
    const m: any = { exports: {} };
    new Function("global", "module", "exports", "window", src)(g, m, m.exports, undefined);
    return m;
  };
  evaluer(clubsSrc);
  evaluer(momentsSrc);
  evaluer(eventsSrc);
  evaluer(dataSrc);
  // engine.js : IIFE qui lit ces globals et pose module.exports = Engine.
  const engMod = evaluer(engineSrc);
  if (!engMod.exports || typeof engMod.exports.scoreDaily !== "function" || typeof engMod.exports.scoreDuel !== "function") {
    throw new Error("Moteur chargé sans scoreDaily/scoreDuel — version déployée trop ancienne ?");
  }
  LOADED = { key, engine: engMod.exports };
  return engMod.exports;
}

// Garde de version. IMPORTANT : sur un hébergeur statique, `?v=` ne SÉLECTIONNE pas
// une version — le fichier n'existe qu'en une seule copie, la query string ne sert
// qu'à casser les caches. On ne peut donc PAS rejouer un run avec un moteur passé.
// La seule réponse correcte est de REFUSER quand le client n'a pas la même version
// que le moteur déployé, au lieu de le noter avec des règles qu'il n'a pas jouées.
// Le client n'a alors qu'à recharger la page (le service worker sert le HTML en
// network-first, donc un rechargement suffit).
export function versionMismatch(engine: any, claimed?: unknown): Response | null {
  const server = engine && engine.ENGINE_VERSION;
  const client = typeof claimed === "string" ? claimed : "";
  if (!server || !client || server === client) return null; // rien à comparer → on laisse passer
  return json({
    error: "Version du jeu périmée — recharge la page pour envoyer ton score.",
    clientVersion: client, serverVersion: server, code: "version_mismatch",
  }, 409);
}

// Client authentifié (avec le JWT du joueur) → renvoie l'utilisateur ou null.
export async function authUser(req: Request) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const client = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await client.auth.getUser();
  return error || !data?.user ? null : data.user;
}

// Client admin (service_role) : contourne la RLS pour écrire les scores vérifiés.
export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

// Validation d'un journal de choix (petits entiers, borné).
export function validChoices(choices: unknown): choices is number[] {
  if (!Array.isArray(choices) || choices.length > 400) return false;
  return choices.every((c) => Number.isInteger(c) && (c as number) >= -1 && (c as number) <= 64);
}
