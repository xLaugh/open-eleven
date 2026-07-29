// ============================================================
//  Edge Function : submit-duel
//  Duels par pseudo — création et réponse, scores VÉRIFIÉS par rejeu serveur.
//
//  action = "create"  : le défieur envoie (seed, choices, toPseudo). Le serveur
//                       rejoue → from_score, insère un duel 'pending'.
//  action = "respond" : le défié envoie (id, choices). Le serveur rejoue la MÊME
//                       graine → to_score, départage et clôt le duel.
//
//  Les scores ne sont JAMAIS pris du client : seuls les choix voyagent.
//  Déploiement : voir SUPABASE_SETUP.md.
// ============================================================
import { CORS, json, getEngine, authUser, adminClient, validChoices } from "../_shared/game-engine.ts";

async function pseudoOf(admin: any, userId: string): Promise<string | null> {
  const { data } = await admin.from("profiles").select("pseudo").eq("user_id", userId).maybeSingle();
  return data?.pseudo ? String(data.pseudo).slice(0, 24) : null;
}
function utcToday(): string { return new Date().toISOString().slice(0, 10); }
// Rate-limit AVANT le rejeu. Renvoie une Response 429 si bloqué, sinon null.
async function rateGuard(admin: any, user: string, bucket: string, cap: number, cooldownMs: number) {
  const rl = await admin.rpc("rate_take", { p_user: user, p_bucket: bucket, p_day: utcToday(), p_cap: cap, p_cooldown_ms: cooldownMs });
  if (rl.data === "cooldown") return json({ error: "Doucement — attends quelques secondes." }, 429);
  if (rl.data === "cap") return json({ error: "Trop de duels aujourd'hui, réessaie demain." }, 429);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST attendu" }, 405);

  const user = await authUser(req);
  if (!user) return json({ error: "Non authentifié" }, 401);

  let p: any;
  try { p = await req.json(); } catch { return json({ error: "Corps JSON invalide" }, 400); }
  const action = String(p?.action || "");
  const choices = p?.choices;
  if (!validChoices(choices)) return json({ error: "Journal de choix invalide" }, 400);
  const label = p?.label ? String(p.label).slice(0, 40) : null;

  const admin = adminClient();
  const E = await getEngine();

  if (action === "create") {
    const seed = (Number(p?.seed) | 0) || 1;
    const toPseudo = String(p?.toPseudo || "").trim().slice(0, 24);
    if (!toPseudo) return json({ error: "Pseudo cible manquant" }, 400);
    const fromPseudo = await pseudoOf(admin, user.id);
    if (!fromPseudo) return json({ error: "Choisis d'abord un pseudo" }, 400);
    if (toPseudo.toLowerCase() === fromPseudo.toLowerCase()) return json({ error: "Tu ne peux pas te défier toi-même" }, 400);

    const g = await rateGuard(admin, user.id, "duel_create", 40, 6000);
    if (g) return g;

    let fromScore: number;
    try { fromScore = Math.round(E.scoreDuel(seed, choices)); } catch (e) { return json({ error: "Vérification impossible", detail: String(e) }, 500); }
    if (!Number.isFinite(fromScore) || fromScore < 0 || fromScore > 1000) return json({ error: "Score hors bornes" }, 422);

    const { data, error } = await admin.from("duels").insert({
      seed, from_user: user.id, from_pseudo: fromPseudo, from_label: label || fromPseudo,
      from_choices: choices, from_score: fromScore, to_pseudo: toPseudo, status: "pending",
    }).select("id").single();
    if (error) return json({ error: "Écriture impossible", detail: error.message }, 500);
    return json({ ok: true, id: data.id, from_score: fromScore, to_pseudo: toPseudo });
  }

  if (action === "respond") {
    const id = String(p?.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Duel invalide" }, 400);
    const { data: duel, error: readErr } = await admin.from("duels").select("*").eq("id", id).maybeSingle();
    if (readErr || !duel) return json({ error: "Duel introuvable" }, 404);
    if (duel.status !== "pending") return json({ error: "Duel déjà terminé" }, 409);
    if (duel.from_user === user.id) return json({ error: "Tu ne peux pas répondre à ton propre défi" }, 400);

    const myPseudo = await pseudoOf(admin, user.id);
    if (!myPseudo) return json({ error: "Choisis d'abord un pseudo" }, 400);
    if (duel.to_pseudo.toLowerCase() !== myPseudo.toLowerCase()) return json({ error: "Ce défi ne t'est pas adressé" }, 403);

    const g = await rateGuard(admin, user.id, "duel_respond", 80, 4000);
    if (g) return g;

    let toScore: number;
    try { toScore = Math.round(E.scoreDuel(duel.seed, choices)); } catch (e) { return json({ error: "Vérification impossible", detail: String(e) }, 500); }
    if (!Number.isFinite(toScore) || toScore < 0 || toScore > 1000) return json({ error: "Score hors bornes" }, 422);

    const winner = toScore > duel.from_score ? "to" : duel.from_score > toScore ? "from" : "tie";
    const { error: upErr } = await admin.from("duels").update({
      to_user: user.id, to_pseudo: myPseudo, to_label: label || myPseudo, to_choices: choices,
      to_score: toScore, winner, status: "done", answered_at: new Date().toISOString(),
    }).eq("id", id).eq("status", "pending"); // garde anti-course : reste 'pending'
    if (upErr) return json({ error: "Écriture impossible", detail: upErr.message }, 500);
    return json({ ok: true, from_score: duel.from_score, to_score: toScore, winner, from_pseudo: duel.from_pseudo });
  }

  return json({ error: "Action inconnue" }, 400);
});
