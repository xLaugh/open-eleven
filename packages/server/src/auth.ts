// Comptes : inscription, connexion, sessions, mot de passe.
//
// Une session est un jeton aléatoire posé dans un cookie HttpOnly — invisible
// du JavaScript de la page. La base n'en garde que l'empreinte : une fuite de
// la table sessions ne permet pas de se connecter.
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config, mailEnabled } from "./config";
import { pool } from "./db";
import { limits } from "./limits";
import { sendAlreadyRegistered, sendConfirmation, sendRecovery } from "./mail";

const COOKIE = "oe_session";
const HASH_COST = 12;
// Comparé quand l'e-mail est inconnu, pour que la réponse prenne le même temps
// que pour un compte existant.
const DUMMY_HASH = bcrypt.hashSync("open-eleven", HASH_COST);

export interface SessionUser { id: string; email: string; recovery: boolean; }

const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");
const newToken = (): string => randomBytes(32).toString("base64url");
const looksLikeEmail = (v: string): boolean => /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;

class AuthError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

// --- Limites de débit ---------------------------------------------------------
// Voir limits.ts pour le raisonnement. `general` borne tous les appels d'une adresse
// (large : un réseau partagé en émet beaucoup) ; les autres visent un abus précis.
function general(req: FastifyRequest): void {
  if (!limits.ip.hit(req.ip)) throw new AuthError("rate limit", 429);
}

// --- Sessions ------------------------------------------------------------------

async function openSession(reply: FastifyReply, userId: string, recovery = false): Promise<void> {
  const token = newToken();
  // Une session « mot de passe oublié » permet d'en changer sans donner l'ancien :
  // elle ne vit que le temps de le faire.
  const hours = recovery ? 1 : config.sessionDays * 24;
  await pool.query(
    "insert into sessions (token_hash, user_id, recovery, expires_at) values ($1, $2, $3, now() + make_interval(hours => $4))",
    [sha256(token), userId, recovery, hours],
  );
  reply.setCookie(COOKIE, token, {
    path: "/", httpOnly: true, sameSite: "lax", secure: config.secureCookie, maxAge: hours * 3600,
  });
}

/** L'utilisateur de la requête, d'après son cookie de session ; null sinon. */
export async function currentUser(req: FastifyRequest): Promise<SessionUser | null> {
  const token = req.cookies[COOKIE];
  if (!token) return null;
  const { rows } = await pool.query(
    "select u.id, u.email, s.recovery from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()",
    [sha256(token)],
  );
  return rows[0] ?? null;
}

async function emailToken(userId: string, kind: "confirm" | "recovery", hours: number): Promise<string> {
  const token = newToken();
  await pool.query("delete from email_tokens where user_id = $1 and kind = $2", [userId, kind]);
  await pool.query(
    "insert into email_tokens (token_hash, user_id, kind, expires_at) values ($1, $2, $3, now() + make_interval(hours => $4))",
    [sha256(token), userId, kind, hours],
  );
  return token;
}

/** Consomme un jeton d'e-mail (usage unique) ; renvoie l'utilisateur ou null. */
async function consumeEmailToken(token: string, kind: "confirm" | "recovery"): Promise<string | null> {
  const { rows } = await pool.query(
    "delete from email_tokens where token_hash = $1 and kind = $2 and expires_at > now() returning user_id",
    [sha256(String(token || "")), kind],
  );
  if (!rows[0]) return null;
  // Avoir reçu l'e-mail prouve l'adresse, quel que soit le lien suivi.
  await pool.query("update users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1", [rows[0].user_id]);
  return rows[0].user_id;
}

const sessionBody = (u: SessionUser | null) => ({ session: u ? { user: { id: u.id, email: u.email }, recovery: u.recovery } : null });

// --- Routes --------------------------------------------------------------------

export function registerAuth(app: FastifyInstance): void {
  const credentials = (req: FastifyRequest) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    return { email: String(body.email ?? "").trim(), password: String(body.password ?? "") };
  };
  // Les messages d'erreur reprennent ceux que l'interface sait déjà traduire.
  const guard = (handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>) =>
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        return await handler(req, reply);
      } catch (err) {
        if (err instanceof AuthError) return reply.code(err.status).send({ error: { message: err.message } });
        throw err;
      }
    };

  app.get("/api/auth/session", async (req) => sessionBody(await currentUser(req)));

  app.post("/api/auth/signup", guard(async (req, reply) => {
    general(req);
    const { email, password } = credentials(req);
    if (!looksLikeEmail(email)) throw new AuthError("Adresse e-mail invalide.");
    if (!limits.signups.hit(req.ip)) throw new AuthError("rate limit", 429);
    if (password.length < 16 || password.length > 200) throw new AuthError("Mot de passe : 16 caractères minimum.");
    const hash = await bcrypt.hash(password, HASH_COST);
    let userId: string;
    try {
      const { rows } = await pool.query(
        "insert into users (email, password_hash, email_confirmed_at) values ($1, $2, $3) returning id",
        [email, hash, mailEnabled() ? null : new Date()],
      );
      userId = rows[0].id;
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        // Adresse déjà prise. Sans e-mails (mode local), on ne peut pas faire autrement
        // que de le dire. Avec e-mails, on répond EXACTEMENT comme pour une adresse neuve
        // (« vérifiez votre boîte ») et on prévient le titulaire par e-mail : impossible,
        // depuis la réponse, de savoir si un compte existe.
        if (!mailEnabled()) throw new AuthError("User already registered", 409);
        sendAlreadyRegistered(email).catch(() => {});
        return { session: null, confirmation: true };
      }
      throw err;
    }
    if (!mailEnabled()) {
      await openSession(reply, userId);
      return sessionBody({ id: userId, email, recovery: false });
    }
    await sendConfirmation(email, await emailToken(userId, "confirm", 48));
    return { session: null, confirmation: true };
  }));

  app.post("/api/auth/login", guard(async (req, reply) => {
    general(req);
    const { email, password } = credentials(req);
    // Seuls les ÉCHECS comptent, par couple (adresse, compte) : on bloque ici AVANT le
    // hachage, qui coûte cher. Un succès remet le compteur à zéro.
    const failKey = req.ip + "|" + email.toLowerCase();
    if (limits.loginFailures.blocked(failKey)) throw new AuthError("rate limit", 429);
    const { rows } = await pool.query("select id, email, password_hash, email_confirmed_at from users where lower(email) = lower($1)", [email]);
    const user = rows[0];
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok) {
      limits.loginFailures.hit(failKey);
      throw new AuthError("Invalid login credentials");
    }
    limits.loginFailures.clear(failKey);
    if (!user.email_confirmed_at) throw new AuthError("Email not confirmed");
    await openSession(reply, user.id);
    return sessionBody({ id: user.id, email: user.email, recovery: false });
  }));

  app.post("/api/auth/logout", async (req, reply) => {
    const token = req.cookies[COOKIE];
    if (token) await pool.query("delete from sessions where token_hash = $1", [sha256(token)]);
    reply.clearCookie(COOKIE, { path: "/" });
    return { ok: true };
  });

  app.post("/api/auth/resend", guard(async (req) => {
    general(req);
    if (!mailEnabled()) throw new AuthError("Les e-mails ne sont pas configurés sur ce serveur.", 501);
    const { email } = credentials(req);
    if (!limits.mailPerIp.hit(req.ip)) throw new AuthError("rate limit", 429);
    // Trop de demandes pour CETTE adresse : même réponse, sans rien envoyer (on ne
    // révèle rien, et personne ne peut en inonder un autre).
    if (!limits.mailPerAccount.hit(email.toLowerCase())) return { ok: true };
    const { rows } = await pool.query("select id, email from users where lower(email) = lower($1) and email_confirmed_at is null", [email]);
    if (rows[0]) await sendConfirmation(rows[0].email, await emailToken(rows[0].id, "confirm", 48));
    return { ok: true }; // même réponse que le compte existe ou non
  }));

  app.post("/api/auth/forgot", guard(async (req) => {
    general(req);
    if (!mailEnabled()) throw new AuthError("Les e-mails ne sont pas configurés sur ce serveur.", 501);
    const { email } = credentials(req);
    if (!limits.mailPerIp.hit(req.ip)) throw new AuthError("rate limit", 429);
    if (!limits.mailPerAccount.hit(email.toLowerCase())) return { ok: true };
    const { rows } = await pool.query("select id, email from users where lower(email) = lower($1)", [email]);
    if (rows[0]) await sendRecovery(rows[0].email, await emailToken(rows[0].id, "recovery", 1));
    return { ok: true };
  }));

  // Lien « mot de passe oublié » : ouvre une session qui autorise à choisir un
  // nouveau mot de passe sans donner l'ancien.
  app.post("/api/auth/recover", guard(async (req, reply) => {
    general(req);
    const userId = await consumeEmailToken(String((req.body as Record<string, unknown> | null)?.token ?? ""), "recovery");
    if (!userId) throw new AuthError("Lien expiré ou déjà utilisé.");
    await openSession(reply, userId, true);
    const { rows } = await pool.query("select email from users where id = $1", [userId]);
    return sessionBody({ id: userId, email: rows[0].email, recovery: true });
  }));

  app.post("/api/auth/password", guard(async (req, reply) => {
    general(req);
    const user = await currentUser(req);
    if (!user) throw new AuthError("Non authentifié", 401);
    // Qui tient une session volée essaie de deviner le mot de passe actuel : mêmes échecs comptés.
    const failKey = req.ip + "|" + user.id;
    if (!user.recovery && limits.loginFailures.blocked(failKey)) throw new AuthError("rate limit", 429);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const password = String(body.password ?? "");
    if (password.length < 16 || password.length > 200) throw new AuthError("Mot de passe : 16 caractères minimum.");
    if (!user.recovery) {
      const { rows } = await pool.query("select password_hash from users where id = $1", [user.id]);
      if (!(await bcrypt.compare(String(body.current ?? ""), rows[0].password_hash))) {
        limits.loginFailures.hit(failKey);
        throw new AuthError("Mot de passe actuel incorrect.");
      }
      limits.loginFailures.clear(failKey);
    }
    await pool.query("update users set password_hash = $2 where id = $1", [user.id, await bcrypt.hash(password, HASH_COST)]);
    // Toutes les sessions tombent, celle-ci comprise, puis on en rouvre une :
    // un appareil resté connecté avec l'ancien mot de passe ne le reste pas.
    await pool.query("delete from sessions where user_id = $1", [user.id]);
    await openSession(reply, user.id);
    return sessionBody({ ...user, recovery: false });
  }));

  // Lien de confirmation d'inscription : active le compte, connecte, renvoie au jeu.
  app.get("/api/auth/confirm", async (req, reply) => {
    const userId = await consumeEmailToken(String((req.query as Record<string, unknown>).token ?? ""), "confirm");
    if (userId) await openSession(reply, userId);
    // Le fragment dit à l'interface ce qui vient de se passer : une connexion
    // toute neuve (elle synchronise alors la sauvegarde), ou un lien périmé.
    return reply.redirect(config.publicUrl + "/" + (userId ? "#confirmed" : "#confirm=expired"));
  });
}

/** Ménage périodique des sessions, jetons expirés et vieilles notifications. */
export async function purgeExpired(): Promise<void> {
  await pool.query("delete from sessions where expires_at < now()");
  await pool.query("delete from email_tokens where expires_at < now()");
  // Notifications : un mois d'historique suffit.
  await pool.query("delete from notifications where created_at < now() - interval '30 days'");
}
