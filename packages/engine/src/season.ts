// Simulation d'une saison.

import { rng } from "./rng";
import { clamp, rand, randInt, pick, weightedRandom } from "./utils";
import { tx } from "./text";
import { applyFx } from "./effects";
import { foreignLangFor, netImpact } from "./events";
import { keyMomentFor, playKeyMoment } from "./moments";
import { isWorldCupYear, playWorldCup, isContinentalYear, noteCompScorer, noteNatRun, updateNatNumber, playContinental, isNationsLeagueYear, playNationsLeague, isOlympicYear, playOlympics, isArabCupYear, isArabNation, playArabCup, regionalGamesOf, playRegionalGames, storyWcFinalFor, youthSelections } from "./international";
import { reviewRole, playingTimeFactor } from "./role";
import { setSeasonObjective, objectiveMet } from "./objectives";
import { headlineFor } from "./press";
import { grantAward, rollSeasonAwards, rollSupercup, rollBallon, rollContinentalBallon } from "./awards";
import { applyInjury, rollInjury, injuryTier, injuryEndChance } from "./injuries";
import { squadOf, reviewSquad, playDevSeason } from "./squad";
import { marketValue } from "./transfers";
import { continentOf, countryOf, divShort, isTopFlightOf, lvlOf, visibilityOf } from "./clubs";
import { ovr, hasTrait } from "./player";
import { roomClubSeason, type RoomClubOutcome } from "./rooms";
import { isQualified, qualifiersFor, settleNatPlayoff } from "./qualifiers";
import { cupOf, leagueRange, noteClubQualification, seasonCupTier, titleChanceFor } from "./clubcups";
import type { CareerState, LevelId, SeasonMomentEntry, SeasonReport } from "./types";
import { BALANCE, COMPETITIONS, CONTINENTAL_CUPS, CONTINENTAL_CUPS2, CONTINENTAL_CUPS3, ENGINE_TEXT, EVENTS, LEVEL_ORDER, MICRO_EVENTS } from "@open-eleven/content";

// --- Simulation d'une saison ----------------------------------------------
export function playSeason(s: CareerState) {
  const lvl = lvlOf(s, s.club);
  if (squadOf(s) !== "first" && !s.loan) return playDevSeason(s, lvl);
  const report: SeasonReport = { age: s.age, year: s.year, clubName: s.club.name, countryId: s.club.countryId, level: lvl, trophies: [], awards: [], lines: [], pendingMoments: [], onLoan: !!s.loan, matches: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0 };
  s.objective = setSeasonObjective(s);
  report.objectiveLabel = s.objective.label;

  seasonPrelude(s, report);

  // Temps de jeu et matchs
  const pt = playingTimeFactor(s);
  report.pt = pt;
  // Consommation du flag de mise à l'écart : une seule saison d'effet. Fait
  // ICI (pas dans playingTimeFactor, appelée deux fois par saison) pour ne
  // le clore qu'une fois — report.frozenOutActive garde la trace pour la
  // vérification de fin de saison plus bas (escalade vers le prêt forcé).
  if (s.frozenOut) { report.frozenOutActive = true; s.frozenOut = false; }

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
    s.history.push({ age: s.age, text: tx(s, "injury", { label: BALANCE.injury.labels[seasonInj.tier.id], weeks: seasonInj.weeks }), impact: -(seasonInj.tier.mor + 4) });
    // Grosse blessure → carte interactive « chemin du retour »
    if (seasonInj.tier.interactive) {
      report.pendingMoments.push({
        type: "injury", label: tx(s, "momInjury"),
        winLabel: tx(s, "momInjuryWin"), failLabel: tx(s, "momInjuryFail"),
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
      report.lines.push({ text: tx(s, "lineCaptain"), impact: 7 });
      s.history.push({ age: s.age, text: tx(s, "captain"), impact: 7 });
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
  // Décidé sur le niveau, pas sur le libellé traduit (cf. isTopFlightOf).
  const isTopFlight = isTopFlightOf(lvl, s.club.countryId);
  const teamBoost = 1 + (rating - 6.6) * 0.12;
  // Ticket "vainqueur de Coupe Nationale la saison PASSÉE" → C2 continental ;
  // on le lit et le vide AVANT tout crédit de coupe de cette saison (sinon un
  // sacre de coupe cette année ouvrirait le C2 la même année). Aucun rng.
  const subTicket = !!s.subCupTicket;
  s.subCupTicket = false;
  const evTrophies = s.seasonTrophies.splice(0);
  for (const tr of evTrophies) {
    if (tr === "league") s.trophies.league += 1;
    if (tr === "cup") {
      s.trophies.cup += 1;
      s.subCupTicket = true; // arme le ticket pour N+1 (le palier C2 existe ou non selon le continent, cf. plus bas)
    }
    if (tr === "continental") {
      s.trophies.continental += 1;
      const cont = continentOf(s.club.countryId) || "eu";
      report.continentalContinent = cont;
      s.continentalDetail.push({ continent: cont, year: s.year });
    }
    if (tr === "goldenBoot") s.trophies.goldenBoot += 1;
    if (tr !== "worldCup") report.trophies.push(tr);
  }
  if (evTrophies.includes("league")) {
    s.leagueTitlesDetail.push({ countryId: s.club.countryId, level: lvl, clubId: s.club.id, year: s.year });
  }
  // Mode salle : le destin du club (titre, barrages, relégation, finales, classement) est
  // tiré une seule fois pour toute la salle, cf. rooms.ts. Le solo garde son propre tirage.
  if (s.roomClub) {
    applyRoomClubSeason(s, report, roomClubSeason(s, lvl, isTopFlight), evTrophies, lvl, isTopFlight);
  } else {
    const wonDivision = !evTrophies.includes("league") && rng() < titleChanceFor(lvl, s.club.countryId) * teamBoost;
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
      s.history.push({ age: s.age, text: tx(s, "divTitlePromo", { div: divShort(lvl, s.club.countryId) }), impact: 9 });
    } else if (!isTopFlight && rating >= 6.4 && rng() < (BALANCE.playoffChance[lvl] || 0) * teamBoost) {
      // Saison solide sans titre : la montée se joue en barrage (moment décisif)
      report.playoffRun = true;
      report.pendingMoments.push({
        // Libellé explicite sur la division VISÉE : « Barrage de montée » tout court
        // laissait croire à une montée depuis la division où l'on est déjà affiché.
        type: "playoff", label: tx(s, "momPromo", { div: divShort(LEVEL_ORDER[Math.min(LEVEL_ORDER.length - 1, LEVEL_ORDER.indexOf(lvl) + 1)], s.club.countryId) }),
        winLabel: tx(s, "momPromoWin"), failLabel: tx(s, "momPromoFail"),
        moment: keyMomentFor(s, "promo_playoff"),
      });
    }
    // Relégation (d1 et d2) : vos performances protègent le club — et les
    // géants historiques ne coulent presque jamais plus bas que la D1
    let relegBase = BALANCE.relegationChance[lvl] || 0;
    if (relegBase && lvl === "d1" && s.club.level === "elite") relegBase *= BALANCE.eliteRelegShield;
    if (!report.promoted && !report.playoffRun && relegBase > 0 &&
        rng() < relegBase * clamp(1 - (rating - 6.3) * 0.35, 0.2, 1.6)) {
      // La descente ne tombe plus en silence : elle se joue en BARRAGE DE MAINTIEN,
      // moment décisif interactif — symétrique du barrage de montée. Une saison
      // vraiment catastrophique reste toutefois sans appel (relégation directe).
      if (rating <= BALANCE.relegDirectRating) {
        report.relegated = true;
        s.moral = clamp(s.moral - 8, 5, 100);
        s.history.push({ age: s.age, text: tx(s, "relegated"), impact: -10 });
      } else {
        report.relegationPlayoff = true;
        report.pendingMoments.push({
          type: "relegation_playoff", label: tx(s, "momStay"),
          winLabel: tx(s, "momStayWin"), failLabel: tx(s, "momStayFail"),
          moment: keyMomentFor(s, "relegation_playoff"),
        });
      }
    }
    // La coupe nationale : atteindre la finale se joue ici, la gagner se
    // joue dans un moment décisif
    if (!evTrophies.includes("cup") && rng() < BALANCE.cupChance[lvl] * BALANCE.cupFinalReachMult * teamBoost) {
      report.pendingMoments.push({
        type: "cup_final", label: tx(s, "momCup"),
        winLabel: tx(s, "momCupWin"), failLabel: tx(s, "momCupFail"),
        moment: keyMomentFor(s, "cup_final"),
      });
    }
    // Coupe continentale de club : ATTEINDRE la finale se joue ici, la GAGNER se
    // joue dans un moment décisif interactif (continental_final).
    // La coupe jouée vient du classement de la saison passée (cf. clubcups.ts) :
    // places de C1, puis de C2, puis de C3 selon le pays. Le billet de la Coupe
    // Nationale ouvre la C2 à un club qui n'a pas mieux. Paliers PAS uniformes
    // sur les 5 continents (pas de C2 en Océanie, pas de C3 hors Europe/Asie).
    // UN SEUL engagement/saison. Palier décidé SANS hasard ; le rng() de portée
    // reste l'unique tirage, à sa place (même pour tier 0 : rng consommé).
    if (!evTrophies.includes("continental") && !evTrophies.includes("continental2") && !evTrophies.includes("continental3")) {
      const continent = continentOf(s.club.countryId) || "eu";
      const qual = seasonCupTier(s, lvl, isTopFlight);
      let tier = 0, reachP = 0, cup = null;
      if (qual.tier === 1) {
        tier = 1;
        reachP = (continent === "eu" ? BALANCE.continentalReach.eu[lvl] : BALANCE.continentalReach.other[lvl]) || 0;
        cup = CONTINENTAL_CUPS[continent] || CONTINENTAL_CUPS.eu;
      } else if ((subTicket || qual.tier === 2) && CONTINENTAL_CUPS2[continent]) {
        tier = 2; reachP = BALANCE.subCupReach.c2[lvl] || 0; cup = CONTINENTAL_CUPS2[continent];
      } else if (qual.tier === 3 && CONTINENTAL_CUPS3[continent]) {
        tier = 3; reachP = BALANCE.subCupReach.c3[lvl] || 0; cup = CONTINENTAL_CUPS3[continent];
      }
      // Le joueur sait dès le début de saison ce que joue son club. Un club élite privé
      // d'Europe, c'est une nouvelle : on le dit. Un club modeste sans Europe, non.
      report.contTier = tier;
      if (cup) report.lines.push({ text: tx(s, "lineContSeason", { cupName: cup.name }), impact: 0 });
      else if (lvl === "elite") report.lines.push({ text: tx(s, "lineContNone"), impact: -3 });
      // contMult : certains championnats (Pays-Bas, Portugal) placent rarement leurs
      // clubs en finale européenne malgré un bon niveau interne. Défaut 1.
      const contM = (countryOf(s.club.countryId) || {}).contMult;
      // rng() TOUJOURS consommé, même tier 0 (reachP y vaut 0 → jamais vrai) :
      // sauter l'appel changerait le tirage de tous les joueurs non qualifiés.
      if (rng() < reachP * teamBoost * (contM != null ? contM : 1)) {
        report.pendingMoments.push({
          type: "continental_final",
          tier,
          continent,
          label: tx(s, "momCont", { cupName: cup!.name }),
          winLabel: tx(s, tier === 3 ? "momCont3Win" : tier === 2 ? "momCont2Win" : "momContWin"),
          failLabel: tx(s, tier === 1 ? "momContFail" : "momContEuFail"),
          moment: keyMomentFor(s, "continental_final"),
        });
      }
    }

    // Classement (mise en scène cohérente avec le destin du club)
    if (report.trophies.includes("league") || report.divisionTitle) report.leaguePos = 1;
    else if (report.playoffRun) report.leaguePos = randInt(2, 4);
    // Barragiste pour le maintien : place de relégable, mais pas encore condamné —
    // le classement définitif est réaligné si le barrage est perdu.
    else if (report.relegationPlayoff) report.leaguePos = lvl === "d1" ? randInt(15, 17) : randInt(16, 18);
    else if (report.relegated) report.leaguePos = lvl === "d1" ? randInt(16, 18) : randInt(17, 19);
    else {
      // Le classement du club n'est plus un pur dé : la saison du joueur pèse. La
      // moitié des objectifs hors élite est de type « top N » — ils étaient donc
      // décidés par un tirage sur lequel le joueur n'avait aucune prise. On réutilise
      // l'écart à la note de référence (même 6.6 que teamBoost) pour décaler le rang.
      // Fourchette selon le niveau ET le championnat (cf. clubcups.ts) : un D1 ordinaire
      // finit derrière les clubs élite de son pays.
      const [lo, hi] = leagueRange(lvl, s.club.countryId);
      // Jamais 1er ici : la première place est celle du champion, décidée plus haut.
      report.leaguePos = clamp(randInt(lo, hi) - Math.round((rating - 6.6) * 2.4), 2, hi + 2);
    }
  }

  // Les deux bornes d'une carrière. Garanties, pas tirées au sort : le
  // premier et le dernier match arrivent à tout le monde, et ils sont posés
  // AVANT le plafond de deux moments — comme la blessure ou la finale
  // continentale, qui ne se laissent pas évincer non plus.
  // Premier match PRO : les saisons en U17/réserve (0 match pro) ne comptent pas.
  if (!s.flags.debutDone && matches > 0 && !s.seasons.some((se) => se.matches > 0)) {
    s.flags.debutDone = true;
    report.pendingMoments.push({
      type: "debut", label: tx(s, "momDebut"),
      winLabel: tx(s, "momDebutWin"), failLabel: tx(s, "momDebutFail"),
      moment: keyMomentFor(s, "debut"),
    });
  }
  if (!s.flags.adieuDone && matches > 0 && s.retiring) {
    s.flags.adieuDone = true;
    report.pendingMoments.push({
      type: "last_match", label: tx(s, "momAdieu"),
      winLabel: tx(s, "momAdieuWin"), failLabel: tx(s, "momAdieuFail"),
      moment: keyMomentFor(s, "last_match"),
    });
  }

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
        type: "old_club", label: tx(s, "momOldClub"),
        winLabel: tx(s, "momOldClubWin"), failLabel: tx(s, "momOldClubFail"),
        moment: keyMomentFor(s, "old_club"),
      });
    } else if (rng() < BALANCE.derbyMomentChance) {
      report.pendingMoments.push({
        type: "derby", label: tx(s, "momDerby"),
        winLabel: tx(s, "momDerbyWin"), failLabel: tx(s, "momDerbyFail"),
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
  const shoeCoef = (continentOf(s.club.countryId) === "eu" && BALANCE.goldenShoeCoef[lvl]) || 0;
  if (shoeCoef && report.goals * shoeCoef >= BALANCE.goldenShoePts && !evTrophies.includes("goldenBoot") && rng() < BALANCE.goldenShoeChance) {
    s.trophies.goldenBoot += 1;
    report.trophies.push("goldenBoot");
    s.history.push({ age: s.age, text: tx(s, "goldenBoot"), impact: 12 });
  }

  // Sélections de jeunes de la saison = écart des totaux (U17 à U23, Jeux compris).
  const youthBefore = s.youth ? { caps: s.youth.caps, goals: s.youth.goals } : { caps: 0, goals: 0 };
  youthSelections(s, report);

  // Mode Histoire : la finale mondiale scénarisée impose la sélection cette
  // année-là (le maître ne rate pas SON dernier Mondial).
  if (storyWcFinalFor(s) && !s.careerEnded) { s.natTeam.active = true; s.natTeam.retired = false; }

  // Saison de qualifications : le monde joue ses éliminatoires pour le tournoi de l'an
  // prochain (cf. qualifiers.ts), que le joueur soit appelé ou non ; il ne les vit que
  // s'il est international (récit, barrage joué).
  const qualFor = isWorldCupYear(s.year + 1) ? "wc" : isContinentalYear(s.year + 1) ? "cont" : null;
  if (qualFor && !s.careerEnded) narrateQualifiers(s, report, qualFor, s.year + 1);

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
    // Attribué à la première convocation, puis réévalué chaque saison : le
    // statut monte, le numéro suit. Appelé APRÈS l'incrément des caps pour
    // que le seuil « cadre » tienne compte de la saison en cours.
    updateNatNumber(s);
    // Les matchs & buts d'un grand tournoi comptent dans le bilan sélection de
    // la saison (affiché au récap), en plus de leur propre carte dédiée.
    const euNation = continentOf(s.nationality.homeCountryId) === "eu";
    const nlYear = isNationsLeagueYear(s.year) && euNation; // Ligue des Sélections : Europe uniquement
    const arabYear = isArabCupYear(s.year) && isArabNation(s); // Coupe arabe : même année, nations arabes
    // Seuls les qualifiés disputent le Mondial et la coupe continentale. Une finale de
    // Mondial scénarisée (mode Histoire) vaut qualification.
    const wcYear = isWorldCupYear(s.year), contYear = isContinentalYear(s.year);
    const wcOn = wcYear && (!!storyWcFinalFor(s) || isQualified(s, "wc", s.year));
    const contOn = contYear && isQualified(s, "cont", s.year);
    if (heavyInjury && (wcOn || contOn || nlYear || arabYear)) report.tournamentMissed = true;
    else if (wcYear && !wcOn) noteNotQualified(s, report, "wc");
    else if (contYear && !contOn) noteNotQualified(s, report, "cont");
    else if (wcOn) { report.wc = playWorldCup(s); report.caps += report.wc.games; report.natGoals += report.wc.goals; noteCompScorer(s, report, "wc", report.wc.goals); }
    else if (contOn) { report.cont = playContinental(s, report); report.caps += report.cont.games; report.natGoals += report.cont.goals; noteCompScorer(s, report, "cont", report.cont.goals); }
    else if (nlYear) { report.natl = playNationsLeague(s, report); report.caps += report.natl.games; report.natGoals += report.natl.goals; noteCompScorer(s, report, "natl", report.natl.goals); }
    else if (arabYear) { report.arab = playArabCup(s, report); report.caps += report.arab.games; report.natGoals += report.arab.goals; noteCompScorer(s, report, "arab", report.arab.goals); }
    // Passes décisives en sélection, pour l'historique : déduites des matchs et du
    // niveau de la saison, SANS tirage — aucune carrière ne change de déroulé.
    report.natAssists = Math.max(0, Math.round(report.caps * s.position.assistRate * perf * 0.9));
    s.natTeam.assists = (s.natTeam.assists || 0) + report.natAssists;
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
    if ((u23 || overage) && goodEnough) {
      report.olympic = playOlympics(s, report);
      noteCompScorer(s, report, "olympic", report.olympic.goals);
    }
  }

  // Jeux régionaux (Asie, Afrique, Amériques, Pacifique) : pendant continental
  // des Jeux Olympiques, ouvert à ceux que le GRAND tournoi de l'année n'a pas
  // retenus — Mondial pour l'Asie, Jeux Olympiques ailleurs. Rien n'est tiré
  // (donc aucune carrière européenne ne change) tant que les conditions ne sont
  // pas réunies : le hasard n'est consommé qu'à partir du surclassement.
  const gamesDef = regionalGamesOf(s);
  if (gamesDef && s.year % 4 === gamesDef.yearMod && !s.careerEnded && !olympicInjury && !report.wc && !report.olympic) {
    const GB = BALANCE.regionalGames;
    const u23 = s.age >= GB.minAge && s.age <= 23;
    const overage = s.age > 23 && s.age <= GB.overageMaxAge && s.rep >= GB.overageMinRep && s.natTeam.active && rng() < GB.overageChance; // surclassé, rare
    const goodEnough = ovr(s) >= GB.minOvr && (s.natTeam.active || s.flags.youth_int || ovr(s) >= GB.minOvrNoCall);
    if ((u23 || overage) && goodEnough) {
      report.games = playRegionalGames(s, report, gamesDef);
      noteCompScorer(s, report, "games", report.games.goals);
    }
  }

  // Distinctions promises par les événements, puis celles de la saison, puis Ballon d'Or
  if (s.seasonAwards) for (const id of s.seasonAwards.splice(0)) grantAward(s, report, id);
  rollSeasonAwards(s, report);
  rollBallon(s, report, 0);
  rollContinentalBallon(s, report, 0);

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

  // Revenus — un contrat sponsor signé à un palier de réputation (cf.
  // sponsorOffersFor/applySponsorDeal) remplace le multiplicateur par
  // défaut, sur la même base (réputation × charisme × visibilité). Sans
  // contrat (jeune joueur encore inconnu), 1.8 reproduit l'ancien calcul.
  const dealMult = s.sponsorDeal ? s.sponsorDeal.mult : 1.8;
  const sponsors = (s.rep / 100) * (s.stats.c / 100) * visibilityOf(s) * dealMult;
  const income = s.contract.salary * 0.55 + sponsors * rand(0.6, 1.2);
  s.money += income;
  report.income = income + (report.objectiveBonus || 0);
  report.sponsorLabel = s.sponsorDeal ? s.sponsorDeal.label : null;
  const prize = report.trophies.length * 0.3;
  if (prize) s.money += prize;

  if (report.trophies.includes("league")) s.history.push({ age: s.age, text: tx(s, "leagueTitle"), impact: 10 });

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
      report.careerEndInjury = { age: s.age, tier: tier!.id };
      s.history.push({ age: s.age, text: tx(s, "careerEndInjury", { label: BALANCE.injury.labels[tier!.id] }), impact: -90 });
    }
  }

  // Totaux carrière
  s.totals.matches += matches;
  s.totals.goals += report.goals;
  s.totals.assists += report.assists;
  s.totals.cleanSheets += report.cleanSheets;
  s.peakOvr = Math.max(s.peakOvr, ovr(s));
  // marketValue() est une fonction PURE de l'état (aucun rng) : la figer ici
  // ne consomme pas de hasard et ne change donc rien au déroulé de carrière.
  const mv = Math.round(marketValue(s) * 10) / 10;
  s.seasons.push({ age: s.age, year: s.year, clubName: s.club.name, countryId: s.club.countryId, level: lvl, matches, goals: report.goals, assists: report.assists, cleanSheets: report.cleanSheets, rating: report.rating, trophies: report.trophies, divisionTitle: !!report.divisionTitle, onLoan: !!s.loan, leaguePos: report.leaguePos, mv });
  // Historique en sélection : seulement les saisons où le joueur a été appelé.
  const seasonRec = s.seasons[s.seasons.length - 1];
  if (report.caps) seasonRec.nat = { caps: report.caps, goals: report.natGoals || 0, assists: report.natAssists || 0 };
  const youthCaps = s.youth ? s.youth.caps - youthBefore.caps : 0;
  if (youthCaps > 0) seasonRec.youthNat = { caps: youthCaps, goals: s.youth.goals - youthBefore.goals };

  // Relations
  if (rating >= 7.4) s.coachRel = clamp(s.coachRel + 4, 5, 100);
  else if (rating <= 5.5) s.coachRel = clamp(s.coachRel - 5, 5, 100);
  if (s.teamRel >= 70) s.moral = clamp(s.moral + 2, 5, 100);
  else if (s.teamRel <= 35) s.moral = clamp(s.moral - 3, 5, 100);
  if (pt < 0.45) { s.moral = clamp(s.moral - 8, 5, 100); report.benched = true; }
  else if (pt > 0.85) s.moral = clamp(s.moral + 3, 5, 100);

  if (s.loan) s.loan.rating = report.rating;
  // Le classement final ouvre (ou non) une coupe continentale pour la saison prochaine.
  const nextTier = noteClubQualification(s, report.leaguePos, isTopFlight);
  const nextCup = cupOf(nextTier, s.club.countryId);
  if (nextCup) {
    report.lines.push({
      text: report.leaguePos === 1 ? tx(s, "lineContQualChamp", { cupName: nextCup.name }) : tx(s, "lineContQual", { cupName: nextCup.name, rank: report.leaguePos }),
      impact: nextTier === 1 ? 5 : 3,
    });
  } else if (isTopFlight && lvl === "elite") {
    report.lines.push({ text: tx(s, "lineContQualMissed", { rank: report.leaguePos }), impact: -4 });
  }
  s.lastSeason = { clubId: s.club.id, leaguePos: report.leaguePos, promoted: !!report.promoted, relegated: !!report.relegated, rating: report.rating, wonLeague: report.trophies.includes("league") };
  reviewRole(s, report); // statut dynamique : promotion / rétrogradation / recrue concurrente
  reviewSquad(s, report); // un jeune dépassé peut redescendre en réserve
  report.headline = headlineFor(s, report);

  // Confiance critique : si la relation avec le coach termine la saison au
  // plancher DEUX fois de suite, le club passe à l'action — mise à l'écart
  // la saison suivante. Si la défiance reste au plancher PENDANT cette
  // mise à l'écart (report.frozenOutActive, posé plus haut cette même
  // saison), la sanction est jugée insuffisante → prêt forcé direct, sans
  // exiger un second compteur de deux saisons (déjà purgé au passage
  // précédent). Un prêté dépend déjà d'un autre club : pas de double
  // sanction pendant un prêt.
  if (!s.loan) {
    if (report.frozenOutActive) {
      if (s.coachRel <= 18) {
        s.forcedLoanNext = true;
        report.forcedLoanWarning = tx(s, "forcedLoanWarning");
        s.history.push({ age: s.age, text: report.forcedLoanWarning, impact: -10 });
      }
      s.disfavorStreak = 0;
    } else {
      s.disfavorStreak = s.coachRel <= 18 ? (s.disfavorStreak || 0) + 1 : 0;
      if (s.disfavorStreak >= 2) {
        s.frozenOut = true;
        report.frozenOutWarning = tx(s, "frozenOutWarning");
        s.history.push({ age: s.age, text: report.frozenOutWarning, impact: -8 });
        s.disfavorStreak = 0;
      }
    }
  }
  return report;
}

// playSeason évalue l'objectif du club AVANT que les moments décisifs
// (finale de coupe, finale de Mondial, barrage) ne soient joués — ils sont
// interactifs et n'arrivent qu'après. Un trophée décroché là peut donc
// valider l'objectif a posteriori : on annule la sanction déjà appliquée
// et on verse la récompense prévue. Sans hasard consommé, pour ne pas
// décaler le PRNG (Défi du jour / rejeu de duel restent identiques).
// Mode salle : applique le destin COMMUN du club (rooms.ts) avec les mêmes effets que
// le tirage solo de playSeason. Les finales et barrages restent des moments joués par
// chacun : leur issue est fixée d'avance (sharedWin), le choix ne pèse que sur la
// performance personnelle du joueur (cf. playKeyMoment).
// --- Qualifications des sélections : le récit pour le joueur -----------------------
export function qualCompName(s: CareerState, comp: string) {
  if (comp === "wc") return ENGINE_TEXT.natCompWc;
  const cont = continentOf(s.nationality.homeCountryId) || "eu";
  return ENGINE_TEXT[{ eu: "natCompEu", am: "natCompAm", af: "natCompAf", as: "natCompAs", oc: "natCompOc" }[cont] || "natCompEu"];
}

function narrateQualifiers(s: CareerState, report: SeasonReport, comp: "wc" | "cont", year: number) {
  const q = qualifiersFor(s, comp, year);
  if (!s.natTeam.active) return; // le monde a joué ses qualifications ; le joueur n'y était pas
  const name = qualCompName(s, comp);
  const m = q.mine;
  if (m.stage === "host") report.lines.push({ text: tx(s, "lineQualHost", { comp: name, when: year }), impact: 4 });
  else if (m.stage === "auto") report.lines.push({ text: tx(s, "lineQualAuto", { comp: name, when: year }), impact: 3 });
  else if (m.stage === "direct") report.lines.push({ text: m.rank === 1 ? tx(s, "lineQualDirectFirst", { comp: name, when: year }) : tx(s, "lineQualDirect", { comp: name, when: year, rank: m.rank }), impact: 6 });
  else if (m.stage === "out") report.lines.push({ text: tx(s, "lineQualOut", { comp: name, when: year, rank: m.rank }), impact: -5 });
  else if (m.stage === "playoff_won" || m.stage === "playoff_lost") {
    // Barrage : le joueur le vit en moment décisif ; son issue tranche.
    report.pendingMoments.push({
      type: "nat_playoff", comp, year,
      label: tx(s, "momNatPlayoff", { comp: name, when: year }),
      winLabel: tx(s, "momNatPlayoffWin"), failLabel: tx(s, "momNatPlayoffFail"),
      moment: keyMomentFor(s, "nat_playoff"),
    });
  }
}

// Nation non qualifiée l'année du tournoi : on le dit, et l'historique le garde.
function noteNotQualified(s: CareerState, report: SeasonReport, comp: "wc" | "cont") {
  report.lines.push({ text: tx(s, "lineDnq", { comp: qualCompName(s, comp), when: s.year }), impact: -4 });
  report.notQualified = comp;
  noteNatRun(s, comp, "dnq");
}

function applyRoomClubSeason(s: CareerState, report: SeasonReport, club: RoomClubOutcome, evTrophies: string[], lvl: LevelId, isTopFlight: boolean) {
  if (club.cupFinal && club.cupWin) s.roomCupWonYear = s.year; // ticket C2 de la salle pour N+1
  if (club.title && !evTrophies.includes("league")) {
    s.trophies.league += 1;
    s.leagueTitlesDetail.push({ countryId: s.club.countryId, level: lvl, clubId: s.club.id, year: s.year });
    if (isTopFlight) report.trophies.push("league");
    else {
      report.divisionTitle = true;
      report.promoted = true;
      s.rep = clamp(s.rep + Math.round(4 * visibilityOf(s)), 0, 100);
      s.moral = clamp(s.moral + 6, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "divTitlePromo", { div: divShort(lvl, s.club.countryId) }), impact: 9 });
    }
  } else if (club.playoff) {
    report.playoffRun = true;
    report.pendingMoments.push({
      type: "playoff", label: tx(s, "momPromo", { div: divShort(LEVEL_ORDER[Math.min(LEVEL_ORDER.length - 1, LEVEL_ORDER.indexOf(lvl) + 1)], s.club.countryId) }),
      winLabel: tx(s, "momPromoWin"), failLabel: tx(s, "momPromoFail"),
      moment: keyMomentFor(s, "promo_playoff"), sharedWin: club.playoffWin,
    });
  }
  if (club.relegDirect) {
    report.relegated = true;
    s.moral = clamp(s.moral - 8, 5, 100);
    s.history.push({ age: s.age, text: tx(s, "relegated"), impact: -10 });
  } else if (club.relegPlayoff) {
    report.relegationPlayoff = true;
    report.pendingMoments.push({
      type: "relegation_playoff", label: tx(s, "momStay"),
      winLabel: tx(s, "momStayWin"), failLabel: tx(s, "momStayFail"),
      moment: keyMomentFor(s, "relegation_playoff"), sharedWin: club.relegWin,
    });
  }
  if (club.cupFinal && !evTrophies.includes("cup")) {
    report.pendingMoments.push({
      type: "cup_final", label: tx(s, "momCup"),
      winLabel: tx(s, "momCupWin"), failLabel: tx(s, "momCupFail"),
      moment: keyMomentFor(s, "cup_final"), sharedWin: club.cupWin,
    });
  }
  // Même annonce de début de saison qu'en solo : la coupe jouée vient du classement passé.
  const seasonCup = cupOf(club.contTier, s.club.countryId);
  report.contTier = club.contTier;
  if (seasonCup) report.lines.push({ text: tx(s, "lineContSeason", { cupName: seasonCup.name }), impact: 0 });
  else if (lvl === "elite") report.lines.push({ text: tx(s, "lineContNone"), impact: -3 });
  if (club.contFinal && !evTrophies.includes("continental") && !evTrophies.includes("continental2") && !evTrophies.includes("continental3")) {
    const continent = continentOf(s.club.countryId) || "eu";
    const tier = club.contTier;
    const cup = (tier === 1 ? CONTINENTAL_CUPS[continent] || CONTINENTAL_CUPS.eu : tier === 2 ? CONTINENTAL_CUPS2[continent] : CONTINENTAL_CUPS3[continent])!;
    report.pendingMoments.push({
      type: "continental_final", tier, continent,
      label: tx(s, "momCont", { cupName: cup.name }),
      winLabel: tx(s, tier === 3 ? "momCont3Win" : tier === 2 ? "momCont2Win" : "momContWin"),
      failLabel: tx(s, tier === 1 ? "momContFail" : "momContEuFail"),
      moment: keyMomentFor(s, "continental_final"), sharedWin: club.contWin,
    });
  }
  report.leaguePos = club.leaguePos;
}

export function recheckObjective(s: CareerState, report: SeasonReport) {
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
export function resolveSeasonMoment(s: CareerState, report: SeasonReport, entry: SeasonMomentEntry, optionId: string | null) {
  const moment = entry.moment;
  const option = moment.options.find((o) => o.id === optionId) || pick(moment.options);
  // En salle, l'issue d'une finale ou d'un barrage du club est commune (sharedWin).
  const res: any = playKeyMoment(s, moment, option, entry.sharedWin);
  res.option = option;
  if (res.success) {
    s.momentWins += 1;
    if (entry.type === "derby") s.derbyWins += 1;
    if (option.id === "panenka" && entry.type === "cup_final") s.flags.panenka_final = true;
  }
  if (entry.type === "debut") {
    // Premiers pas : l'enjeu n'est pas un trophée mais une réputation qui
    // n'existe pas encore.
    if (res.success) {
      s.rep = clamp(s.rep + 3, 0, 100);
      s.moral = clamp(s.moral + 8, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "debutWin"), impact: 7 });
    } else {
      s.moral = clamp(s.moral - 4, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "debutFail"), impact: -3 });
    }
  } else if (entry.type === "last_match") {
    // Un adieu raté reste un adieu : le joueur lit ce texte en dernier, on
    // ne termine pas une carrière sur une punition.
    if (res.success) {
      s.rep = clamp(s.rep + 4, 0, 100);
      s.moral = clamp(s.moral + 10, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "adieuWin"), impact: 10 });
    } else {
      s.moral = clamp(s.moral + 2, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "adieuFail"), impact: 3 });
    }
  } else if (entry.type === "playoff") {
    if (res.success) {
      report.promoted = true;
      if (s.lastSeason) s.lastSeason.promoted = true;
      s.moral = clamp(s.moral + 10, 5, 100);
      s.rep = clamp(s.rep + 4, 0, 100);
      s.history.push({ age: s.age, text: tx(s, "promoWin"), impact: 12 });
      recheckObjective(s, report);
    } else {
      s.moral = clamp(s.moral - 6, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "promoLoss"), impact: -6 });
    }
  } else if (entry.type === "relegation_playoff") {
    // Miroir du barrage de montée : ici c'est la survie du club qui se joue.
    // lastSeason.relegated est tenu à jour car advanceYear s'en sert pour faire
    // descendre le club (et le classement final est réaligné sur l'issue).
    if (res.success) {
      report.relegated = false;
      report.survivedPlayoff = true;
      if (s.lastSeason) s.lastSeason.relegated = false;
      s.moral = clamp(s.moral + 8, 5, 100);
      s.rep = clamp(s.rep + 2, 0, 100);
      s.history.push({ age: s.age, text: tx(s, "stayWin"), impact: 8 });
    } else {
      report.relegated = true;
      if (s.lastSeason) s.lastSeason.relegated = true;
      report.leaguePos = Math.max(report.leaguePos, lvlOf(s, s.club) === "d1" ? 17 : 18);
      s.moral = clamp(s.moral - 10, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "stayLoss"), impact: -11 });
    }
  } else if (entry.type === "nat_playoff") {
    // Barrage de qualification d'une sélection : l'issue jouée remplace celle tirée d'avance.
    settleNatPlayoff(s, entry.comp, entry.year, !!res.success);
    const comp = qualCompName(s, entry.comp);
    if (res.success) {
      s.rep = clamp(s.rep + 4, 0, 100);
      s.moral = clamp(s.moral + 10, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "natPlayoffWin", { comp, when: entry.year }), impact: 10 });
    } else {
      s.moral = clamp(s.moral - 8, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "natPlayoffLoss", { comp, when: entry.year }), impact: -8 });
    }
  } else if (entry.type === "cup_final") {
    if (res.success) {
      s.trophies.cup += 1;
      report.trophies.push("cup");
      s.money += 0.3;
      s.moral = clamp(s.moral + 8, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "cupWin", { cupName: COMPETITIONS.cup.name }), impact: 9 });
      recheckObjective(s, report);
      // Vainqueur de coupe → qualifié pour une coupe continentale la saison
      // prochaine (C2, ou C1 si le club est/passe au sommet). Aucun rng.
      // Océanie exclue : aucun palier C2 pour ce continent (cf. content).
      if (CONTINENTAL_CUPS2[continentOf(s.club.countryId) ?? ""]) {
        s.subCupTicket = true;
        // Déjà qualifié en C1 ou en C2 par le classement : le billet n'apporte rien de plus.
        const q = s.contNext;
        const alreadyIn = q && q.clubId === s.club.id && q.year === s.year && (q.tier === 1 || q.tier === 2);
        if (!alreadyIn) report.lines.push({ text: tx(s, "lineEuroTicket"), impact: 5 });
      }
    } else {
      s.moral = clamp(s.moral - 5, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "cupLoss", { cupName: COMPETITIONS.cup.name }), impact: -4 });
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
        s.history.push({ age: s.age, text: tx(s, "contCupWin", { cupName: cup.name }), impact: continent === "eu" ? 15 : 11 });
        recheckObjective(s, report);
        // Le sacre continental rebat les cartes du Ballon d'Or (comme le Mondial).
        if (!report.awards.includes("ballon_won")) rollBallon(s, report, 0);
        rollSupercup(s, report, continent);
      } else {
        s.rep = clamp(s.rep + 2, 0, 100);
        s.moral = clamp(s.moral - 6, 5, 100);
        s.history.push({ age: s.age, text: tx(s, "contCupLossTop", { cupName: cup.name }), impact: -5 });
      }
    } else {
      // C2 (Trophée) / C3 (Bouclier) — coupes continentales secondaires.
      // Portée non uniforme selon le continent (cf. CONTINENTAL_CUPS2/3) :
      // entry.continent a été posé au bon continent à la création du moment.
      const key = tier === 2 ? "continental2" : "continental3";
      const detailKey = tier === 2 ? "continental2Detail" : "continental3Detail";
      const cont = entry.continent || "eu";
      const cup = (tier === 2 ? CONTINENTAL_CUPS2 : CONTINENTAL_CUPS3)[cont] || CONTINENTAL_CUPS2.eu;
      const rw = BALANCE.subCupReward[tier];
      if (res.success) {
        s.trophies[key] = (s.trophies[key] || 0) + 1; // guardé : vieilles saves sans ce compteur
        report.trophies.push(key);
        (s[detailKey] = s[detailKey] || []).push({ continent: cont, year: s.year });
        s.money += rw.money;
        s.rep = clamp(s.rep + rw.rep, 0, 100);
        s.moral = clamp(s.moral + rw.moral, 5, 100);
        s.history.push({ age: s.age, text: tx(s, "contCupWin", { cupName: cup.name }), impact: rw.impact });
        recheckObjective(s, report);
        if (rw.ballon && !report.awards.includes("ballon_won")) rollBallon(s, report, 0);
        if (tier === 2) rollSupercup(s, report, cont);
      } else {
        s.rep = clamp(s.rep + 1, 0, 100);
        s.moral = clamp(s.moral - (tier === 2 ? 5 : 4), 5, 100);
        s.history.push({ age: s.age, text: tx(s, "contCupLoss", { cupName: cup.name }), impact: tier === 2 ? -4 : -3 });
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
      s.history.push({ age: s.age, text: tx(s, "injuryBack"), impact: 6 });
    } else {
      s.chronicWeeks = (s.chronicWeeks || 0) + (opt.setback || 10);
      s.moral = clamp(s.moral - 6, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "injuryRelapse"), impact: -8 });
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

// Aléas d'avant-saison communs à toutes les saisons (brève, hygiène de vie,
// trajectoire instable).
export function seasonPrelude(s: CareerState, report: SeasonReport) {
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
    report.lines.push({ text: tx(s, "lineDiscipline"), impact: -5 });
  } else if (s.discipline >= 72) {
    s.form = clamp(s.form + 2, 5, 100);
  }
  // Trajectoire instable : le mental fait le yoyo
  if (s.trajectory.id === "unstable" && rng() < 0.4) {
    s.form = clamp(s.form - randInt(2, 8), 5, 100);
    s.moral = clamp(s.moral - randInt(0, 6), 5, 100);
  }
}
