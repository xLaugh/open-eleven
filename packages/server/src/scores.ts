// Scores VÉRIFIÉS : défi du jour et duels.
//
// L'interface n'envoie que (date ou graine, journal de choix). Le serveur
// rejoue la carrière avec le MÊME moteur que le jeu et calcule le score
// lui-même : on ne peut pas mentir sur son score, seuls les choix comptent.
// C'est la seule voie d'écriture dans daily_scores et duels.
import { Engine } from "@open-eleven/engine";
import type { FastifyInstance, FastifyReply } from "fastify";
import { currentUser } from "./auth";
import { pool } from "./db";
import { notify } from "./notify";

// Fenêtre de rattrapage : au-delà, un défi passé n'entre plus au classement.
// Sans elle, rejouer des centaines de défis anciens gonflait le classement
// général (somme sur toutes les dates).
const DAILY_BACKLOG_DAYS = 2;

function utcDay(offset = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function validChoices(choices: unknown): choices is number[] {
  if (!Array.isArray(choices) || choices.length > 400) return false;
  return choices.every((c) => Number.isInteger(c) && c >= -1 && c <= 64);
}
const validScore = (n: number): boolean => Number.isFinite(n) && n >= 0 && n <= 1000;

/** Une interface restée sur une ancienne version jouerait avec d'autres règles. */
function versionMismatch(reply: FastifyReply, claimed: unknown): FastifyReply | null {
  if (typeof claimed !== "string" || !claimed || claimed === Engine.ENGINE_VERSION) return null;
  return reply.code(409).send({
    error: "Version du jeu périmée — recharge la page pour envoyer ton score.",
    clientVersion: claimed, serverVersion: Engine.ENGINE_VERSION, code: "version_mismatch",
  });
}

/** Limite AVANT le rejeu (coûteux). Renvoie le message de refus, ou null. */
async function rateLimit(userId: string, bucket: string, day: string, cap: number, cooldownMs: number, capMessage: string): Promise<string | null> {
  const { rows } = await pool.query("select rate_take($1, $2, $3, $4, $5) as verdict", [userId, bucket, day, cap, cooldownMs]);
  if (rows[0].verdict === "cooldown") return "Doucement — attends quelques secondes.";
  if (rows[0].verdict === "cap") return capMessage;
  return null;
}

async function pseudoOf(userId: string): Promise<string | null> {
  const { rows } = await pool.query("select pseudo from profiles where user_id = $1", [userId]);
  return rows[0]?.pseudo ? String(rows[0].pseudo).slice(0, 24) : null;
}

export function registerScores(app: FastifyInstance): void {
  app.post("/api/scores/daily", async (req, reply) => {
    const user = await currentUser(req);
    if (!user) return reply.code(401).send({ error: "Non authentifié" });
    const p = (req.body ?? {}) as Record<string, unknown>;
    const date = String(p.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply.code(400).send({ error: "Date invalide" });
    if (date > utcDay(1)) return reply.code(400).send({ error: "Date dans le futur" });
    if (date < utcDay(-DAILY_BACKLOG_DAYS)) return reply.code(400).send({ error: "Ce défi est trop ancien pour entrer au classement." });
    if (!validChoices(p.choices)) return reply.code(400).send({ error: "Journal de choix invalide" });
    const mismatch = versionMismatch(reply, p.v);
    if (mismatch) return mismatch;

    // Deux seaux : un seul, indexé sur la date du défi, se contournerait en
    // alternant les dates. Le premier plafonne la journée, le second un défi.
    const blocked =
      (await rateLimit(user.id, "daily_global", utcDay(), 60, 4000, "Trop de soumissions aujourd'hui, réessaie demain.")) ??
      (await rateLimit(user.id, "daily", date, 25, 8000, "Trop de tentatives pour ce défi."));
    if (blocked) return reply.code(429).send({ error: blocked });

    let score: number;
    try { score = Engine.scoreDaily(date, p.choices); } catch (err) { req.log.error(err); return reply.code(500).send({ error: "Vérification impossible" }); }
    if (!validScore(score)) return reply.code(422).send({ error: "Score hors bornes" });
    score = Math.round(score);

    const pseudo = (await pseudoOf(user.id)) ?? "Joueur " + user.id.slice(0, 4);
    const { rows } = await pool.query("select record_daily_score($1, $2, $3, $4::jsonb, $5) as best", [user.id, date, score, JSON.stringify(p.choices), pseudo]);
    return { ok: true, score, best: rows[0].best, date, pseudo };
  });

  app.post("/api/scores/duel", async (req, reply) => {
    const user = await currentUser(req);
    if (!user) return reply.code(401).send({ error: "Non authentifié" });
    const p = (req.body ?? {}) as Record<string, unknown>;
    const choices = p.choices;
    if (!validChoices(choices)) return reply.code(400).send({ error: "Journal de choix invalide" });
    const label = p.label ? String(p.label).slice(0, 40) : null;
    const mismatch = versionMismatch(reply, p.v);
    if (mismatch) return mismatch;
    const duelCap = "Trop de duels aujourd'hui, réessaie demain.";

    if (p.action === "create") {
      const seed = (Number(p.seed) | 0) || 1;
      const toPseudo = String(p.toPseudo ?? "").trim().slice(0, 24);
      if (!toPseudo) return reply.code(400).send({ error: "Pseudo cible manquant" });
      const fromPseudo = await pseudoOf(user.id);
      if (!fromPseudo) return reply.code(400).send({ error: "Choisis d'abord un pseudo" });
      if (toPseudo.toLowerCase() === fromPseudo.toLowerCase()) return reply.code(400).send({ error: "Tu ne peux pas te défier toi-même" });
      const blocked = await rateLimit(user.id, "duel_create", utcDay(), 40, 6000, duelCap);
      if (blocked) return reply.code(429).send({ error: blocked });

      let fromScore: number;
      try { fromScore = Math.round(Engine.scoreDuel(seed, choices)); } catch (err) { req.log.error(err); return reply.code(500).send({ error: "Vérification impossible" }); }
      if (!validScore(fromScore)) return reply.code(422).send({ error: "Score hors bornes" });
      const { rows } = await pool.query(
        "insert into duels (seed, from_user, from_pseudo, from_label, from_choices, from_score, to_pseudo, status) " +
        "values ($1, $2, $3, $4, $5::jsonb, $6, $7, 'pending') returning id",
        [seed, user.id, fromPseudo, label ?? fromPseudo, JSON.stringify(choices), fromScore, toPseudo]);
      // Le joueur défié est prévenu (s'il existe : le pseudo cible n'est pas vérifié à la création).
      pool.query("select user_id from profiles where lower(pseudo) = lower($1)", [toPseudo])
        .then((r) => notify([r.rows[0]?.user_id], "duel_received", { from: fromPseudo, duelId: rows[0].id })).catch(() => {});
      return { ok: true, id: rows[0].id, from_score: fromScore, to_pseudo: toPseudo };
    }

    if (p.action === "respond") {
      const id = String(p.id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(id)) return reply.code(400).send({ error: "Duel invalide" });
      const duel = (await pool.query("select * from duels where id = $1", [id])).rows[0];
      if (!duel) return reply.code(404).send({ error: "Duel introuvable" });
      if (duel.status !== "pending") return reply.code(409).send({ error: "Duel déjà terminé" });
      if (duel.from_user === user.id) return reply.code(400).send({ error: "Tu ne peux pas répondre à ton propre défi" });
      const myPseudo = await pseudoOf(user.id);
      if (!myPseudo) return reply.code(400).send({ error: "Choisis d'abord un pseudo" });
      if (String(duel.to_pseudo).toLowerCase() !== myPseudo.toLowerCase()) return reply.code(403).send({ error: "Ce défi ne t'est pas adressé" });
      const blocked = await rateLimit(user.id, "duel_respond", utcDay(), 80, 4000, duelCap);
      if (blocked) return reply.code(429).send({ error: blocked });

      // Les DEUX journaux sont rejoués maintenant, avec le même moteur : comparer
      // un score calculé à la création (peut-être avant un rééquilibrage) à un
      // score calculé aujourd'hui départagerait deux barèmes différents.
      let fromScore: number, toScore: number;
      try {
        fromScore = Math.round(Engine.scoreDuel(duel.seed, duel.from_choices ?? []));
        toScore = Math.round(Engine.scoreDuel(duel.seed, choices));
      } catch (err) { req.log.error(err); return reply.code(500).send({ error: "Vérification impossible" }); }
      if (!validScore(fromScore) || !validScore(toScore)) return reply.code(422).send({ error: "Score hors bornes" });

      const winner = toScore > fromScore ? "to" : fromScore > toScore ? "from" : "tie";
      // « and status = 'pending' » : deux réponses simultanées ne peuvent pas
      // gagner toutes les deux, la seconde ne modifie aucune ligne.
      const updated = await pool.query(
        "update duels set to_user = $2, to_pseudo = $3, to_label = $4, to_choices = $5::jsonb, from_score = $6, to_score = $7, " +
        "winner = $8, status = 'done', answered_at = now() where id = $1 and status = 'pending'",
        [id, user.id, myPseudo, label ?? myPseudo, JSON.stringify(choices), fromScore, toScore, winner]);
      if (!updated.rowCount) return reply.code(409).send({ error: "Duel déjà terminé" });
      // Le lanceur du défi apprend le résultat, de SON point de vue.
      notify([duel.from_user], "duel_result", { from: myPseudo, result: winner === "from" ? "win" : winner === "to" ? "loss" : "tie", mine: fromScore, theirs: toScore }).catch(() => {});
      return { ok: true, from_score: fromScore, to_score: toScore, winner, from_pseudo: duel.from_pseudo };
    }

    return reply.code(400).send({ error: "Action inconnue" });
  });
}
