// Point d'entrée du moteur de jeu : assemble l'objet `Engine` exposé au
// navigateur (window.Engine) et au serveur (module.exports) — cf. scripts/build.js.

import { rng, setSeed, clearSeed, getSeedState, setSeedState } from "./rng";
import { clamp, rand, randInt, pick, weightedRandom, deOf, leOf, fmtMoney } from "./utils";
import { natForms } from "./country-names";
import { rollPotential, potStars, prodigyChance, pickTrajectory } from "./potential";
import { academyOffers } from "./academy";
import { generateName, newCareer } from "./career";
import { dualNatOf, dualPartnersOf } from "./nationality";
import { renderText } from "./text";
import { applyFx } from "./effects";
import { eventEligible, pickEvent, optionEligible, resolveOption, netImpact, toneOf } from "./events";
import { keyMomentFor, keyMomentSuccess, playKeyMoment } from "./moments";
import { isWorldCupYear, bestNatRuns, natRunsOfYear,playWorldCup, resolveWcFinal, isContinentalYear, playContinental, isNationsLeagueYear, playNationsLeague, isOlympicYear, playOlympics, isArabCupYear, playArabCup, regionalGamesOf, playRegionalGames } from "./international";
import { playingTimeFactor, roleForClub, roleOf } from "./role";
import { setSeasonObjective, objectiveMet } from "./objectives";
import { headlineFor } from "./press";
import { grantAward, rollSeasonAwards, rollBallon, rollContinentalBallon } from "./awards";
import { squadOf } from "./squad";
import { playSeason, resolveSeasonMoment } from "./season";
import { advanceYear } from "./offseason";
import { marketValue, salaryFor, buildOffer, offersFor, loanOffersFor, applyLoan, transferWindow, applyTransfer, renewContract } from "./transfers";
import { totalAwards, careerRating, computeCareerScore, careerTitle, pickHighlights, buildNarrative, buildUntakenPath } from "./ending";
import { newRival, rivalSeason, rivalNewsLine, compareVerdict } from "./rival";
import { hashInt, dailyChallenge, dailySeedFor, duelChallenge, replayDaily, replayDuel, scoreDaily, scoreDuel } from "./challenge";
import { countryOf, levelRank, lvlOf, divShort, visibilityOf } from "./clubs";
import { ovr, hasTrait } from "./player";
import { sponsorDealDue, sponsorTierFor, sponsorOffersFor, applySponsorDeal } from "./sponsors";
import { creditClubTrophies, roomClubSeason, roomClubSeed, teamRatingFromOvr } from "./rooms";
import { hasEliteClubs, leagueRange, seasonCupTier, simulatedRank, tierForRank } from "./clubcups";
import { ENGINE_VERSION } from "./version";
import { BALANCE } from "@open-eleven/content";

export const Engine = {
  rng, setSeed, clearSeed, getSeedState, setSeedState,
  clamp, rand, randInt, pick, weightedRandom, countryOf, levelRank, lvlOf, divShort,
  deOf, leOf,
  fmtMoney, rollPotential, potStars, prodigyChance, pickTrajectory, academyOffers,
  generateName, newCareer, ovr, hasTrait, renderText, applyFx,
  eventEligible, pickEvent, optionEligible, resolveOption, netImpact, toneOf,
  keyMomentFor, keyMomentSuccess, playKeyMoment, isWorldCupYear,
  bestNatRuns, // meilleur parcours par compétition de sélection (fiche finale)
  natRunsOfYear, // tournois de sélection d'une année (historique saison par saison)
  playWorldCup, resolveWcFinal, isContinentalYear, playContinental, isNationsLeagueYear, playNationsLeague, isOlympicYear, playOlympics, isArabCupYear, playArabCup, regionalGamesOf, playRegionalGames, playingTimeFactor, setSeasonObjective,
  objectiveMet, headlineFor, grantAward, rollSeasonAwards, rollBallon, rollContinentalBallon,
  roleForClub, roleOf, squadOf, dualNatOf, dualPartnersOf, natForms,
  playSeason, resolveSeasonMoment, advanceYear, marketValue, salaryFor,
  buildOffer, offersFor, loanOffersFor, applyLoan, transferWindow,
  sponsorDealDue, sponsorTierFor, sponsorOffersFor, applySponsorDeal,
  applyTransfer, renewContract, totalAwards, careerRating, computeCareerScore, visibilityOf, creditClubTrophies, roomClubSeed, teamRatingFromOvr, roomClubSeason,
  hasEliteClubs, leagueRange, seasonCupTier, simulatedRank, tierForRank, // coupes continentales de clubs (cf. clubcups.ts)
  careerTitle, pickHighlights, buildNarrative, buildUntakenPath,
  newRival, rivalSeason, rivalNewsLine, compareVerdict,
  hashInt, dailyChallenge, dailySeedFor, duelChallenge, replayDaily, replayDuel, scoreDaily, scoreDuel,
  ENGINE_VERSION,
  BALANCE_REF: BALANCE,
};
