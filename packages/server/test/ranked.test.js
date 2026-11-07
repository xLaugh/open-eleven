// Ranked : la première partie du défi du jour est classée (jeton), les étoiles sont
// recalculées par le serveur, une seconde partie ne compte pas, une partie abandonnée
// est soldée à 0 étoile au départ suivant, et le classement de la saison se lit sans compte.
//
//   TEST_SERVER_URL=http://localhost:3000 npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadEngine } = require("../../engine/test/load-engine");

const BASE = process.env.TEST_SERVER_URL;
const ORIGIN = process.env.TEST_ORIGIN || "http://localhost:5173";
const skip = BASE ? false : "TEST_SERVER_URL absent";
const tag = Date.now().toString(36);
const E = BASE ? loadEngine() : null;
const day = (offset = 0) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };

function client() {
  let cookie = "";
  const ip = "10." + [1, 2, 3].map(() => Math.floor(Math.random() * 250) + 1).join(".");
  const call = async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", Origin: ORIGIN, "X-Forwarded-For": ip, ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie();
    if (set.length) cookie = set[0].split(";")[0];
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { status: res.status, json };
  };
  return {
    post: (path, body) => call("POST", path, body ?? {}),
    rpc: async (name, args) => { const r = await call("POST", "/api/rpc/" + name, args ?? {}); return { status: r.status, ...(r.json || {}) }; },
  };
}
async function player(name) {
  const c = client();
  const up = await c.post("/api/auth/signup", { email: "rk-" + name + "-" + tag + "@exemple.test", password: "mot-de-passe-long-" + name });
  assert.equal(up.status, 200, JSON.stringify(up.json));
  const ps = await c.rpc("profile_set_pseudo", { pseudo: ("rk" + name + tag).slice(0, 24) });
  assert.equal(ps.status, 200, JSON.stringify(ps));
  return c;
}
// Le serveur impose 8 s entre deux envois du même défi (cf. scores.ts).
const pause = () => new Promise((r) => setTimeout(r, 8500));
const choices = (k) => Array.from({ length: 400 }, (_, i) => (i * 7 + k) % 3);

test("ranked : première partie classée, étoiles recalculées, seconde partie hors rang", { skip, timeout: 60000 }, async () => {
  const a = await player("un");
  const date = day();
  const v = E.ENGINE_VERSION;
  const start = await a.post("/api/ranked/start", { date, v });
  assert.equal(start.status, 200, JSON.stringify(start.json));
  assert.equal(start.json.ranked, true);
  assert.match(start.json.token, /^[0-9a-f-]{36}$/);
  // Un second départ le même jour n'est pas classé.
  const again = await a.post("/api/ranked/start", { date, v });
  assert.deepEqual([again.json.ranked, again.json.reason], [false, "already"]);

  // Jeton faux : score enregistré, aucun effet sur le rang.
  const bad = await a.post("/api/scores/daily", { date, choices: choices(1), v, rankedToken: "00000000-0000-0000-0000-000000000000" });
  assert.equal(bad.status, 200, JSON.stringify(bad.json));
  assert.equal(bad.json.ranked, null);

  await pause();
  const done = await a.post("/api/scores/daily", { date, choices: choices(2), v, rankedToken: start.json.token });
  assert.equal(done.status, 200, JSON.stringify(done.json));
  const stars = E.starsDaily(date, choices(2));
  assert.equal(done.json.ranked.stars, stars, "les étoiles viennent du rejeu serveur");
  assert.equal(done.json.ranked.after.tier, 0);
  assert.equal(done.json.ranked.after.points, [0, 2, 4, 6][stars]);
  // Le même jeton ne sert qu'une fois.
  await pause();
  const twice = await a.post("/api/scores/daily", { date, choices: choices(0), v, rankedToken: start.json.token });
  assert.equal(twice.json.ranked, null);

  const me = (await a.rpc("ranked_me")).data;
  assert.equal(me.unranked, false);
  assert.equal(me.days[0].date, date);
  assert.equal(me.days[0].status, "done");
  assert.equal(me.days[0].stars, stars);
  assert.equal(me.points, [0, 2, 4, 6][stars]);

  // Classement de la saison : public, le joueur y figure avec son pseudo.
  const top = (await client().rpc("ranked_top", { limit: 100 })).data;
  assert.equal(top.season, date.slice(0, 7));
  assert.ok(top.items.some((x) => x.pseudo === ("rkun" + tag).slice(0, 24)));
});

test("ranked : une partie classée abandonnée compte 0 étoile au départ suivant", { skip }, async () => {
  const b = await player("deux");
  const v = E.ENGINE_VERSION;
  const hier = await b.post("/api/ranked/start", { date: day(-1), v });
  assert.equal(hier.json.ranked, true);
  const auj = await b.post("/api/ranked/start", { date: day(), v });
  assert.equal(auj.json.ranked, true);
  const me = (await b.rpc("ranked_me")).data;
  const yesterday = me.days.find((d) => d.date === day(-1));
  assert.equal(yesterday.status, "forfeit");
  assert.equal(yesterday.stars, 0);
  assert.equal(me.days.find((d) => d.date === day()).status, "started");
  // Un jour plus ancien que le dernier classé n'est plus jouable en ranked.
  const old = await b.post("/api/ranked/start", { date: day(-1), v });
  assert.equal(old.json.ranked, false);
});

test("ranked : sans compte, pas de départ classé ; date trop ancienne refusée", { skip }, async () => {
  const anon = await client().post("/api/ranked/start", { date: day() });
  assert.equal(anon.status, 401);
  const c = await player("trois");
  const old = await c.post("/api/ranked/start", { date: day(-5), v: E.ENGINE_VERSION });
  assert.deepEqual([old.json.ranked, old.json.reason], [false, "date"]);
});
