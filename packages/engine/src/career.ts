// Création d'une carrière (état initial).

import { rng } from "./rng";
import { clamp, randInt, pick } from "./utils";
import { rollPotential, prodigyChance, pickTrajectory } from "./potential";
import { rollDualNat } from "./nationality";
import { tx } from "./text";
import { applyFx } from "./effects";
import { roleForClub } from "./role";
import { squadForClub } from "./squad";
import { salaryFor } from "./transfers";
import { clubHomeOf, continentOf, countryOf, lvlOf } from "./clubs";
import { ovr } from "./player";
import type { CareerState, NewCareerOptions } from "./types";
import { BALANCE, COACH_NAMES, ENTOURAGES, LIFESTYLES, NAME_POOLS, TRAJECTORIES } from "@open-eleven/content";

// --- Création de carrière ---------------------------------------------
export function generateName(natId: string) {
  const pool = NAME_POOLS[natId] || NAME_POOLS.fr;
  return `${pick(pool.first)} ${pick(pool.last)}`;
}

export function newCareer(opts: NewCareerOptions) {
  const lifestyle = opts.lifestyle || pick(LIFESTYLES);
  const entourage = opts.entourage || pick(ENTOURAGES);
  const trajectory = opts.trajectory || pickTrajectory(opts.origin);
  const s: CareerState = {
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
    continentalDetail: [], // coupes continentales (C1) : { continent, year }
    continental2Detail: [], // Trophées continentaux (C2) : { continent, year }
    continental3Detail: [], // Boucliers continentaux (C3) : { continent, year }
    supercupDetail: [], // Supercoupes continentales (C1 vs C2) : { continent, year }
    // Parcours en SÉLECTION, tournoi par tournoi : { comp, year, stage }.
    // Rien d'autre n'en gardait trace — seuls les TITRES survivaient à la
    // saison. Une demi-finale de Coupe du Monde disparaissait purement et
    // simplement. On n'enregistre qu'un résultat déjà décidé : aucun tirage
    // consommé, donc aucune carrière modifiée.
    natRuns: [],
    subCupTicket: false, // vainqueur de Coupe Nationale → qualifié C2 continental la saison suivante
    momentWins: 0,
    derbyWins: 0,
    bestBallonRank: null,
    prevClub: null, // club quitté au dernier transfert (retrouvailles)
    natTeam: { active: false, retired: false, caps: 0, goals: 0 },
    youth: { caps: 0, goals: 0, tiers: [] }, // sélections de jeunes (U17→U23), à part des A
    olympicMedals: { gold: 0, silver: 0, bronze: 0 }, // médailles des Jeux Olympiques
    gamesMedals: { gold: 0, silver: 0, bronze: 0 }, // médailles des Jeux régionaux (asiatiques, africains…)
    totals: { matches: 0, goals: 0, assists: 0, cleanSheets: 0 },
    captainMatches: 0, // matchs disputés avec le brassard de capitaine (bilan de fin)
    trophies: { league: 0, cup: 0, leagueCup: 0, natSupercup: 0, continental: 0, continental2: 0, continental3: 0, supercup: 0, worldCup: 0, contInt: 0, natLeague: 0, olympic: 0, arabCup: 0, games: 0, ballon: 0, goldenBoot: 0, ballonAsia: 0, ballonAfrica: 0, ballonOceania: 0 },
    seasons: [],
    transferHistory: [],
    history: [],
    peakOvr: 0,
    clubsPlayed: [opts.club.id],
    continentsPlayed: [continentOf(opts.club.countryId) || "eu"],
    retiring: false,
    careerEnded: false,
    careerEndReason: null,
    sponsorDeal: null, // contrat sponsor actif { id, label, mult } — cf. SPONSOR_TIERS (content)
    sponsorTier: 0, // nombre de paliers de sponsoring déjà franchis
    dualNatAlt: null, // autre nation encore accessible après le premier choix (seconde chance à 24/28 ans)
    squad: "first", // "youth" (U17 du club) | "reserve" | "first" — fixé plus bas selon le club de départ
    devTotals: {}, // matchs/buts en U17 et en réserve, comptés à part : { youth: {...}, reserve: {...} }
    youthTrophies: { clubU17: 0, contU17: 0, wcU17: 0 }, // titres de jeunes, hors palmarès senior
    disfavorStreak: 0, // saisons consécutives de confiance coach au plancher (cf. fin de playSeason)
    frozenOut: false, // mise à l'écart décidée : appliquée puis consommée dès la saison suivante
    forcedLoanNext: false, // défiance persistante malgré la mise à l'écart : prêt forcé programmé
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
  s.transferHistory.push({ age: s.age, toClubName: opts.club.name, countryName: countryOf(opts.club.countryId)!.name, fee: null, level: lvlOf(s, opts.club) });
  s.role = roleForClub(s, opts.club); // statut au centre de formation (souvent Espoir/Rotation)
  // Effectif de départ : U17 du club pour presque tout le monde, les pros
  // d'emblée pour un prodige ou un joueur très au-dessus du niveau du club.
  // Le mode Histoire rejoue une légende : elle démarre chez les pros.
  s.squad = opts.startYear ? "first" : squadForClub(s, opts.club);
  // Exil à 16 ans (offre étrangère de academyOffers) : le mal du pays se
  // paie d'entrée. Hors mode Histoire (startYear imposé), où le club de
  // départ à l'étranger fait partie de la légende rejouée.
  if (!opts.startYear && opts.club.countryId !== clubHomeOf(opts.nationality)) {
    s.moral = clamp(s.moral - 12, 5, 100);
    s.teamRel = clamp(s.teamRel - 8, 5, 100);
    s.flags.young_exile = true;
    s.history.push({ age: s.age, text: tx(s, "youngExile"), impact: -4 });
  }
  // Double nationalité. Le tirage est TOUJOURS exécuté (même quand le joueur a
  // choisi lui-même) pour que la consommation de hasard reste identique — c'est ce
  // qui garde le Défi du jour et les duels rejouables à l'identique.
  // • Carrière libre : le joueur choisit sa seconde nationalité à la création,
  //   opts.dualNat l'emporte (null = il n'en veut pas).
  // • Défi du jour / duel / Histoire : opts.dualNat est absent → le tirage décide,
  //   comme pour tout le reste du profil imposé.
  const rolled = rollDualNat(s);
  s.dualNat = opts.dualNat !== undefined ? (opts.dualNat || null) : rolled;
  s.peakOvr = ovr(s);
  return s;
}
