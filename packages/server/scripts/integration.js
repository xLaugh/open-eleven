// Tests d'intégration du serveur : de vraies requêtes HTTP sur de vrais serveurs lancés
// contre une vraie base Postgres.
//
//   DATABASE_URL=postgres://… npm run test:server
//   DATABASE_URL=postgres://… MAILPIT_URL=http://localhost:8025 SMTP_URL=smtp://localhost:1025 npm run test:server
//
// Deux serveurs partagent la base :
//   • l'un SANS e-mails (un compte est actif dès l'inscription) — comptes, sauvegardes,
//     amis, scores vérifiés, duels, salles, historique des carrières, limites de débit ;
//   • l'autre AVEC e-mails, vers un Mailpit — confirmation d'inscription, mot de passe
//     oublié, plafonds d'envoi. Ignoré si MAILPIT_URL est absent.
// Les tests créent leurs propres comptes (noms uniques) : la base n'a pas à être vide.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..", "..");
const entry = join(root, "dist", "server.js");
const databaseUrl = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/openeleven";
const mailpit = process.env.MAILPIT_URL;
const smtp = process.env.SMTP_URL ?? "smtp://localhost:1025";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(entry)) {
  console.error("Le serveur n'est pas assemblé : lancez « npm run build » d'abord.");
  process.exit(2);
}

const children = [];
function startServer(port, env) {
  const child = spawn(process.execPath, [entry], {
    env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(port), HOST: "127.0.0.1", LOG_LEVEL: "error", ...env },
    stdio: ["ignore", "inherit", "inherit"],
  });
  children.push(child);
  return child;
}
async function waitHealthy(url) {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url + "/api/health")).ok) return; } catch { /* pas encore prêt */ }
    await wait(500);
  }
  throw new Error("le serveur ne répond pas : " + url);
}
function run(files, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--test", ...files.map((f) => join(root, "test", f))], { env: { ...process.env, ...env }, stdio: "inherit", cwd: repo });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

let status = 0;
try {
  startServer(3101, { SMTP_URL: "" });
  if (mailpit) startServer(3102, { SMTP_URL: smtp });
  await waitHealthy("http://127.0.0.1:3101");
  if (mailpit) await waitHealthy("http://127.0.0.1:3102");

  status ||= await run(["api.test.js", "rooms.test.js", "limits.test.js", "notifications.test.js", "careers.test.js"], { TEST_SERVER_URL: "http://127.0.0.1:3101" });
  if (mailpit) status ||= await run(["mail.test.js"], { TEST_SERVER_URL: "http://127.0.0.1:3102", TEST_MAILPIT_URL: mailpit });
  else console.log("\nTests d'e-mails ignorés : MAILPIT_URL n'est pas renseigné.");
} finally {
  for (const c of children) c.kill();
  await wait(300);
}
process.exit(status);
