// ============================================================
//  Edge Function : submit-daily
//  Classement mondial VÉRIFIÉ du Défi du jour.
//
//  Le client n'envoie QUE (date, journal de choix). Le serveur charge le MÊME
//  moteur que le jeu, REJOUE le run et RECALCULE le score lui-même : le client
//  ne peut pas mentir sur son score — seuls ses choix comptent.
//
//  Écrit avec le service_role (contourne RLS) : SEULE voie d'écriture dans
//  daily_scores. Déploiement : voir SUPABASE_SETUP.md.
// ============================================================
import { CORS, json, getEngine, authUser, adminClient, validChoices } from "../_shared/game-engine.ts";

function utcTodayPlus(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST attendu" }, 405);

  const user = await authUser(req);
  if (!user) return json({ error: "Non authentifié" }, 401);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Corps JSON invalide" }, 400); }
  const date = String(payload?.date || "");
  const choices = payload?.choices;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "Date invalide" }, 400);
  if (date > utcTodayPlus(1)) return json({ error: "Date dans le futur" }, 400);
  if (!validChoices(choices)) return json({ error: "Journal de choix invalide" }, 400);

  const admin = adminClient();

  // Rate-limit AVANT le rejeu (coûteux) : anti brute-force / anti-martelage.
  const rl = await admin.rpc("rate_take", { p_user: user.id, p_bucket: "daily", p_day: date, p_cap: 25, p_cooldown_ms: 8000 });
  if (rl.data === "cooldown") return json({ error: "Doucement — attends quelques secondes." }, 429);
  if (rl.data === "cap") return json({ error: "Trop de tentatives aujourd'hui pour ce défi." }, 429);

  // REJOUER + RECALCULER le score côté serveur (anti-triche).
  let score: number;
  try {
    const E = await getEngine();
    score = E.scoreDaily(date, choices);
  } catch (e) {
    return json({ error: "Vérification impossible", detail: String(e) }, 500);
  }
  if (!Number.isFinite(score) || score < 0 || score > 1000) return json({ error: "Score hors bornes" }, 422);
  score = Math.round(score);
  const { data: prof } = await admin.from("profiles").select("pseudo").eq("user_id", user.id).maybeSingle();
  const pseudo = (prof?.pseudo && String(prof.pseudo).slice(0, 24)) || `Joueur ${user.id.slice(0, 4)}`;

  const { data: stored, error: rpcErr } = await admin.rpc("record_daily_score", {
    p_user: user.id, p_date: date, p_score: score, p_choices: choices, p_pseudo: pseudo,
  });
  if (rpcErr) return json({ error: "Écriture impossible", detail: rpcErr.message }, 500);

  return json({ ok: true, score, best: stored, date, pseudo });
});
