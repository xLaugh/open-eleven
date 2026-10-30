// Procédures écrites ici, en TypeScript : sauvegarde, profil, amis, lecture
// des salles. Chacune remplace un accès direct de l'interface à une table —
// c'est donc ici que se décide qui a le droit de lire ou d'écrire quoi.
import type { Db } from "./db";
import { isAvatarId } from "@open-eleven/content";
import { pseudoForbidden } from "./pseudo";

export class ProcedureError extends Error {
  constructor(message: string, readonly status = 400, readonly code?: string) { super(message); }
}

type Args = Record<string, unknown>;
export interface Procedure {
  /** Sans connexion, la procédure est refusée (401). */
  auth: boolean;
  run: (db: Db, userId: string | null, args: Args) => Promise<unknown>;
}

const MAX_SAVE_BYTES = 6 * 1024 * 1024;
const MAX_STATS_BYTES = 200 * 1024;

// Historique des carrières (cf. migrations/008_careers.sql). Une carrière pèse
// 20 à 35 Ko : 128 Ko laisse de la marge sans ouvrir la porte au remplissage.
const CAREERS_MAX = 1000;
const CAREER_FAVORITES_MAX = 100;
const CAREER_MAX_BYTES = 128 * 1024;
const CAREER_BATCH_MAX = 20;
const CAREER_MODES = ["career", "daily", "duel", "story", "room"];
/** Envois par jour et par compte : l'import du Panthéon en fait un, chaque fin de partie un. */
const CAREER_CALLS_PER_DAY = 300;

/** Résumé affiché dans la liste : recopié champ par champ, borné, jamais tel quel. */
function careerSummary(raw: unknown): Record<string, unknown> {
  const s = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0);
  const trophies: Record<string, number> = {};
  if (s.trophies && typeof s.trophies === "object" && !Array.isArray(s.trophies)) {
    for (const [k, v] of Object.entries(s.trophies as Record<string, unknown>).slice(0, 40)) {
      if (/^[A-Za-z0-9_]{1,24}$/.test(k) && Number.isInteger(v) && (v as number) > 0 && (v as number) < 1000) trophies[k] = v as number;
    }
  }
  return {
    name: str(s.name, 40), title: str(s.title, 80), natId: str(s.natId, 12), natFlag: str(s.natFlag, 16),
    natName: str(s.natName, 40), posIcon: str(s.posIcon, 8), peakOvr: num(s.peakOvr), money: num(s.money),
    seasons: num(s.seasons), trophies,
  };
}
/** Date de fin annoncée par l'appareil, si elle est plausible ; sinon le serveur prend « maintenant ». */
function playedAt(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  if (!Number.isFinite(t) || t < Date.parse("2020-01-01") || t > Date.now() + 5 * 60 * 1000) return null;
  return new Date(t).toISOString();
}
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const uuidArg = (args: Args, name: string): string => {
  if (!isUuid(args[name])) throw new ProcedureError("Identifiant invalide : " + name);
  return args[name] as string;
};
const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
const isDuplicate = (err: unknown): boolean => (err as { code?: string }).code === "23505";

async function pseudoOf(db: Db, userId: string): Promise<string | null> {
  const { rows } = await db.query("select pseudo from profiles where user_id = $1", [userId]);
  return rows[0]?.pseudo ?? null;
}

export const procedures: Record<string, Procedure> = {
  // --- Sauvegarde ---------------------------------------------------------------
  // Un seul bloc par joueur, remplacé en entier. `expected` est la date de la
  // version que l'appareil connaît : si le serveur en a une autre, quelqu'un
  // a écrit entre-temps (un second appareil) et l'on refuse plutôt que
  // d'écraser en silence — sauf demande explicite (`force`).
  save_get: {
    auth: true,
    async run(db, me) {
      const { rows } = await db.query("select data, updated_at from saves where user_id = $1", [me]);
      return rows[0] ? { data: rows[0].data, updated_at: iso(rows[0].updated_at) } : null;
    },
  },
  save_put: {
    auth: true,
    async run(db, me, args) {
      const json = JSON.stringify(args.data ?? {});
      if (typeof args.data !== "object" || args.data === null || Array.isArray(args.data)) throw new ProcedureError("Sauvegarde invalide");
      if (Buffer.byteLength(json) > MAX_SAVE_BYTES) throw new ProcedureError("Sauvegarde trop volumineuse", 413);
      const { rows } = await db.query("select updated_at from saves where user_id = $1 for update", [me]);
      const remote = iso(rows[0]?.updated_at);
      if (remote && !args.force && remote !== args.expected) return { ok: false, conflict: true, serverStamp: remote };
      // Horodatage à la milliseconde : c'est la précision que l'interface sait
      // relire et renvoyer telle quelle dans `expected`.
      const saved = await db.query(
        "insert into saves (user_id, data, updated_at) values ($1, $2::jsonb, date_trunc('milliseconds', now())) " +
        "on conflict (user_id) do update set data = excluded.data, updated_at = excluded.updated_at returning updated_at",
        [me, json],
      );
      return { ok: true, updated_at: iso(saved.rows[0].updated_at) };
    },
  },

  // --- Historique des carrières -------------------------------------------------
  // Toutes les carrières terminées du compte, jusqu'à CAREERS_MAX (les favorites
  // ne partent jamais). Chaque procédure ne voit que les carrières du joueur.
  careers_add: {
    auth: true,
    async run(db, me, args) {
      const items = args.items;
      if (!Array.isArray(items) || !items.length || items.length > CAREER_BATCH_MAX) throw new ProcedureError("Envoi invalide : 1 à " + CAREER_BATCH_MAX + " carrières");
      const day = new Date().toISOString().slice(0, 10);
      const { rows: verdict } = await db.query("select rate_take($1, 'careers', $2, $3, 0) as v", [me, day, CAREER_CALLS_PER_DAY]);
      if (verdict[0].v !== "ok") throw new ProcedureError("Trop de carrières envoyées aujourd'hui", 429);
      let added = 0;
      for (const raw of items) {
        const it = (raw && typeof raw === "object" ? raw : {}) as Args;
        const clientId = typeof it.clientId === "string" && /^[\w-]{1,64}$/.test(it.clientId) ? it.clientId : null;
        if (!clientId) throw new ProcedureError("Identifiant de carrière invalide");
        if (typeof it.mode !== "string" || !CAREER_MODES.includes(it.mode)) throw new ProcedureError("Mode de carrière invalide");
        if (!it.data || typeof it.data !== "object" || Array.isArray(it.data)) throw new ProcedureError("Carrière invalide");
        const data = JSON.stringify(it.data);
        if (Buffer.byteLength(data) > CAREER_MAX_BYTES) throw new ProcedureError("Carrière trop volumineuse", 413);
        const score = Number.isFinite(Number(it.score)) ? Math.max(0, Math.min(1_000_000, Math.round(Number(it.score)))) : 0;
        // Une carrière supprimée par le joueur ne revient pas, même renvoyée par un autre appareil.
        const r = await db.query(
          "insert into careers (user_id, client_id, mode, summary, data, score, played_at) " +
          // À la milliseconde : c'est la précision du curseur de careers_list.
          "select $1, $2, $3, $4::jsonb, $5::jsonb, $6, date_trunc('milliseconds', coalesce($7::timestamptz, now())) " +
          "where not exists (select 1 from careers_deleted where user_id = $1 and client_id = $2) on conflict (user_id, client_id) do nothing",
          [me, clientId, it.mode, JSON.stringify(careerSummary(it.summary)), data, score, playedAt(it.playedAt)],
        );
        added += r.rowCount ?? 0;
      }
      // Au-delà du plafond, les plus anciennes non favorites s'en vont.
      await db.query(
        "delete from careers where id in (select id from careers where user_id = $1 and not favorite order by played_at desc, id desc " +
        "offset greatest(0, $2 - (select count(*) from careers where user_id = $1 and favorite)))",
        [me, CAREERS_MAX],
      );
      const { rows } = await db.query("select count(*)::int as n from careers where user_id = $1", [me]);
      return { added, total: rows[0].n };
    },
  },
  // Page de la liste, la plus récente d'abord. `before` = { at, id } de la dernière
  // carrière déjà affichée (pagination stable même si une carrière arrive entre-temps).
  careers_list: {
    auth: true,
    async run(db, me, args) {
      const limit = Math.min(50, Math.max(1, Number.isInteger(args.limit) ? (args.limit as number) : 20));
      const where = ["user_id = $1"];
      const values: unknown[] = [me];
      if (args.mode !== undefined && args.mode !== null) {
        if (typeof args.mode !== "string" || !CAREER_MODES.includes(args.mode)) throw new ProcedureError("Mode de carrière invalide");
        values.push(args.mode);
        where.push("mode = $" + values.length);
      }
      if (args.favorites === true) where.push("favorite");
      const before = args.before as { at?: unknown; id?: unknown } | undefined;
      if (before) {
        const at = typeof before.at === "string" && Number.isFinite(Date.parse(before.at)) ? new Date(before.at).toISOString() : null;
        if (!at || !isUuid(before.id)) throw new ProcedureError("Curseur invalide");
        values.push(at, before.id);
        where.push("(played_at, id) < ($" + (values.length - 1) + "::timestamptz, $" + values.length + "::uuid)");
      }
      values.push(limit + 1);
      const { rows } = await db.query(
        "select id, mode, summary, score, favorite, played_at from careers where " + where.join(" and ") +
        " order by played_at desc, id desc limit $" + values.length,
        values,
      );
      const counts = (await db.query("select count(*)::int as total, count(*) filter (where favorite)::int as favorites from careers where user_id = $1", [me])).rows[0];
      return {
        items: rows.slice(0, limit).map((r) => ({ id: r.id, mode: r.mode, summary: r.summary, score: r.score, favorite: r.favorite, playedAt: iso(r.played_at) })),
        hasMore: rows.length > limit,
        total: counts.total, favorites: counts.favorites, max: CAREERS_MAX, maxFavorites: CAREER_FAVORITES_MAX,
      };
    },
  },
  careers_get: {
    auth: true,
    async run(db, me, args) {
      const id = uuidArg(args, "id");
      const { rows } = await db.query("select data from careers where id = $1 and user_id = $2", [id, me]);
      if (!rows[0]) throw new ProcedureError("Carrière introuvable", 404);
      return rows[0].data;
    },
  },
  careers_favorite: {
    auth: true,
    async run(db, me, args) {
      const id = uuidArg(args, "id");
      const favorite = args.favorite === true;
      if (favorite) {
        const { rows } = await db.query("select count(*)::int as n from careers where user_id = $1 and favorite and id <> $2", [me, id]);
        if (rows[0].n >= CAREER_FAVORITES_MAX) throw new ProcedureError("Favorites : " + CAREER_FAVORITES_MAX + " au plus", 409, "favorites_cap");
      }
      const r = await db.query("update careers set favorite = $3 where id = $1 and user_id = $2", [id, me, favorite]);
      if (!r.rowCount) throw new ProcedureError("Carrière introuvable", 404);
      return { favorite };
    },
  },
  careers_delete: {
    auth: true,
    async run(db, me, args) {
      const id = uuidArg(args, "id");
      const r = await db.query("delete from careers where id = $1 and user_id = $2 returning client_id", [id, me]);
      if (!r.rowCount) throw new ProcedureError("Carrière introuvable", 404);
      await db.query("insert into careers_deleted (user_id, client_id) values ($1, $2) on conflict do nothing", [me, r.rows[0].client_id]);
      // Seules les plus récentes peuvent encore traîner dans un Panthéon (20 par appareil) : 500 suffisent.
      await db.query(
        "delete from careers_deleted where user_id = $1 and client_id in " +
        "(select client_id from careers_deleted where user_id = $1 order by deleted_at desc offset 500)",
        [me],
      );
      return { ok: true };
    },
  },

  // --- Profil -------------------------------------------------------------------
  profile_me: {
    auth: true,
    async run(db, me) {
      const { rows } = await db.query("select pseudo, avatar from profiles where user_id = $1", [me]);
      return { pseudo: rows[0]?.pseudo ?? null, avatar: rows[0]?.avatar ?? null };
    },
  },
  // Avatar : un des identifiants du jeu, ou null pour revenir à l'avatar par défaut.
  // Il faut un pseudo d'abord : l'avatar vit sur la même fiche.
  profile_set_avatar: {
    auth: true,
    async run(db, me, args) {
      const avatar = args.avatar === null ? null : args.avatar;
      if (avatar !== null && !isAvatarId(avatar)) throw new ProcedureError("Avatar inconnu.");
      const r = await db.query("update profiles set avatar = $2 where user_id = $1", [me, avatar]);
      if (!r.rowCount) throw new ProcedureError("Choisis d'abord un pseudo.", 400, "no_pseudo");
      return { avatar };
    },
  },
  profile_set_pseudo: {
    auth: true,
    async run(db, me, args) {
      const pseudo = String(args.pseudo ?? "").trim().slice(0, 24);
      if (pseudo.length < 2) throw new ProcedureError("Pseudo trop court (2 caractères min).");
      if (pseudoForbidden(pseudo)) throw new ProcedureError("Pseudo non autorisé.", 400, "pseudo_forbidden");
      try {
        // L'index unique sur lower(pseudo) est la seule source de vérité.
        await db.query("insert into profiles (user_id, pseudo) values ($1, $2) on conflict (user_id) do update set pseudo = excluded.pseudo", [me, pseudo]);
      } catch (err) {
        if (isDuplicate(err)) throw new ProcedureError("Ce pseudo est déjà pris.", 409, "pseudo_taken");
        throw err;
      }
      return { pseudo };
    },
  },
  // Vitrine publique, déclarée par le joueur (non vérifiée).
  profile_set_stats: {
    auth: true,
    async run(db, me, args) {
      const json = JSON.stringify(args.stats ?? null);
      if (typeof args.stats !== "object" || args.stats === null || Array.isArray(args.stats)) throw new ProcedureError("Statistiques invalides");
      if (Buffer.byteLength(json) > MAX_STATS_BYTES) throw new ProcedureError("Statistiques trop volumineuses", 413);
      await db.query("update profiles set stats = $2::jsonb where user_id = $1", [me, json]);
      return null;
    },
  },
  profile_find: {
    auth: false,
    async run(db, _me, args) {
      const { rows } = await db.query("select user_id, pseudo from profiles where lower(pseudo) = lower($1) limit 1", [String(args.pseudo ?? "").trim()]);
      return rows[0] ?? null;
    },
  },

  // --- Amis ---------------------------------------------------------------------
  // Une amitié = deux lignes (une dans chaque sens) au statut « accepted ».
  // Une invitation = une ligne « pending », du demandeur vers la cible.
  friends_list: {
    auth: true,
    async run(db, me) {
      const cols = "f.user_id, f.friend_id, f.friend_pseudo, f.created_at, f.status";
      // L'avatar de l'autre joueur accompagne chaque ligne (null s'il n'en a pas choisi).
      const mine = await db.query("select " + cols + ", fp.avatar from friends f left join profiles fp on fp.user_id = f.friend_id where f.user_id = $1 order by f.created_at desc", [me]);
      const incoming = await db.query(
        "select " + cols + ", coalesce(p.pseudo, 'Joueur') as from_pseudo, p.avatar from friends f left join profiles p on p.user_id = f.user_id " +
        "where f.friend_id = $1 and f.status = 'pending' order by f.created_at desc", [me]);
      return {
        friends: mine.rows.filter((r) => r.status === "accepted"),
        outgoing: mine.rows.filter((r) => r.status === "pending"),
        incoming: incoming.rows,
      };
    },
  },
  friend_request: {
    auth: true,
    async run(db, me, args) {
      const friendId = uuidArg(args, "friend_id");
      if (friendId === me) throw new ProcedureError("C'est toi !");
      const pseudo = await pseudoOf(db, friendId);
      if (!pseudo) throw new ProcedureError("Aucun joueur avec ce pseudo.", 404);
      // Il nous a déjà invité : on accepte SA demande, sinon deux invitations
      // croisées resteraient en attente face à face.
      const mutual = await db.query("update friends set status = 'accepted' where user_id = $1 and friend_id = $2 and status = 'pending'", [friendId, me]);
      if (mutual.rowCount) {
        await db.query(
          "insert into friends (user_id, friend_id, friend_pseudo, status) values ($1, $2, $3, 'accepted') " +
          "on conflict (user_id, friend_id) do update set status = 'accepted', friend_pseudo = excluded.friend_pseudo", [me, friendId, pseudo]);
        return { pseudo, accepted: true };
      }
      const inserted = await db.query(
        "insert into friends (user_id, friend_id, friend_pseudo, status) values ($1, $2, $3, 'pending') on conflict (user_id, friend_id) do nothing", [me, friendId, pseudo]);
      if (!inserted.rowCount) throw new ProcedureError("Déjà ami ou déjà invité.", 409, "duplicate");
      return { pseudo, accepted: false };
    },
  },
  friend_accept: {
    auth: true,
    async run(db, me, args) {
      const fromId = uuidArg(args, "from_id");
      const accepted = await db.query("update friends set status = 'accepted' where user_id = $1 and friend_id = $2 and status = 'pending'", [fromId, me]);
      if (!accepted.rowCount) throw new ProcedureError("Aucune invitation en attente.", 404);
      await db.query(
        "insert into friends (user_id, friend_id, friend_pseudo, status) values ($1, $2, $3, 'accepted') " +
        "on conflict (user_id, friend_id) do update set status = 'accepted', friend_pseudo = excluded.friend_pseudo",
        [me, fromId, (await pseudoOf(db, fromId)) ?? "Joueur"]);
      return null;
    },
  },
  // Retirer un ami, refuser une invitation reçue, annuler une invitation
  // envoyée : dans les trois cas, le lien disparaît dans les deux sens.
  friend_remove: {
    auth: true,
    async run(db, me, args) {
      const other = uuidArg(args, "friend_id");
      await db.query("delete from friends where (user_id = $1 and friend_id = $2) or (user_id = $2 and friend_id = $1)", [me, other]);
      return null;
    },
  },

  // --- Notifications ----------------------------------------------------------------
  // Les 40 plus récentes, et le nombre de non lues (pour la cloche et le titre de l'onglet).
  notifications_list: {
    auth: true,
    async run(db, me) {
      const list = await db.query(
        "select id, kind, payload, created_at, read_at is not null as read from notifications where user_id = $1 order by created_at desc limit 40", [me]);
      const unread = await db.query("select count(*)::int as n from notifications where user_id = $1 and read_at is null", [me]);
      return { items: list.rows.map((r) => ({ id: Number(r.id), kind: r.kind, payload: r.payload, at: iso(r.created_at), read: r.read })), unread: unread.rows[0].n };
    },
  },
  notifications_read: {
    auth: true,
    async run(db, me) {
      await db.query("update notifications set read_at = now() where user_id = $1 and read_at is null", [me]);
      return null;
    },
  },

  // --- Salles (lecture) -----------------------------------------------------------
  // Les écritures passent par les fonctions SQL room_* ; ici, ce qu'un joueur
  // peut VOIR : ses invitations, ses salles, et l'état complet d'une salle
  // dont il est membre.
  rooms_mine: {
    auth: true,
    async run(db, me) {
      // Invitations reçues : l'hôte (pseudo, avatar) et qui est déjà dans la salle.
      const invitations = await db.query(
        "select m.room_id, coalesce(p.pseudo, 'Joueur') as from_pseudo, p.avatar as from_avatar from room_members m join rooms r on r.id = m.room_id " +
        "left join profiles p on p.user_id = m.invited_by where m.user_id = $1 and m.status = 'invited' and r.status <> 'ended' order by m.created_at desc", [me]);
      const rooms = await db.query(
        "select r.id, r.status, r.phase, r.mode, r.created_by from room_members m join rooms r on r.id = m.room_id " +
        "where m.user_id = $1 and m.status = 'joined' order by m.created_at desc", [me]);
      const roomIds = [...rooms.rows.map((r) => r.id), ...invitations.rows.map((r) => r.room_id)];
      // Chaque membre : avatar, qui l'a invité, et si son profil de départ est prêt.
      const members = roomIds.length
        ? await db.query(
          "select m.room_id, m.user_id, m.pseudo, m.status, m.invited_by, m.career_ended, m.final_score, m.final_summary, " +
          "m.starting_offers is not null as ready, p.avatar from room_members m left join profiles p on p.user_id = m.user_id " +
          "where m.room_id = any($1::uuid[]) and m.status in ('joined', 'invited') order by m.created_at", [roomIds])
        : { rows: [] as Record<string, unknown>[] };
      return {
        invitations: invitations.rows.map((r) => ({
          roomId: r.room_id, fromPseudo: r.from_pseudo, fromAvatar: r.from_avatar,
          members: members.rows.filter((m) => m.room_id === r.room_id && m.status === "joined").map((m) => ({ pseudo: m.pseudo, avatar: m.avatar })),
        })),
        rooms: rooms.rows.map((r) => ({
          id: r.id, status: r.status, phase: r.phase, mode: r.mode, isCreator: r.created_by === me, createdBy: r.created_by,
          members: members.rows.filter((m) => m.room_id === r.id),
        })),
      };
    },
  },
  room_state: {
    auth: true,
    async run(db, me, args) {
      const roomId = uuidArg(args, "room_id");
      const member = await db.query("select 1 from room_members where room_id = $1 and user_id = $2", [roomId, me]);
      if (!member.rowCount) throw new ProcedureError("Salle introuvable.", 404);
      const room = (await db.query("select * from rooms where id = $1", [roomId])).rows[0];
      const members = (await db.query(
        "select m.room_id, m.user_id, m.pseudo, m.status, m.starting_offers, m.career_ended, m.final_score, m.final_summary, m.live_stats, p.avatar " +
        "from room_members m left join profiles p on p.user_id = m.user_id where m.room_id = $1 order by m.created_at", [roomId])).rows;
      const openVote = (await db.query("select * from room_votes where room_id = $1 and status = 'open' order by opened_at desc limit 1", [roomId])).rows[0] ?? null;
      if (openVote) openVote.ballots = (await db.query("select vote_id, user_id, choice, cast_at from room_ballots where vote_id = $1", [openVote.id])).rows;
      // Dernier vote de mercato clos : son résultat dit où part l'équipe.
      const lastClosedVote = (await db.query(
        "select * from room_votes where room_id = $1 and status = 'closed' and kind in ('transfer', 'follow_relocation') order by closed_at desc limit 1", [roomId])).rows[0] ?? null;
      const progress = (await db.query("select ready from room_progress where room_id = $1 and user_id = $2", [roomId, me])).rows[0] ?? null;
      return { room, members, openVote, lastClosedVote, progress, me };
    },
  },
};
