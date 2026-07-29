/* ============================================================
   MOTEUR DE JEU v4 — logique pure, aucun accès DOM.
   Toutes les fonctions prennent l'état en paramètre : le même
   code sert au joueur (game.js), au rival et à simulate.js.

   Nouveautés v4 : trajectoires de carrière (explosion précoce,
   révélation tardive, météore…), vie des clubs (montées,
   descentes, changements de dimension — niveau effectif par
   carrière via s.clubLevels), Ballon d'Or à points de saison
   avec momentum multi-Ballons, récompenses individuelles,
   moments décisifs interactifs (finale de CDM, barrages),
   prêts stratégiques avec bilan de retour, offres de transfert
   ciblées (pays natal, rival domestique, transfert direct).
   ============================================================ */
(function () {
  "use strict";

  // --- Hasard seedable (déterminisme opt-in) -------------------------------
  // Par défaut : Math.random → carrières normales 100 % aléatoires.
  // setSeed(n) bascule sur un PRNG reproductible (mulberry32) : le Défi du jour
  // et les duels deviennent déterministes — même graine + mêmes choix ⇒
  // carrière identique (la divergence n'apparaît qu'après un choix différent).
  // L'état tient dans UN entier (getSeedState/setSeedState) → sérialisable dans
  // l'autosave pour une reprise déterministe. rng() est l'UNIQUE source de
  // hasard du moteur (les ex-Math.random y passent tous désormais).
  let _rngState = null; // null = Math.random (non seedé)
  function rng() {
    if (_rngState === null) return Math.random();
    let a = _rngState | 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    _rngState = a;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function setSeed(seed) { _rngState = (seed | 0) || 1; }
  function clearSeed() { _rngState = null; }
  function getSeedState() { return _rngState; }
  function setSeedState(s) { _rngState = (s === null || s === undefined) ? null : (s | 0); }

  // --- Utilitaires -----------------------------------------------------
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return min + rng() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }

  function weightedRandom(items, weightFn) {
    const getW = weightFn || ((it) => (it.weight != null ? it.weight : it.w));
    const total = items.reduce((s, it) => s + getW(it), 0);
    let roll = rng() * total;
    for (const it of items) {
      roll -= getW(it);
      if (roll <= 0) return it;
    }
    return items[items.length - 1];
  }

  function countryOf(countryId) { return COUNTRIES.find((c) => c.id === countryId); }
  function levelRank(levelId) { return LEVELS[levelId] ? LEVELS[levelId].rank : 0; }

  // Étiquette de division RELATIVE à la nation. Le meilleur échelon d'un pays
  // s'affiche « D1 », le suivant « D2 », etc. — même si sa FORCE réelle (level,
  // qui pilote salaire/OVR/niveau) équivaut à un D3 voire un Régional des grands
  // championnats. Chaque nation a ainsi sa propre pyramide à l'écran, sans rien
  // changer à l'équilibrage. Les grands pays (top = élite) ne bougent pas.
  const _countryTopRank = {};
  function countryTopRank(countryId) {
    if (_countryTopRank[countryId] == null) {
      let top = 0;
      for (const c of CLUBS) if (c.countryId === countryId) top = Math.max(top, levelRank(c.level));
      _countryTopRank[countryId] = top;
    }
    return _countryTopRank[countryId];
  }
  const _DIV_SHORTS = ["D1", "D2", "D3", "Rég."];
  function divShort(level, countryId) {
    if (level === "elite") return "Élite"; // l'élite reste distincte (grands pays)
    const baseIdx = { d1: 0, d2: 1, d3: 2, regional: 3 }[level];
    if (baseIdx == null) return LEVELS[level] ? LEVELS[level].short : level;
    const shift = Math.max(0, 3 - countryTopRank(countryId)); // 3 = rang de D1
    return _DIV_SHORTS[Math.max(0, baseIdx - shift)];
  }

  // Niveau EFFECTIF d'un club pour cette carrière : les montées/descentes
  // vécues sont stockées dans s.clubLevels sans toucher aux données globales.
  function lvlOf(s, club) {
    return (s.clubLevels && s.clubLevels[club.id]) || club.level;
  }

  // Élision française : « de/le » deviennent « d'/l' » devant une voyelle (ou
  // voyelle accentuée). Évite « le Aigle de Osaka » → « L'Aigle d'Osaka ».
  function frElide(w) { return /^[aàâäeéèêëiîïoôöuùûüyAÀÂÄEÉÈÊËIÎÏOÔÖUÙÛÜY]/.test(String(w || "")); }
  function deOf(w) {
    w = String(w || "");
    if (/^Les /.test(w)) return "des " + w.slice(4); // « de Les Corts » → « des Corts »
    if (/^Le /.test(w)) return "du " + w.slice(3);   // « de Le Caire » → « du Caire »
    return (frElide(w) ? "d'" : "de ") + w;           // « de Paris » / « d'Amiens »
  }
  function leOf(w) { return (frElide(w) ? "L'" : "Le ") + w; } // « Le Balayeur » / « L'Aigle »

  // Visibilité médiatique effective : les championnats du Golfe paient
  // très cher mais exposent deux fois moins (gains de réputation réduits,
  // Ballon d'Or hors de portée — cf. rollBallon).
  function visibilityOf(s) {
    const base = BALANCE.mediaVisibility[lvlOf(s, s.club)];
    const country = countryOf(s.club.countryId);
    return country && country.gulf ? base * 0.5 : base;
  }
  function setClubLevel(s, club, levelId) {
    s.clubLevels[club.id] = levelId;
  }
  function shiftClubLevel(s, club, delta) {
    const idx = clamp(LEVEL_ORDER.indexOf(lvlOf(s, club)) + delta, 0, LEVEL_ORDER.length - 1);
    setClubLevel(s, club, LEVEL_ORDER[idx]);
    return LEVEL_ORDER[idx];
  }

  function fmtMoney(m) {
    if (m >= 1000) return `${(m / 1000).toFixed(1).replace(".", ",")} Md€`;
    if (m > 0 && m < 0.1) return `${Math.max(1, Math.round(m * 1000))} k€`;
    const v = m >= 10 ? Math.round(m) : Math.round(m * 10) / 10;
    return `${String(v).replace(".", ",")} M€`;
  }

  // --- Potentiel caché & trajectoire -----------------------------------------
  const ORIGIN_POT = { formation: 1, sportif: 1, quartier: 2, futsal: 2, tardif: -2 };

  function rollPotential(origin, lifestyle, entourage) {
    let cap = 72 + randInt(-4, 14);
    cap += ORIGIN_POT[origin.id] || 0;
    cap += lifestyle ? lifestyle.potBonus : 0;
    if (entourage && entourage.id === "family") cap += 1;
    return clamp(cap, 68, 97);
  }

  function potStars(potCap) {
    if (potCap <= 74) return 1;
    if (potCap <= 80) return 2;
    if (potCap <= 85) return 3;
    if (potCap <= 91) return 4;
    return 5;
  }

  // Probabilité qu'un profil naisse « talent générationnel » : influencée par
  // les choix de création (origine, hygiène de vie, entourage) et la nation.
  // Base faible, meilleur profil possible ~5 % (cf. BALANCE.prodigy*).
  function prodigyChance(profile) {
    const b = BALANCE;
    let p = b.prodigyBase;
    p += b.prodigyOrigin[profile.origin.id] || 0;
    if (profile.lifestyle) p += b.prodigyLifestyle[profile.lifestyle.id] || 0;
    if (profile.entourage) p += b.prodigyEntourage[profile.entourage.id] || 0;
    p *= profile.nationality ? profile.nationality.weight : 1;
    return clamp(p, 0, b.prodigyChanceCap);
  }

  function pickTrajectory(origin) {
    return weightedRandom(TRAJECTORIES, (t) => {
      let w = t.w;
      if (origin.id === "tardif" && (t.id === "late" || t.id === "surge")) w *= 4;
      if (origin.id === "tardif" && (t.id === "early" || t.id === "flash")) w *= 0.2;
      return w;
    });
  }

  // Multiplicateur de progression selon la trajectoire et l'âge.
  function trajGrowthMult(s) {
    const a = s.age;
    switch (s.trajectory.id) {
      case "steady": return a <= 25 ? 0.8 : 1.1;
      case "early": return a <= 21 ? 1.8 : a <= 25 ? 0.8 : 0.6;
      case "late": return a <= 22 ? 0.7 : a <= 29 ? 1.7 : 1;
      case "chaotic": return rand(0.4, 1.7);
      case "unstable": return 1.2;
      case "flash": return a <= 20 ? 1.9 : a <= 24 ? 0.5 : 0.3;
      case "surge": return a < s.sparkAge ? 0.75 : a <= s.sparkAge + 2 ? 2.1 : 1;
      default: return 1;
    }
  }

  // --- Génération du centre de formation (départ de carrière) ---------------
  const ORIGIN_ACADEMY = {
    formation: { d1: 8, elite: 6, regional: -10 },
    sportif: { elite: 10, d1: 4 },
    quartier: { regional: 10, d2: 4, elite: -4 },
    futsal: { d2: 6, d1: 2 },
    tardif: { regional: 16, d2: 2, d1: -8, elite: -8 },
  };
  const LIFESTYLE_ACADEMY = { pro: { d1: 4, elite: 4 }, balance: {}, street: { elite: -4 } };
  const ACADEMY_BLURBS = {
    elite: "Centre d'élite — infrastructures de pointe, concurrence féroce",
    d1: "Centre professionnel réputé — un cap sérieux vers le haut niveau",
    d2: "Club formateur solide — du temps de jeu et de vrais éducateurs",
    regional: "Club local — l'école de la débrouille, près des vôtres",
  };

  function academyOffers(profile) {
    const w = { ...BALANCE.academyWeights };
    const add = (obj) => { for (const k in obj) w[k] = (w[k] || 0) + obj[k]; };
    add(ORIGIN_ACADEMY[profile.origin.id] || {});
    add(LIFESTYLE_ACADEMY[profile.lifestyle.id] || {});
    if (profile.entourage && profile.entourage.academy) add(profile.entourage.academy);
    if (profile.potCap >= 88) add({ elite: 10, d1: 6 });
    else if (profile.potCap <= 76) add({ elite: -8 });
    for (const k in w) w[k] = Math.max(0, w[k]);

    const homeId = profile.nationality.homeCountryId;
    // Uniquement des centres du pays natal : un niveau sans club
    // domestique (ex. élite au Brésil) est simplement inaccessible.
    const clubsAt = (lvl) => CLUBS_BY_LEVEL[lvl].filter((c) => c.countryId === homeId);
    for (const k in w) if (!clubsAt(k).length) w[k] = 0;

    const count = randInt(2, 3);
    const offers = [];
    const remaining = { ...w };
    for (let i = 0; i < count; i++) {
      const entries = Object.entries(remaining).filter(([, weight]) => weight > 0);
      if (!entries.length) break;
      const [lvl] = weightedRandom(entries, (e) => e[1]);
      delete remaining[lvl];
      offers.push({ club: pick(clubsAt(lvl)), level: lvl, blurb: ACADEMY_BLURBS[lvl] });
    }
    if (!offers.some((o) => o.level === "elite") && clubsAt("elite").length && rng() < BALANCE.academySurpriseChance) {
      offers[offers.length - 1] = {
        club: pick(clubsAt("elite")), level: "elite",
        blurb: ACADEMY_BLURBS.elite, surprise: true,
      };
    }
    offers.sort((a, b) => levelRank(a.level) - levelRank(b.level));
    return offers;
  }

  // --- Création de carrière ---------------------------------------------
  function generateName(natId) {
    const pool = NAME_POOLS[natId] || NAME_POOLS.fr;
    return `${pick(pool.first)} ${pick(pool.last)}`;
  }

  function newCareer(opts) {
    const lifestyle = opts.lifestyle || pick(LIFESTYLES);
    const entourage = opts.entourage || pick(ENTOURAGES);
    const trajectory = opts.trajectory || pickTrajectory(opts.origin);
    const s = {
      name: opts.name || generateName(opts.nationality.id),
      nationality: opts.nationality,
      origin: opts.origin,
      position: opts.position,
      lifestyle, entourage, trajectory,
      sparkAge: randInt(22, 26), // année du déclic (trajectoire "surge")
      age: BALANCE.ageMin,
      year: opts.startYear || BALANCE.startYear, // mode Histoire : époque imposée
      club: opts.club,
      coach: pick(COACH_NAMES),
      contract: { salary: 0.05, years: 3 },
      stats: { t: 0, p: 0, m: 0, c: 0 },
      rep: 0,
      form: 68,
      moral: 70,
      discipline: 50,
      coachRel: 58,
      teamRel: 60,
      money: 0.05,
      potCap: opts.potCap != null ? opts.potCap : rollPotential(opts.origin, lifestyle, entourage),
      traits: [],
      flags: {},
      usedEvents: [],
      scheduled: [],
      injuryWeeks: 0,          // indispo TOTALE de la saison (blessure + suspension + dette) → matchs
      seasonInjuryWeeks: 0,    // semaines de BLESSURE seule de la saison (hors suspension) → conséquences blessure
      chronicWeeks: 0,         // dette de récupération : déborde sur la/les saison(s) suivante(s)
      injuryHistory: 0,        // nombre de grosses blessures subies (fragilité acquise)
      seasonTrophies: [],
      seasonAwards: [],
      loan: null,
      loanReturn: null,
      role: 2, // statut au club (index ROLES) — fixé juste après selon le club de départ
      seasonsAtClub: 0, // saisons au club actuel (la revue de rôle saute la 1re)
      objective: null,
      lastSeason: null,
      clubLevels: {}, // niveaux effectifs des clubs (montées/descentes vécues)
      clubMomentum: 0, // saisons consécutives dans le haut du classement
      clubFade: 0, // saisons consécutives de déclin (élite)
      awardCounts: {},
      archetype: null,
      leagueTitlesDetail: [], // titres de champion : { countryId, level, clubId, year }
      continentalDetail: [], // coupes continentales : { continent, year }
      euroCupTicket: false, // vainqueur de Coupe Nationale (club EU) → qualifié C2 la saison suivante
      momentWins: 0,
      derbyWins: 0,
      bestBallonRank: null,
      prevClub: null, // club quitté au dernier transfert (retrouvailles)
      natTeam: { active: false, retired: false, caps: 0, goals: 0 },
      youth: { caps: 0, goals: 0, tiers: [] }, // sélections de jeunes (U17→U23), à part des A
      olympicMedals: { gold: 0, silver: 0, bronze: 0 }, // médailles des Jeux Olympiques
      totals: { matches: 0, goals: 0, assists: 0, cleanSheets: 0 },
      captainMatches: 0, // matchs disputés avec le brassard de capitaine (bilan de fin)
      trophies: { league: 0, cup: 0, continental: 0, continental2: 0, continental3: 0, worldCup: 0, contInt: 0, natLeague: 0, olympic: 0, ballon: 0, goldenBoot: 0 },
      seasons: [],
      transferHistory: [],
      history: [],
      peakOvr: 0,
      clubsPlayed: [opts.club.id],
      continentsPlayed: [(countryOf(opts.club.countryId) || {}).continent || "eu"],
      retiring: false,
      careerEnded: false,
      careerEndReason: null,
    };
    const st = opts.origin.startStats;
    s.stats = { t: st.t, p: st.p, m: st.m, c: st.c };
    s.rep = st.rep;
    if (opts.origin.id === "tardif") s.flags.lateBloomer = true;
    // Talent générationnel : tirage caché influencé par les choix de création.
    // Peut faire naître un phénomène adolescent — potentiel d'élite, trajectoire
    // explosive, stats de départ au-dessus du lot. Jamais quand la trajectoire
    // est imposée (mode Histoire : le potentiel y est déjà scénarisé).
    if (!opts.trajectory && rng() < prodigyChance({ origin: opts.origin, lifestyle, entourage, nationality: opts.nationality })) {
      s.flags.prodigy = true;
      s.potCap = clamp(randInt(BALANCE.prodigyPotMin, BALANCE.prodigyPotMax), 68, 99);
      s.trajectory = TRAJECTORIES.find((t) => t.id === (rng() < 0.65 ? "early" : "flash")) || s.trajectory;
      // Déjà bien au-dessus du lot à 16 ans : un crack ne sort pas de nulle part.
      s.stats.t = clamp(s.stats.t + randInt(9, 13), 1, 99);
      s.stats.p = clamp(s.stats.p + randInt(4, 7), 1, 99);
      s.stats.m = clamp(s.stats.m + randInt(2, 4), 1, 99);
      s.stats.c = clamp(s.stats.c + randInt(1, 3), 1, 99);
    }
    if (s.trajectory.id === "unstable") s.potCap = clamp(s.potCap + 5, 68, 99);
    if (s.trajectory.id === "flash") s.stats.t = clamp(s.stats.t + 4, 1, 99);
    applyFx(s, lifestyle.fx || {});
    applyFx(s, entourage.fx || {});
    if (entourage.flag) s.flags[entourage.flag] = true;
    if (opts.clubLevels) s.clubLevels = { ...opts.clubLevels }; // mode Histoire : niveaux d'époque
    s.contract.salary = salaryFor(s, opts.club) * 0.3;
    s.transferHistory.push({ age: s.age, toClubName: opts.club.name, countryName: countryOf(opts.club.countryId).name, fee: null, level: lvlOf(s, opts.club) });
    s.role = roleForClub(s, opts.club); // statut au centre de formation (souvent Espoir/Rotation)
    s.peakOvr = ovr(s);
    return s;
  }

  function ovr(s) {
    return Math.round(0.4 * s.stats.t + 0.25 * s.stats.p + 0.2 * s.stats.m + 0.15 * s.stats.c);
  }

  function hasTrait(s, id) { return s.traits.includes(id); }

  // --- Rendu des textes (templating) --------------------------------------
  function renderText(s, text, extra) {
    if (!text) return "";
    const country = countryOf(s.club.countryId);
    const contCup = (CONTINENTAL_CUPS[(country || {}).continent] || CONTINENTAL_CUPS.eu).name;
    let out = text
      // Élision : « de {club/nat/country/name} » → « d'Osaka », « d'Angleterre »…
      .replace(/\bde \{club\}/g, deOf(s.club.name))
      .replace(/\bde \{nat\}/g, deOf(s.nationality.name))
      .replace(/\bde \{country\}/g, deOf(country ? country.name : ""))
      .replace(/\bde \{name\}/g, deOf(s.name))
      .replace(/\{club\}/g, s.club.name)
      .replace(/\{coach\}/g, s.coach)
      .replace(/\{country\}/g, country ? country.name : "")
      .replace(/\{contCup\}/g, contCup) // coupe continentale du club (Europe/Amériques/Afrique…)
      .replace(/\{name\}/g, s.name)
      .replace(/\{nat\}/g, s.nationality.name);
    if (extra && extra.rival) out = out.replace(/\{rival\}/g, extra.rival);
    else out = out.replace(/\{rival\}/g, "votre grand rival");
    return out;
  }

  // --- Application des effets ("fx") ---------------------------------------
  const STAT_LABELS = { t: "Technique", p: "Physique", m: "Mental", c: "Charisme" };

  function applyFx(s, fx) {
    const chips = [];
    if (!fx) return chips;

    for (const key of ["t", "p", "m", "c"]) {
      if (fx[key]) {
        let d = fx[key];
        if (d > 0 && key === "t" && hasTrait(s, "genius") && s.age <= 23) d = Math.round(d * 1.4);
        s.stats[key] = clamp(s.stats[key] + d, 1, 99);
        chips.push({ label: `${d > 0 ? "+" : ""}${d} ${STAT_LABELS[key]}`, kind: d > 0 ? "good" : "bad" });
      }
    }
    if (fx.rep) {
      let d = fx.rep;
      if (d > 0) d = Math.round(d * visibilityOf(s));
      if (d > 0 && hasTrait(s, "showman")) d = Math.round(d * 1.3);
      if (d > 0 && hasTrait(s, "mercenary")) d = Math.round(d * 0.85);
      s.rep = clamp(s.rep + d, 0, 100);
      if (d) chips.push({ label: `${d > 0 ? "+" : ""}${d} Réputation`, kind: d > 0 ? "good" : "bad" });
    }
    if (fx.form) {
      s.form = clamp(s.form + fx.form, 5, 100);
      chips.push({ label: `${fx.form > 0 ? "+" : ""}${fx.form} Forme`, kind: fx.form > 0 ? "good" : "bad" });
    }
    if (fx.mor) {
      s.moral = clamp(s.moral + fx.mor, 5, 100);
      chips.push({ label: `${fx.mor > 0 ? "+" : ""}${fx.mor} Moral`, kind: fx.mor > 0 ? "good" : "bad" });
    }
    if (fx.dis) {
      s.discipline = clamp(s.discipline + fx.dis, 5, 100);
      chips.push({ label: `${fx.dis > 0 ? "+" : ""}${fx.dis} Discipline`, kind: fx.dis > 0 ? "good" : "bad" });
    }
    if (fx.coach) {
      s.coachRel = clamp(s.coachRel + fx.coach, 5, 100);
      chips.push({ label: `${fx.coach > 0 ? "+" : ""}${fx.coach} Relation coach`, kind: fx.coach > 0 ? "good" : "bad" });
    }
    if (fx.team) {
      s.teamRel = clamp(s.teamRel + fx.team, 5, 100);
      chips.push({ label: `${fx.team > 0 ? "+" : ""}${fx.team} Vestiaire`, kind: fx.team > 0 ? "good" : "bad" });
    }
    if (fx.role) { // ajustement direct du statut au club (ex. « tu restes → tu perds ta place »)
      const before = typeof s.role === "number" ? s.role : 2;
      s.role = clamp(before + fx.role, 0, 4);
      if (s.role !== before) chips.push({ label: `${fx.role > 0 ? "⬆️ Promu" : "⬇️ Rétrogradé"} : ${ROLES[s.role].label}`, kind: fx.role > 0 ? "good" : "bad" });
    }
    if (fx.money) {
      let d = fx.money;
      if (d > 0 && hasTrait(s, "mercenary")) d *= 1.2;
      s.money = Math.max(0, s.money + d);
      chips.push({ label: `${d > 0 ? "+" : "−"}${fmtMoney(Math.abs(d))}`, kind: d > 0 ? "money" : "bad" });
    }
    if (fx.salaryMult) {
      s.contract.salary = Math.round(s.contract.salary * fx.salaryMult * 100) / 100;
      chips.push({ label: `📈 Salaire : ${fmtMoney(s.contract.salary)}/an`, kind: "money" });
    }
    if (fx.archetype) {
      const arch = ARCHETYPES.find((a) => a.id === fx.archetype);
      if (arch) {
        s.archetype = arch;
        chips.push({ label: `🧬 ${arch.name} : ${arch.effect || arch.desc}`, kind: "trait" });
      }
    }
    if (fx.ban) {
      s.injuryWeeks += fx.ban;
      chips.push({ label: `⛔ ${fx.ban} semaines hors du groupe`, kind: "bad" });
    }
    if (fx.inj) {
      const weeks = applyInjury(s, fx.inj); // modulation traits + répartition saison/chronique + fragilité
      chips.push({ label: `🩹 ${weeks} semaines d'absence`, kind: "bad" });
    }
    if (fx.chronic) {
      let w = fx.chronic;
      if (hasTrait(s, "ironman")) w = Math.round(w * 0.6);
      else if (hasTrait(s, "glass")) w = Math.round(w * 1.5);
      s.chronicWeeks = (s.chronicWeeks || 0) + Math.max(1, w);
    }
    if (fx.pot) s.potCap = clamp(s.potCap + fx.pot, 68, 99);
    if (fx.clubBoost) {
      const newLvl = shiftClubLevel(s, s.club, fx.clubBoost);
      chips.push({ label: `🏗️ ${s.club.name} passe en ${divShort(newLvl, s.club.countryId)}`, kind: "trophy" });
      s.history.push({ age: s.age, text: `Un investisseur propulse ${s.club.name} en ${divShort(newLvl, s.club.countryId)}.`, impact: 8 });
    }
    if (fx.trait && !hasTrait(s, fx.trait)) {
      s.traits.push(fx.trait);
      const t = TRAITS[fx.trait];
      chips.push({ label: `${t.icon} Trait : ${t.name}`, kind: "trait" });
    }
    if (fx.flag) s.flags[fx.flag] = true;
    if (fx.clearFlag) delete s.flags[fx.clearFlag];
    if (fx.sched) s.scheduled.push({ id: fx.sched.id, age: s.age + fx.sched.inYears });
    if (fx.trophy) {
      s.seasonTrophies.push(fx.trophy);
      const comp = COMPETITIONS[fx.trophy];
      if (comp) chips.push({ label: `${comp.icon} ${comp.name} !`, kind: "trophy" });
    }
    if (fx.award) {
      // Distinction individuelle promise par un événement : créditée au
      // bilan de la saison en cours (cf. playSeason), comme fx.trophy.
      if (!s.seasonAwards) s.seasonAwards = [];
      s.seasonAwards.push(fx.award);
      const aw = AWARDS[fx.award];
      if (aw) chips.push({ label: `${aw.icon} ${aw.name} !`, kind: "trophy" });
    }
    if (fx.natCall && !s.natTeam.active && !s.natTeam.retired) {
      // Idempotent : si déjà international, l'événement reste cohérent (pas de doublon)
      s.natTeam.active = true;
      // Une première sélection décrochée PAR ÉVÉNEMENT compte autant que celle
      // décrochée par les seuils d'advanceYear : sans ces drapeaux, le badge
      // « Premier de cordée » et la quête « Pépite » restaient hors d'atteinte.
      if (s.age <= 18) s.flags.early_cap = true;
      if (s.age <= 20) s.flags.young_int = true;
      chips.push({ label: `${s.nationality.flag} International !`, kind: "trophy" });
    }
    if (fx.natRetire) {
      s.natTeam.active = false;
      s.natTeam.retired = true;
      chips.push({ label: `${s.nationality.flag} Retraite internationale`, kind: "neutral" });
    }
    if (fx.retire) {
      s.retiring = true;
      chips.push({ label: "👋 Retraite en fin de saison", kind: "neutral" });
    }
    if (fx.end) {
      s.careerEnded = true;
      s.careerEndReason = fx.end;
    }
    return chips;
  }

  // --- Sélection d'événement --------------------------------------------
  // Langue principale d'un pays (COUNTRY_LANG) ; un pays non listé parle sa
  // langue propre (son id), donc étrangère à toutes les autres.
  function langOf(countryId) {
    return (typeof COUNTRY_LANG !== "undefined" && COUNTRY_LANG[countryId]) || countryId;
  }
  // Vrai si le pays du club actuel ne parle PAS la langue natale du joueur.
  function foreignLangFor(s) {
    return langOf(s.club.countryId) !== langOf(s.nationality.homeCountryId);
  }

  function eventEligible(s, ev) {
    if (ev.scheduledOnly) return false;
    const c = ev.cond || {};
    if (ev.once !== false && s.usedEvents.includes(ev.id)) return false;
    if (c.aMin != null && s.age < c.aMin) return false;
    if (c.aMax != null && s.age > c.aMax) return false;
    if (c.levels && !c.levels.includes(lvlOf(s, s.club))) return false;
    if (c.pos && !c.pos.includes(s.position.id)) return false;
    if (c.origin && s.origin.id !== c.origin) return false;
    if (c.lifestyle && s.lifestyle.id !== c.lifestyle) return false;
    if (c.entourage && s.entourage.id !== c.entourage) return false;
    const o = ovr(s);
    if (c.minOvr != null && o < c.minOvr) return false;
    if (c.maxOvr != null && o > c.maxOvr) return false;
    if (c.minRep != null && s.rep < c.minRep) return false;
    if (c.maxRep != null && s.rep > c.maxRep) return false;
    if (c.minMoney != null && s.money < c.minMoney) return false;
    if (c.minBallon != null && s.trophies.ballon < c.minBallon) return false;
    if (c.minForm != null && s.form < c.minForm) return false;
    if (c.maxForm != null && s.form > c.maxForm) return false;
    if (c.minMor != null && s.moral < c.minMor) return false;
    if (c.maxMor != null && s.moral > c.maxMor) return false;
    if (c.minDis != null && s.discipline < c.minDis) return false;
    if (c.maxDis != null && s.discipline > c.maxDis) return false;
    if (c.minCoach != null && s.coachRel < c.minCoach) return false;
    if (c.maxCoach != null && s.coachRel > c.maxCoach) return false;
    if (c.minTeam != null && s.teamRel < c.minTeam) return false;
    if (c.maxTeam != null && s.teamRel > c.maxTeam) return false;
    if (c.flag && !s.flags[c.flag]) return false;
    if (c.notFlag && s.flags[c.notFlag]) return false;
    if (c.trait && !hasTrait(s, c.trait)) return false;
    if (c.notTrait && hasTrait(s, c.notTrait)) return false;
    if (c.nat === true && !s.natTeam.active) return false;
    if (c.nat === false && (s.natTeam.active || s.natTeam.retired)) return false;
    if (c.wc === true && !isWorldCupYear(s.year)) return false;
    if (c.loan === true && !s.loan) return false;
    if (c.loan === false && s.loan) return false;
    if (c.abroad === true && s.club.countryId === s.nationality.homeCountryId) return false;
    if (c.abroad === false && s.club.countryId !== s.nationality.homeCountryId) return false;
    // Événements de choc linguistique : n'ont de sens que si le pays du club
    // parle une autre langue que la langue natale (un Argentin en Espagne, non).
    if (c.foreignLang === true && !foreignLangFor(s)) return false;
    if (c.exoticClub === false && (countryOf(s.club.countryId) || {}).gulf) return false; // déjà au Golfe → pas d'offre "or du désert"
    // Continent d'origine du joueur (nationalité) : événements de sélection
    // propres à un continent, ex. la Coupe d'Afrique (homeContinent: "af").
    if (c.homeContinent) {
      const homeCountry = countryOf(s.nationality.homeCountryId);
      if (!homeCountry || homeCountry.continent !== c.homeContinent) return false;
    }
    if (c.originLevel) {
      const originClub = CLUBS.find((cl) => cl.id === s.clubsPlayed[0]);
      if (!originClub || !c.originLevel.includes(originClub.level)) return false;
    }
    if (c.notAtOriginClub && s.club.id === s.clubsPlayed[0]) return false;
    // Les grands hommages exigent d'avoir marqué l'histoire DU club :
    // ancienneté minimale au club actuel (saisons jouées sous ce maillot)
    if (c.minClubSeasons != null) {
      const seasonsHere = s.seasons.filter((se) => se.clubName === s.club.name).length;
      if (seasonsHere < c.minClubSeasons) return false;
    }
    if (c.chance != null && rng() > c.chance) return false;
    return true;
  }

  function pickEvent(s) {
    // Décision de crépuscule imposée : la pression de retraite a déclenché
    // l'an passé (advanceYear). « Raccrocher » ou « une saison de plus ? »
    if (s.flags.retire_pending) {
      const ev = EVENTS.find((e) => e.id === "ev_retire_decision");
      if (ev) return ev; // le drapeau est retiré à la résolution (clearFlag)
    }
    const dueIdx = s.scheduled.findIndex((sc) => s.age >= sc.age);
    if (dueIdx >= 0) {
      const due = s.scheduled.splice(dueIdx, 1)[0];
      const ev = EVENTS.find((e) => e.id === due.id);
      if (ev) return ev;
    }
    // L'identité de jeu est un rite de passage garanti : si le hasard ne
    // l'a pas proposée avant, le coach l'impose à 21 ans.
    if (!s.archetype && s.age >= 21) {
      const spec = EVENTS.find((e) => e.id === `ev_spec_${s.position.id}` && !s.usedEvents.includes(e.id));
      if (spec) {
        s.usedEvents.push(spec.id);
        return spec;
      }
    }
    const pool = EVENTS.filter((ev) => eventEligible(s, ev));
    if (pool.length === 0) return null;
    const ev = weightedRandom(pool, (e) => e.w || 10);
    if (ev.once !== false) s.usedEvents.push(ev.id);
    return ev;
  }

  // Résout une option : tirage pondéré + application. Les transferts
  // "direct" (rejoindre LE club de l'histoire, sans liste d'offres)
  // sont appliqués immédiatement ici, pour le joueur comme pour le rival.
  // Une option peut être conditionnée (ex. "bon transfert" réservé aux
  // joueurs réputés) : les portes de sortie dépendent du statut.
  function optionEligible(s, option) {
    const c = option.cond;
    if (!c) return true;
    if (c.minRep != null && s.rep < c.minRep) return false;
    if (c.maxRep != null && s.rep > c.maxRep) return false;
    if (c.minOvr != null && ovr(s) < c.minOvr) return false;
    if (c.minMoney != null && s.money < c.minMoney) return false;
    if (c.flag && !s.flags[c.flag]) return false;
    if (c.notFlag && s.flags[c.notFlag]) return false;
    return true;
  }

  function resolveOption(s, option) {
    const outcome = weightedRandom(option.outcomes);
    const chips = applyFx(s, outcome.fx || {});
    let movedTo = null;
    if (outcome.fx && outcome.fx.transfer && outcome.fx.transfer.direct) {
      const offers = offersFor(s, outcome.fx.transfer);
      if (offers.length) {
        applyTransfer(s, offers[0]);
        movedTo = offers[0].club;
        chips.push({ label: `➜ ${movedTo.name}`, kind: "neutral" });
      }
    }
    const impact = netImpact(outcome.fx);
    s.history.push({ age: s.age, text: outcome.text, impact });
    return { outcome, chips, tone: toneOf(outcome.fx, impact), movedTo };
  }

  function netImpact(fx) {
    if (!fx) return 0;
    let n = 0;
    for (const k of ["t", "p", "m", "c", "rep"]) n += fx[k] || 0;
    n += (fx.form || 0) * 0.5 + (fx.mor || 0) * 0.5 + (fx.money || 0) * 2;
    n += (fx.dis || 0) * 0.3 + (fx.coach || 0) * 0.3 + (fx.team || 0) * 0.3;
    if (fx.trophy) n += 12;
    if (fx.inj) n -= fx.inj * 0.8;
    if (fx.end) n = -100;
    return n;
  }

  function toneOf(fx, impact) {
    if (fx && fx.end) return "terrible";
    if (fx && fx.trophy) return "great";
    if (impact >= 9) return "great";
    if (impact >= 3) return "good";
    if (impact <= -12) return "terrible";
    if (impact <= -3) return "bad";
    return "neutral";
  }

  // --- Moments décisifs (interactifs) -----------------------------------------
  // Sélectionne la variante d'un moment décisif : pool par poste si
  // disponible, sinon gk/field, sinon générique. Chaque pool peut être
  // un tableau de scénarios (variété anti-répétition).
  function keyMomentFor(s, momentId) {
    const variants = KEY_MOMENTS[momentId];
    if (!variants) return null;
    let pool = variants[s.position.id]
      || (s.position.id === "gk" ? variants.gk : variants.field)
      || variants.any;
    if (Array.isArray(pool)) pool = pick(pool);
    return pool;
  }

  function keyMomentSuccess(s, option) {
    let p = option.base;
    p += s.position.id === "gk" ? (s.stats.m - 60) / 300 : (s.stats.t - 70) / 350;
    p += (s.form - 60) / 500;
    if (hasTrait(s, "clutch")) p += 0.08;
    return rng() < clamp(p, 0.15, 0.92);
  }

  // Applique un moment décisif générique : retourne { success, text, chips }.
  function playKeyMoment(s, moment, option) {
    const success = keyMomentSuccess(s, option);
    const chips = [];
    if (success && option.repWin) chips.push(...applyFx(s, { rep: option.repWin }));
    if (!success && option.repFail) chips.push(...applyFx(s, { rep: option.repFail }));
    if (success && option.traitWin && !hasTrait(s, option.traitWin)) {
      chips.push(...applyFx(s, { trait: option.traitWin }));
    }
    // Beats scénarisés (mode Histoire) : drapeau posé selon le CHOIX (toujours),
    // et textes propres à l'option si fournis (sinon ceux du moment).
    if (option.flag) s.flags[option.flag] = true;
    const winTxt = option.winText || moment.winText;
    const failTxt = option.failText || moment.failText;
    return { success, text: renderText(s, success ? winTxt : failTxt), chips };
  }

  // --- Coupe du Monde -------------------------------------------------------
  function isWorldCupYear(year) { return year % 4 === 2; }

  // Déroule le tournoi jusqu'à la finale éventuelle. Si la finale est
  // atteinte, l'issue n'est PAS tirée ici : elle se joue dans un moment
  // décisif (resolveWcFinal), interactif pour le joueur, auto pour le rival.
  function playWorldCup(s) {
    // Finale scénarisée (mode Histoire) : la nation atteint la finale à coup sûr
    // l'année où le joueur a l'âge prévu, et le moment décisif de l'histoire
    // remplace la finale générique (cf. STORIES.*.wcFinal).
    const storyFinal = storyWcFinalFor(s);
    const natW = s.nationality.weight;
    const playerBoost = 0.6 + (ovr(s) / 100) * 0.8 + (hasTrait(s, "clutch") ? 0.15 : 0) + (s.flags.wc_fresh ? 0.1 : 0);
    delete s.flags.wc_fresh;
    // Mondial au format 48 équipes (2026) : un tour de plus (seizièmes) → le
    // finaliste joue 8 matchs. WC_STAGES_48 est propre au Mondial.
    let stage = weightedRandom(WC_STAGES_48, (st) => {
      // Tri par force de la nation (façon classement FIFA) : les étapes profondes
      // sont pilotées par natWeight ÉLEVÉ À UNE PUISSANCE (pas de plancher), pour
      // qu'un petit pays n'atteigne quasiment jamais une finale de Mondial. Le
      // talent du joueur (playerBoost) ne pèse plus qu'à la marge : un crack ne
      // porte pas un minnow au sacre. Mondial = le plus sélectif (^2.5).
      if (st.id === "champion" || st.id === "final") return (st.baseW / 2) * Math.pow(natW, 2.5) * (0.6 + playerBoost * 0.5) * 4.6;
      if (st.id === "semi") return st.baseW * Math.pow(natW, 1.8) * (0.4 + playerBoost * 0.4) * 1.9;
      return st.baseW;
    });
    if (storyFinal) stage = WC_STAGES_48.find((st) => st.id === "final") || WC_STAGES_48.find((st) => st.id === "champion") || stage;

    const finalReached = !!storyFinal || stage.id === "champion" || stage.id === "final";
    const wc = {
      year: s.year,
      stage: finalReached ? "final" : stage.id,
      label: finalReached ? "En finale !" : stage.label,
      text: finalReached
        ? "Votre nation renverse tout sur son passage : LA FINALE ! À 90 minutes du toit du monde."
        : stage.text,
      finalPending: finalReached,
      champion: false,
      goldenBall: false,
    };
    if (!finalReached) {
      if (stage.id === "semi") {
        s.rep = clamp(s.rep + 4, 0, 100);
        s.moral = clamp(s.moral - 4, 5, 100);
        s.history.push({ age: s.age, text: `${stage.label} de la Coupe du Monde ${s.year}.`, impact: 8 });
      } else {
        s.moral = clamp(s.moral - 3, 5, 100);
      }
    }
    // 8 matchs pour le finaliste : poules 3 → 16es 4 → 8es 5 → quart 6 → demie 7 → finale 8.
    const games = stage.id === "groups" ? 3 : stage.id === "r32" ? 4 : stage.id === "r16" ? 5 : stage.id === "quarter" ? 6 : stage.id === "semi" ? 7 : 8;
    s.natTeam.caps += games;
    const wcGoals = Math.round(games * s.position.goalRate * (0.4 + s.stats.t / 150) * rand(0.5, 1.4));
    s.natTeam.goals += wcGoals;
    wc.games = games;
    wc.goals = wcGoals;
    if (finalReached) wc.moment = storyFinal || keyMomentFor(s, "wc_final");
    if (storyFinal) wc.storyFinal = true;
    return wc;
  }

  // --- Championnat continental de sélection (Euro / Copa América / CAN) --------
  // Pendant continental de la Coupe du Monde, les années paires HORS Mondial.
  // Auto-résolu (la CDM reste le seul tournoi à finale interactive) : un pendant
  // plus accessible mais moins prestigieux. Le continent vient de la nationalité.
  function isContinentalYear(year) { return year % 4 === 0; }

  function playContinental(s, report) {
    const continent = (countryOf(s.nationality.homeCountryId) || {}).continent;
    const cup = NATIONAL_CUPS[continent];
    if (!cup) return null; // continent sans tournoi (ne devrait pas arriver : nationalités eu/am/af)
    const natW = s.nationality.weight;
    const playerBoost = 0.6 + (ovr(s) / 100) * 0.8 + (hasTrait(s, "clutch") ? 0.15 : 0);
    const stage = weightedRandom(WC_STAGES, (st) => {
      // Tri par force (cf. Mondial), mais un cran plus accessible : un titre
      // continental reste un exploit possible pour un outsider (Grèce 2004,
      // Zambie 2012) et un continent faible peut gagner SA coupe. Gating ^2.0.
      if (st.id === "champion") return st.baseW * Math.pow(natW, 2.0) * (0.6 + playerBoost * 0.5) * 2.4;
      if (st.id === "final") return st.baseW * Math.pow(natW, 2.0) * (0.5 + playerBoost * 0.45) * 2.1;
      if (st.id === "semi") return st.baseW * Math.pow(natW, 1.5) * (0.4 + playerBoost * 0.4) * 1.4;
      return st.baseW;
    });
    const games = stage.id === "groups" ? 3 : stage.id === "r16" ? 4 : stage.id === "quarter" ? 5 : stage.id === "semi" ? 6 : 7;
    s.natTeam.caps += games;
    const goals = Math.round(games * s.position.goalRate * (0.4 + s.stats.t / 150) * rand(0.5, 1.4));
    s.natTeam.goals += goals;
    const cont = {
      year: s.year, continent, cupName: cup.name, cupShort: cup.short, icon: cup.icon,
      stage: stage.id, label: stage.label, text: stage.text, games, goals, champion: stage.id === "champion",
    };
    if (stage.id === "champion") {
      s.trophies.contInt += 1;
      s.continentalNatDetail = s.continentalNatDetail || [];
      s.continentalNatDetail.push({ continent, year: s.year });
      cont.label = `CHAMPION ${cup.of.toUpperCase()}`;
      cont.text = cup.championText;
      s.rep = clamp(s.rep + 6, 0, 100);
      s.moral = clamp(s.moral + 10, 5, 100);
      s.money += 1;
      s.history.push({ age: s.age, text: `Champion ${cup.of} ${s.year} avec ${s.nationality.name} !`, impact: 22 });
      if (!report.awards.includes("ballon_won")) rollBallon(s, report, 1.5); // coup de pouce Ballon d'Or (moindre que le Mondial)
      recheckObjective(s, report);
    } else if (stage.id === "final") {
      cont.label = "Finaliste";
      s.rep = clamp(s.rep + 3, 0, 100);
      s.moral = clamp(s.moral - 5, 5, 100);
      s.history.push({ age: s.age, text: `Finaliste ${cup.of} ${s.year} — l'argent au goût amer.`, impact: 9 });
    } else if (stage.id === "semi") {
      s.rep = clamp(s.rep + 2, 0, 100);
      s.history.push({ age: s.age, text: `Demi-finaliste ${cup.of} ${s.year}.`, impact: 6 });
    } else {
      s.moral = clamp(s.moral - 2, 5, 100);
    }
    return cont;
  }

  // Ligue des Sélections : compétition EUROPÉENNE de sélections jouée les années
  // libres (ni Mondial ni Euro). Trophée secondaire, récompenses moindres qu'un Euro.
  function isNationsLeagueYear(year) { return year % 4 === 1; }

  function playNationsLeague(s, report) {
    const cup = NATIONS_LEAGUE;
    const natW = s.nationality.weight;
    const playerBoost = 0.6 + (ovr(s) / 100) * 0.8 + (hasTrait(s, "clutch") ? 0.15 : 0);
    const stage = weightedRandom(NL_STAGES, (st) => {
      // Ligue des Sélections (Europe) : même tri par force que le continental.
      if (st.id === "champion") return st.baseW * Math.pow(natW, 2.0) * (0.6 + playerBoost * 0.5) * 2.4;
      if (st.id === "final") return st.baseW * Math.pow(natW, 2.0) * (0.5 + playerBoost * 0.45) * 2.1;
      if (st.id === "final_four") return st.baseW * Math.pow(natW, 1.5) * (0.4 + playerBoost * 0.4) * 1.4;
      return st.baseW;
    });
    const games = stage.games;
    s.natTeam.caps += games;
    const goals = Math.round(games * s.position.goalRate * (0.4 + s.stats.t / 150) * rand(0.5, 1.4));
    s.natTeam.goals += goals;
    const nl = {
      year: s.year, cupName: cup.name, cupShort: cup.short, icon: cup.icon,
      stage: stage.id, label: stage.label, text: stage.text, games, goals, champion: stage.id === "champion",
    };
    if (stage.id === "champion") {
      s.trophies.natLeague += 1;
      s.natLeagueDetail = s.natLeagueDetail || [];
      s.natLeagueDetail.push({ year: s.year });
      nl.label = `VAINQUEUR ${cup.of.toUpperCase()}`;
      nl.text = cup.championText;
      s.rep = clamp(s.rep + 3, 0, 100);
      s.moral = clamp(s.moral + 7, 5, 100);
      s.money += 0.4;
      s.history.push({ age: s.age, text: `Vainqueur ${cup.of} ${s.year} avec ${s.nationality.name} !`, impact: 12 });
      if (!report.awards.includes("ballon_won")) rollBallon(s, report, 0.6); // léger coup de pouce (moindre que l'Euro)
      recheckObjective(s, report);
    } else if (stage.id === "final") {
      nl.label = "Finaliste";
      s.rep = clamp(s.rep + 2, 0, 100);
      s.moral = clamp(s.moral - 3, 5, 100);
      s.history.push({ age: s.age, text: `Finaliste ${cup.of} ${s.year}.`, impact: 6 });
    } else if (stage.id === "final_four") {
      s.rep = clamp(s.rep + 1, 0, 100);
      s.history.push({ age: s.age, text: `Dernier carré ${cup.of} ${s.year}.`, impact: 4 });
    } else {
      s.moral = clamp(s.moral - 1, 5, 100);
    }
    return nl;
  }

  // --- Jeux Olympiques (tournoi U23, années %4==3) ----------------------------
  function isOlympicYear(year) { return year % 4 === 3; }

  function playOlympics(s, report) {
    const natW = s.nationality.weight;
    const playerBoost = 0.6 + (ovr(s) / 100) * 0.8 + (hasTrait(s, "clutch") ? 0.15 : 0);
    const stage = weightedRandom(OLYMPIC_STAGES, (st) => {
      // Plus ouvert que le Mondial (tournoi U23, terre d'exploits) : gating ^1.6.
      if (st.id === "champion" || st.id === "final") return st.baseW * Math.pow(natW, 1.6) * (0.5 + playerBoost * 0.5) * 3.0;
      if (st.id === "semi") return st.baseW * Math.pow(natW, 1.3) * (0.4 + playerBoost * 0.4) * 1.8;
      return st.baseW;
    });
    const games = stage.games;
    const goals = Math.round(games * s.position.goalRate * (0.4 + s.stats.t / 150) * rand(0.5, 1.4));
    s.youth = s.youth || { caps: 0, goals: 0, tiers: [] };
    s.youth.caps += games; // les JO (U23) comptent dans les sélections jeunes
    s.youth.goals += goals;
    const ol = { year: s.year, stage: stage.id, label: stage.label, text: stage.text, games, goals, icon: "🥇", cupName: "Jeux Olympiques", medal: null };
    if (stage.id === "champion") {
      s.trophies.olympic += 1; s.olympicMedals.gold += 1; ol.medal = "gold"; ol.label = "MÉDAILLE D'OR";
      s.rep = clamp(s.rep + 5, 0, 100); s.moral = clamp(s.moral + 9, 5, 100);
      s.history.push({ age: s.age, text: `🥇 Champion olympique ${s.year} avec ${s.nationality.name} !`, impact: 16 });
      if (!report.awards.includes("ballon_won")) rollBallon(s, report, 0.5); // petit coup de pouce Ballon d'Or
    } else if (stage.id === "final") {
      s.olympicMedals.silver += 1; ol.medal = "silver"; ol.label = "Médaille d'argent";
      s.rep = clamp(s.rep + 3, 0, 100); s.moral = clamp(s.moral - 2, 5, 100);
      s.history.push({ age: s.age, text: `🥈 Médaille d'argent olympique ${s.year}.`, impact: 9 });
    } else if (stage.id === "semi") {
      s.olympicMedals.bronze += 1; ol.medal = "bronze"; ol.label = "Médaille de bronze";
      s.rep = clamp(s.rep + 2, 0, 100);
      s.history.push({ age: s.age, text: `🥉 Médaille de bronze olympique ${s.year}.`, impact: 7 });
    } else {
      s.moral = clamp(s.moral - 2, 5, 100);
    }
    return ol;
  }

  // Renvoie le moment de finale scénarisée si le joueur suit une histoire dont
  // la finale de CDM tombe à son âge actuel (année de Mondial garantie).
  function storyWcFinalFor(s) {
    if (!s.storyId || typeof STORIES === "undefined") return null;
    const story = STORIES.find((st) => st.id === s.storyId);
    if (story && story.wcFinal && s.age === story.wcFinal.age) return story.wcFinal;
    return null;
  }

  // Résout la finale de CDM. optionId null → choix aléatoire (rival, simu).
  function resolveWcFinal(s, report, optionId) {
    const wc = report.wc;
    const moment = wc.moment;
    const option = moment.options.find((o) => o.id === optionId) || pick(moment.options);
    const res = playKeyMoment(s, moment, option);
    res.option = option;
    wc.finalPending = false;
    if (res.success) {
      s.momentWins += 1;
      if (option.id === "panenka") s.flags.panenka_final = true;
      wc.champion = true;
      wc.stage = "champion";
      wc.label = "CHAMPION DU MONDE";
      s.trophies.worldCup += 1;
      report.trophies.push("worldCup");
      s.rep = clamp(s.rep + 8, 0, 100);
      s.moral = clamp(s.moral + 12, 5, 100);
      s.money += 2;
      s.history.push({ age: s.age, text: `Champion du monde ${s.year} avec ${s.nationality.name} !`, impact: 40 });
      // Distinctions du tournoi
      if (ovr(s) >= 85 && rng() < 0.55) {
        wc.goldenBall = true;
        grantAward(s, report, "wc_golden_ball");
      }
      if (wc.goals >= 5) grantAward(s, report, "wc_top_scorer");
      // Le sacre mondial rebat les cartes du Ballon d'Or de fin d'année
      if (!report.awards.includes("ballon_won")) rollBallon(s, report, 3 + (wc.goldenBall ? 2.5 : 0));
      recheckObjective(s, report); // « Ramener un trophée majeur » : le Mondial compte
    } else {
      wc.stage = "final";
      wc.label = "Finaliste";
      s.rep = clamp(s.rep + 4, 0, 100);
      s.moral = clamp(s.moral - 8, 5, 100);
      s.history.push({ age: s.age, text: `Finaliste de la Coupe du Monde ${s.year} — si près du rêve.`, impact: 10 });
    }
    return res;
  }

  // --- Statut au club (rôle) --------------------------------------------------
  // Rôle proposé sur une offre : dérivé de ta marge (OVR − niveau attendu du club),
  // modulé par l'âge/potentiel (un jeune crack dans un grand club = projet) et le
  // contexte (le Golfe construit autour de ses signatures). Retourne un INDEX 0→4.
  // Plancher de statut : « Espoir » n'a de sens que pour un jeune. Passé
  // ROLE_ESPOIR_MAX_AGE, on ne peut plus redescendre en dessous de « Sporadique ».
  function roleFloor(s) { return s.age <= ROLE_ESPOIR_MAX_AGE ? 0 : 1; }

  function roleForClub(s, club) {
    const bar = BALANCE.expectedLevel[lvlOf(s, club)];
    const margin = ovr(s) - bar;
    const m = BALANCE.role.margins;
    let idx = margin >= m[0] ? 4 : margin >= m[1] ? 3 : margin >= m[2] ? 2 : margin >= m[3] ? 1 : 0;
    const lvl = lvlOf(s, club);
    const big = lvl === "elite" || lvl === "d1";
    if (s.age <= 20 && big && idx > 1) idx -= 1;                              // recruté pour l'avenir
    if ((countryOf(club.countryId) || {}).gulf) idx = Math.min(4, idx + 1);  // le Golfe titularise ses recrues
    if (s.flags && s.flags.prodigy && s.age <= 20) idx = Math.max(idx, 3);   // un crack est lancé
    return clamp(idx, roleFloor(s), 4);
  }
  function roleOf(s) { return ROLES[typeof s.role === "number" ? clamp(s.role, 0, 4) : 2]; }

  // Revue de statut en fin de saison (dynamique) : promotion si tu dépasses
  // l'attente et que le coach te fait confiance ; rétrogradation si tu es sous
  // l'attente, si la confiance s'effondre, ou si une recrue star débarque à ton
  // poste. Sautée la 1re saison au club (le rôle vient d'être signé).
  function reviewRole(s, report) {
    if (s.loan || (s.seasonsAtClub || 0) < 1) return;
    const role = roleOf(s);
    const r = report.rating || 6;
    const from = typeof s.role === "number" ? s.role : 2;
    const floor = roleFloor(s); // plus d'« Espoir » passé 20 ans
    let idx = from, reason = null;
    if (r >= role.expect + 0.6 && s.coachRel >= 60 && idx < 4 && rng() < 0.7) { idx++; reason = "up"; }
    else if ((r <= role.expect - 0.7 || s.coachRel < 32) && idx > floor && rng() < 0.75) { idx--; reason = "down"; }
    else if (idx >= 2 && rng() < BALANCE.role.starSignChance) { idx--; reason = "signing"; }
    if (idx < floor) idx = floor;
    if (idx !== from) {
      s.role = idx;
      s.coachRel = clamp(s.coachRel + (idx > from ? 4 : -3), 5, 100);
      report.roleChange = { from, to: idx, reason };
    }
  }

  // --- Temps de jeu -----------------------------------------------------------
  function playingTimeFactor(s) {
    const role = roleOf(s);
    let pt = role.pt + (s.coachRel - 55) / 180; // le rôle ANCRE, la confiance du coach module
    // Confiance du coach : quand elle s'effondre, tu ne joues plus, peu importe
    // ton statut. Un vrai levier, pas un détail cosmétique.
    if (s.coachRel < 22) pt -= 0.32;
    else if (s.coachRel < 38) pt -= 0.13;
    if (s.loan) pt += 0.22;
    if (s.flags.prodigy && s.age <= 20) pt += 0.2; // on lance les cracks très tôt
    // Rotation du vétéran : après 32 ans, la jeunesse pousse et le temps de jeu
    // s'érode un peu chaque saison — sauf les gardiens, qui enchaînent tard.
    if (s.age > 32 && s.position.id !== "gk") pt -= (s.age - 32) * 0.03;
    return clamp(pt, 0.05, 1);
  }

  // Aptitude à durer (recalculée chaque saison : un trait gagné en cours de route
  // compte). Repousse le pivot de la pression de retraite. ~[-6, +10].
  function longevityScore(s) {
    let L = 0;
    L += s.position.id === "gk" ? 4 : s.position.id === "def" ? 2 : s.position.id === "mil" ? 1 : 0;
    if (hasTrait(s, "ironman")) L += 4;
    if (hasTrait(s, "glass")) L -= 4;
    if (hasTrait(s, "zen")) L += 1;
    L += (s.discipline - 50) / 12;
    L += (s.stats.p - 60) / 15;
    return L;
  }

  // --- Objectif de saison fixé par le club --------------------------------------
  function setSeasonObjective(s) {
    const lvl = lvlOf(s, s.club);
    if (rng() < 0.5) {
      if (s.position.id === "att") {
        const n = Math.max(6, Math.round(38 * s.position.goalRate * (0.5 + ovr(s) / 220)));
        return { type: "goals", n, label: `Marquer ${n} buts` };
      }
      if (s.position.id === "gk") {
        const n = Math.max(6, Math.round(38 * (0.2 + ovr(s) / 320)));
        return { type: "cs", n, label: `${n} clean sheets` };
      }
      const n = lvl === "elite" ? 7.0 : lvl === "d1" ? 6.8 : 6.5;
      return { type: "rating", n, label: `Note de saison ≥ ${n.toFixed(1)}` };
    }
    if (lvl === "elite") return { type: "trophy", label: "Ramener un trophée majeur" };
    if (lvl === "d1") return { type: "top", n: 6, label: "Accrocher le top 6" };
    if (lvl === "d2") return { type: "top", n: 5, label: "Jouer la montée (top 5)" };
    if (lvl === "d3") return { type: "top", n: 6, label: "Jouer la montée (top 6)" };
    return { type: "top", n: 8, label: "Viser le haut de tableau (top 8)" };
  }

  function objectiveMet(obj, report) {
    if (!obj) return false;
    if (obj.type === "goals") return report.goals >= obj.n;
    if (obj.type === "cs") return report.cleanSheets >= obj.n;
    if (obj.type === "rating") return report.rating >= obj.n;
    if (obj.type === "trophy") return report.trophies.length > 0;
    if (obj.type === "top") return report.leaguePos <= obj.n;
    return false;
  }

  // --- Une de presse de fin de saison ---------------------------------------------
  function headlineFor(s, report) {
    // Une saison réellement PRODUCTIVE (buts + passes décisives) n'est jamais
    // une "année blanche", même si la note brute est modeste — typiquement un
    // jeune à l'OVR encore faible qui performe déjà. Le commentaire doit coller
    // aux statistiques affichées, pas à la seule note.
    const productive = report.matches >= 10 &&
      (report.goals + report.assists) >= report.matches * 0.33;
    // Un jeune (≤ 20 ans) n'est jamais « fini » : au lieu du banc ou du flop, la
    // presse le voit en pépite / futur prodige. On garde trophées & saison
    // exceptionnelle (ces unes-là restent méritées à tout âge).
    const young = s.age <= 20;
    let pool = null;
    if (report.injuryWeeks >= 12) pool = HEADLINES.injury;
    else if (young && (report.benched || report.rating <= 5.3)) pool = HEADLINES.prospect;
    else if (report.benched) pool = HEADLINES.benched;
    else if (report.trophies.length > 0) pool = HEADLINES.trophy;
    else if (report.rating >= 7.8) pool = HEADLINES.wonder;
    else if (productive && report.rating <= 5.3) pool = HEADLINES.solid; // productif mais mal noté → "valeur sûre", pas "flop"
    else if (report.rating <= 5.3) pool = HEADLINES.flop;
    else if ((report.rating >= 7 || productive) && rng() < 0.6) pool = HEADLINES.solid;
    if (!pool) return null;
    return pick(pool).replace(/\{name\}/g, s.name).replace(/\{club\}/g, s.club.name);
  }

  // --- Récompenses individuelles ----------------------------------------------
  function grantAward(s, report, id) {
    if (report.awards.includes(id)) return;
    const award = AWARDS[id];
    if (!award) return;
    applyFx(s, award.fx || {});
    report.awards.push(id);
    s.awardCounts[id] = (s.awardCounts[id] || 0) + 1;
    if (["league_mvp", "wc_golden_ball", "cl_mvp"].includes(id)) {
      s.history.push({ age: s.age, text: `${award.icon} ${award.name} ${s.year}.`, impact: 12 });
    }
  }

  function rollSeasonAwards(s, report) {
    const lvl = lvlOf(s, s.club);
    const isTop = lvl === "elite" || lvl === "d1";
    const r = report.rating;
    if (isTop) {
      if (r >= 7.9 && rng() < 0.65) grantAward(s, report, "league_mvp");
      else if (r >= 7.5 && s.age <= 21 && rng() < 0.6) grantAward(s, report, "young_star");
      if (report.assists >= 14 && rng() < 0.5) grantAward(s, report, "top_assist");
      if (r >= 7.3 && rng() < 0.6) grantAward(s, report, "team_of_season");
      if (s.position.id === "gk" && report.cleanSheets >= 17 && rng() < 0.5) grantAward(s, report, "golden_glove");
      if (!s.flags.revelation_won && r >= 7.4 && s.age <= 22) {
        s.flags.revelation_won = true;
        grantAward(s, report, "revelation");
      }
    }
    if (report.trophies.includes("continental") && r >= 7.5 && rng() < 0.5) grantAward(s, report, "cl_mvp");
    // Légende du club : longévité + statut au même endroit
    if (!s.flags.club_legend_won && s.rep >= 70) {
      const seasonsHere = s.seasons.filter((se) => se.clubName === s.club.name).length;
      if (seasonsHere >= 7) {
        s.flags.club_legend_won = true;
        grantAward(s, report, "club_legend");
      }
    }
  }

  // --- Ballon d'Or (modèle à points de saison + classement top 30) ---------------
  // extraPts : points supplémentaires injectés après coup (sacre mondial).
  // Si la saison ne suffit pas pour le sacre, elle peut valoir une place
  // dans le classement (top 30) — uniquement quand c'est crédible.
  function rollBallon(s, report, extraPts) {
    if (report.awards.includes("ballon_won")) return false;
    const lvl = lvlOf(s, s.club);
    if (lvl !== "elite" && lvl !== "d1") return false;
    // Loin des radars européens, ni sacre ni classement : le prix de l'exil doré
    if ((countryOf(s.club.countryId) || {}).gulf) return false;

    // Points de saison (communs au sacre et au classement)
    let pts = (report.rating - 7) * 2.2 + (extraPts || 0);
    if (report.trophies.includes("continental")) pts += report.continentalContinent === "eu" ? 2.2 : 0.8;
    if (report.trophies.includes("continental2")) pts += 0.7; // Trophée d'Europe (C3 : aucun poids Ballon)
    if (report.trophies.includes("worldCup") && !extraPts) pts += 3;
    if (report.trophies.includes("league")) pts += 1.2;
    if (report.trophies.includes("cup")) pts += 0.4;
    if (report.trophies.includes("goldenBoot")) pts += 1.5;
    for (const id of report.awards) pts += (AWARDS[id] && AWARDS[id].ballonPts) || 0;
    if (s.rep >= 85) pts += 0.8;
    else if (s.rep >= 75) pts += 0.4;
    if (lvl === "elite") pts += 0.6;
    if (hasTrait(s, "clutch")) pts += 0.3;

    // Sacre : réservé aux saisons vraiment exceptionnelles
    if (ovr(s) >= BALANCE.ballonMinOvr && s.rep >= BALANCE.ballonMinRep && report.rating >= 7.2) {
      const count = s.trophies.ballon;
      const momentum = count === 0 ? 1 : count <= 2 ? BALANCE.ballonMomentum : BALANCE.ballonDynasty;
      const chance = clamp((pts - BALANCE.ballonPtsFloor) * BALANCE.ballonSlope, 0, BALANCE.ballonCap) * s.nationality.weight * momentum;
      if (rng() < chance) {
        s.trophies.ballon += 1;
        report.trophies.push("ballon");
        report.awards.push("ballon_won");
        report.ballonRank = 1;
        s.bestBallonRank = 1;
        s.rep = clamp(s.rep + 8, 0, 100);
        s.money += 1.5;
        s.history.push({ age: s.age, text: `Ballon d'Or ${s.year} — le monde à vos pieds.`, impact: 30 });
        if (s.age <= 23) s.flags.early_ballon = true;
        return true;
      }
    }

    // Classement top 30 : grande saison exigée, cohérence stricte —
    // défenseurs/gardiens et championnats moins huppés classés plus bas,
    // sauf saison hors norme.
    if (report.rating >= 7 && ovr(s) >= 78 && s.rep >= 55 && pts >= 2.2) {
      let rankPts = pts;
      if ((s.position.id === "def" || s.position.id === "gk") && report.rating < 8) rankPts -= 1.2;
      if (lvl === "d1") rankPts -= 0.8;
      let rank;
      if (rankPts >= 8) rank = randInt(2, 3);
      else if (rankPts >= 6.5) rank = randInt(2, 5);
      else if (rankPts >= 5) rank = randInt(4, 10);
      else if (rankPts >= 3.5) rank = randInt(8, 20);
      else rank = randInt(15, 30);
      report.ballonRank = rank;
      if (!s.bestBallonRank || rank < s.bestBallonRank) s.bestBallonRank = rank;
      if (rank <= 10) s.rep = clamp(s.rep + 2, 0, 100);
      if (rank <= 3) s.history.push({ age: s.age, text: `Sur le podium du Ballon d'Or ${s.year} (${rank}ᵉ).`, impact: 12 });
    }
    return false;
  }

  // --- Blessures --------------------------------------------------------------
  // Applique une blessure : modulation traits, répartition saison / dette
  // chronique, drapeaux de fragilité. AUCUN rng. Retourne les semaines modulées.
  function applyInjury(s, rawWeeks, forceBig) {
    let weeks = rawWeeks;
    if (hasTrait(s, "ironman")) weeks = Math.round(weeks * 0.6);
    else if (hasTrait(s, "glass")) weeks = Math.round(weeks * 1.5);
    weeks = Math.max(1, weeks);
    const cap = BALANCE.injury.seasonCap;
    const thisSeason = Math.min(weeks, cap);
    s.injuryWeeks += thisSeason;
    s.seasonInjuryWeeks = (s.seasonInjuryWeeks || 0) + thisSeason;
    if (weeks > cap) s.chronicWeeks = (s.chronicWeeks || 0) + (weeks - cap);
    const big = forceBig != null ? forceBig : weeks >= BALANCE.injury.severeThreshold;
    if (big) { s.flags.big_injury = true; s.injuryHistory = (s.injuryHistory || 0) + 1; }
    return weeks;
  }
  // Tirage de blessure de la saison. rng : occurrence TOUJOURS ; si touché,
  // gravité (weightedRandom) + durée (randInt). Renvoie {tier, weeks} ou null.
  function rollInjury(s, pt) {
    const B = BALANCE.injury;
    let p = B.baseChance;
    if (s.age > 29) p += (s.age - 29) * B.ageStep;
    if (s.age <= 20) p -= B.youthReduce;
    p += Math.max(0, pt - 0.5) * B.minutesCoef;
    if (s.discipline < 40) p += B.hygieneAdd;
    p += (s.injuryHistory || 0) * B.historyAdd;
    if (hasTrait(s, "glass")) p += B.glassAdd;
    else if (hasTrait(s, "ironman")) p += B.ironmanAdd;
    p = clamp(p, B.minChance, B.maxChance);
    if (rng() >= p) return null;
    const bias = clamp(Math.max(0, s.age - 30) * B.severityBiasAge + (s.injuryHistory || 0) * B.severityBiasHistory + (hasTrait(s, "glass") ? B.severityBiasGlass : 0), 0, 1);
    const tier = weightedRandom(B.tiers, (t) => (t.up ? t.w * (1 + bias * 2) : t.w / (1 + bias)));
    return { tier, weeks: randInt(tier.min, tier.max) };
  }
  function injuryTier(id) { return BALANCE.injury.tiers.find((t) => t.id === id); }
  // Probabilité de fin de carrière (rarissime) d'une grave/catastrophe. AUCUN rng.
  function injuryEndChance(s, tier) {
    const B = BALANCE.injury;
    if (!tier || !tier.endChance) return 0;
    let p = tier.endChance + Math.max(0, s.age - 30) * B.endAgeStep + (s.injuryHistory || 0) * B.endHistory;
    if (hasTrait(s, "glass")) p *= B.endGlass;
    else if (hasTrait(s, "ironman")) p *= B.endIronman;
    return clamp(p, 0, B.endCap);
  }

  // --- Simulation d'une saison ----------------------------------------------
  function playSeason(s) {
    const lvl = lvlOf(s, s.club);
    const report = { age: s.age, year: s.year, clubName: s.club.name, countryId: s.club.countryId, level: lvl, trophies: [], awards: [], lines: [], pendingMoments: [], onLoan: !!s.loan };
    s.objective = setSeasonObjective(s);
    report.objectiveLabel = s.objective.label;

    // Brèves de saison
    if (rng() < BALANCE.microChance) {
      const eligible = MICRO_EVENTS.filter((m) => s.age >= m.aMin && s.age <= m.aMax && (!m.pos || m.pos.includes(s.position.id)) && (!m.foreignLang || foreignLangFor(s)));
      if (eligible.length) {
        const micro = weightedRandom(eligible, (m) => m.w);
        applyFx(s, micro.fx || {});
        report.lines.push({ text: micro.text, impact: netImpact(micro.fx) });
        if (Math.abs(netImpact(micro.fx)) >= 8) s.history.push({ age: s.age, text: micro.text, impact: netImpact(micro.fx) });
      }
    }

    // Hygiène de vie
    if (s.discipline < 40 && rng() < 0.35) {
      s.form = clamp(s.form - 4, 5, 100);
      s.injuryWeeks += 2;
      report.lines.push({ text: "Des écarts d'hygiène de vie répétés se paient sur le terrain.", impact: -5 });
    } else if (s.discipline >= 72) {
      s.form = clamp(s.form + 2, 5, 100);
    }
    // Trajectoire instable : le mental fait le yoyo
    if (s.trajectory.id === "unstable" && rng() < 0.4) {
      s.form = clamp(s.form - randInt(2, 8), 5, 100);
      s.moral = clamp(s.moral - randInt(0, 6), 5, 100);
    }

    // Temps de jeu et matchs
    const pt = playingTimeFactor(s);
    report.pt = pt;

    // --- Blessures : dette chronique reversée, puis tirage de saison -----------
    // (avant injuryFactor : une blessure ampute les matchs de cette saison)
    if ((s.chronicWeeks || 0) > 0) {
      const carry = Math.min(s.chronicWeeks, BALANCE.injury.carryCap);
      s.injuryWeeks += carry;
      s.seasonInjuryWeeks = (s.seasonInjuryWeeks || 0) + carry;
      s.chronicWeeks -= carry;
      report.carryInjury = carry;
    }
    const seasonInj = rollInjury(s, pt);
    if (seasonInj) {
      applyInjury(s, seasonInj.weeks, seasonInj.tier.big);
      s.moral = clamp(s.moral - seasonInj.tier.mor, 5, 100);
      s.form = clamp(s.form - seasonInj.tier.form, 5, 100);
      report.seasonInjury = { tier: seasonInj.tier.id, weeks: seasonInj.weeks };
      s.history.push({ age: s.age, text: `${BALANCE.injury.labels[seasonInj.tier.id]} (${seasonInj.weeks} sem.) en ${s.year}.`, impact: -(seasonInj.tier.mor + 4) });
      // Grosse blessure → carte interactive « chemin du retour »
      if (seasonInj.tier.interactive) {
        report.pendingMoments.push({
          type: "injury", label: "Coup dur",
          winLabel: "De retour, plus fort", failLabel: "Convalescence prolongée",
          moment: keyMomentFor(s, "injury"),
        });
      }
    }

    const [mMin, mMax] = BALANCE.matchesByLevel[lvl];
    const injuryFactor = clamp(1 - s.injuryWeeks / 42, 0.05, 1);
    const matches = Math.round(rand(mMin, mMax) * pt * injuryFactor);
    report.matches = matches;
    report.injuryWeeks = s.injuryWeeks;
    // Capitanat : le brassard revient au patron du vestiaire — soit désigné par un
    // événement (flag captain), soit un Leader né installé, soit un vétéran fidèle
    // et respecté du club. Une fois acquis, le brassard reste. Les matchs joués
    // capitaine sont cumulés pour le bilan final (les prêts n'en font pas partie).
    // Aucun hasard : dépend uniquement de l'état, le déterminisme est préservé.
    if (!s.loan && matches > 0) {
      const seasonsHere = s.seasons.filter((se) => se.clubName === s.club.name).length;
      if (!s.flags.captain && ((hasTrait(s, "leader") && s.age >= 26 && seasonsHere >= 2) ||
          (seasonsHere >= 4 && s.age >= 30 && s.rep >= 62))) {
        // Nomination : le vestiaire confie le brassard. Une reconnaissance qui
        // rejaillit sur la réputation, annoncée au récap et dans l'historique.
        s.flags.captain = true;
        s.rep = clamp(s.rep + 2, 0, 100);
        report.newCaptain = true;
        report.lines.push({ text: "🅒 Le vestiaire vous confie le brassard de capitaine.", impact: 7 });
        s.history.push({ age: s.age, text: `Nommé capitaine ${deOf(s.club.name)}.`, impact: 7 });
      }
      if (s.flags.captain) {
        s.captainMatches += matches;
        report.captain = true;
        // Rôle de patron : le brassard resserre le vestiaire et le lien au coach
        // (leadership au quotidien). Bonus modéré, purement déterministe.
        s.teamRel = clamp(s.teamRel + 3, 5, 100);
        s.coachRel = clamp(s.coachRel + 2, 5, 100);
      }
    }

    // Performance individuelle (modulée par l'archétype de jeu)
    const arch = s.archetype ? s.archetype.mods : {};
    const perf = 0.32 + s.stats.t / 160 + (s.form - 60) / 400 + (s.moral - 60) / 600;
    report.goals = Math.max(0, Math.round(matches * s.position.goalRate * perf * (arch.goals || 1) * rand(0.75, 1.3)));
    report.assists = Math.max(0, Math.round(matches * s.position.assistRate * perf * (arch.assists || 1) * rand(0.7, 1.3)));
    report.cleanSheets = s.position.id === "gk"
      ? Math.max(0, Math.round(matches * (0.18 + ovr(s) / 280) * (arch.cs || 1) * rand(0.8, 1.2)))
      : 0;

    // Note de saison
    let rating = 5.4 + (ovr(s) - 62) / 14 + (s.form - 60) / 90 + (pt - 0.7) * 0.8 + (arch.rating || 0);
    // Rendement offensif : buts ET passes décisives (les passes ne comptaient
    // PAS avant). Rapporté à l'attendu du poste → neutre pour une saison type,
    // franchement positif pour une vraie production. Un jeune qui plante 15 G/A
    // n'est plus "en échec" juste parce que son OVR est encore modeste.
    if (s.position.id !== "gk") {
      const expGA = matches * (s.position.goalRate + s.position.assistRate);
      rating += clamp((report.goals + report.assists - expGA * 0.9) / 24, -0.6, 1.6);
    }
    rating = clamp(rating + rand(-0.35, 0.45), 3.5, 9.9);
    report.rating = Math.round(rating * 10) / 10;

    // Trophées collectifs & destin du club (titre, montée, barrage, relégation)
    // Sommet de la pyramide DE LA NATION (division affichée « D1 »/« Élite »),
    // pas seulement le top mondial : un petit pays dont le meilleur échelon vaut
    // un D3 mondial n'a AUCUNE division au-dessus — donc ni barrage de montée ni
    // « montée » possibles (on est déjà champion de son pays).
    const topDiv = divShort(lvl, s.club.countryId);
    const isTopFlight = topDiv === "D1" || topDiv === "Élite";
    const teamBoost = 1 + (rating - 6.6) * 0.12;
    // Ticket "vainqueur de Coupe Nationale la saison PASSÉE" → C2 européen ; on
    // le lit et le vide AVANT tout crédit de coupe de cette saison (sinon un
    // sacre de coupe cette année ouvrirait l'Europe la même année). Aucun rng.
    const euroTicket = !!s.euroCupTicket;
    s.euroCupTicket = false;
    const evTrophies = s.seasonTrophies.splice(0);
    for (const tr of evTrophies) {
      if (tr === "league") s.trophies.league += 1;
      if (tr === "cup") {
        s.trophies.cup += 1;
        if (((countryOf(s.club.countryId) || {}).continent) === "eu") s.euroCupTicket = true; // arme le ticket pour N+1
      }
      if (tr === "continental") {
        s.trophies.continental += 1;
        const cont = (countryOf(s.club.countryId) || {}).continent || "eu";
        report.continentalContinent = cont;
        s.continentalDetail.push({ continent: cont, year: s.year });
      }
      if (tr === "goldenBoot") s.trophies.goldenBoot += 1;
      if (tr !== "worldCup") report.trophies.push(tr);
    }
    if (evTrophies.includes("league")) {
      s.leagueTitlesDetail.push({ countryId: s.club.countryId, level: lvl, clubId: s.club.id, year: s.year });
    }
    const wonDivision = !evTrophies.includes("league") && rng() < BALANCE.titleChance[lvl] * teamBoost;
    if (wonDivision && isTopFlight) {
      s.trophies.league += 1;
      report.trophies.push("league");
      s.leagueTitlesDetail.push({ countryId: s.club.countryId, level: lvl, clubId: s.club.id, year: s.year });
    } else if (wonDivision) {
      report.divisionTitle = true;
      report.promoted = true;
      // Un titre de division inférieure (Régional/D3/D2) EST un titre de champion :
      // il compte dans le total (compteur « Titres », carte partageable, Panthéon),
      // au même titre qu'un sacre en D1. Le détail par division reste distinct via
      // leagueTitlesDetail ; les quêtes/badges « champion top-flight » filtrent par
      // niveau et ne sont donc pas affectés.
      s.trophies.league += 1;
      s.leagueTitlesDetail.push({ countryId: s.club.countryId, level: lvl, clubId: s.club.id, year: s.year });
      s.rep = clamp(s.rep + Math.round(4 * visibilityOf(s)), 0, 100);
      s.moral = clamp(s.moral + 6, 5, 100);
      s.history.push({ age: s.age, text: `Champion ${deOf(divShort(lvl, s.club.countryId))} ${s.year} avec ${s.club.name} — la montée !`, impact: 9 });
    } else if (!isTopFlight && rating >= 6.4 && rng() < (BALANCE.playoffChance[lvl] || 0) * teamBoost) {
      // Saison solide sans titre : la montée se joue en barrage (moment décisif)
      report.playoffRun = true;
      report.pendingMoments.push({
        type: "playoff", label: "Barrage de montée",
        winLabel: "MONTÉE !", failLabel: "Échec en barrage",
        moment: keyMomentFor(s, "promo_playoff"),
      });
    }
    // Relégation (d1 et d2) : vos performances protègent le club — et les
    // géants historiques ne coulent presque jamais plus bas que la D1
    let relegBase = BALANCE.relegationChance[lvl] || 0;
    if (relegBase && lvl === "d1" && s.club.level === "elite") relegBase *= BALANCE.eliteRelegShield;
    if (!report.promoted && !report.playoffRun && relegBase > 0 &&
        rng() < relegBase * clamp(1 - (rating - 6.3) * 0.35, 0.2, 1.6)) {
      report.relegated = true;
      s.moral = clamp(s.moral - 8, 5, 100);
      s.history.push({ age: s.age, text: `Relégation ${deOf(s.club.name)} en ${s.year} — une saison noire.`, impact: -10 });
    }
    // La coupe nationale : atteindre la finale se joue ici, la gagner se
    // joue dans un moment décisif
    if (!evTrophies.includes("cup") && rng() < BALANCE.cupChance[lvl] * BALANCE.cupFinalReachMult * teamBoost) {
      report.pendingMoments.push({
        type: "cup_final", label: "Finale de la Coupe Nationale",
        winLabel: "VAINQUEUR !", failLabel: "Finale perdue",
        moment: keyMomentFor(s, "cup_final"),
      });
    }
    // Coupe continentale de club : ATTEINDRE la finale se joue ici, la GAGNER se
    // joue dans un moment décisif interactif (continental_final). Hors d'Europe,
    // la D1 est le sommet (pas de clubs "élite") → elle conteste sa Coupe des Champions.
    // 3 tiers en Europe : élite → C1 (Coupe des Champions) ; vainqueur de Coupe
    // Nationale (ticket) → C2 (Trophée d'Europe), TOUTES divisions ; D1 → C3
    // (Bouclier d'Europe). Hors d'Europe : la Coupe des Champions du continent,
    // inchangée. UN SEUL engagement/saison. Tier décidé SANS hasard ; le rng() de
    // portée reste l'unique tirage, à sa place (même pour tier 0 : rng consommé).
    if (!evTrophies.includes("continental") && !evTrophies.includes("continental2") && !evTrophies.includes("continental3")) {
      const continent = (countryOf(s.club.countryId) || {}).continent || "eu";
      let tier = 0, reachP = 0, cup = null;
      if (continent === "eu") {
        if (lvl === "elite") { tier = 1; reachP = BALANCE.continentalReach.eu.elite || 0; cup = CONTINENTAL_CUPS.eu; }
        else if (euroTicket) { tier = 2; reachP = BALANCE.euroReach.c2[lvl] || 0; cup = COMPETITIONS.continental2; }
        else if (lvl === "d1") { tier = 3; reachP = BALANCE.euroReach.c3.d1 || 0; cup = COMPETITIONS.continental3; }
      } else {
        tier = 1; reachP = BALANCE.continentalReach.other[lvl] || 0; cup = CONTINENTAL_CUPS[continent] || CONTINENTAL_CUPS.eu;
      }
      if (rng() < reachP * teamBoost) {
        report.pendingMoments.push({
          type: "continental_final",
          tier,
          continent: tier === 1 ? continent : "eu",
          label: `Finale · ${cup.name}`,
          winLabel: tier === 3 ? "BOUCLIER D'EUROPE REMPORTÉ !" : tier === 2 ? "TROPHÉE D'EUROPE REMPORTÉ !" : "SACRE CONTINENTAL !",
          failLabel: tier === 1 ? "Finale continentale perdue" : "Finale européenne perdue",
          moment: keyMomentFor(s, "continental_final"),
        });
      }
    }

    // Classement (mise en scène cohérente avec le destin du club)
    if (report.trophies.includes("league") || report.divisionTitle) report.leaguePos = 1;
    else if (report.playoffRun) report.leaguePos = randInt(2, 4);
    else if (report.relegated) report.leaguePos = lvl === "d1" ? randInt(16, 18) : randInt(17, 19);
    else report.leaguePos = lvl === "elite" ? randInt(2, 7) : lvl === "d1" ? randInt(2, 12) : randInt(4, 14);

    // Autres moments décisifs de la saison (2 maximum par saison).
    // Retrouvailles : uniquement si le match est crédible — même pays
    // (donc même championnat ou coupe nationale) ou trahison d'un rival.
    // (et jamais en doublon d'un retour hostile déjà programmé chez le rival)
    const oldClubPlausible = s.justTransferred && s.prevClub &&
      (s.prevClub.countryId === s.club.countryId || s.flags.traitor) &&
      !s.scheduled.some((sc) => sc.id === "ev_traitor_return");
    if (report.pendingMoments.length < 2 && matches > 8) {
      if (oldClubPlausible && rng() < BALANCE.oldClubMomentChance) {
        report.pendingMoments.push({
          type: "old_club", label: "Retrouvailles avec votre ancien club",
          winLabel: "Retrouvailles maîtrisées", failLabel: "Soirée compliquée",
          moment: keyMomentFor(s, "old_club"),
        });
      } else if (rng() < BALANCE.derbyMomentChance) {
        report.pendingMoments.push({
          type: "derby", label: "Le derby",
          winLabel: "Derby remporté !", failLabel: "Derby perdu",
          moment: keyMomentFor(s, "derby"),
        });
      }
    }
    s.justTransferred = false;

    // Meilleurs buteurs — deux distinctions séparées : le titre domestique
    // (chaque championnat couronne le sien, seuil selon le niveau) et le
    // Soulier d'Or européen, attribué aux buts × coefficient de championnat
    // (élite ×2, D1 ×1,5 — hors d'Europe, les buts ne comptent pas).
    if (report.goals >= BALANCE.topScorerGoals[lvl] && rng() < BALANCE.topScorerChance) {
      grantAward(s, report, "top_scorer");
    }
    const shoeCoef = ((countryOf(s.club.countryId) || {}).continent === "eu" && BALANCE.goldenShoeCoef[lvl]) || 0;
    if (shoeCoef && report.goals * shoeCoef >= BALANCE.goldenShoePts && !evTrophies.includes("goldenBoot") && rng() < BALANCE.goldenShoeChance) {
      s.trophies.goldenBoot += 1;
      report.trophies.push("goldenBoot");
      s.history.push({ age: s.age, text: `Soulier d'Or européen ${s.year} — meilleur buteur du continent.`, impact: 12 });
    }

    // Sélections de jeunes (U17 → U23) : on gravit l'échelle selon l'âge, tant
    // qu'on n'est pas passé chez les A, si le niveau suit. Chaque nouveau palier
    // décroché : annonce + réputation, et — pour les grands tournois de jeunes —
    // un résultat résumé en une ligne. Les caps jeunes sont comptés à part des A.
    if (!s.natTeam.active && !s.natTeam.retired && s.age <= 23) {
      s.youth = s.youth || { caps: 0, goals: 0, tiers: [] };
      for (const tier of YOUTH_TIERS) {
        if (s.age < tier.aMin || s.age > tier.aMax || s.youth.tiers.includes(tier.id)) continue;
        if (ovr(s) < tier.ovrNeed || s.rep < 18 + (tier.aMin - 15) * 4) continue;
        s.youth.tiers.push(tier.id);
        s.flags.youth_int = true;
        s.youth.caps += randInt(3, 6);
        s.rep = clamp(s.rep + 2, 0, 100);
        report.lines.push({ text: `🎽 Première convocation avec les ${tier.label} ${deOf(s.nationality.name)}.`, impact: 5 });
        s.history.push({ age: s.age, text: `Sélectionné en ${tier.label} ${deOf(s.nationality.name)}.`, impact: 5 });
        if (tier.tournament) {
          const natW = s.nationality.weight;
          const st = weightedRandom(YOUTH_STAGES, (x) =>
            x.id === "champion" ? x.baseW * (0.4 + natW * 1.6) :
            (x.id === "final" || x.id === "semi") ? x.baseW * (0.5 + natW * 1.0) : x.baseW);
          s.youth.caps += st.games;
          report.lines.push({ text: `🏆 ${tier.tournament} : ${st.label}.`, impact: st.champion ? 8 : 4 });
          if (st.champion) s.history.push({ age: s.age, text: `Vainqueur du ${tier.tournament} ${s.year} !`, impact: 9 });
        }
        break; // un seul palier par saison
      }
    }

    // Mode Histoire : la finale mondiale scénarisée impose la sélection cette
    // année-là (le maître ne rate pas SON dernier Mondial).
    if (storyWcFinalFor(s) && !s.careerEnded) { s.natTeam.active = true; s.natTeam.retired = false; }

    // Sélection nationale
    if (s.natTeam.active) {
      // caps encore à 0 → c'est la toute première convocation en A (robuste au
      // rechargement d'une sauvegarde : aucun nouveau champ d'état requis).
      const firstCap = s.natTeam.caps === 0;
      // Une saison amputée par la blessure réduit les sélections ; une longue
      // absence fait carrément manquer le grand tournoi de l'année.
      const heavyInjury = (s.seasonInjuryWeeks || 0) >= BALANCE.injury.tournamentSkip;
      const caps = Math.max(0, Math.round(randInt(4, 9) * clamp(injuryFactor + 0.1, 0.1, 1)));
      s.natTeam.caps += caps;
      const natGoals = Math.round(caps * s.position.goalRate * perf * rand(0.5, 1.2));
      s.natTeam.goals += natGoals;
      report.caps = caps;
      report.natGoals = natGoals;
      report.firstCap = firstCap;
      // Filet de sécurité : la toute première sélection A est ici horodatée à
      // l'âge RÉEL où le joueur porte le maillot (et non à l'âge post-incrément
      // d'advanceYear ou via une activation "Histoire"). Garantit le badge
      // « Premier de cordée » et la quête « Pépite » quel que soit le chemin.
      if (firstCap) {
        if (s.age <= 20) s.flags.young_int = true;
        if (s.age <= 18) s.flags.early_cap = true;
      }
      // Les matchs & buts d'un grand tournoi comptent dans le bilan sélection de
      // la saison (affiché au récap), en plus de leur propre carte dédiée.
      const euNation = ((countryOf(s.nationality.homeCountryId) || {}).continent) === "eu";
      const nlYear = isNationsLeagueYear(s.year) && euNation; // Ligue des Sélections : Europe uniquement
      if (heavyInjury && (isWorldCupYear(s.year) || isContinentalYear(s.year) || nlYear)) report.tournamentMissed = true;
      else if (isWorldCupYear(s.year)) { report.wc = playWorldCup(s); report.caps += report.wc.games; report.natGoals += report.wc.goals; }
      else if (isContinentalYear(s.year)) { report.cont = playContinental(s, report); report.caps += report.cont.games; report.natGoals += report.cont.goals; }
      else if (nlYear) { report.natl = playNationsLeague(s, report); report.caps += report.natl.games; report.natGoals += report.natl.goals; }
    }

    // Jeux Olympiques (années %4==3, sans tournoi A) : tournoi U23, ouvert aux
    // jeunes prometteurs comme aux jeunes déjà en A, et à de rares surclassés.
    // Médailles or/argent/bronze. Les caps olympiques comptent en jeunes (U23).
    const olympicInjury = (s.seasonInjuryWeeks || 0) >= BALANCE.injury.tournamentSkip;
    if (isOlympicYear(s.year) && !s.careerEnded && !olympicInjury) {
      s.youth = s.youth || { caps: 0, goals: 0, tiers: [] };
      const u23 = s.age <= 23;
      const overage = s.age >= 24 && s.age <= 29 && s.rep >= 62 && s.natTeam.active && rng() < 0.35; // surclassé, rare
      const goodEnough = ovr(s) >= 66 && (s.natTeam.active || s.flags.youth_int || ovr(s) >= 70);
      if ((u23 || overage) && goodEnough) report.olympic = playOlympics(s, report);
    }

    // Distinctions promises par les événements, puis celles de la saison, puis Ballon d'Or
    if (s.seasonAwards) for (const id of s.seasonAwards.splice(0)) grantAward(s, report, id);
    rollSeasonAwards(s, report);
    rollBallon(s, report, 0);

    // Objectif du club
    const met = objectiveMet(s.objective, report);
    report.objectiveMet = met;
    if (met) {
      s.coachRel = clamp(s.coachRel + 6, 5, 100);
      s.rep = clamp(s.rep + 2, 0, 100);
      const bonus = s.contract.salary * 0.12;
      s.money += bonus;
      report.objectiveBonus = bonus;
    } else {
      s.coachRel = clamp(s.coachRel - 5, 5, 100);
      s.moral = clamp(s.moral - 3, 5, 100);
    }

    // Revenus
    const sponsors = (s.rep / 100) * (s.stats.c / 100) * visibilityOf(s) * 1.8;
    const income = s.contract.salary * 0.55 + sponsors * rand(0.6, 1.2);
    s.money += income;
    report.income = income + (report.objectiveBonus || 0);
    const prize = report.trophies.length * 0.3;
    if (prize) s.money += prize;

    if (report.trophies.includes("league")) s.history.push({ age: s.age, text: `Champion national ${s.year} avec ${s.club.name}.`, impact: 10 });

    // Fin de carrière par blessure : RARISSIME, à tout âge, issue extrême d'une
    // grave/catastrophe. Évaluée en FIN de saison (la saison diminuée a été jouée
    // entièrement → pas de « blessé qui gagne le Mondial puis tombe »). Le rng
    // n'est consommé que pour une grave/catastrophe (pEnd>0). careerEnded est
    // routé vers l'écran de fin côté UI (renderRecap → renderCareerEndInjury).
    if (report.seasonInjury && !s.careerEnded) {
      const tier = injuryTier(report.seasonInjury.tier);
      const pEnd = injuryEndChance(s, tier);
      if (pEnd > 0 && rng() < pEnd) {
        s.careerEnded = true;
        s.careerEndReason = "injury";
        report.careerEndInjury = { age: s.age, tier: tier.id };
        s.history.push({ age: s.age, text: `${BALANCE.injury.labels[tier.id]} : votre carrière s'arrête net en ${s.year}.`, impact: -90 });
      }
    }

    // Totaux carrière
    s.totals.matches += matches;
    s.totals.goals += report.goals;
    s.totals.assists += report.assists;
    s.totals.cleanSheets += report.cleanSheets;
    s.peakOvr = Math.max(s.peakOvr, ovr(s));
    s.seasons.push({ age: s.age, year: s.year, clubName: s.club.name, countryId: s.club.countryId, level: lvl, matches, goals: report.goals, assists: report.assists, cleanSheets: report.cleanSheets, rating: report.rating, trophies: report.trophies, divisionTitle: !!report.divisionTitle, onLoan: !!s.loan, leaguePos: report.leaguePos });

    // Relations
    if (rating >= 7.4) s.coachRel = clamp(s.coachRel + 4, 5, 100);
    else if (rating <= 5.5) s.coachRel = clamp(s.coachRel - 5, 5, 100);
    if (s.teamRel >= 70) s.moral = clamp(s.moral + 2, 5, 100);
    else if (s.teamRel <= 35) s.moral = clamp(s.moral - 3, 5, 100);
    if (pt < 0.45) { s.moral = clamp(s.moral - 8, 5, 100); report.benched = true; }
    else if (pt > 0.85) s.moral = clamp(s.moral + 3, 5, 100);

    if (s.loan) s.loan.rating = report.rating;
    s.lastSeason = { clubId: s.club.id, leaguePos: report.leaguePos, promoted: !!report.promoted, relegated: !!report.relegated, rating: report.rating };
    reviewRole(s, report); // statut dynamique : promotion / rétrogradation / recrue concurrente
    report.headline = headlineFor(s, report);
    return report;
  }

  // playSeason évalue l'objectif du club AVANT que les moments décisifs
  // (finale de coupe, finale de Mondial, barrage) ne soient joués — ils sont
  // interactifs et n'arrivent qu'après. Un trophée décroché là peut donc
  // valider l'objectif a posteriori : on annule la sanction déjà appliquée
  // et on verse la récompense prévue. Sans hasard consommé, pour ne pas
  // décaler le PRNG (Défi du jour / rejeu de duel restent identiques).
  function recheckObjective(s, report) {
    if (!report || report.objectiveMet) return false;
    if (!objectiveMet(s.objective, report)) return false;
    report.objectiveMet = true;
    s.coachRel = clamp(s.coachRel + 5, 5, 100);  // annule le −5 de l'échec
    s.moral = clamp(s.moral + 3, 5, 100);        // annule le −3 de l'échec
    s.coachRel = clamp(s.coachRel + 6, 5, 100);  // puis la récompense
    s.rep = clamp(s.rep + 2, 0, 100);
    const bonus = s.contract.salary * 0.12;
    s.money += bonus;
    report.objectiveBonus = (report.objectiveBonus || 0) + bonus;
    report.income = (report.income || 0) + bonus;
    return true;
  }

  // Résout un moment décisif de saison (barrage, finale de coupe, derby,
  // retrouvailles). optionId null → choix aléatoire (rival, simulation).
  function resolveSeasonMoment(s, report, entry, optionId) {
    const moment = entry.moment;
    const option = moment.options.find((o) => o.id === optionId) || pick(moment.options);
    const res = playKeyMoment(s, moment, option);
    res.option = option;
    if (res.success) {
      s.momentWins += 1;
      if (entry.type === "derby") s.derbyWins += 1;
      if (option.id === "panenka" && entry.type === "cup_final") s.flags.panenka_final = true;
    }
    if (entry.type === "playoff") {
      if (res.success) {
        report.promoted = true;
        if (s.lastSeason) s.lastSeason.promoted = true;
        s.moral = clamp(s.moral + 10, 5, 100);
        s.rep = clamp(s.rep + 4, 0, 100);
        s.history.push({ age: s.age, text: `Montée décrochée en barrage avec ${s.club.name} (${s.year}) !`, impact: 12 });
        recheckObjective(s, report);
      } else {
        s.moral = clamp(s.moral - 6, 5, 100);
        s.history.push({ age: s.age, text: `Barrage de montée perdu avec ${s.club.name} (${s.year}).`, impact: -6 });
      }
    } else if (entry.type === "cup_final") {
      if (res.success) {
        s.trophies.cup += 1;
        report.trophies.push("cup");
        s.money += 0.3;
        s.moral = clamp(s.moral + 8, 5, 100);
        s.history.push({ age: s.age, text: `Vainqueur de la ${COMPETITIONS.cup.name} ${s.year} avec ${s.club.name}.`, impact: 9 });
        recheckObjective(s, report);
        // Vainqueur de coupe (club européen) → qualifié pour une coupe d'Europe
        // la saison prochaine (C2, ou C1 si le club est/passe élite). Aucun rng.
        if (((countryOf(s.club.countryId) || {}).continent) === "eu") {
          s.euroCupTicket = true;
          if (lvlOf(s, s.club) !== "elite") report.lines.push({ text: `🇪🇺 Sacre en Coupe Nationale : vous voilà qualifié pour une coupe d'Europe la saison prochaine !`, impact: 5 });
        }
      } else {
        s.moral = clamp(s.moral - 5, 5, 100);
        s.history.push({ age: s.age, text: `Finale de ${COMPETITIONS.cup.name} perdue en ${s.year}.`, impact: -4 });
      }
    } else if (entry.type === "continental_final") {
      const tier = entry.tier || 1;
      if (tier === 1) {
        const continent = entry.continent || "eu";
        const cup = CONTINENTAL_CUPS[continent] || CONTINENTAL_CUPS.eu;
        if (res.success) {
          s.trophies.continental += 1;
          report.trophies.push("continental");
          report.continentalContinent = continent;
          s.continentalDetail.push({ continent, year: s.year });
          s.money += continent === "eu" ? 1.2 : 0.6;
          s.rep = clamp(s.rep + (continent === "eu" ? 6 : 4), 0, 100);
          s.moral = clamp(s.moral + 10, 5, 100);
          s.history.push({ age: s.age, text: `Vainqueur de la ${cup.name} avec ${s.club.name} (${s.year}) !`, impact: continent === "eu" ? 15 : 11 });
          recheckObjective(s, report);
          // Le sacre continental rebat les cartes du Ballon d'Or (comme le Mondial).
          if (!report.awards.includes("ballon_won")) rollBallon(s, report, 0);
        } else {
          s.rep = clamp(s.rep + 2, 0, 100);
          s.moral = clamp(s.moral - 6, 5, 100);
          s.history.push({ age: s.age, text: `Finale de ${cup.name} perdue en ${s.year} — si près du toit du continent.`, impact: -5 });
        }
      } else {
        // C2 (Trophée d'Europe) / C3 (Bouclier d'Europe) — coupes d'Europe secondaires
        const key = tier === 2 ? "continental2" : "continental3";
        const cup = COMPETITIONS[key];
        const rw = BALANCE.euroReward[tier];
        if (res.success) {
          s.trophies[key] = (s.trophies[key] || 0) + 1; // guardé : vieilles saves sans ce compteur
          report.trophies.push(key);
          s.money += rw.money;
          s.rep = clamp(s.rep + rw.rep, 0, 100);
          s.moral = clamp(s.moral + rw.moral, 5, 100);
          s.history.push({ age: s.age, text: `Vainqueur de la ${cup.name} avec ${s.club.name} (${s.year}) !`, impact: rw.impact });
          recheckObjective(s, report);
          if (rw.ballon && !report.awards.includes("ballon_won")) rollBallon(s, report, 0);
        } else {
          s.rep = clamp(s.rep + 1, 0, 100);
          s.moral = clamp(s.moral - (tier === 2 ? 5 : 4), 5, 100);
          s.history.push({ age: s.age, text: `Finale de ${cup.name} perdue en ${s.year}.`, impact: tier === 2 ? -4 : -3 });
        }
      }
    } else if (entry.type === "injury") {
      // Chemin du retour : le choix module la dette de récupération (chronicWeeks)
      // qui déborde sur la saison suivante. Aucun rng ajouté (valeurs de l'option).
      const opt = res.option;
      if (res.success) {
        s.chronicWeeks = Math.max(0, (s.chronicWeeks || 0) - (opt.recover || 8));
        s.moral = clamp(s.moral + 6, 5, 100);
        s.form = clamp(s.form + 6, 5, 100);
        s.history.push({ age: s.age, text: `Retour de blessure réussi en ${s.year} — le pire est derrière vous.`, impact: 6 });
      } else {
        s.chronicWeeks = (s.chronicWeeks || 0) + (opt.setback || 10);
        s.moral = clamp(s.moral - 6, 5, 100);
        s.history.push({ age: s.age, text: `Rechute en ${s.year} : la convalescence s'éternise.`, impact: -8 });
      }
    } else if (entry.type === "derby") {
      if (res.success) {
        s.moral = clamp(s.moral + 6, 5, 100);
        s.teamRel = clamp(s.teamRel + 4, 5, 100);
      } else {
        s.moral = clamp(s.moral - 5, 5, 100);
      }
    } else if (entry.type === "old_club") {
      s.moral = clamp(s.moral + (res.success ? 5 : -4), 5, 100);
    }
    return res;
  }

  // --- Vieillissement, vie du club & intersaison ------------------------------
  function advanceYear(s) {
    // Semaines de BLESSURE de la saison écoulée (hors suspension), capturées AVANT
    // le reset (plus bas) : servent au frein de croissance et à la pression de
    // retraite. La perte est RÉCUPÉRABLE (on freine la progression de l'année, on
    // n'érode pas définitivement les stats — une pépite n'est jamais condamnée).
    const seasonInj = s.seasonInjuryWeeks || 0;
    s.seasonsAtClub = (s.seasonsAtClub || 0) + 1; // une saison de plus au club (débloque la revue de rôle)
    const pt = playingTimeFactor(s);
    // Développement des jeunes : un Espoir joue peu en compétition mais s'ENTRAÎNE
    // au haut niveau → sa progression n'est pas étranglée par le manque de minutes.
    const devPt = s.age <= 21 ? Math.max(pt, 0.5) : pt;
    const infra = BALANCE.growthInfra[lvlOf(s, s.club)];
    const gap = s.potCap - ovr(s);
    let potDamp = gap <= 0 ? 0.15 : gap <= 4 ? 0.45 : 1;
    if (s.flags.prodigy && s.age <= 20) potDamp = Math.max(potDamp, 0.85); // un prodige ne freine pas jeune
    const injDamp = clamp(1 - seasonInj / BALANCE.injury.growthDamp, 0.55, 1);
    const g = (s.flags.lateBloomer ? 1.15 : 1) * infra * potDamp * trajGrowthMult(s) * injDamp;

    if (s.age <= 21) {
      s.stats.t = clamp(s.stats.t + Math.round(rand(2, 4) * devPt * g * (hasTrait(s, "genius") ? 1.4 : 1)), 1, 99);
      s.stats.p = clamp(s.stats.p + randInt(1, 3), 1, 99);
      s.stats.m = clamp(s.stats.m + randInt(0, 2), 1, 99);
      s.stats.c = clamp(s.stats.c + randInt(0, 1), 1, 99);
      // Saison de percée : les trajectoires explosives peuvent brûler
      // les étapes — c'est ici que naissent les phénomènes à 85 avant 22 ans
      const explosive = (s.trajectory.id === "early" || s.trajectory.id === "flash") ||
        (s.trajectory.id === "surge" && s.age >= s.sparkAge);
      const prod = s.flags.prodigy && s.age <= 20; // un crack brûle vraiment les étapes
      if (explosive && devPt >= (prod ? 0.3 : 0.5) && rng() < (prod ? 0.9 : 0.6)) {
        s.stats.t = clamp(s.stats.t + randInt(prod ? 5 : 3, prod ? 9 : 6), 1, 99);
        s.stats.p = clamp(s.stats.p + randInt(prod ? 3 : 2, prod ? 5 : 4), 1, 99);
        s.stats.m = clamp(s.stats.m + randInt(prod ? 2 : 1, prod ? 4 : 3), 1, 99);
      }
      // Fenêtre 16-18 ans : un phénomène éclate MAINTENANT, pas à 20 ans.
      if (s.flags.prodigy && s.age <= 18) {
        s.stats.t = clamp(s.stats.t + randInt(2, 4), 1, 99);
        s.stats.p = clamp(s.stats.p + randInt(1, 3), 1, 99);
      }
    } else if (s.age <= 25) {
      s.stats.t = clamp(s.stats.t + Math.round(rand(1, 2.5) * pt * g), 1, 99);
      s.stats.p = clamp(s.stats.p + randInt(0, 2), 1, 99);
      s.stats.m = clamp(s.stats.m + randInt(0, 2), 1, 99);
      s.stats.c = clamp(s.stats.c + randInt(0, 1), 1, 99);
      if (s.trajectory.id === "surge" && s.age >= s.sparkAge && s.age <= s.sparkAge + 2 && rng() < 0.7) {
        s.stats.t = clamp(s.stats.t + randInt(2, 5), 1, 99);
        s.stats.p = clamp(s.stats.p + randInt(1, 3), 1, 99);
        s.stats.m = clamp(s.stats.m + randInt(1, 3), 1, 99);
      }
    } else if (s.age <= 29) {
      s.stats.t = clamp(s.stats.t + Math.round(rand(0, 1.5) * pt * (g > 1.3 ? g * 0.6 : 0)), 1, 99);
      s.stats.m = clamp(s.stats.m + randInt(0, 1), 1, 99);
      if (rng() < 0.4) s.stats.p = clamp(s.stats.p - 1, 1, 99);
    } else if (s.age <= 32) {
      s.stats.p = clamp(s.stats.p - randInt(1, 3), 1, 99);
      if (rng() < 0.4) s.stats.t = clamp(s.stats.t - 1, 1, 99);
      s.stats.m = clamp(s.stats.m + randInt(0, 1), 1, 99);
    } else if (s.age <= 36) {
      s.stats.p = clamp(s.stats.p - Math.round(randInt(2, 4) * (hasTrait(s, "ironman") ? 0.6 : 1)), 1, 99);
      s.stats.t = clamp(s.stats.t - randInt(0, 2), 1, 99);
    } else if (s.age <= 42) {
      // Crépuscule (37-42) : déclin physique plus marqué, adouci par la longévité
      // (Increvable, gardien, défenseur). Le physique baisse, mais la lecture du
      // jeu — le mental — peut encore progresser : c'est ce qui fait durer les vieux sages.
      const soft = hasTrait(s, "ironman") ? 0.55 : 1;
      const posSoft = s.position.id === "gk" ? 0.6 : s.position.id === "def" ? 0.8 : 1;
      s.stats.p = clamp(s.stats.p - Math.round(randInt(2, 5) * soft * posSoft), 1, 99);
      s.stats.t = clamp(s.stats.t - randInt(0, 2), 1, 99);
      if (rng() < 0.25) s.stats.m = clamp(s.stats.m + 1, 1, 99);
    } else {
      // Ultra-crépuscule (43+) : le corps lâche pour de bon. L'OVR chute vite —
      // seuls des clubs de D3/Régional signent encore un vétéran de cet âge ; un
      // gardien increvable peut, rarement, tenir plus haut. Le mental s'érode aussi.
      const soft = hasTrait(s, "ironman") ? 0.7 : 1;
      const posSoft = s.position.id === "gk" ? 0.5 : s.position.id === "def" ? 0.8 : 1;
      s.stats.p = clamp(s.stats.p - Math.round(randInt(4, 7) * soft * posSoft), 1, 99);
      s.stats.t = clamp(s.stats.t - randInt(1, 3), 1, 99);
      if (rng() < 0.5) s.stats.m = clamp(s.stats.m - 1, 1, 99);
    }
    // Trajectoires : usure spécifique
    if (s.trajectory.id === "flash" && s.age >= 28) {
      s.stats.p = clamp(s.stats.p - 1, 1, 99);
      if (rng() < 0.5) s.stats.t = clamp(s.stats.t - 1, 1, 99);
    }
    if (s.trajectory.id === "steady" && s.age >= 30 && rng() < 0.5) {
      s.stats.p = clamp(s.stats.p + 1, 1, 99); // vieillit mieux que les autres
    }
    if (hasTrait(s, "leader")) s.stats.m = clamp(s.stats.m + 1, 1, 99);
    if (s.archetype && s.archetype.mods.mGrowth) s.stats.m = clamp(s.stats.m + s.archetype.mods.mGrowth, 1, 99);
    if (hasTrait(s, "party")) { s.form = clamp(s.form - 4, 5, 100); s.stats.c = clamp(s.stats.c + 1, 1, 99); }
    if (s.discipline >= 72 && rng() < 0.5) s.stats.t = clamp(s.stats.t + 1, 1, 99);

    // Un phénomène est né ?
    if (!s.flags.wonderkid && s.age < 22 && ovr(s) >= 85) {
      s.flags.wonderkid = true;
      s.history.push({ age: s.age, text: `À ${s.age} ans, le monde entier parle déjà de vous comme d'un phénomène.`, impact: 15 });
    }
    if (s.age < 23 && ovr(s) >= 85) s.flags.high_early = true;

    // Vie du club : montée effective, relégation, changement de dimension.
    // IMPORTANT : le destin (montée/descente) s'applique au club où la
    // saison a été jouée — jamais au nouveau club si le joueur est parti
    // entre-temps. Chaque club garde sa propre division.
    const ls = s.lastSeason;
    if (ls) {
      const seasonClub = CLUBS.find((c) => c.id === ls.clubId);
      const stayed = seasonClub && s.club.id === ls.clubId && !s.loan;
      if (seasonClub) {
        const lvl = lvlOf(s, seasonClub);
        if (ls.promoted && (lvl === "regional" || lvl === "d3" || lvl === "d2")) {
          const newLvl = shiftClubLevel(s, seasonClub, 1);
          if (stayed) s.history.push({ age: s.age, text: `${seasonClub.name} évolue désormais en ${divShort(newLvl, seasonClub.countryId)} — l'ascension continue.`, impact: 6 });
        } else if (ls.relegated && (lvl === "d1" || lvl === "d2" || lvl === "d3")) {
          shiftClubLevel(s, seasonClub, -1);
        } else if (stayed && lvl === "d1") {
          s.clubMomentum = ls.leaguePos <= 2 ? s.clubMomentum + 1 : 0;
          if (s.clubMomentum >= BALANCE.clubRiseSeasons) {
            setClubLevel(s, seasonClub, "elite");
            s.clubMomentum = 0;
            s.history.push({ age: s.age, text: `${seasonClub.name} change de dimension et rejoint l'élite européenne.`, impact: 8 });
          }
        } else if (stayed && lvl === "elite") {
          // Un cador peut décliner s'il enchaîne les saisons ratées
          s.clubFade = ls.leaguePos >= 7 ? s.clubFade + 1 : 0;
          if (s.clubFade >= BALANCE.clubFadeSeasons) {
            setClubLevel(s, seasonClub, "d1");
            s.clubFade = 0;
            s.history.push({ age: s.age, text: `${seasonClub.name} n'est plus que l'ombre du géant qu'il fut.`, impact: -5 });
          }
        }
      }
    }

    // Dérive des jauges
    const formTarget = 65;
    const moralTarget = (hasTrait(s, "zen") ? 70 : 60) + Math.round((s.teamRel - 55) / 8);
    s.form = clamp(Math.round(s.form + (formTarget - s.form) * 0.35 + rand(-6, 6)), 5, 100);
    s.moral = clamp(Math.round(s.moral + (moralTarget - s.moral) * 0.25 + rand(-4, 4)), 5, 100);
    if (hasTrait(s, "leader")) s.moral = Math.max(s.moral, 40);
    s.discipline = clamp(Math.round(s.discipline + (50 - s.discipline) * 0.06), 5, 100);
    s.coachRel = clamp(Math.round(s.coachRel + (55 - s.coachRel) * 0.15), 5, 100);
    s.teamRel = clamp(Math.round(s.teamRel + (55 - s.teamRel) * 0.12 + rand(-3, 3)), 5, 100);

    // Retour de prêt : bilan sportif et conséquences réelles
    if (s.loan) {
      const parent = s.loan;
      const loanRating = parent.rating || 6.5;
      s.club = parent.parentClub;
      s.coach = parent.parentCoach;
      s.loan = null;
      if (loanRating >= 7.2) {
        s.coachRel = 72;
        s.form = clamp(s.form + 6, 5, 100);
        s.history.push({ age: s.age, text: `Retour de prêt convaincant : ${parent.parentClub.name} compte enfin sur vous.`, impact: 8 });
        if (rng() < 0.6) s.loanReturn = { clubId: parent.loanClubId, rating: loanRating };
      } else if (loanRating >= 6.3) {
        s.coachRel = 60;
        s.history.push({ age: s.age, text: `Retour de prêt à ${parent.parentClub.name}, avec une copie honnête.`, impact: 3 });
      } else {
        s.coachRel = 46;
        s.rep = clamp(s.rep - 2, 0, 100);
        s.history.push({ age: s.age, text: `Un prêt raté : ${parent.parentClub.name} doute ouvertement de vous.`, impact: -6 });
      }
      s.transferHistory.push({ age: s.age + 1, toClubName: parent.parentClub.name, countryName: countryOf(parent.parentClub.countryId).name, fee: null, loanReturn: true, level: lvlOf(s, parent.parentClub) });
    } else if (rng() < BALANCE.coachChangeChance) {
      s.coach = pick(COACH_NAMES);
      s.coachRel = 48 + randInt(0, 14);
    }

    s.injuryWeeks = 0;
    s.seasonInjuryWeeks = 0; // la dette chronique (chronicWeeks) N'est PAS remise à 0 : elle déborde
    s.age += 1;
    s.year += 1;
    s.contract.years -= 1;
    // On sort de l'âge « Espoir » : le statut de pari sur l'avenir n'existe plus,
    // le plancher devient Sporadique (sans hasard consommé → PRNG intact).
    if (s.role === 0 && s.age > ROLE_ESPOIR_MAX_AGE) s.role = 1;

    // Sélection : possible dès 17 ans pour un crack, de plus en plus
    // accessible entre 21 et 23 ans ; la visibilité du niveau compte,
    // et un passage par les Espoirs ouvre des portes.
    if (!s.natTeam.active && !s.natTeam.retired && s.age >= 17 && seasonInj < 20) {
      const rank = levelRank(lvlOf(s, s.club));
      let ovrNeed, repNeed;
      if (s.age <= 18) { ovrNeed = 81; repNeed = 58; }
      else if (s.age <= 20) { ovrNeed = 77; repNeed = 52; }
      else if (s.age <= 23) { ovrNeed = 74; repNeed = 50; }
      else { ovrNeed = 73; repNeed = 48; }
      if (rank === 1) { ovrNeed += 2; repNeed += 8; }
      else if (rank === 0) { ovrNeed += 5; repNeed += 16; }
      if (s.flags.youth_int) repNeed -= 4;
      if (s.rep >= repNeed && ovr(s) >= ovrNeed) {
        s.natTeam.active = true;
        if (s.age <= 18) s.flags.early_cap = true;
        if (s.age <= 20) s.flags.young_int = true;
        s.history.push({ age: s.age, text: `Première convocation avec ${s.nationality.name}${s.age <= 19 ? ` — à seulement ${s.age} ans !` : ""}.`, impact: 8 });
      }
    }

    // Reconduction en sélection : un international vieillissant n'est rappelé QUE
    // s'il tient encore le niveau. La barre d'OVR monte avec l'âge (seuls les
    // meilleurs jouent à 37-40 ans) ; une note récente correcte et un vrai temps
    // de jeu sont aussi exigés. Sinon, la sélection tourne la page (retraite
    // internationale de fait, définitive). Aucun hasard : dépend des perfs réelles.
    // Guard caps>0 : on ne remercie pas un joueur tout juste convoqué le même tour.
    if (s.natTeam.active && !s.natTeam.retired && s.natTeam.caps > 0 && s.age >= BALANCE.intlRetainAge) {
      const last = s.seasons[s.seasons.length - 1];
      const recentRating = last ? last.rating : 7;
      const posBonus = BALANCE.intlRetainPos[s.position.id] || 0; // gardien/défenseur : barre abaissée, sélectionnés plus vieux
      const ovrNeed = BALANCE.intlRetainOvr + (s.age - BALANCE.intlRetainAge) * BALANCE.intlRetainStep - posBonus;
      const stillGood = ovr(s) >= ovrNeed && recentRating >= BALANCE.intlRetainRating && playingTimeFactor(s) >= 0.35;
      if (!stillGood) {
        s.natTeam.active = false;
        s.natTeam.retired = true;
        s.history.push({ age: s.age, text: `Fin de l'aventure en sélection avec ${s.nationality.name} : place à la nouvelle génération.`, impact: -4 });
      }
    }

    // Crépuscule : pression de retraite croissante. Le pivot recule avec la
    // longévité (un gardien Increvable discipliné est encore titulaire à 40 ans).
    // Quand elle déclenche, la décision « une saison de plus ? » s'impose à la
    // saison suivante (ev_retire_decision via pickEvent). Le joueur reste maître :
    // pousser jusqu'à 42 ans est possible, mais le corps et les clubs pèsent.
    if (s.age >= BALANCE.retireFloor && !s.retiring && !s.careerEnded && s.age < BALANCE.ageMax) {
      const pivot = BALANCE.retireBaseAge + longevityScore(s) * 0.6;
      let p = 0.10 + (s.age - pivot) * 0.18;
      const pt = playingTimeFactor(s);
      if (pt < 0.4) p += 0.20;          // relégué sur le banc : le signal de partir
      if (s.form < 45) p += 0.10;
      // Corps qui lâche : une saison très blessée OU une dette chronique en cours
      // pousse (doucement) vers la sortie. Lit seasonInj capturé AVANT le reset
      // (l'ancien test s.injuryWeeks>20 était mort : injuryWeeks vaut 0 ici).
      if (seasonInj > 20 || (s.chronicWeeks || 0) > 0) p += 0.10;
      if (s.moral > 70) p -= 0.08;      // l'envie, encore intacte, fait tenir
      if (hasTrait(s, "loyal")) p -= 0.05;
      if (rng() < clamp(p, 0, 0.95)) s.flags.retire_pending = true;
    }
  }

  // --- Mercato -----------------------------------------------------------------
  function marketValue(s) {
    const ageF = s.age < 24 ? 1.35 : s.age <= 28 ? 1.1 : s.age <= 31 ? 0.65 : 0.3;
    // Coefficient revu à la baisse (0.85, était 1.5) pour des montants de
    // transfert plus réalistes : les indemnités s'étaient envolées trop haut.
    return Math.max(0.2, (ovr(s) - 50) * 0.85 * ageF * (1 + s.rep / 90));
  }

  function salaryFor(s, club) {
    const country = countryOf(club.countryId);
    // Les pétromonarchies du Golfe (Arabie Saoudite, Qatar, Émirats) paient sur
    // une base "élite" quel que soit le niveau réel du club : c'est tout leur
    // argument (« l'or du désert »).
    const levelBase = country && country.gulf ? BALANCE.salaryBase.elite : BALANCE.salaryBase[lvlOf(s, club)];
    // Le salaire suit la carrière : un vétéran sur le déclin ne touche plus les
    // émoluments de sa grande époque. Au-delà de 30 ans, la barre baisse par
    // paliers (un club ne prolonge plus un trentenaire au même tarif qu'à 27 ans).
    const ageSal = s.age <= 30 ? 1 : s.age <= 33 ? 0.82 : s.age <= 36 ? 0.6 : s.age <= 39 ? 0.42 : 0.3;
    const base = levelBase * (country ? country.salaryMult : 1) * ageSal;
    return Math.max(0.02, Math.round(base * (0.4 + ovr(s) / 90 + s.rep / 160) * rand(0.85, 1.25) * 100) / 100);
  }

  function buildOffer(s, club) {
    const gulf = !!(countryOf(club.countryId) || {}).gulf;
    return {
      club,
      fee: Math.max(0.1, Math.round(marketValue(s) * BALANCE.feeMult[lvlOf(s, club)] * (gulf ? 1.4 : 1) * rand(0.8, 1.3) * 10) / 10),
      salary: salaryFor(s, club),
      years: randInt(2, 5),
      gulf,
      role: roleForClub(s, club), // statut proposé (Espoir → Titulaire) : la vraie info de décision
    };
  }

  // spec : { d, toLevel (niveau imposé), cross, gulf, home (pays natal),
  //          domestic (même pays) }. Règle des mineurs : avant 18 ans, un
  //          joueur au Brésil ne peut pas être transféré à l'étranger.
  function offersFor(s, spec) {
    const d = spec && spec.d != null ? spec.d : 0;
    let targetLevel = spec && spec.toLevel
      ? spec.toLevel
      : LEVEL_ORDER[clamp(LEVEL_ORDER.indexOf(lvlOf(s, s.club)) + d, 0, LEVEL_ORDER.length - 1)];
    // Barre de recrutement : pour MONTER d'un cran (transfert ordinaire), il faut
    // en avoir le niveau. Un OVR sous la barre du niveau visé fait capoter la
    // promotion — on reste à son étage. Les chemins spéciaux (Golfe, retour au
    // pays/formateur, club ciblé, descente forcée) ne sont pas concernés.
    if (!(spec && (spec.toLevel || spec.clubId || spec.origin || spec.gulf || spec.exotic || spec.home))) {
      const curIdx = LEVEL_ORDER.indexOf(lvlOf(s, s.club));
      if (LEVEL_ORDER.indexOf(targetLevel) > curIdx && ovr(s) < (BALANCE.signingBar[targetLevel] || 0)) {
        targetLevel = LEVEL_ORDER[curIdx]; // pas encore le niveau : la montée n'a pas lieu
      }
    }
    const minorLock = s.age < 18 && s.club.countryId === "br";
    let pool;
    if (spec && spec.clubId) {
      // Événement/Histoire ciblé : UN club précis vient vous chercher.
      const target = CLUBS.filter((c) => c.id === spec.clubId && c.id !== s.club.id);
      return target.map((club) => buildOffer(s, club));
    } else if (spec && spec.origin) {
      // Retour aux sources : uniquement le club formateur (aucun repli)
      const originPool = CLUBS.filter((c) => c.id === s.clubsPlayed[0] && c.id !== s.club.id);
      return originPool.map((club) => buildOffer(s, club));
    } else if (spec && (spec.gulf || spec.exotic) && !minorLock) {
      // « Or du désert » : un club du Golfe (Arabie Saoudite / Qatar) vient vous chercher.
      // (spec.exotic : ancien nom de spec.gulf, encore accepté par sécurité.)
      pool = CLUBS.filter((c) => { const co = countryOf(c.countryId) || {}; return co.gulf && c.id !== s.club.id; });
    } else {
      pool = CLUBS_BY_LEVEL[targetLevel].filter((c) => {
        const co = countryOf(c.countryId);
        if (co.gulf) return false; // le Golfe ne se signe jamais par un transfert ordinaire
        if (c.id === s.club.id) return false;
        if (minorLock) return c.countryId === s.club.countryId;
        if (spec && spec.home) return c.countryId === s.nationality.homeCountryId;
        if (spec && spec.domestic) return c.countryId === s.club.countryId;
        if (spec && spec.cross) return c.countryId !== s.club.countryId;
        return true;
      });
    }
    if (pool.length === 0 && spec && spec.home) {
      // Aucun club du pays natal à ce niveau : élargir aux niveaux voisins
      pool = CLUBS.filter((c) => c.countryId === s.nationality.homeCountryId && c.id !== s.club.id && !(countryOf(c.countryId) || {}).gulf);
    }
    if (pool.length === 0) pool = CLUBS_BY_LEVEL[targetLevel].filter((c) => c.id !== s.club.id);
    const count = Math.min(pool.length, randInt(1, 3));
    const shuffled = [...pool].sort(() => rng() - 0.5).slice(0, count);
    const offers = shuffled.map((club) => buildOffer(s, club));
    // Une clause libératoire rend le joueur plus abordable → plus d'offres sérieuses
    if (s.flags.release_clause) offers.forEach((o) => { o.fee = Math.round(o.fee * 0.75 * 10) / 10; });
    return offers;
  }

  function loanOffersFor(s) {
    const idx = LEVEL_ORDER.indexOf(lvlOf(s, s.club));
    const levels = [LEVEL_ORDER[Math.max(0, idx - 1)], LEVEL_ORDER[Math.max(0, idx - 2)]];
    let pool = CLUBS.filter((c) => levels.includes(c.level) && c.id !== s.club.id && !(countryOf(c.countryId) || {}).gulf);
    const domestic = pool.filter((c) => c.countryId === s.club.countryId);
    if (domestic.length >= 2) pool = domestic;
    const shuffled = [...pool].sort(() => rng() - 0.5).slice(0, Math.min(pool.length, randInt(2, 3)));
    return shuffled.map((club) => ({ club, loan: true }));
  }

  function applyLoan(s, offer) {
    s.loan = { parentClub: s.club, parentCoach: s.coach, loanClubId: offer.club.id };
    s.club = offer.club;
    s.coach = pick(COACH_NAMES);
    s.coachRel = 58;
    if (!s.clubsPlayed.includes(offer.club.id)) s.clubsPlayed.push(offer.club.id);
    s.transferHistory.push({
      age: s.age,
      fromClubName: s.loan.parentClub.name,
      toClubName: offer.club.name,
      countryName: countryOf(offer.club.countryId).name,
      countryId: offer.club.countryId,
      fee: null,
      loan: true,
      level: lvlOf(s, offer.club),
    });
    s.history.push({ age: s.age, text: `Prêté une saison à ${offer.club.name} pour s'aguerrir.`, impact: 4 });
  }

  function transferWindow(s, report) {
    if (s.age >= BALANCE.ageMax) return null;
    if (s.loan) return null;
    const contractUp = s.contract.years <= 0;
    let reason = null, spec = { d: 0 };

    // Le club de prêt de l'an passé revient avec une offre définitive
    if (s.loanReturn) {
      const club = CLUBS.find((c) => c.id === s.loanReturn.clubId);
      s.loanReturn = null;
      if (club) {
        return {
          reason: `${club.name} n'a pas oublié votre prêt réussi : offre de transfert définitif sur la table.`,
          offers: [buildOffer(s, club)],
          contractUp: false,
          renewSalary: salaryFor(s, s.club),
        };
      }
    }

    // Vétéran au-delà de 42 ans : l'élite ferme ses portes. Plus aucun cador ne
    // prolonge — seuls des clubs modestes (D3/Régional le plus souvent, rarement
    // D2/D1) veulent encore d'un joueur de cet âge. Un gardien, dont l'usure est
    // moindre, tient un cran plus haut. Aucune prolongation possible : il faut
    // rebondir plus bas, saison après saison, ou raccrocher.
    if (s.age >= 42) {
      const gk = s.position.id === "gk";
      const r = rng();
      let target = gk
        ? (r < 0.15 ? "d1" : r < 0.55 ? "d2" : r < 0.9 ? "d3" : "regional")
        : (r < 0.04 ? "d1" : r < 0.15 ? "d2" : r < 0.6 ? "d3" : "regional");
      const curIdx = LEVEL_ORDER.indexOf(lvlOf(s, s.club));
      if (LEVEL_ORDER.indexOf(target) > curIdx) target = LEVEL_ORDER[curIdx]; // ne remonte jamais
      return {
        reason: gk
          ? "L'élite vous juge trop vieux, mais un gardien chevronné trouve toujours preneur, un ou deux crans plus bas."
          : "Passé 42 ans, plus aucun cador ne mise sur vous : seuls des clubs modestes vous ouvrent encore leurs portes.",
        offers: offersFor(s, { toLevel: target }),
        contractUp: false, // pas de prolongation : le vétéran doit descendre pour continuer
        renewSalary: salaryFor(s, s.club),
      };
    }

    // Joueur DÉPASSÉ par le niveau de son club : nettement sous le niveau attendu
    // ET une saison ratée (banc ou note < 6) → le club s'en sépare et le pousse
    // d'un cran (deux s'il est très loin du compte). Aucune prolongation : soit on
    // redescend se relancer, soit on raccroche. C'est le prix du haut niveau.
    const curLvl = lvlOf(s, s.club);
    const expectedHere = BALANCE.expectedLevel[curLvl];
    const outOfDepth = ovr(s) < expectedHere - 7;
    const badSeason = report && (report.benched || (report.rating != null && report.rating < 6.0));
    if (curLvl !== "regional" && outOfDepth && badSeason) {
      const drop = ovr(s) < expectedHere - 16 ? -2 : -1;
      return {
        reason: "Trop juste pour ce niveau : le club vous remercie. Direction l'échelon inférieur pour vous relancer.",
        offers: offersFor(s, { d: drop }),
        contractUp: false,
        renewSalary: salaryFor(s, s.club),
      };
    }

    if (contractUp) {
      // Le club ne prolonge PAS automatiquement : une saison ratée (note faible,
      // banc, coach à cran) peut le pousser à NE PAS renouveler → il faut rebondir
      // ailleurs, souvent un cran plus bas. Les cadres (Important/Titulaire) sont
      // mieux protégés ; un Espoir/Sporadique est plus vite lâché.
      const r = report && report.rating != null ? report.rating : 6.2;
      const benched = report && report.benched;
      let decline = 0;
      if (r < 5.4 || (benched && s.coachRel < 30)) decline = 0.85;
      else if (benched || r < 6.0 || s.coachRel < 35) decline = 0.55;
      else if (r < 6.4) decline = 0.2;
      decline *= (s.role >= 3 ? 0.55 : s.role <= 1 ? 1.3 : 1);
      if (decline > 0 && rng() < decline) {
        let offers = [];
        for (let d = (r < 5.4 ? -1 : (rng() < 0.5 ? -1 : 0)); d >= -3 && !offers.length; d--) offers = offersFor(s, { d });
        if (offers.length) {
          return {
            reason: `Vos statistiques n'ont pas convaincu : ${s.club.name} ne prolonge pas votre contrat. À vous de rebondir ailleurs.`,
            offers, contractUp: false, noStay: true, renewSalary: salaryFor(s, s.club),
          };
        }
        // Aucun club preneur : on n'envoie pas dans le vide → la prolongation a lieu quand même.
      }
      reason = "Votre contrat expire : il faut trancher.";
      spec = { d: r >= 7.2 ? 1 : 0 };
    } else if (report && report.promoted) {
      reason = `La montée ${deOf(s.club.name)} fait de vous une cible : rester pour l'aventure, ou viser encore plus haut ?`;
      spec = { d: 1 };
    } else if (report && report.relegated) {
      reason = `La relégation ${deOf(s.club.name)} ouvre votre bon de sortie.`;
      spec = { d: 0 };
    } else if (report && report.benched) {
      if (rng() < 0.65) { reason = "Votre temps de jeu famélique alerte tout le marché."; spec = { d: -1 }; }
    } else if (report && report.rating >= 7.8 && s.rep >= 50 && lvlOf(s, s.club) !== "elite") {
      if (rng() < 0.5) { reason = "Votre saison XXL affole les recruteurs."; spec = { d: 1 }; }
    } else if (s.flags.listed) {
      // Placé sur la liste des transferts après un bras de fer
      delete s.flags.listed;
      reason = "Le club vous a placé sur la liste des transferts : le marché s'organise.";
      spec = { d: report && report.rating >= 7 ? 0 : -1 };
    } else if (rng() < BALANCE.windowRandomChance) {
      reason = "Le mercato s'agite autour de votre nom.";
      spec = { d: rng() < 0.35 ? 1 : 0, cross: rng() < 0.3 };
    }
    if (!reason) return null;
    if (s.age >= 28 && s.rep >= 55 && rng() < 0.25) spec.gulfExtra = true;

    let offers = rng() < BALANCE.noOfferChance && !contractUp ? [] : offersFor(s, spec);
    if (spec.gulfExtra) {
      const gulf = offersFor(s, { gulf: true }); // offre "or du désert" (Arabie Saoudite / Qatar) pour un vétéran coté
      if (gulf.length) offers = offers.concat(gulf.slice(0, 1));
    }
    return { reason, offers, contractUp, renewSalary: salaryFor(s, s.club) };
  }

  function applyTransfer(s, offer) {
    const from = s.club;
    s.prevClub = { id: from.id, name: from.name, countryId: from.countryId, level: lvlOf(s, from) };
    s.club = offer.club;
    s.coach = pick(COACH_NAMES);
    s.coachRel = 55 + randInt(0, 8);
    s.teamRel = 52 + randInt(0, 10);
    s.contract = { salary: offer.salary, years: offer.years };
    s.money += Math.min(3, offer.fee * 0.06);
    s.role = (offer.role != null) ? offer.role : roleForClub(s, offer.club); // statut signé
    s.seasonsAtClub = 0; // nouveau club : la revue de rôle saute la 1re saison
    s.clubMomentum = 0;
    s.clubFade = 0;
    if (!s.clubsPlayed.includes(offer.club.id)) s.clubsPlayed.push(offer.club.id);
    s.transferHistory.push({
      age: s.age,
      fromClubName: from.name,
      toClubName: offer.club.name,
      countryName: countryOf(offer.club.countryId).name,
      countryId: offer.club.countryId,
      fee: offer.fee,
      level: lvlOf(s, offer.club),
    });
    s.history.push({ age: s.age, text: `Transfert à ${offer.club.name} pour ${fmtMoney(offer.fee)}.`, impact: 5 });
    s.justTransferred = true; // retrouvailles possibles la saison suivante
    const newCountry = countryOf(offer.club.countryId);
    if (newCountry) {
      if (!s.continentsPlayed.includes(newCountry.continent)) s.continentsPlayed.push(newCountry.continent);
      if (newCountry.gulf) { // championnats du Golfe (Arabie Saoudite / Qatar) : l'or du désert
        s.flags.played_exotic = true;
        if (s.age >= 33) s.flags.exotic_late = true;
      }
    }
    if (hasTrait(s, "loyal")) s.moral = clamp(s.moral - 4, 5, 100);
  }

  function renewContract(s, window) {
    s.contract = { salary: window ? window.renewSalary : salaryFor(s, s.club), years: randInt(2, 4) };
    if (hasTrait(s, "loyal")) s.moral = clamp(s.moral + 4, 5, 100);
  }

  // --- Fin de carrière ------------------------------------------------------
  function totalAwards(s) {
    return Object.values(s.awardCounts).reduce((a, b) => a + b, 0);
  }

  // Note de carrière affichée sur la carte finale : l'OVR max, bonifié par
  // ce qui fait les monstres sacrés (Ballons d'Or, Mondial, palmarès,
  // longévité, sélection). Une carrière légendaire atteint 93-95.
  function careerRating(s) {
    const t = s.trophies;
    let bonus = t.ballon * 2 + t.worldCup * 2 + Math.min(3, t.continental) +
      Math.min(1.5, (t.continental2 || 0) * 0.5 + (t.continental3 || 0) * 0.25) +
      Math.min(2, (t.contInt || 0) * 0.7) +
      Math.min(2, t.league * 0.4) + Math.min(1.5, totalAwards(s) * 0.15) +
      (s.natTeam.caps >= 100 ? 1 : 0) + (s.totals.matches >= 700 ? 0.5 : 0) +
      (s.rep >= 90 ? 1 : 0);
    return Math.min(97, Math.round(s.peakOvr + Math.min(11, bonus)));
  }

  function computeCareerScore(s) {
    const t = s.trophies;
    return Math.round(
      s.peakOvr * 1.0 + s.rep * 0.45 +
      t.worldCup * 20 + t.ballon * 18 + t.continental * 9 + (t.contInt || 0) * 11 +
      (t.natLeague || 0) * 5 + (t.olympic || 0) * 8 + (t.continental2 || 0) * 5 + (t.continental3 || 0) * 2 +
      t.league * 4 + t.cup * 2 + t.goldenBoot * 5 +
      Math.min(12, totalAwards(s) * 1.2) +
      Math.min(20, s.natTeam.caps / 6) + Math.min(15, s.totals.goals / 30) +
      s.money * 0.05
    );
  }

  function careerTitle(s) {
    if (s.careerEnded && s.careerEndReason) {
      if (s.careerEndReason === "medical") {
        return { title: "Carrière jamais commencée", story: "Un diagnostic médical implacable a mis fin à vos espoirs avant même vos débuts professionnels. Une histoire qui aurait pu être si différente." };
      }
      // Fin sur blessure : le récit s'adapte à l'âge et au palmarès accompli — un
      // vétéran au vrai vécu n'est pas un « espoir fauché ».
      const sc = computeCareerScore(s);
      if (s.age >= 30 || sc >= 130) {
        return { title: "Carrière écourtée par la blessure", story: "Une blessure de trop a refermé le rideau plus tôt que vous ne l'auriez voulu. Mais le chemin parcouru, lui, personne ne pourra vous l'enlever." };
      }
      if (s.age >= 24) {
        return { title: "Carrière fauchée en plein vol", story: "En pleine ascension, une blessure implacable a tout arrêté net. On ne saura jamais jusqu'où vous seriez allé — et c'est peut-être ça, le plus cruel." };
      }
      return { title: "Carrière brisée", story: "Une blessure sévère a stoppé net votre progression, alors que tout semblait encore possible. Le destin en a décidé autrement." };
    }
    const score = computeCareerScore(s);
    const t = s.trophies;
    if ((t.worldCup > 0 || t.ballon > 0) && score < 170) {
      return { title: "Star inattendue", story: "Rien ne laissait présager un tel sommet, et pourtant vous avez soulevé le plus grand des trophées. Une carrière que personne n'avait vue venir." };
    }
    if (score >= 235) return { title: "Légende du football mondial", story: "Votre nom restera gravé parmi les plus grands. Les gamins du monde entier porteront votre maillot pendant des décennies." };
    if (score >= 196) return { title: "Star mondiale", story: "Vous avez marqué votre époque et forcé le respect de tout un sport, bien au-delà des frontières de vos clubs." };
    if (score >= 148) return { title: "Joueur de classe internationale", story: "Une carrière remarquable, de celles qui remplissent les stades et les albums de vignettes." };
    if (score >= 105) return { title: "Carrière solide et respectée", story: "Sans être une superstar, vous avez mené une carrière dont vous pouvez être fier, reconnue par vos pairs." };
    if (score >= 78) return { title: "Honnête professionnel", story: "Une carrière sans éclat majeur, mais menée avec sérieux jusqu'au bout, loin des projecteurs." };
    return { title: "Carrière discrète", story: "Le grand public ne retiendra pas votre nom, mais vous avez vécu de votre passion, et ça n'a pas de prix." };
  }

  function pickHighlights(history, count) {
    return [...history].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, count);
  }

  function buildNarrative(s) {
    const base = careerTitle(s);
    const highlights = pickHighlights(s.history, 2).map((h) => h.text).join(" ");
    return { title: base.title, story: highlights ? `${base.story} ${highlights}` : base.story };
  }

  function buildUntakenPath(s) {
    const moments = s.history.filter((h) => Math.abs(h.impact) >= 5);
    if (!moments.length) return null;
    const chosen = pick(moments.slice(0, 6));
    return pick(UNTAKEN_PATH_TEMPLATES).replace("{age}", chosen.age);
  }

  // --- Rival ------------------------------------------------------------------
  // Le rival joue au même poste que le joueur quand il est fourni :
  // une vraie rivalité se joue sur le même territoire.
  function newRival(forcedPosition) {
    const nat = pick(NATIONALITIES);
    const origin = pick(ORIGINS);
    const position = forcedPosition || pick(POSITIONS);
    const lifestyle = pick(LIFESTYLES);
    const entourage = pick(ENTOURAGES);
    const potCap = rollPotential(origin, lifestyle, entourage);
    const offers = academyOffers({ nationality: nat, origin, lifestyle, entourage, potCap });
    const start = offers.length ? pick(offers).club : pick(CLUBS_BY_LEVEL.regional);
    return newCareer({ nationality: nat, origin, position, lifestyle, entourage, potCap, club: start });
  }

  function rivalSeason(r) {
    if (r.careerEnded || r.retiring || r.age > BALANCE.ageMax) return null;
    const ev = pickEvent(r);
    if (ev) {
      const eligible = ev.options.filter((o) => optionEligible(r, o));
      const opt = pick(eligible.length ? eligible : ev.options);
      const res = resolveOption(r, opt);
      if (r.careerEnded) return null;
      if (res.outcome.fx && res.outcome.fx.transfer && !res.outcome.fx.transfer.direct) {
        const offers = offersFor(r, res.outcome.fx.transfer);
        if (offers.length && rng() < 0.7) applyTransfer(r, pick(offers));
      } else if (res.outcome.fx && res.outcome.fx.loan) {
        const offers = loanOffersFor(r);
        if (offers.length) applyLoan(r, pick(offers));
      }
    }
    if (r.age <= 18 && rng() < BALANCE.earlyEndChance) {
      r.careerEnded = true;
      r.careerEndReason = "injury";
      return null;
    }
    const report = playSeason(r);
    if (report.wc && report.wc.finalPending) resolveWcFinal(r, report, null);
    while (report.pendingMoments.length) resolveSeasonMoment(r, report, report.pendingMoments.shift(), null);
    if (r.careerEnded) return report; // blessure fatale en cours de saison : le rival ne transfère/vieillit plus
    const window = transferWindow(r, report);
    if (window) {
      if (window.offers.length && rng() < 0.6) applyTransfer(r, pick(window.offers));
      else renewContract(r, window);
    }
    advanceYear(r);
    return report;
  }

  // diff (optionnel) : score du joueur − score du rival, pour les unes
  // comparatives qui font vivre le duel de génération.
  function rivalNewsLine(r, report, diff) {
    if (!report) return null;
    if (diff != null && Math.abs(diff) > 12 && rng() < 0.35) {
      const tpl = pick(diff >= 0 ? RIVAL_NEWS_AHEAD : RIVAL_NEWS_BEHIND);
      return tpl.replace(/\{rival\}/g, r.name);
    }
    const good = report.rating >= 7 || report.trophies.length > 0;
    const tpl = pick(good ? RIVAL_NEWS_GOOD : RIVAL_NEWS_BAD);
    return tpl.replace(/\{rival\}/g, r.name);
  }

  function compareVerdict(s, r) {
    if (s.careerEnded) return `Le destin ne vous aura pas laissé la moindre chance de rivaliser. ${r.name} aura eu l'opportunité de construire la carrière qui vous a échappé.`;
    if (r.careerEnded) return `${r.name} n'aura même pas eu la chance de faire ses preuves. Le destin vous aura été bien plus favorable qu'à lui.`;
    const diff = computeCareerScore(s) - computeCareerScore(r);
    if (diff > 50) return `Vous surpassez très largement ${r.name} : cette rivalité n'en aura jamais vraiment été une.`;
    if (diff > 18) return `Vous prenez clairement le dessus sur ${r.name} au fil des années.`;
    if (diff > -18) return `Une rivalité aussi intense que serrée avec ${r.name} — tout aurait pu basculer à tout moment.`;
    if (diff > -50) return `${r.name} vous aura devancé sur la majeure partie de votre carrière.`;
    return `${r.name} aura eu la carrière que vous auriez rêvé d'avoir.`;
  }

  // --- Défi du jour : dérivation déterministe (PARTAGÉE client ↔ serveur) -------
  // hashInt DOIT rester identique à celui de game.js : la graine du jour ne doit
  // jamais diverger entre l'affichage (client) et la vérification (serveur).
  function hashInt(n) {
    let h = (n >>> 0);
    h ^= h >>> 16;
    h = Math.imul(h, 0x45d9f3b);
    h ^= h >>> 16;
    h = Math.imul(h, 0x45d9f3b);
    h ^= h >>> 16;
    return h >>> 0;
  }
  // Profil imposé du jour (nationalité/poste/origine), dérivé de la date.
  function dailyChallenge(dateKey) {
    const seed = Number(String(dateKey).replace(/-/g, ""));
    return {
      id: dateKey,
      nationality: NATIONALITIES[hashInt(seed * 5 + 1) % NATIONALITIES.length],
      position: POSITIONS[hashInt(seed * 5 + 2) % POSITIONS.length],
      origin: ORIGINS[hashInt(seed * 5 + 3) % ORIGINS.length],
    };
  }
  // Graine MOTEUR du run de défi : mêmes événements pour tous, à choix égaux.
  function dailySeedFor(dateKey) { return hashInt(Number(String(dateKey).replace(/-/g, "")) + 777); }

  // Profil imposé d'un duel : même dérivation que le Défi, mais depuis la graine.
  function duelChallenge(seed) {
    return {
      nationality: NATIONALITIES[hashInt(seed * 5 + 1) % NATIONALITIES.length],
      position: POSITIONS[hashInt(seed * 5 + 2) % POSITIONS.length],
      origin: ORIGINS[hashInt(seed * 5 + 3) % ORIGINS.length],
    };
  }

  // Rejeu HEADLESS d'un run à partir du SEUL journal de choix, sous (graine, profil).
  // Cœur de l'anti-triche : le serveur charge ce même moteur, rejoue et RECALCULE
  // le score. Le client ne peut donc pas mentir sur son score — seuls ses CHOIX
  // comptent. Miroir EXACT du chemin interactif (Défi du jour ET duel).
  function replayRun(seed, prof, choices) {
    const log = choices || [];
    let i = 0;
    const next = () => (i < log.length ? log[i++] : 0);
    setSeed(seed);
    const lifestyle = LIFESTYLES[next()] || LIFESTYLES[0];
    const entourage = ENTOURAGES[next()] || ENTOURAGES[0];
    const potCap = rollPotential(prof.origin, lifestyle, entourage);
    const offers = academyOffers({ nationality: prof.nationality, origin: prof.origin, lifestyle, entourage, potCap });
    const club = (offers[next()] || offers[0]).club;
    const s = newCareer({ nationality: prof.nationality, origin: prof.origin, position: prof.position, lifestyle, entourage, potCap, club });
    let guard = 0;
    while (!s.careerEnded && !s.retiring && s.age <= BALANCE.ageMax && guard++ < 40) {
      const ev = pickEvent(s);
      if (ev) {
        const res = resolveOption(s, ev.options[next()] || ev.options[0]);
        if (s.careerEnded) break;
        if (res.outcome.fx && res.outcome.fx.transfer && !res.outcome.fx.transfer.direct) {
          const t = offersFor(s, res.outcome.fx.transfer);
          const ch = next();
          if (t.length && ch >= 0) applyTransfer(s, t[ch] || t[0]);
        } else if (res.outcome.fx && res.outcome.fx.loan) {
          const l = loanOffersFor(s);
          const ch = next();
          if (l.length) applyLoan(s, l[ch] || l[0]);
        }
      }
      if (s.age <= 18 && rng() < BALANCE.earlyEndChance) { s.careerEnded = true; s.careerEndReason = "injury"; break; }
      const report = playSeason(s);
      while (report.pendingMoments.length) {
        const entry = report.pendingMoments.shift();
        const opt = entry.moment.options[next()];
        resolveSeasonMoment(s, report, entry, opt ? opt.id : null);
      }
      if (report.wc && report.wc.finalPending) {
        const opt = report.wc.moment.options[next()];
        resolveWcFinal(s, report, opt ? opt.id : null);
      }
      if (s.careerEnded) break;
      if (s.retiring || s.age >= BALANCE.ageMax) break;
      const window = transferWindow(s, report);
      if (window) {
        const ch = next();
        if (window.offers.length && ch >= 0) applyTransfer(s, window.offers[ch] || window.offers[0]);
        else if (window.contractUp) renewContract(s, window);
      }
      advanceYear(s);
    }
    return s;
  }
  function replayDaily(dateKey, choices) { return replayRun(dailySeedFor(dateKey), dailyChallenge(dateKey), choices); }
  function replayDuel(seed, choices) { return replayRun((seed | 0) || 1, duelChallenge((seed | 0) || 1), choices); }
  // Scores officiels d'un run rejoué (ce que le serveur inscrit / compare).
  function scoreDaily(dateKey, choices) { return computeCareerScore(replayDaily(dateKey, choices)); }
  function scoreDuel(seed, choices) { return computeCareerScore(replayDuel(seed, choices)); }

  // --- Export ------------------------------------------------------------------
  const Engine = {
    rng, setSeed, clearSeed, getSeedState, setSeedState,
    clamp, rand, randInt, pick, weightedRandom, countryOf, levelRank, lvlOf, divShort,
    deOf, leOf,
    fmtMoney, rollPotential, potStars, prodigyChance, pickTrajectory, academyOffers,
    generateName, newCareer, ovr, hasTrait, renderText, applyFx,
    eventEligible, pickEvent, optionEligible, resolveOption, netImpact, toneOf,
    keyMomentFor, keyMomentSuccess, playKeyMoment, isWorldCupYear,
    playWorldCup, resolveWcFinal, isContinentalYear, playContinental, isNationsLeagueYear, playNationsLeague, isOlympicYear, playOlympics, playingTimeFactor, setSeasonObjective,
    objectiveMet, headlineFor, grantAward, rollSeasonAwards, rollBallon,
    roleForClub, roleOf,
    playSeason, resolveSeasonMoment, advanceYear, marketValue, salaryFor,
    buildOffer, offersFor, loanOffersFor, applyLoan, transferWindow,
    applyTransfer, renewContract, totalAwards, careerRating, computeCareerScore, visibilityOf,
    careerTitle, pickHighlights, buildNarrative, buildUntakenPath,
    newRival, rivalSeason, rivalNewsLine, compareVerdict,
    hashInt, dailyChallenge, dailySeedFor, duelChallenge, replayDaily, replayDuel, scoreDaily, scoreDuel,
    BALANCE_REF: BALANCE,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  else window.Engine = Engine;
})();
