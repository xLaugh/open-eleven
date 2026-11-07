// Serveur d'Open Eleven : comptes, sauvegardes, classements vérifiés, amis,
// duels et salles. Tout est servi sous /api ; les pages du jeu, elles, sont
// des fichiers statiques servis à côté (Vite en développement, Caddy en
// production).
import { join } from "node:path";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { Engine } from "@open-eleven/engine";
import { purgeExpired, registerAuth } from "./auth";
import { config, mailEnabled } from "./config";
import { migrate, pool, waitForDb } from "./db";
import { registerLive } from "./live";
import { registerRpc } from "./rpc";
import { registerScores } from "./scores";
import { registerRanked } from "./ranked";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info" },
  bodyLimit: 8 * 1024 * 1024, // une sauvegarde complète (Panthéon compris) pèse quelques Mo
  // Derrière Caddy, l'adresse du joueur est dans X-Forwarded-For. On ne croit cet en-tête
  // que venant d'un proxy local (Caddy sur le réseau Docker, Vite en développement) :
  // sinon n'importe qui choisirait son adresse et contournerait les limites de débit.
  trustProxy: "loopback, uniquelocal",
});

await app.register(cookie);
await app.register(websocket);

// Le cookie de session est « SameSite=Lax » : un autre site ne peut pas le
// faire envoyer avec un POST. On refuse en plus toute écriture dont l'origine
// annoncée n'est pas celle du jeu.
app.addHook("onRequest", async (req, reply) => {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.origin;
  if (origin && origin !== config.publicUrl) return reply.code(403).send({ error: { message: "Origine refusée" } });
});

app.get("/api/health", async () => {
  await pool.query("select 1");
  return { ok: true, engine: Engine.ENGINE_VERSION, mail: mailEnabled() };
});

registerAuth(app);
registerRpc(app);
registerScores(app);
registerRanked(app);
registerLive(app);

await waitForDb();
const applied = await migrate(process.env.MIGRATIONS_DIR ?? join(import.meta.dirname, "..", "migrations"));
if (applied.length) app.log.info({ applied }, "migrations appliquées");

setInterval(() => purgeExpired().catch((err) => app.log.error(err)), 6 * 60 * 60 * 1000).unref();

await app.listen({ port: config.port, host: config.host });
app.log.info("moteur " + Engine.ENGINE_VERSION + " · e-mails " + (mailEnabled() ? "activés" : "désactivés (comptes actifs dès l'inscription)"));

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => { app.close().then(() => pool.end()).finally(() => process.exit(0)); });
}
