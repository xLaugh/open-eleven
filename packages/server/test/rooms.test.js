// Salles : la barrière de fin de saison face aux votes pris EN COURS de saison.
// Demande un serveur lancé sur une base vide (ignoré sans TEST_SERVER_URL).
//
// Cas qui faisaient avancer un joueur d'une saison sur l'autre :
//   1. un membre attend déjà à la barrière, un autre ouvre un vote de transfert en
//      cours de saison : sa clôture ne doit ni libérer le premier, ni avancer l'année ;
//   2. un bilan de fin de saison rendu PENDANT un vote doit être conservé ;
//   3. le vote de la barrière, lui, avance l'année et fait suivre le club à l'équipe.
const test = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.TEST_SERVER_URL;
const ORIGIN = process.env.TEST_ORIGIN || "http://localhost:5173";
const skip = BASE ? false : "TEST_SERVER_URL absent";
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
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  return {
    post: (path, body) => call("POST", path, body ?? {}),
    rpc: async (name, args) => { const r = await call("POST", "/api/rpc/" + name, args ?? {}); return { status: r.status, ...(r.json || {}) }; },
  };
}
async function player(name) {
  const c = client();
  const up = await c.post("/api/auth/signup", { email: name + "-" + tag + "@exemple.test", password: "mot-de-passe-long-" + name });
  assert.equal(up.status, 200, JSON.stringify(up.json));
  c.id = up.json.session.user.id;
  const set = await c.rpc("profile_set_pseudo", { pseudo: (name + tag).slice(0, 24) });
  assert.equal(set.status, 200, JSON.stringify(set));
  return c;
}
/** Deux amis réunis dans une salle lancée au club « fr_paris ». */
async function launchedRoom(prefix) {
  const a = await player(prefix + "a"), b = await player(prefix + "b");
  await a.rpc("friend_request", { friend_id: b.id });
  await b.rpc("friend_accept", { from_id: a.id });
  const roomId = (await a.rpc("room_create")).data;
  await a.rpc("room_invite", { p_room_id: roomId, p_friend_id: b.id });
  await b.rpc("room_join", { p_room_id: roomId });
  assert.equal((await a.rpc("room_launch", { p_room_id: roomId, p_club_id: "fr_paris" })).status, 200);
  const state = async (p = a) => (await p.rpc("room_state", { room_id: roomId })).data;
  return { a, b, roomId, state };
}
const noOffer = (roomId) => ({ p_room_id: roomId, p_pending_offer: { offers: [] }, p_club_trophies: [] });
const season = (st) => st.room.season_year || 0;

test("un vote pris en cours de saison ne libère pas celui qui attend à la barrière", { skip }, async () => {
  const { a, b, roomId, state } = await launchedRoom("rb1");
  // A a fini sa saison et attend.
  await a.rpc("room_report_season", noOffer(roomId));
  assert.equal((await state()).progress.ready, true);
  // B, en pleine saison, reçoit une offre : vote de la salle.
  await b.rpc("room_open_transfer_vote", { p_room_id: roomId, p_offers: ["it_milan"], p_forced: false });
  let st = await state();
  assert.equal(st.room.phase, "season_vote");
  assert.equal(st.openVote.barrier, false, "un vote en cours de saison n'est pas un vote de barrière");
  await a.rpc("room_cast_vote", { p_vote_id: st.openVote.id, p_choice: "it_milan" });
  await b.rpc("room_cast_vote", { p_vote_id: st.openVote.id, p_choice: "it_milan" });
  st = await state();
  assert.equal(st.openVote, null);
  assert.equal(st.room.phase, "in_season", "la saison reprend");
  assert.equal(season(st), 0, "l'année de la salle n'a pas bougé");
  assert.equal(st.progress.ready, true, "le bilan de A est conservé : il attend toujours");
  assert.equal(st.room.club_id, "it_milan", "le club de l'équipe suit la décision");
  // B finit sa saison à son tour : la barrière se franchit, une seule fois.
  await b.rpc("room_report_season", noOffer(roomId));
  st = await state();
  assert.equal(season(st), 1);
  assert.equal(st.progress.ready, false);
  assert.equal((await state(b)).progress.ready, false);
});

test("un bilan rendu pendant un vote est conservé, et la barrière s'évalue à la clôture", { skip }, async () => {
  const { a, b, roomId, state } = await launchedRoom("rb2");
  await b.rpc("room_open_transfer_vote", { p_room_id: roomId, p_offers: ["es_madrid"], p_forced: false });
  const vote = (await state()).openVote;
  // Les deux finissent leur saison PENDANT le vote : avant, ces bilans étaient jetés.
  await a.rpc("room_report_season", noOffer(roomId));
  await b.rpc("room_report_season", noOffer(roomId));
  let st = await state();
  assert.equal(st.progress.ready, true, "le bilan rendu pendant le vote est enregistré");
  assert.equal(season(st), 0, "mais la barrière attend la fin du vote");
  await a.rpc("room_cast_vote", { p_vote_id: vote.id, p_choice: "stay" });
  await b.rpc("room_cast_vote", { p_vote_id: vote.id, p_choice: "stay" });
  st = await state();
  assert.equal(st.openVote, null, "personne n'ouvre de vote de barrière : aucune offre");
  assert.equal(season(st), 1, "le dernier bilan était arrivé pendant le vote : la barrière se franchit à sa clôture");
  assert.equal(st.progress.ready, false);
  assert.equal(st.room.club_id, "fr_paris", "« rester » ne change pas le club de l'équipe");
});

test("le vote de la barrière avance l'année une fois et fait suivre le club", { skip }, async () => {
  const { a, b, roomId, state } = await launchedRoom("rb3");
  await a.rpc("room_report_season", { p_room_id: roomId, p_pending_offer: { offers: ["de_munich"] }, p_club_trophies: ["league"] });
  await b.rpc("room_report_season", noOffer(roomId));
  let st = await state();
  assert.equal(st.room.phase, "season_vote");
  assert.equal(st.openVote.barrier, true);
  assert.equal(st.openVote.season_year, 0, "le vote retient l'année de sa barrière");
  // Un bilan tardif pendant la barrière est écarté, sans effet de bord.
  assert.equal((await b.rpc("room_report_season", noOffer(roomId))).status, 200);
  await a.rpc("room_cast_vote", { p_vote_id: st.openVote.id, p_choice: "de_munich" });
  await b.rpc("room_cast_vote", { p_vote_id: st.openVote.id, p_choice: "de_munich" });
  st = await state();
  assert.equal(season(st), 1);
  assert.equal(st.room.club_id, "de_munich");
  assert.equal(st.room.phase, "in_season");
  assert.equal(st.progress.ready, false);
  assert.deepEqual(st.room.season_trophies, ["league"]);
});

test("mode Rivaux : chacun son club, jamais le même, lancement sans club commun et barrière sans vote", { skip }, async () => {
  const a = await player("rva"), b = await player("rvb");
  await a.rpc("friend_request", { friend_id: b.id });
  await b.rpc("friend_accept", { from_id: a.id });
  assert.equal((await a.rpc("room_create", { p_mode: "pirate" })).status, 400, "mode inconnu refusé");
  const roomId = (await a.rpc("room_create", { p_mode: "rivals" })).data;
  await a.rpc("room_invite", { p_room_id: roomId, p_friend_id: b.id });
  await b.rpc("room_join", { p_room_id: roomId });
  const state = async (p = a) => (await p.rpc("room_state", { room_id: roomId })).data;
  assert.equal((await state()).room.mode, "rivals");
  assert.equal((await a.rpc("rooms_mine")).data.rooms[0].mode, "rivals", "la liste des salles donne le mode");

  // Chacun réserve son centre de formation ; un club déjà pris est refusé.
  assert.equal((await a.rpc("room_pick_start_club", { p_room_id: roomId, p_club_id: "fr_paris" })).status, 200);
  const taken = await b.rpc("room_pick_start_club", { p_room_id: roomId, p_club_id: "fr_paris" });
  assert.equal(taken.status, 400);
  assert.match(taken.error.message, /taken/);
  assert.equal((await b.rpc("room_pick_start_club", { p_room_id: roomId, p_club_id: "fr_lyon" })).status, 200);
  // A change d'avis : son ancien club redevient libre.
  assert.equal((await a.rpc("room_pick_start_club", { p_room_id: roomId, p_club_id: "fr_marseille" })).status, 200);
  const ready = (await a.rpc("rooms_mine")).data.rooms[0].members;
  assert.deepEqual(ready.map((m) => m.ready), [true, true], "réserver son club rend prêt");

  // Lancement sans club commun : chacun part du sien.
  assert.equal((await a.rpc("room_launch", { p_room_id: roomId, p_club_id: null })).status, 200);
  let st = await state();
  assert.equal(st.room.phase, "in_season");
  assert.equal(st.room.club_id, null);
  assert.equal((await a.rpc("room_pick_start_club", { p_room_id: roomId, p_club_id: "fr_nice" })).status, 400, "plus de réservation une fois lancée");

  // Barrière : aucun vote, l'année avance quand tout le monde a fini sa saison.
  await a.rpc("room_report_season", noOffer(roomId));
  assert.equal(season(await state()), 0, "on attend le rival");
  await b.rpc("room_report_season", noOffer(roomId));
  st = await state();
  assert.equal(st.openVote, null);
  assert.equal(st.room.phase, "in_season");
  assert.equal(season(st), 1);
});

test("mode Ensemble : une salle créée sans mode reste une salle de coéquipiers", { skip }, async () => {
  const a = await player("tga");
  const roomId = (await a.rpc("room_create")).data;
  assert.equal((await a.rpc("room_state", { room_id: roomId })).data.room.mode, "together");
  assert.equal((await a.rpc("room_pick_start_club", { p_room_id: roomId, p_club_id: "fr_paris" })).status, 400, "pas de réservation de club en mode Ensemble");
  await a.rpc("room_leave", { p_room_id: roomId });
});
