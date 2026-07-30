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
  const [dataSrc, engineSrc] = await Promise.all([
    fetch(`${base}/data.js${q}`, opts).then((r) => {
      if (!r.ok) throw new Error(`data.js${q} → HTTP ${r.status}`);
      return r.text();
    }),
    fetch(`${base}/engine.js${q}`, opts).then((r) => {
      if (!r.ok) throw new Error(`engine.js${q} → HTTP ${r.status}`);
      return r.text();
    }),
  ]);

  const g: any = globalThis;
  // data.js : son bloc d'export s'active quand `module` existe → pose les données
  // sur `global` (= globalThis ici) : NATIONALITIES, LEVELS, BALANCE, etc.
  const dataMod: any = { exports: {} };
  new Function("global", "module", "exports", "window", dataSrc)(g, dataMod, dataMod.exports, undefined);
  // engine.js : IIFE qui lit ces globals et pose module.exports = Engine.
  const engMod: any = { exports: {} };
  new Function("global", "module", "exports", "window", engineSrc)(g, engMod, engMod.exports, undefined);
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
