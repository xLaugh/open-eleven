// Effectif (U17 du club, réserve, équipe première) et sélections de jeunes.

import { rng } from "./rng";
import { clamp, rand, weightedRandom } from "./utils";
import { tx } from "./text";
import { youthSelections } from "./international";
import { roleForClub } from "./role";
import { seasonPrelude } from "./season";
import { marketValue } from "./transfers";
import { continentOf, countryOf, isTopFlightOf, lvlOf, visibilityOf } from "./clubs";
import { roomClubSeason } from "./rooms";
import { noteClubQualification } from "./clubcups";
import { ovr } from "./player";
import type { CareerState, Club, LevelId, SeasonReport } from "./types";
import { BALANCE, CONTINENTAL_CUPS, ENGINE_TEXT, YOUTH_STAGES } from "@open-eleven/content";

// --- Effectif : U17 du club → réserve → équipe première ---------------------
// s.squad vaut "youth" (U17 du club, l'année des 16 ans), "reserve" ou
// "first". Absent (sauvegardes antérieures, mode Histoire) = "first".
// Les matchs joués en U17/réserve sont comptés À PART (s.devTotals) : ils ne
// nourrissent ni les totaux de carrière ni le palmarès senior.
export function squadOf(s: CareerState) { return s.squad || "first"; }
// Effectif d'accueil dans un club. Un prodige est lancé d'emblée chez les
// pros (il peut redescendre ensuite, cf. reviewSquad). Aucun rng.
export function squadForClub(s: CareerState, club: Club) {
  const B = BALANCE.squad;
  if (s.age > B.firstByAge || (s.flags && s.flags.prodigy)) return "first";
  const margin = ovr(s) - BALANCE.expectedLevel[lvlOf(s, club)];
  if (s.age <= 16) return margin >= B.youthSkip ? "first" : "youth";
  return margin >= B.firstMargin ? "first" : "reserve";
}
// Bilan d'effectif de fin de saison : montée chez les pros au mérite,
// descente d'un jeune dépassé. Appelé pour TOUTES les saisons hors prêt.
export function reviewSquad(s: CareerState, report: SeasonReport) {
  if (s.loan) return;
  const B = BALANCE.squad;
  const from = squadOf(s);
  const margin = ovr(s) - BALANCE.expectedLevel[lvlOf(s, s.club)];
  const r = report.rating || 6;
  let to = from;
  if (from === "youth") {
    // Une seule saison en U17 : ensuite la réserve, ou directement les pros.
    to = (margin + B.anticipation >= B.firstMargin || (r >= 7.6 && margin >= B.firstMargin - 5)) ? "first" : "reserve";
  } else if (from === "reserve") {
    if (s.age >= B.firstByAge || margin + B.anticipation >= B.firstMargin) to = "first";
    else if (r >= 7.3 && margin >= B.firstMargin - 6 && rng() < 0.6) to = "first";
  } else if (s.age < B.firstByAge && (s.seasonsAtClub || 0) >= 1) {
    // Chez les pros mais trop juste : un jeune peu utilisé redescend jouer.
    // Un prodige n'y échappe pas s'il passe complètement à côté de sa saison.
    const weak = s.flags.prodigy ? (r < 5.2 && margin < B.firstMargin - 2) : ((s.role || 0) <= 1 && margin < B.demoteMargin);
    if (weak && rng() < 0.5) to = "reserve";
  }
  if (to === from) return;
  s.squad = to;
  report.squadChange = { from, to };
  if (to === "first") {
    s.role = roleForClub(s, s.club);
    s.seasonsAtClub = 0; // la revue de rôle saute la 1re saison chez les pros
    s.moral = clamp(s.moral + 6, 5, 100);
    s.history.push({ age: s.age, text: tx(s, "squadToFirst"), impact: 6 });
  } else if (from === "youth") {
    s.history.push({ age: s.age, text: tx(s, "squadToReserve"), impact: 1 });
  } else {
    s.moral = clamp(s.moral - 6, 5, 100);
    s.history.push({ age: s.age, text: tx(s, "squadDown"), impact: -5 });
  }
}

// Saison en U17 du club ou en réserve : on joue, on progresse, on est
// observé — mais rien de tout ça ne compte chez les pros. Pas d'objectif de
// club, pas de trophée senior, pas de moment décisif ; un bilan de fin de
// saison décide de la suite (reviewSquad).
export function playDevSeason(s: CareerState, lvl: LevelId) {
  const squad = squadOf(s);
  const B = BALANCE.squad;
  const report: SeasonReport = { age: s.age, year: s.year, clubName: s.club.name, countryId: s.club.countryId, level: lvl, trophies: [], awards: [], lines: [], pendingMoments: [], onLoan: false, squad, matches: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0 };
  seasonPrelude(s, report);

  const injuryFactor = clamp(1 - s.injuryWeeks / 42, 0.05, 1);
  report.injuryWeeks = s.injuryWeeks;
  const [mMin, mMax] = B.matches[squad];
  const dm = Math.round(rand(mMin, mMax) * injuryFactor);
  const arch = s.archetype ? s.archetype.mods : {};
  // Même formule de rendement que chez les pros, avec l'avantage de jouer
  // contre des adversaires de son âge (edge).
  const perf = (0.32 + s.stats.t / 160 + (s.form - 60) / 400 + (s.moral - 60) / 600) * B.edge[squad];
  const dev = {
    matches: dm,
    goals: Math.max(0, Math.round(dm * s.position.goalRate * perf * (arch.goals || 1) * rand(0.75, 1.3))),
    assists: Math.max(0, Math.round(dm * s.position.assistRate * perf * (arch.assists || 1) * rand(0.7, 1.3))),
    cleanSheets: s.position.id === "gk" ? Math.max(0, Math.round(dm * (0.24 + ovr(s) / 280) * (arch.cs || 1) * rand(0.8, 1.2))) : 0,
  };
  // Note rapportée au niveau de CETTE équipe (gap sous l'équipe première).
  let rating = 6.3 + (ovr(s) - (BALANCE.expectedLevel[lvl] - B.gap[squad])) / 12 + (s.form - 60) / 90 + (arch.rating || 0);
  if (s.position.id !== "gk") {
    const expGA = dm * (s.position.goalRate + s.position.assistRate) * B.edge[squad];
    rating += clamp((dev.goals + dev.assists - expGA * 0.9) / 24, -0.6, 1.2);
  }
  rating = clamp(rating + rand(-0.35, 0.45), 4.5, 9.5);
  report.rating = Math.round(rating * 10) / 10;

  // Coupe des Champions U17 : réservée aux U17 des clubs de haut niveau.
  s.youthTrophies = s.youthTrophies || { clubU17: 0, contU17: 0, wcU17: 0 };
  const cont = continentOf(s.club.countryId) || "eu";
  if (squad === "youth" && (lvl === "elite" || lvl === "d1") && CONTINENTAL_CUPS[cont]) {
    const cupName = `${ENGINE_TEXT.youthCupName} (${CONTINENTAL_CUPS[cont].short})`;
    const boost = clamp(0.7 + (report.rating - 6.5) * 0.5, 0.4, 1.7) * (lvl === "elite" ? 1.3 : 1);
    const st = weightedRandom(YOUTH_STAGES, (x) => (x.id === "champion" || x.id === "final" || x.id === "semi") ? x.baseW * boost : x.baseW);
    dev.matches += st.games;
    report.lines.push({ text: `🏆 ${cupName} : ${st.label}.`, impact: st.champion ? 8 : 4 });
    if (st.champion) {
      s.youthTrophies.clubU17 += 1;
      s.rep = clamp(s.rep + 2, 0, 100);
      s.history.push({ age: s.age, text: tx(s, "youthClubWin", { cupName }), impact: 9 });
    }
  }
  report.dev = dev;
  s.devTotals = s.devTotals || {};
  const tot = (s.devTotals[squad] = s.devTotals[squad] || { matches: 0, goals: 0, assists: 0, cleanSheets: 0 });
  tot.matches += dev.matches; tot.goals += dev.goals; tot.assists += dev.assists; tot.cleanSheets += dev.cleanSheets;

  youthSelections(s, report);

  // Revenus : même base que chez les pros (le contrat d'un jeune est minime).
  const dealMult = s.sponsorDeal ? s.sponsorDeal.mult : 1.8;
  const income = s.contract.salary * 0.55 + (s.rep / 100) * (s.stats.c / 100) * visibilityOf(s) * dealMult * rand(0.6, 1.2);
  s.money += income;
  report.income = income;
  report.sponsorLabel = s.sponsorDeal ? s.sponsorDeal.label : null;

  s.peakOvr = Math.max(s.peakOvr, ovr(s));
  const mv = Math.round(marketValue(s) * 10) / 10;
  // Mode salle : le club vit la même saison que chez les coéquipiers en équipe première
  // (classement, montée, descente), même si ce membre est encore en U17 ou en réserve —
  // sinon son club divergerait des leurs. Barrages et finales sont tranchés d'office.
  const club = s.roomClub ? roomClubSeason(s, lvl, isTopFlightOf(lvl, s.club.countryId)) : null;
  if (club && club.cupFinal && club.cupWin) s.roomCupWonYear = s.year;
  const leaguePos = club ? (club.relegPlayoff && !club.relegWin ? Math.max(club.leaguePos, lvl === "d1" ? 17 : 18) : club.leaguePos) : null;
  // Le classement partagé ouvre la même coupe continentale que chez les coéquipiers.
  if (club) noteClubQualification(s, leaguePos, isTopFlightOf(lvl, s.club.countryId));
  s.seasons.push({ age: s.age, year: s.year, clubName: s.club.name, countryId: s.club.countryId, level: lvl, matches: 0, goals: 0, assists: 0, cleanSheets: 0, rating: report.rating, trophies: [], divisionTitle: false, onLoan: false, leaguePos, mv, squad, dev });

  if (rating >= 7.4) s.coachRel = clamp(s.coachRel + 4, 5, 100);
  else if (rating <= 5.5) s.coachRel = clamp(s.coachRel - 5, 5, 100);
  // Pas de « destin du club » à rejouer pour une saison hors équipe première (hors salle).
  s.lastSeason = club
    ? {
        clubId: s.club.id, leaguePos: leaguePos!, rating: report.rating,
        promoted: (club.title && !isTopFlightOf(lvl, s.club.countryId)) || (club.playoff && club.playoffWin),
        relegated: club.relegDirect || (club.relegPlayoff && !club.relegWin),
        wonLeague: club.title,
      }
    : null;
  reviewSquad(s, report);
  // Un réserviste qui s'éternise attire les clubs d'en dessous (mercato).
  if (squadOf(s) === "reserve" && s.age >= 19) report.benched = true;
  return report;
}
