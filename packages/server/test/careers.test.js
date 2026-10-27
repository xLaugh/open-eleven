// Historique des carrières du compte : ajout sans doublon, pages, plafond de 1000
// (favorites gardées), suppression définitive, et chacun ne voit que les siennes.
//
//   TEST_SERVER_URL=http://localhost:3000 npm test
const test = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.TEST_SERVER_URL;
const ORIGIN = process.env.TEST_ORIGIN || "http://localhost:5173";
const skip = BASE ? false : "TEST_SERVER_URL absent";
const tag = Date.now().toString(36);

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
  const up = await c.post("/api/auth/signup", { email: "car-" + name + "-" + tag + "@exemple.test", password: "mot-de-passe-long-" + name });
  assert.equal(up.status, 200, JSON.stringify(up.json));
  return c;
}
/** Une carrière minimale, telle que l'envoie le jeu. */
const career = (id, extra = {}) => ({
  clientId: id, mode: "career", score: 100,
  summary: { name: "Joueur " + id, title: "Légende", natId: "fr", natFlag: "🇫🇷", posIcon: "⚽", peakOvr: 80, money: 12, trophies: { league: 2 } },
  data: { name: "Joueur " + id, seasons: [] },
  ...extra,
});
const batches = (items, n = 20) => Array.from({ length: Math.ceil(items.length / n) }, (_, i) => items.slice(i * n, i * n + n));

test("carrières : ajout, sans doublon, liste et fiche complète", { skip }, async () => {
  const a = await player("ajout");
  const r = await a.rpc("careers_add", { items: [career("a1", { playedAt: "2026-01-01T10:00:00.000Z" }), career("a2", { mode: "daily", playedAt: "2026-01-02T10:00:00.000Z" })] });
  assert.equal(r.status, 200, JSON.stringify(r));
  assert.deepEqual(r.data, { added: 2, total: 2 });
  // Renvoi (réseau coupé, second appareil) : rien ne double.
  assert.deepEqual((await a.rpc("careers_add", { items: [career("a1")] })).data, { added: 0, total: 2 });

  const list = (await a.rpc("careers_list")).data;
  assert.equal(list.total, 2);
  assert.equal(list.max, 1000);
  assert.deepEqual(list.items.map((x) => x.summary.name), ["Joueur a2", "Joueur a1"], "la plus récente d'abord");
  assert.equal(list.items[0].mode, "daily");
  assert.equal(list.items[0].playedAt, "2026-01-02T10:00:00.000Z");
  assert.equal(list.items[0].data, undefined, "la liste ne transporte pas les carrières entières");
  assert.deepEqual((await a.rpc("careers_list", { mode: "daily" })).data.items.map((x) => x.summary.name), ["Joueur a2"]);

  const full = await a.rpc("careers_get", { id: list.items[1].id });
  assert.deepEqual(full.data, { name: "Joueur a1", seasons: [] });
});

test("carrières : le résumé est recopié champ par champ, borné", { skip }, async () => {
  const a = await player("resume");
  const long = "x".repeat(500);
  await a.rpc("careers_add", { items: [career("r1", { summary: { name: long, title: long, trophies: { league: 3, "<img>": 1, cup: -2, ballon: 1.5 }, intrus: "non" } })] });
  const s = (await a.rpc("careers_list")).data.items[0].summary;
  assert.equal(s.name.length, 40);
  assert.equal(s.title.length, 80);
  assert.deepEqual(s.trophies, { league: 3 }, "seules les clés et valeurs plausibles passent");
  assert.equal(s.intrus, undefined);
});

test("carrières : envois refusés", { skip }, async () => {
  const a = await player("refus");
  assert.equal((await a.rpc("careers_add", { items: [] })).status, 400);
  assert.equal((await a.rpc("careers_add", { items: Array.from({ length: 21 }, (_, i) => career("t" + i)) })).status, 400, "20 par envoi au plus");
  assert.equal((await a.rpc("careers_add", { items: [career("m", { mode: "pirate" })] })).status, 400);
  assert.equal((await a.rpc("careers_add", { items: [career("bad id!")] })).status, 400);
  assert.equal((await a.rpc("careers_add", { items: [career("lourd", { data: { blob: "x".repeat(140 * 1024) } })] })).status, 413);
  assert.equal((await client().rpc("careers_list")).status, 401, "sans compte : rien");
  assert.equal((await a.rpc("careers_list")).data.total, 0, "un envoi refusé n'écrit rien");
});

test("carrières : pages sans trou ni doublon, même à la milliseconde près", { skip }, async () => {
  const a = await player("pages");
  // Sans date fournie, tout un envoi partage la même heure : le curseur doit départager par id.
  for (const b of batches(Array.from({ length: 25 }, (_, i) => career("p" + i, { playedAt: undefined })))) {
    assert.equal((await a.rpc("careers_add", { items: b })).status, 200);
  }
  const seen = [];
  let before;
  for (let page = 0; page < 5; page++) {
    const r = (await a.rpc("careers_list", { limit: 10, ...(before ? { before } : {}) })).data;
    seen.push(...r.items.map((x) => x.id));
    if (!r.hasMore) break;
    const last = r.items[r.items.length - 1];
    before = { at: last.playedAt, id: last.id };
  }
  assert.equal(seen.length, 25);
  assert.equal(new Set(seen).size, 25);
});

test("carrières : au-delà de 1000, les plus anciennes partent, les favorites restent", { skip }, async () => {
  const a = await player("plafond");
  const at = (i) => new Date(Date.UTC(2025, 0, 1) + i * 60000).toISOString();
  // La toute première carrière est mise en favorite avant le reste.
  await a.rpc("careers_add", { items: [career("f0", { playedAt: at(0) })] });
  const first = (await a.rpc("careers_list")).data.items[0];
  assert.equal((await a.rpc("careers_favorite", { id: first.id, favorite: true })).status, 200);

  const rest = Array.from({ length: 1009 }, (_, i) => career("c" + (i + 1), { playedAt: at(i + 1) }));
  let last;
  for (const b of batches(rest)) last = await a.rpc("careers_add", { items: b });
  assert.equal(last.data.total, 1000, "plafond tenu");

  const list = (await a.rpc("careers_list", { limit: 50 })).data;
  assert.equal(list.total, 1000);
  assert.equal(list.favorites, 1);
  assert.equal(list.items[0].summary.name, "Joueur c1009", "la plus récente est là");
  const favs = (await a.rpc("careers_list", { favorites: true })).data.items;
  assert.deepEqual(favs.map((x) => x.id), [first.id], "la favorite, la plus ancienne de toutes, est restée");
  // 1010 envoyées, 1000 gardées : la favorite + les 999 plus récentes. c1…c10 sont parties.
  // Tout ce qui est strictement antérieur à c12 (même heure + plus petit identifiant possible).
  const oldest = (await a.rpc("careers_list", { before: { at: at(12), id: "00000000-0000-0000-0000-000000000000" }, limit: 50 })).data.items;
  assert.deepEqual(oldest.map((x) => x.summary.name), ["Joueur c11", "Joueur f0"]);
});

test("carrières : supprimée, elle ne revient pas ; chacun ne touche qu'aux siennes", { skip }, async () => {
  const a = await player("suppr");
  const b = await player("intrus");
  await a.rpc("careers_add", { items: [career("s1"), career("s2")] });
  const [c1] = (await a.rpc("careers_list")).data.items;

  // L'intrus ne peut ni lire, ni marquer, ni supprimer la carrière d'un autre.
  assert.equal((await b.rpc("careers_get", { id: c1.id })).status, 404);
  assert.equal((await b.rpc("careers_favorite", { id: c1.id, favorite: true })).status, 404);
  assert.equal((await b.rpc("careers_delete", { id: c1.id })).status, 404);
  assert.equal((await b.rpc("careers_list")).data.total, 0);

  assert.equal((await a.rpc("careers_delete", { id: c1.id })).status, 200);
  assert.equal((await a.rpc("careers_get", { id: c1.id })).status, 404);
  // Un autre appareil la renvoie depuis son Panthéon : elle ne réapparaît pas.
  const again = await a.rpc("careers_add", { items: [career(c1.summary.name.replace("Joueur ", ""))] });
  assert.deepEqual(again.data, { added: 0, total: 1 });
  // Le même identifiant reste libre pour un autre compte.
  assert.deepEqual((await b.rpc("careers_add", { items: [career("s1")] })).data, { added: 1, total: 1 });
});
