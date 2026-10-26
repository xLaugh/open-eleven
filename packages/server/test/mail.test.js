// Parcours par e-mail : confirmation d'inscription et mot de passe oublié.
// Demande un serveur lancé AVEC l'envoi d'e-mails (SMTP_URL) vers un Mailpit,
// dont on relit la boîte par son API :
//
//   TEST_SERVER_URL=http://localhost:3000 TEST_MAILPIT_URL=http://localhost:8025 npm test
//
// Sans ces deux variables, ces tests sont ignorés.
const test = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.TEST_SERVER_URL;
const MAILPIT = process.env.TEST_MAILPIT_URL;
const ORIGIN = process.env.TEST_ORIGIN || "http://localhost:5173";
const skip = BASE && MAILPIT ? false : "TEST_SERVER_URL ou TEST_MAILPIT_URL absent";
const tag = Date.now().toString(36);

function client() {
  let cookie = "";
  // Chaque joueur de test a sa propre adresse : les limites de débit du serveur sont par
  // adresse, et toute la suite sortirait sinon de la même (127.0.0.1).
  const ip = "10." + [1, 2, 3].map(() => Math.floor(Math.random() * 250) + 1).join(".");
  const call = async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", Origin: ORIGIN, "X-Forwarded-For": ip, ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const set = res.headers.getSetCookie();
    if (set.length) cookie = set[0].split(";")[0];
    return { status: res.status, location: res.headers.get("location"), json: await res.json().catch(() => null) };
  };
  return { get: (path) => call("GET", path), post: (path, body) => call("POST", path, body ?? {}) };
}

/** Les e-mails reçus par une adresse, du plus récent au plus ancien (texte brut). */
async function inbox(email) {
  const list = await (await fetch(MAILPIT + "/api/v1/search?query=" + encodeURIComponent("to:" + email))).json();
  return Promise.all(list.messages.map(async (m) => (await (await fetch(MAILPIT + "/api/v1/message/" + m.ID)).json())));
}
async function waitForMail(email, count = 1) {
  for (let i = 0; i < 40; i++) {
    const mails = await inbox(email);
    if (mails.length >= count) return mails;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("aucun e-mail reçu par " + email);
}

test("inscription : le compte n'ouvre qu'après le lien de confirmation", { skip }, async () => {
  const c = client();
  const email = "confirme-" + tag + "@exemple.test";
  const up = await c.post("/api/auth/signup", { email, password: "mot-de-passe-seize" });
  assert.equal(up.status, 200, JSON.stringify(up.json));
  assert.equal(up.json.session, null, "pas de session avant confirmation");
  assert.equal((await c.get("/api/auth/session")).json.session, null);
  const early = await c.post("/api/auth/login", { email, password: "mot-de-passe-seize" });
  assert.match(early.json.error.message, /Email not confirmed/);

  const [mail] = await waitForMail(email);
  assert.match(mail.Subject, /confirmez/);
  assert.equal(mail.To[0].Address, email);
  const link = mail.Text.match(/https?:\/\/\S+\/api\/auth\/confirm\?token=[\w-]+/)[0];
  assert.ok(link.startsWith(ORIGIN + "/api/auth/confirm"), "le lien pointe sur l'adresse publique du jeu : " + link);

  // Renvoi : un nouveau lien part, et l'ancien ne vaut plus rien.
  assert.equal((await c.post("/api/auth/resend", { email })).status, 200);
  const mails = await waitForMail(email, 2);
  const fresh = mails[0].Text.match(/\/api\/auth\/confirm\?token=[\w-]+/)[0];
  const stale = await client().get(new URL(link).pathname + new URL(link).search);
  assert.equal(stale.status, 302);
  assert.match(stale.location, /#confirm=expired$/);

  const ok = await c.get(fresh);
  assert.equal(ok.status, 302);
  assert.equal(ok.location, ORIGIN + "/#confirmed");
  assert.equal((await c.get("/api/auth/session")).json.session.user.email, email, "le lien connecte");
  assert.match((await client().get(fresh)).location, /#confirm=expired$/, "un lien ne sert qu'une fois");
  assert.equal((await client().post("/api/auth/login", { email, password: "mot-de-passe-seize" })).status, 200);

  // Compte déjà confirmé : « renvoyer » ne renvoie rien, sans le dire.
  assert.equal((await c.post("/api/auth/resend", { email })).status, 200);
  await new Promise((r) => setTimeout(r, 400));
  assert.equal((await inbox(email)).length, 2);
});

test("inscription en double : réponse identique, le titulaire est prévenu sans rien révéler", { skip }, async () => {
  const email = "double-" + tag + "@exemple.test";
  const first = await client().post("/api/auth/signup", { email, password: "mot-de-passe-seize" });
  assert.equal(first.status, 200, JSON.stringify(first.json));
  await waitForMail(email); // le lien de confirmation

  // Même adresse (casse différente) : la réponse est EXACTEMENT celle d'une adresse neuve
  // (200, pas de session, « confirmez votre boîte ») — rien ne trahit qu'un compte existe.
  const dup = await client().post("/api/auth/signup", { email: email.toUpperCase(), password: "un-autre-mot-de-passe" });
  assert.equal(dup.status, 200, JSON.stringify(dup.json));
  assert.deepEqual(dup.json, first.json, "réponse indiscernable d'une inscription neuve");

  // Le titulaire reçoit un e-mail « vous avez déjà un compte » (et aucun second compte n'est créé).
  const mails = await waitForMail(email, 2);
  assert.match(mails[0].Subject, /déjà un compte/);
  assert.equal((await client().post("/api/auth/login", { email, password: "un-autre-mot-de-passe" })).status, 400, "le mot de passe de la tentative ne marche pas");
});

test("mot de passe oublié : le lien permet d'en choisir un nouveau, une seule fois", { skip }, async () => {
  const email = "oubli-" + tag + "@exemple.test";
  const owner = client();
  await owner.post("/api/auth/signup", { email, password: "ancien-mot-de-passe-1" });
  const confirm = (await waitForMail(email))[0].Text.match(/\/api\/auth\/confirm\?token=[\w-]+/)[0];
  await owner.get(confirm);
  assert.ok((await owner.get("/api/auth/session")).json.session);

  // Adresse inconnue : même réponse, aucun e-mail.
  const ghost = "personne-" + tag + "@exemple.test";
  assert.equal((await client().post("/api/auth/forgot", { email: ghost })).status, 200);

  const c = client();
  assert.equal((await c.post("/api/auth/forgot", { email: email.toUpperCase() })).status, 200);
  const mail = (await waitForMail(email, 2))[0];
  assert.match(mail.Subject, /nouveau mot de passe/);
  const link = mail.Text.match(/https?:\/\/\S+#type=recovery&token=[\w-]+/)[0];
  assert.ok(link.startsWith(ORIGIN + "/#type=recovery"), link);
  const token = link.split("token=")[1];
  assert.equal((await inbox(ghost)).length, 0);

  const rec = await c.post("/api/auth/recover", { token });
  assert.equal(rec.status, 200, JSON.stringify(rec.json));
  assert.equal(rec.json.session.recovery, true);
  assert.equal((await client().post("/api/auth/recover", { token })).status, 400, "un lien ne sert qu'une fois");
  // Session de récupération : l'ancien mot de passe n'est pas demandé.
  const changed = await c.post("/api/auth/password", { password: "nouveau-mot-de-passe-2" });
  assert.equal(changed.status, 200, JSON.stringify(changed.json));
  assert.equal(changed.json.session.recovery, false);
  // …mais une fois le mot de passe choisi, la session redevient ordinaire.
  assert.equal((await c.post("/api/auth/password", { password: "encore-un-mot-de-passe-3" })).status, 400);

  assert.equal((await owner.get("/api/auth/session")).json.session, null, "les autres appareils sont déconnectés");
  assert.equal((await client().post("/api/auth/login", { email, password: "ancien-mot-de-passe-1" })).status, 400);
  assert.equal((await client().post("/api/auth/login", { email, password: "nouveau-mot-de-passe-2" })).status, 200);
});

test("mot de passe oublié : au plus 5 e-mails par adresse et par heure, sans rien révéler", { skip }, async () => {
  const email = "plafond-" + tag + "@exemple.test";
  assert.equal((await client().post("/api/auth/signup", { email, password: "mot-de-passe-seize" })).status, 200);
  // Huit demandes, depuis huit adresses différentes (le plafond visé est celui du destinataire).
  const statuses = [];
  for (let i = 0; i < 8; i++) statuses.push((await client().post("/api/auth/forgot", { email })).status);
  assert.deepEqual(statuses, Array(8).fill(200), "la réponse est identique, plafond atteint ou non");
  await new Promise((r) => setTimeout(r, 1200));
  const recoveries = (await inbox(email)).filter((m) => /nouveau mot de passe/.test(m.Subject));
  assert.equal(recoveries.length, 5, "pas plus de cinq e-mails : le serveur n'est pas un robot à spam");
});
