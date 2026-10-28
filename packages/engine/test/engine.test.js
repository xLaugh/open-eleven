// Tests du moteur, lancés par « npm test » (node --test, aucune dépendance).
// Ils portent sur les sources TypeScript, assemblées en mémoire avec le contenu.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { loadEngine } = require("./load-engine");
const { computeGolden } = require("./golden");

const E = loadEngine();
const golden = JSON.parse(fs.readFileSync(path.join(__dirname, "golden.json"), "utf8"));

test("le moteur se charge sans navigateur et expose son API", () => {
  for (const fn of ["newCareer", "playSeason", "advanceYear", "transferWindow", "replayDaily", "replayDuel", "scoreDaily", "scoreDuel", "computeCareerScore"]) {
    assert.equal(typeof E[fn], "function", fn + " manquant");
  }
  assert.match(E.ENGINE_VERSION, /^\d+\.\d+$/);
});

test("les carrières de référence se rejouent à l'identique", () => {
  // Une refonte interne ne doit RIEN changer ici. Si une règle change
  // volontairement : avancer ENGINE_VERSION puis régénérer golden.json
  // (node packages/engine/scripts/make-golden.js).
  assert.equal(E.ENGINE_VERSION, golden.engineVersion, "ENGINE_VERSION a changé : régénérer golden.json");
  const now = computeGolden(E);
  assert.equal(now.length, golden.cases.length);
  const diff = now.filter((c, i) => c.print !== golden.cases[i].print || c.score !== golden.cases[i].score);
  assert.equal(diff.length, 0, diff.length + " carrière(s) divergent, la première : " + JSON.stringify(diff[0]));
});

test("un même journal de choix donne deux fois la même carrière", () => {
  const choices = Array.from({ length: 300 }, (_, i) => (i * 5) % 4 - 1);
  const a = JSON.stringify(E.replayDaily("2031-05-17", choices));
  const b = JSON.stringify(E.replayDaily("2031-05-17", choices));
  assert.equal(a, b);
  assert.notEqual(a, JSON.stringify(E.replayDaily("2031-05-18", choices)), "deux dates différentes devraient diverger");
});

test("Coupe arabe et Jeux régionaux : réservés aux bonnes nations, aux bonnes années", () => {
  const { loadContent } = require("./load-engine");
  const C = loadContent();
  const continentOf = new Map(C.COUNTRIES.map((c) => [c.id, c.continent]));
  const natOf = new Map(C.NATIONALITIES.map((n) => [n.id, n]));
  let arab = 0, games = 0, europeanWithGames = 0;
  for (let i = 0; i < 600; i++) {
    const choices = Array.from({ length: 400 }, (_, k) => ((i * 13 + k * 5) % 5) - 1);
    const s = E.replayDuel(70000 + i * 211, choices);
    const runs = s.natRuns || [];
    for (const r of runs.filter((x) => x.comp === "arab")) {
      arab++;
      assert.equal(r.year % 4, 1, "Coupe arabe jouée une année hors cycle : " + r.year);
    }
    for (const r of runs.filter((x) => x.comp === "games")) {
      games++;
      // Un binational qui a changé de sélection (flags.natSwitched) a pu jouer ces
      // Jeux sous son ancienne nationalité : on ne contrôle le continent que si elle est restée la même.
      const def = C.REGIONAL_GAMES[continentOf.get(natOf.get(s.nationality.id).homeCountryId)];
      if (!s.flags.natSwitched && !def) europeanWithGames++;
      assert.ok(r.year % 4 === 2 || r.year % 4 === 3, "Jeux régionaux hors cycle : " + r.year);
      // Jamais deux grands tournois la même année : les Jeux n'accueillent que les non-retenus.
      assert.ok(!runs.some((x) => x.year === r.year && x.stage !== "dnq" && (x.comp === "wc" || x.comp === "olympic")), "Jeux et grand tournoi la même année (" + r.year + ")");
    }
    // Compteurs d'état toujours cohérents avec les médailles.
    const m = s.gamesMedals || { gold: 0, silver: 0, bronze: 0 };
    assert.equal(s.trophies.games || 0, m.gold, "titres des Jeux ≠ médailles d'or");
    assert.ok(runs.filter((x) => x.comp === "games").length >= m.gold + m.silver + m.bronze);
    if (!C.ARAB_NATION_IDS.includes(s.nationality.id) && !s.flags.natSwitched) assert.equal(runs.filter((x) => x.comp === "arab").length, 0, "Coupe arabe jouée par une nation non arabe : " + s.nationality.id);
  }
  assert.ok(arab > 20 && games > 100, "tournois trop rares : " + arab + " Coupes arabes, " + games + " Jeux");
  assert.equal(europeanWithGames, 0, "des Européens ont disputé des Jeux régionaux");
});

test("offres de transfert : nombre selon l'entourage, pays variés, peu d'Afrique hors Afrique", () => {
  const { loadContent } = require("./load-engine");
  const C = loadContent();
  const continentOf = new Map(C.COUNTRIES.map((c) => [c.id, c.continent]));
  // Des joueurs réels de tous les continents, dont on rejoue le mercato à volonté.
  const players = [];
  for (let i = 0; i < 60 && players.length < 40; i++) {
    const choices = Array.from({ length: 400 }, (_, k) => ((i * 7 + k * 3 + (k % 5) * i) % 5) - 1);
    const s = E.replayDuel(51000 + i * 389, choices);
    if (!s.flags.natSwitched) players.push(s);
  }
  const levels = ["regional", "d4", "d3", "d2", "d1", "elite"];
  const sizeFor = (entourage) => {
    let offers = 0, windows = 0;
    for (const p of players) {
      const s = JSON.parse(JSON.stringify(p));
      s.entourage = { id: entourage }; s.flags = {};
      for (const lvl of levels) for (let r = 0; r < 8; r++) {
        const o = E.offersFor(s, { toLevel: lvl });
        if (!o.length) continue;
        windows++; offers += o.length;
        assert.equal(new Set(o.map((x) => x.club.countryId)).size, o.length, "deux offres du même pays");
        assert.ok(o.length <= C.BALANCE.offerCountMax);
      }
    }
    return offers / windows;
  };
  const family = sizeFor("family"), crew = sizeFor("crew"), shark = sizeFor("shark");
  assert.ok(family < crew - 0.6 && crew < shark - 0.6, "famille < bande < agent attendu : " + [family, crew, shark].map((x) => x.toFixed(2)).join(" / "));
  assert.ok(crew > 3, "trop peu d'offres en moyenne : " + crew.toFixed(2));
  // Hors Afrique, l'Afrique ne fournit qu'une petite part des clubs proposés.
  let africa = 0, total = 0;
  for (const p of players) {
    if (continentOf.get(p.nationality.homeCountryId) === "af") continue;
    const s = JSON.parse(JSON.stringify(p)); s.entourage = { id: "crew" }; s.flags = {};
    for (const lvl of levels) for (let r = 0; r < 10; r++) for (const o of E.offersFor(s, { toLevel: lvl })) {
      total++; if (continentOf.get(o.club.countryId) === "af") africa++;
    }
  }
  assert.ok(africa / total < 0.12, "trop de clubs africains proposés à des non-Africains : " + (100 * africa / total).toFixed(1) + " %");
});

test("accord du verbe avec un pays pluriel (« les Pays-Bas ne vous ont… »)", () => {
  const { loadContent } = require("./load-engine");
  const C = loadContent();
  const nat = (id) => C.NATIONALITIES.find((n) => n.id === id);
  const base = E.replayDuel(51000, Array.from({ length: 400 }, (_, k) => (k % 5) - 1));
  const render = (text, over) => E.renderText({ ...base, ...over }, text);
  const t = "{nat} ne vous {nat?a|ont} toujours pas appelé. {altNat} {altNat?revient|reviennent} à la charge.";
  assert.equal(render(t, { nationality: nat("nl"), dualNat: "fr", dualNatAlt: "fr" }), "Les Pays-Bas ne vous ont toujours pas appelé. La France revient à la charge.");
  assert.equal(render(t, { nationality: nat("fr"), dualNat: "nl", dualNatAlt: "nl" }), "La France ne vous a toujours pas appelé. Les Pays-Bas reviennent à la charge.");
  // Aucune marque ne doit survivre à un rendu, quel que soit le pays.
  for (const n of C.NATIONALITIES.slice(0, 80)) assert.ok(!/[{}]/.test(render("{nat} ne vous {nat?a|ont} pas appelé.", { nationality: n })), n.id);
  // Les marques du contenu sont bien formées et ne visent qu'un nom de pays connu.
  const marks = [];
  (function walk(x) {
    if (typeof x === "string") { for (const m of x.matchAll(/\{(\w+)\?([^{}]*)\}/g)) marks.push(m); return; }
    if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") Object.values(x).forEach(walk);
  })({ E: C.EVENTS, T: C.ENGINE_TEXT, M: C.MICRO_EVENTS });
  assert.ok(marks.length >= 6, "marques d'accord attendues dans le contenu : " + marks.length);
  for (const m of marks) {
    assert.ok(["nat", "dualNat", "altNat", "country"].includes(m[1]), "marque sur une variable inconnue : " + m[0]);
    assert.equal(m[2].split("|").length, 2, "forme singulier|pluriel attendue : " + m[0]);
  }
});

test("des carrières longues et variées se rejouent sans erreur", () => {
  // Traverse sponsors, sélections de jeunes, mercato, vétérans… : tout ce
  // qu'un journal de choix quelconque peut atteindre.
  for (let i = 0; i < 60; i++) {
    const choices = Array.from({ length: 400 }, (_, k) => ((i * 11 + k * 7) % 5) - 1);
    assert.doesNotThrow(() => E.replayDuel(50000 + i * 131, choices));
  }
});

test("salle : deux joueurs du même club vivent exactement la même saison de club", () => {
  const { loadContent } = require("./load-engine");
  const C = loadContent();
  const choices = (i) => Array.from({ length: 400 }, (_, k) => ((i * 7 + k * 3 + (k % 5) * i) % 5) - 1);
  // Deux joueurs que tout oppose (poste, niveau, événements, langue du libellé de division).
  const base = [E.replayDuel(7001, choices(3)), E.replayDuel(9137, choices(11))];
  const clubs = ["elite", "d1", "d2", "d3"].map((lvl) => C.CLUBS.find((c) => c.level === lvl && c.countryId === "fr") || C.CLUBS.find((c) => c.level === lvl));
  const CLUB_KEYS = ["leaguePos", "promoted", "relegated", "playoffRun", "relegationPlayoff", "divisionTitle"];
  const clubView = (s, r) => JSON.stringify({
    ...Object.fromEntries(CLUB_KEYS.map((k) => [k, r[k] ?? null])),
    league: r.trophies.includes("league"),
    moments: r.pendingMoments.filter((m) => ["playoff", "relegation_playoff", "cup_final", "continental_final"].includes(m.type)).map((m) => m.type + ":" + m.sharedWin + ":" + (m.tier || 0)),
    next: s.lastSeason && { promoted: s.lastSeason.promoted, relegated: s.lastSeason.relegated, pos: s.lastSeason.leaguePos },
  });
  let elitePlayoffs = 0, divergences = 0, seasons = 0;
  for (const club of clubs) for (let year = 2030; year < 2070; year++) {
    const views = base.map((p) => {
      const s = JSON.parse(JSON.stringify(p));
      Object.assign(s, { club, year, clubLevels: {}, squad: "first", loan: null, careerEnded: false, retiring: false, seasonTrophies: [], seasonAwards: [], scheduled: [], injuryWeeks: 0 });
      s.roomClub = { seed: E.roomClubSeed("salle-test", year, club.id), teamRating: E.teamRatingFromOvr(72) };
      const r = E.playSeason(s);
      if (club.level === "elite" && r.playoffRun) elitePlayoffs++;
      return clubView(s, r);
    });
    seasons++;
    if (views[0] !== views[1]) divergences++;
  }
  assert.equal(divergences, 0, divergences + " saison(s) sur " + seasons + " où le club n'a pas vécu la même saison chez les deux joueurs");
  assert.equal(elitePlayoffs, 0, "un club d'élite ne joue jamais de barrage de montée");
  // Le hasard commun varie bien d'une saison à l'autre.
  const pos = new Set();
  for (let year = 2030; year < 2050; year++) {
    const s = JSON.parse(JSON.stringify(base[0]));
    Object.assign(s, { club: clubs[1], year, clubLevels: {}, squad: "first" });
    s.roomClub = { seed: E.roomClubSeed("salle-test", year, clubs[1].id), teamRating: 6.6 };
    pos.add(E.roomClubSeason(s, "d1", true).leaguePos);
  }
  assert.ok(pos.size >= 4, "classements trop uniformes : " + [...pos]);
});

test("la première place du championnat est réservée au champion", () => {
  const bad = [];
  for (let i = 0; i < 400; i++) {
    const choices = Array.from({ length: 400 }, (_, k) => ((i * 7 + k * 3 + (k % 5) * i) % 5) - 1);
    const s = E.replayDuel(70001 + i * 97, choices);
    for (const se of s.seasons) {
      const champion = (se.trophies || []).includes("league") || se.divisionTitle;
      if (se.leaguePos === 1 && !champion) bad.push(se.year + " " + se.clubName);
    }
  }
  assert.deepEqual(bad.slice(0, 5), [], bad.length + " saison(s) finie(s) 1re sans titre");
});

test("tout joueur reçoit au moins une offre de centre de formation, quels que soient pays et profil", () => {
  const { loadContent } = require("./load-engine");
  const C = loadContent();
  const empty = [];
  for (const nat of C.NATIONALITIES) for (const origin of C.ORIGINS) for (const potCap of [68, 80, 92]) {
    const offers = E.academyOffers({ nationality: nat, origin, lifestyle: C.LIFESTYLES[0], entourage: C.ENTOURAGES[0], potCap });
    if (!offers.length) empty.push(nat.id + "/" + origin.id);
  }
  assert.deepEqual(empty.slice(0, 5), [], empty.length + " départ(s) sans aucune offre");
});

test("les grands championnats ont un échelon régional, proposé au départ", () => {
  const { loadContent } = require("./load-engine");
  const C = loadContent();
  for (const cc of ["fr", "de", "es", "it", "en", "pt", "nl", "br", "ar", "be", "mx", "tr", "us"]) {
    assert.ok(C.CLUBS.filter((c) => c.countryId === cc && c.level === "regional").length >= 5, "pas de clubs régionaux : " + cc);
  }
  const fr = C.NATIONALITIES.find((n) => (n.homeCountryId || n.id) === "fr");
  let reg = 0;
  for (let i = 0; i < 400; i++) {
    const offers = E.academyOffers({ nationality: fr, origin: C.ORIGINS[i % C.ORIGINS.length], lifestyle: C.LIFESTYLES[0], entourage: C.ENTOURAGES[0], potCap: 75 });
    if (offers.some((o) => o.level === "regional")) reg++;
  }
  assert.ok(reg > 40 && reg < 260, "un départ « Rég. » doit être possible sans être la règle : " + reg + "/400");
});

test("coupes de clubs : les places européennes et continentales, comme dans la réalité", () => {
  const places = (country, n) => Array.from({ length: n }, (_, i) => E.tierForRank(country, i + 1));
  assert.deepEqual(places("en", 7), [1, 1, 1, 1, 2, 3, 0], "Angleterre : top 4 en C1, 5e en C2, 6e en C3");
  assert.deepEqual(places("fr", 6), [1, 1, 1, 2, 3, 0], "France : top 3 en C1");
  assert.deepEqual(places("pt", 5), [1, 1, 2, 3, 0], "Portugal : top 2 en C1");
  assert.deepEqual(places("be", 6), [1, 1, 2, 3, 3, 0], "Belgique : top 2 en C1, 3e en C2, 4e et 5e en C3");
  assert.deepEqual(places("ch", 6), [1, 2, 2, 3, 3, 0], "championnats moyens : le champion en C1, plus de places en C2 et C3");
  assert.deepEqual(places("is", 5), [1, 2, 3, 3, 0], "petits championnats : le champion en C1, 2e en C2, 3e et 4e en C3");
  assert.deepEqual(places("br", 7), [1, 1, 1, 1, 2, 2, 0], "Brésil : top 4 en C1, 5e et 6e en C2");
  assert.deepEqual(places("ma", 4), [1, 1, 2, 0], "Afrique : top 2 en C1, 3e en C2 (pas de C3)");
  assert.deepEqual(places("jp", 5), [1, 1, 2, 3, 0], "Asie : top 2 en C1, puis C2 et C3");
  assert.deepEqual(places("nz", 3), [1, 0, 0], "Océanie : le champion seul (ni C2 ni C3)");
  // Le classement d'un club qu'on rejoint ne dépend que du club et de l'année : le même
  // dans toutes les carrières, et pour tous les membres d'une salle.
  const club = { id: "en_city", countryId: "en" };
  const a = E.seasonCupTier({ club, year: 2031, contNext: null }, "elite", true);
  const b = E.seasonCupTier({ club, year: 2031, contNext: { clubId: "autre", year: 2030, tier: 0 } }, "elite", true);
  assert.deepEqual(a, b);
  assert.equal(a.simulated, true);
  // Le joueur y était la saison passée : c'est SON classement qui compte.
  assert.equal(E.seasonCupTier({ club, year: 2031, contNext: { clubId: club.id, year: 2030, tier: 3, rank: 6 } }, "elite", true).tier, 3);
});

test("coupes de clubs : l'élite finit en haut sans être qualifiée d'office, les D1 de son pays finissent derrière", () => {
  const elite = [], d1 = [];
  let checked = 0;
  for (let i = 0; i < 300; i++) {
    const choices = Array.from({ length: 400 }, (_, k) => ((i * 11 + k * 3 + (k % 7) * i) % 5) - 1);
    const s = E.replayDuel(52001 + i * 97, choices);
    for (const se of s.seasons) {
      if (!se.leaguePos || !se.matches) continue;
      if (se.level === "elite") elite.push(E.tierForRank(se.countryId, se.leaguePos));
      else if (se.level === "d1" && E.hasEliteClubs(se.countryId)) d1.push(se.leaguePos);
    }
    // La qualification notée en fin de carrière suit le dernier classement du club.
    const last = s.seasons[s.seasons.length - 1];
    if (s.contNext && last && last.leaguePos && last.level === "elite") {
      assert.equal(s.contNext.tier, E.tierForRank(last.countryId, last.leaguePos), "qualification ≠ classement final");
      checked++;
    }
  }
  assert.ok(elite.length > 200 && d1.length > 50, "pas assez de saisons pour juger : " + elite.length + " / " + d1.length);
  const c1 = elite.filter((t) => t === 1).length / elite.length;
  assert.ok(c1 > 0.6 && c1 < 0.97, "un club élite se qualifie souvent pour la C1, mais pas toujours : " + c1.toFixed(2));
  const d1Top4 = d1.filter((p) => p <= 4).length / d1.length;
  assert.ok(d1Top4 < 0.2, "un D1 d'un pays à clubs élite finit rarement dans le top 4 : " + d1Top4.toFixed(2));
  assert.ok(checked > 0, "aucune fin de carrière en élite pour vérifier la qualification");
});

test("qualifications : la bonne taille de tournoi, les hôtes qualifiés, et la force qui compte", () => {
  const sizes = { wc: new Set(), eu: new Set(), af: new Set(), as: new Set(), am: new Set(), oc: new Set() };
  const wc = {};
  for (let i = 0; i < 250; i++) {
    const choices = Array.from({ length: 400 }, (_, k) => ((i * 7 + k * 3 + (k % 5) * i) % 5) - 1);
    const s = E.replayDuel(31001 + i * 53, choices);
    for (const [k, q] of Object.entries(s.world || {})) {
      assert.equal(new Set(q.qualified).size, q.qualified.length, "doublon parmi les qualifiés : " + k);
      for (const h of q.hosts) assert.ok(q.qualified.includes(h), "hôte non qualifié : " + h + " (" + k + ")");
      if (k.startsWith("wc:")) {
        sizes.wc.add(q.qualified.length);
        if (k === "wc:2026") for (const h of ["us", "ca", "mx"]) assert.ok(q.qualified.includes(h));
        const me = s.nationality.id;
        (wc[me] ||= [0, 0])[0]++;
        if (q.qualified.includes(me)) wc[me][1]++;
      } else sizes[k.split(":")[1]].add(q.qualified.length);
    }
  }
  assert.deepEqual([...sizes.wc], [48], "Mondial à 48");
  for (const [cont, n] of [["eu", 24], ["af", 24], ["as", 24], ["am", 16], ["oc", 8]]) {
    if (sizes[cont].size) assert.deepEqual([...sizes[cont]], [n], "taille de la coupe continentale " + cont);
  }
  // Les plus grandes nations se qualifient presque toujours, les plus petites jamais.
  for (const id of ["fr", "en", "br"]) if (wc[id] && wc[id][0] >= 5) assert.ok(wc[id][1] / wc[id][0] >= 0.8, id + " trop souvent absente du Mondial");
  for (const id of ["sm", "to"]) if (wc[id]) assert.equal(wc[id][1], 0, id + " qualifiée pour le Mondial");
});
