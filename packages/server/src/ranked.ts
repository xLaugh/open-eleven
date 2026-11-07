// Ranked : la première partie du défi du jour fait monter ou descendre le rang.
//
//   POST /api/ranked/start   { date, v }  → ouvre la partie classée du jour (jeton) ;
//                                           une seconde partie le même jour n'est pas classée.
//   finishRanked(...)         appelé par /api/scores/daily quand l'envoi porte le jeton :
//                             le serveur recalcule les étoiles en rejouant la partie.
//   ranked_me / ranked_top    lecture (procédures RPC, cf. procedures.ts).
//
// Les règles (gains, montée, descente, saison) sont celles du moteur (engine/stars.ts) :
// la base garde seulement l'état, ligne verrouillée le temps de l'écriture.
import { Engine } from "@open-eleven/engine";
import type { FastifyInstance } from "fastify";
import { currentUser } from "./auth";
import { pool, type Db } from "./db";

export function utcDay(offset = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export const currentSeason = (): string => utcDay().slice(0, 7);

type RankedState = ReturnType<typeof Engine.rankedFresh>;

function rowToState(r: Record<string, any> | undefined): RankedState {
  if (!r) return Engine.rankedFresh();
  return { season: r.season, tier: r.tier, div: r.div, points: r.points, protect: r.protect, bestTier: r.best_tier, bestDiv: r.best_div, lastDate: r.last_date };
}

/** Ligne de rang du joueur, créée au besoin, verrouillée jusqu'à la fin de la transaction. */
async function lockState(db: Db, userId: string): Promise<RankedState> {
  await db.query("insert into ranked (user_id) values ($1) on conflict (user_id) do nothing", [userId]);
  const { rows } = await db.query("select * from ranked where user_id = $1 for update", [userId]);
  return rowToState(rows[0]);
}

async function saveState(db: Db, userId: string, s: RankedState): Promise<void> {
  const pseudo = (await db.query("select pseudo from profiles where user_id = $1", [userId])).rows[0]?.pseudo ?? null;
  await db.query(
    "update ranked set season = $2, tier = $3, div = $4, points = $5, protect = $6, best_tier = $7, best_div = $8, last_date = $9, pseudo = $10, updated_at = now() where user_id = $1",
    [userId, s.season, s.tier, s.div, s.points, s.protect, s.bestTier, s.bestDiv, s.lastDate, pseudo]);
}

/** Applique un jour (étoiles) à l'état, archive la saison close, renvoie le détail. */
async function applyDay(db: Db, userId: string, state: RankedState, date: string, stars: number) {
  const res = Engine.rankedStep(state, date, stars);
  if (res.closedSeason) {
    await db.query(
      "insert into ranked_seasons (user_id, season, best_tier, best_div) values ($1, $2, $3, $4) on conflict (user_id, season) do nothing",
      [userId, res.closedSeason.season, res.closedSeason.bestTier, res.closedSeason.bestDiv]);
  }
  return res;
}

/** Solde à 0 étoile les parties classées commencées avant `date` et jamais terminées. */
async function settleForfeits(db: Db, userId: string, state: RankedState, date: string): Promise<RankedState> {
  const open = (await db.query("select date from ranked_days where user_id = $1 and status = 'started' and date < $2 order by date", [userId, date])).rows;
  let s = state;
  for (const r of open) {
    if (s.lastDate && r.date < s.lastDate) {
      await db.query("update ranked_days set status = 'forfeit', stars = 0, delta = 0 where user_id = $1 and date = $2", [userId, r.date]);
      continue;
    }
    const res = await applyDay(db, userId, s, r.date, 0);
    s = res.state;
    await db.query(
      "update ranked_days set status = 'forfeit', stars = 0, delta = $3, tier = $4, div = $5, points = $6 where user_id = $1 and date = $2",
      [userId, r.date, res.delta - res.decay, s.tier, s.div, s.points]);
  }
  return s;
}

async function inTx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query("begin");
    const out = await fn(db);
    await db.query("commit");
    return out;
  } catch (err) {
    await db.query("rollback").catch(() => {});
    throw err;
  } finally {
    db.release();
  }
}

/**
 * Fin de la partie classée : étoiles recalculées par rejeu, rang mis à jour.
 * Renvoie null si l'envoi n'est pas (ou plus) la partie classée du jour.
 */
export async function finishRanked(userId: string, date: string, token: string, choices: number[]) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const stars = Engine.starsDaily(date, choices);
  return inTx(async (db) => {
    let state = await lockState(db, userId);
    const day = (await db.query("select status, token from ranked_days where user_id = $1 and date = $2 for update", [userId, date])).rows[0];
    if (!day || day.status !== "started" || String(day.token) !== token) return null;
    state = await settleForfeits(db, userId, state, date);
    const before = { tier: state.tier, div: state.div, points: state.points };
    const res = await applyDay(db, userId, state, date, stars);
    await saveState(db, userId, res.state);
    await db.query(
      "update ranked_days set status = 'done', stars = $3, delta = $4, tier = $5, div = $6, points = $7 where user_id = $1 and date = $2",
      [userId, date, stars, res.delta - res.decay, res.state.tier, res.state.div, res.state.points]);
    return {
      stars, delta: res.delta, decay: res.decay, promoted: res.promoted, demoted: res.demoted, newTier: res.newTier,
      before, after: { tier: res.state.tier, div: res.state.div, points: res.state.points, protect: res.state.protect },
    };
  });
}

export function registerRanked(app: FastifyInstance): void {
  app.post("/api/ranked/start", async (req, reply) => {
    const user = await currentUser(req);
    if (!user) return reply.code(401).send({ error: "Non authentifié" });
    const p = (req.body ?? {}) as Record<string, unknown>;
    const date = String(p.date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply.code(400).send({ error: "Date invalide" });
    if (typeof p.v === "string" && p.v && p.v !== Engine.ENGINE_VERSION) {
      return reply.code(409).send({ error: "Version du jeu périmée — recharge la page.", code: "version_mismatch" });
    }
    // Seul le défi d'aujourd'hui (à un jour près, pour les fuseaux) est classé.
    if (date < utcDay(-1) || date > utcDay(1)) return { ranked: false, reason: "date" };
    return inTx(async (db) => {
      let state = await lockState(db, user.id);
      const existing = (await db.query("select status, stars from ranked_days where user_id = $1 and date = $2", [user.id, date])).rows[0];
      if (existing) return { ranked: false, reason: "already", status: existing.status, stars: existing.stars };
      if (state.lastDate && date < state.lastDate) return { ranked: false, reason: "date" };
      state = await settleForfeits(db, user.id, state, date);
      await saveState(db, user.id, state);
      const { rows } = await db.query("insert into ranked_days (user_id, date) values ($1, $2) returning token", [user.id, date]);
      return { ranked: true, token: String(rows[0].token) };
    });
  });
}
