// Point d'entrée unique des procédures : POST /api/rpc/<nom>, arguments en JSON.
//
// Deux familles, indiscernables pour l'interface :
//   • les fonctions SQL reprises du schéma d'origine (classements, duels,
//     salles), déclarées ci-dessous — seules celles de cette liste sont
//     appelables, avec ces arguments-là ;
//   • les procédures de procedures.ts.
// Réponse : { data } ou { error: { message, code? } }.
import type { FastifyInstance } from "fastify";
import { currentUser } from "./auth";
import { pool, withUser, type Db } from "./db";
import { limits } from "./limits";
import { notify, pseudoOf, roomMembersExcept } from "./notify";
import { notifyRoomsOf } from "./live";
import { ProcedureError, procedures } from "./procedures";

interface SqlFunction {
  /** Arguments acceptés ; « nom:jsonb » pour un argument JSON. */
  args: string[];
  auth: boolean;
  /** rows = table de résultats · scalar = une valeur · void = rien. */
  returns: "rows" | "scalar" | "void";
}
const fn = (returns: SqlFunction["returns"], auth: boolean, ...args: string[]): SqlFunction => ({ args, auth, returns });

const SQL_FUNCTIONS: Record<string, SqlFunction> = {
  // Classements et vitrines : lisibles sans compte.
  daily_top: fn("rows", false, "d", "lim"),
  daily_rank: fn("rows", false, "d", "sc"),
  range_top: fn("rows", false, "since", "lim"),
  level_top: fn("rows", false, "lim"),
  level_rank: fn("rows", false, "p_user"),
  public_profile: fn("rows", false, "p_pseudo"),
  random_legends: fn("rows", false, "n"),
  stats_publiques: fn("rows", false),
  bump_stat: fn("void", false, "cle"),
  // Ne renvoie rien si l'on n'est ni connecté ni ami : la fonction s'en charge.
  friend_profile: fn("rows", false, "p_pseudo"),
  friends_daily: fn("rows", true, "d", "lim"),
  friends_range: fn("rows", true, "since", "lim"),
  // Duels (la création et la réponse, vérifiées, passent par /api/scores/duel).
  duels_incoming: fn("rows", true),
  duels_outgoing: fn("rows", true),
  duels_history: fn("rows", true),
  duel_cancel: fn("scalar", true, "p_id"),
  // Salles.
  room_create: fn("scalar", true, "p_mode"),
  room_pick_start_club: fn("void", true, "p_room_id", "p_club_id"),
  room_invite: fn("void", true, "p_room_id", "p_friend_id"),
  room_join: fn("void", true, "p_room_id"),
  room_decline: fn("void", true, "p_room_id"),
  room_cancel_invite: fn("void", true, "p_room_id", "p_user_id"),
  room_leave: fn("void", true, "p_room_id"),
  room_launch: fn("void", true, "p_room_id", "p_club_id"),
  room_submit_starting_offers: fn("void", true, "p_room_id", "p_offers:jsonb"),
  room_open_starting_vote: fn("scalar", true, "p_room_id"),
  room_open_transfer_vote: fn("scalar", true, "p_room_id", "p_offers:jsonb", "p_forced"),
  room_open_relocation_vote: fn("scalar", true, "p_room_id", "p_club_id"),
  room_propose_kick: fn("scalar", true, "p_room_id", "p_target_user_id"),
  room_cast_vote: fn("void", true, "p_vote_id", "p_choice"),
  room_maybe_resolve_vote: fn("void", true, "p_vote_id"),
  room_report_season: fn("void", true, "p_room_id", "p_pending_offer:jsonb", "p_club_trophies:jsonb"),
  room_mark_career_ended: fn("void", true, "p_room_id", "p_score", "p_summary:jsonb"),
  room_update_stats: fn("void", true, "p_room_id", "p_stats:jsonb"),
  room_claim_season_club: fn("scalar", true, "p_room_id", "p_year", "p_club_id"),
};

const MAX_JSON_ARG_BYTES = 256 * 1024;

// Tailles de liste demandées sans compte : bornées, sinon un seul appel lirait
// toute la table (et le coût de la requête avec).
const MAX_LIST = 100;
const listArgs = new Set(["lim", "n"]);

/**
 * Une écriture à la fois par salle.
 *
 * Les fonctions room_* comptent puis agissent : « tous les membres ont rendu
 * leur bilan → la saison avance », « tous ont voté → le vote se clôt ». Deux
 * joueurs qui écrivent au même instant ne voient pas encore la ligne de
 * l'autre : chacun compte un bilan sur deux, personne ne fait avancer la
 * salle, et elle reste bloquée. Le verrou (tenu jusqu'à la fin de la
 * transaction) fait passer le second après le premier, qui voit alors tout.
 */
async function lockRoom(db: Db, args: Record<string, unknown>): Promise<void> {
  let roomId = args.p_room_id;
  if (roomId === undefined && args.p_vote_id !== undefined) {
    roomId = (await db.query("select room_id from room_votes where id = $1", [args.p_vote_id])).rows[0]?.room_id;
  }
  if (typeof roomId === "string") await db.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [roomId]);
}

async function callSql(db: Db, name: string, def: SqlFunction, args: Record<string, unknown>): Promise<unknown> {
  const unknown = Object.keys(args).filter((k) => !def.args.some((a) => a.split(":")[0] === k));
  if (unknown.length) throw new ProcedureError("Argument inconnu : " + unknown[0]);
  if (name.startsWith("room_")) await lockRoom(db, args);
  const parts: string[] = [];
  const values: unknown[] = [];
  for (const spec of def.args) {
    const [arg, type] = spec.split(":");
    if (args[arg] === undefined) continue; // absent : la valeur par défaut SQL s'applique
    if (type === "jsonb") {
      const json = JSON.stringify(args[arg]);
      if (Buffer.byteLength(json) > MAX_JSON_ARG_BYTES) throw new ProcedureError("Argument trop volumineux : " + arg, 413);
      values.push(json);
      parts.push(arg + " => $" + values.length + "::jsonb");
    } else if (listArgs.has(arg)) {
      const n = Number(args[arg]);
      if (!Number.isInteger(n) || n < 1) throw new ProcedureError("Argument invalide : " + arg);
      values.push(Math.min(n, MAX_LIST));
      parts.push(arg + " => $" + values.length);
    } else {
      values.push(args[arg]);
      parts.push(arg + " => $" + values.length);
    }
  }
  const call = name + "(" + parts.join(", ") + ")";
  if (def.returns === "rows") return (await db.query("select * from " + call, values)).rows;
  const { rows } = await db.query("select " + call + " as value", values);
  return def.returns === "scalar" ? rows[0].value : null;
}

// Codes Postgres qui signalent une demande refusée ou mal formée, pas une panne.
//   P0001 : « raise exception » d'une fonction (« not a joined member »…)
//   22xxx : valeur invalide (uuid mal formé…) · 23xxx : contrainte violée
const isClientFault = (code: string | undefined): boolean => !!code && (code === "P0001" || code.startsWith("22") || code.startsWith("23"));

// Qui prévenir après une action réussie (cf. notify.ts). Hors transaction, sans attendre :
// la réponse au joueur qui agit ne dépend pas de l'envoi des notifications.
async function notifyAfter(name: string, me: string, args: Record<string, unknown>, data: unknown): Promise<void> {
  const roomId = typeof args.p_room_id === "string" ? args.p_room_id : null;
  // Une invitation traitée (d'ici, du panneau Amis ou de l'overlay Salle) ne propose plus
  // ses boutons : la notification correspondante est marquée « faite ».
  const done = (kind: string, key: string, value: unknown) => typeof value === "string"
    ? pool.query("update notifications set payload = payload || '{\"done\": true}'::jsonb where user_id = $1 and kind = $2 and payload->>$3 = $4", [me, kind, key, value])
    : null;
  if (name === "friend_accept") await done("friend_request", "fromId", args.from_id);
  if (name === "friend_remove" || name === "friend_request") await done("friend_request", "fromId", args.friend_id);
  if (name === "room_join" || name === "room_decline") await done("room_invite", "roomId", roomId);
  // Invitation annulée par l'hôte : chez l'invité, la notification ne propose plus « Rejoindre ».
  if (name === "room_cancel_invite" && typeof args.p_user_id === "string") {
    await pool.query("update notifications set payload = payload || '{\"done\": true}'::jsonb where user_id = $1 and kind = 'room_invite' and payload->>'roomId' = $2", [args.p_user_id, roomId]);
  }
  const from = await pseudoOf(me);
  switch (name) {
    case "friend_request": {
      const accepted = !!(data as { accepted?: boolean } | null)?.accepted;
      return notify([args.friend_id as string], accepted ? "friend_accepted" : "friend_request", { from, fromId: me });
    }
    case "friend_accept":
      return notify([args.from_id as string], "friend_accepted", { from });
    case "room_invite":
      return notify([args.p_friend_id as string], "room_invite", { from, roomId });
    case "room_join":
      return notify(await roomMembersExcept(roomId!, me), "room_joined", { from, roomId });
    case "room_decline": {
      const { rows } = await pool.query("select invited_by from room_members where room_id = $1 and user_id = $2", [roomId, me]);
      return notify([rows[0]?.invited_by], "room_declined", { from, roomId });
    }
    case "room_launch":
      return notify(await roomMembersExcept(roomId!, me), "room_launched", { from, roomId });
    case "room_open_transfer_vote": case "room_open_relocation_vote": case "room_propose_kick": {
      // Plusieurs membres peuvent ouvrir « le même » vote en même temps : une seule notification par vote.
      const voteId = typeof data === "string" ? data : null;
      if (!voteId) return;
      const seen = await pool.query("select 1 from notifications where kind = 'room_vote' and payload->>'voteId' = $1 limit 1", [voteId]);
      if (seen.rowCount) return;
      return notify(await roomMembersExcept(roomId!, me), "room_vote", { from, roomId, voteId, kick: name === "room_propose_kick" });
    }
  }
}

export function registerRpc(app: FastifyInstance): void {
  app.post("/api/rpc/:name", async (req, reply) => {
    const name = (req.params as { name: string }).name;
    const sql = Object.hasOwn(SQL_FUNCTIONS, name) ? SQL_FUNCTIONS[name] : null;
    const proc = Object.hasOwn(procedures, name) ? procedures[name] : null;
    if (!sql && !proc) return reply.code(404).send({ error: { message: "Procédure inconnue" } });

    const body = req.body ?? {};
    if (typeof body !== "object" || Array.isArray(body)) return reply.code(400).send({ error: { message: "Arguments invalides" } });
    const args = body as Record<string, unknown>;

    // Les compteurs publics s'incrémentent sans compte : bornés par adresse.
    if (name === "bump_stat" && !limits.stats.hit(req.ip)) return reply.code(429).send({ error: { message: "rate limit" } });

    const user = await currentUser(req);
    if ((sql ?? proc)!.auth && !user) return reply.code(401).send({ error: { message: "Non authentifié" } });
    const userId = user ? user.id : null;

    try {
      const data = await withUser(userId, (db) => (sql ? callSql(db, name, sql, args) : proc!.run(db, userId, args)));
      // Une salle a pu changer : ses membres connectés en sont prévenus.
      if (userId && name.startsWith("room_") && name !== "room_state") notifyRoomsOf(userId).catch(() => {});
      if (userId) notifyAfter(name, userId, args, data).catch(() => {});
      return { data };
    } catch (err) {
      if (err instanceof ProcedureError) return reply.code(err.status).send({ error: { message: err.message, code: err.code } });
      const pgErr = err as { code?: string; message?: string };
      if (isClientFault(pgErr.code)) return reply.code(400).send({ error: { message: pgErr.message ?? "Demande refusée", code: pgErr.code } });
      req.log.error(err);
      return reply.code(500).send({ error: { message: "Erreur du serveur" } });
    }
  });
}
