// ============================================================
//  Edge Function : submit-daily
//  Classement mondial VÉRIFIÉ du Défi du jour.
//
//  Le client n'envoie QUE (date, journal de choix). Le serveur charge le
//  MÊME moteur que le jeu (data.js + engine.js déployés), REJOUE le run et
//  RECALCULE le score lui-même : le client ne peut donc pas mentir sur son
//  score — seuls ses choix comptent. C'est ce qui rend le classement fiable.
//
//  Écrit avec le service_role (contourne RLS) : c'est la SEULE voie d'écriture
//  dans daily_scores (aucune policy d'insertion côté client).
//
//  Déploiement : voir SUPABASE_SETUP.md.
//    supabase functions deploy submit-daily --no-verify-jwt
//  (on vérifie le JWT nous-mêmes pour renvoyer des messages clairs + CORS.)
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ---- Moteur chargé une fois par isolate (fetch du code DÉPLOYÉ) -------------
// On récupère data.js + engine.js du site en ligne : garantie que le serveur
// évalue EXACTEMENT le moteur que le joueur a utilisé (aucune copie à maintenir).
let ENGINE: any = null;
async function getEngine(): Promise<any> {
  if (ENGINE) return ENGINE;
  const base = (Deno.env.get("GAME_ORIGIN") || "https://openeleven.laugh.yt").replace(/\/+$/, "");
  const [dataSrc, engineSrc] = await Promise.all([
    fetch(`${base}/data.js`).then((r) => r.text()),
    fetch(`${base}/engine.js`).then((r) => r.text()),
  ]);
  const g: any = globalThis;
  // data.js : son bloc d'export s'active quand `module` existe et pose les
  // données sur `global` (= globalThis ici) → NATIONALITIES, LEVELS, BALANCE…
  const dataMod: any = { exports: {} };
  new Function("global", "module", "exports", "window", dataSrc)(g, dataMod, dataMod.exports, undefined);
  // engine.js : IIFE qui lit ces globals et pose module.exports = Engine.
  const engMod: any = { exports: {} };
  new Function("global", "module", "exports", "window", engineSrc)(g, engMod, engMod.exports, undefined);
  if (!engMod.exports || typeof engMod.exports.scoreDaily !== "function") {
    throw new Error("Moteur chargé sans scoreDaily — version déployée trop ancienne ?");
  }
  ENGINE = engMod.exports;
  return ENGINE;
}

function utcTodayPlus(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST attendu" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ---- 1. Authentifier l'utilisateur via son JWT ---------------------------
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Non authentifié" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Session invalide" }, 401);
  const user = userData.user;

  // ---- 2. Valider l'entrée -------------------------------------------------
  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Corps JSON invalide" }, 400); }
  const date = String(payload?.date || "");
  const choices = payload?.choices;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "Date invalide" }, 400);
  if (date > utcTodayPlus(1)) return json({ error: "Date dans le futur" }, 400); // marge d'1 jour (fuseaux)
  if (!Array.isArray(choices) || choices.length > 400) return json({ error: "Journal de choix invalide" }, 400);
  for (const c of choices) {
    if (!Number.isInteger(c) || c < -1 || c > 64) return json({ error: "Choix hors bornes" }, 400);
  }

  // ---- 3. REJOUER + RECALCULER le score côté serveur (anti-triche) ---------
  let score: number;
  try {
    const E = await getEngine();
    score = E.scoreDaily(date, choices);
  } catch (e) {
    return json({ error: "Vérification impossible", detail: String(e) }, 500);
  }
  if (!Number.isFinite(score) || score < 0 || score > 1000) return json({ error: "Score hors bornes" }, 422);
  score = Math.round(score);

  // ---- 4. Pseudo (dénormalisé pour lire le classement sans jointure) -------
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  const { data: prof } = await admin.from("profiles").select("pseudo").eq("user_id", user.id).maybeSingle();
  const pseudo = (prof?.pseudo && String(prof.pseudo).slice(0, 24)) || `Joueur ${user.id.slice(0, 4)}`;

  // ---- 5. Enregistrer (garde le MEILLEUR score du jour) --------------------
  const { data: stored, error: rpcErr } = await admin.rpc("record_daily_score", {
    p_user: user.id, p_date: date, p_score: score, p_choices: choices, p_pseudo: pseudo,
  });
  if (rpcErr) return json({ error: "Écriture impossible", detail: rpcErr.message }, 500);

  return json({ ok: true, score, best: stored, date, pseudo });
});
