// Mode salle : saison de club commune et trophées de club partagés entre coéquipiers.

import { BALANCE, CONTINENTAL_CUPS2, CONTINENTAL_CUPS3 } from "@open-eleven/content";
import { continentOf, countryOf, divShort, lvlOf, shiftClubLevel } from "./clubs";
import { leagueRange, seasonCupTier, titleChanceFor } from "./clubcups";
import { tx } from "./text";
import { clamp } from "./utils";
import type { CareerState, LevelId } from "./types";

// --- Saison de club commune ---------------------------------------------------
// En salle, tous les membres jouent dans le MÊME club, mais chacun simule sa saison
// de son côté. Le destin du club (titre, barrages, relégation, finales atteintes et
// leur issue, classement) ne peut donc pas sortir du hasard de chacun : un membre
// verrait son club monter quand l'autre le verrait rester en D2.
//
// Il est tiré ici avec un hasard PROPRE à la salle (graine = salle + année + club,
// identique chez tous), à partir du niveau moyen de l'équipe — les entrées sont les
// mêmes pour tous, le résultat aussi. Le hasard du joueur n'est pas touché : le
// solo, le défi du jour et les duels ne passent jamais par ici.
//
// Les probabilités reprennent celles de playSeason (season.ts), la note du joueur
// étant remplacée par celle de l'équipe.

export interface RoomClubInput {
  /** Graine commune : salle + année + club (cf. roomClubSeed). */
  seed: number;
  /** Note d'équipe (même échelle que la note de saison, 6.6 = saison moyenne). */
  teamRating: number;
}

export interface RoomClubOutcome {
  title: boolean;
  playoff: boolean; playoffWin: boolean;
  relegDirect: boolean; relegPlayoff: boolean; relegWin: boolean;
  cupFinal: boolean; cupWin: boolean;
  contTier: 0 | 1 | 2 | 3; contFinal: boolean; contWin: boolean;
  leaguePos: number;
}

/** Graine commune d'une saison de salle (FNV-1a sur « salle:année:club »). */
export function roomClubSeed(roomId: string, year: number, clubId: string): number {
  let h = 0x811c9dc5;
  for (const ch of roomId + ":" + year + ":" + clubId) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) || 1;
}

/** Note d'équipe à partir de l'OVR moyen des membres (formule de la note de saison, sans le hasard). */
export function teamRatingFromOvr(avgOvr: number | null | undefined): number {
  if (avgOvr == null || !Number.isFinite(avgOvr)) return 6.6;
  return clamp(5.4 + (avgOvr - 62) / 14, 4.5, 8.5);
}

// Générateur local (mulberry32) : n'avance pas le hasard global du moteur.
function seededRng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Destin du club pour la saison en cours, identique pour tous les membres de la salle.
 * Toujours dix tirages, dans le même ordre, quelle que soit la branche : deux membres
 * dont un détail diffère ne décalent jamais leurs tirages l'un par rapport à l'autre.
 */
export function roomClubSeason(s: CareerState, lvl: LevelId, isTopFlight: boolean): RoomClubOutcome {
  const input = s.roomClub as RoomClubInput;
  const r = seededRng(input.seed);
  const d = Array.from({ length: 10 }, () => r());
  const rating = input.teamRating;
  const boost = 1 + (rating - 6.6) * 0.12;
  // Une finale ou un barrage : l'équipe la plus forte a l'avantage, sans certitude.
  const pWin = clamp(0.5 + (rating - 6.6) * 0.15, 0.25, 0.8);

  const title = d[0] < titleChanceFor(lvl, s.club.countryId) * boost;
  const playoff = !title && !isTopFlight && rating >= 6.4 && d[1] < (BALANCE.playoffChance[lvl] || 0) * boost;
  let relegBase = BALANCE.relegationChance[lvl] || 0;
  if (relegBase && lvl === "d1" && s.club.level === "elite") relegBase *= BALANCE.eliteRelegShield;
  const promotedNow = title && !isTopFlight;
  const relegation = !promotedNow && !playoff && relegBase > 0 && d[2] < relegBase * clamp(1 - (rating - 6.3) * 0.35, 0.2, 1.6);
  const relegDirect = relegation && rating <= BALANCE.relegDirectRating;
  const relegPlayoff = relegation && !relegDirect;
  const cupFinal = d[3] < BALANCE.cupChance[lvl] * BALANCE.cupFinalReachMult * boost;

  // Coupe continentale : même palier que playSeason, au classement de la saison passée
  // (identique chez tous les membres : même club, même classement partagé, ou le même
  // classement simulé pour un club qu'ils viennent de rejoindre). Le ticket C2 vient de
  // la coupe nationale gagnée par la SALLE la saison passée (roomCupWonYear), jamais
  // d'un événement personnel — sinon le palier différerait d'un membre à l'autre.
  const continent = continentOf(s.club.countryId) || "eu";
  const qual = seasonCupTier(s, lvl, isTopFlight);
  const ticket = s.roomCupWonYear === s.year - 1;
  let contTier: 0 | 1 | 2 | 3 = 0, reachP = 0;
  if (qual.tier === 1) {
    contTier = 1;
    reachP = (continent === "eu" ? BALANCE.continentalReach.eu[lvl] : BALANCE.continentalReach.other[lvl]) || 0;
  } else if ((ticket || qual.tier === 2) && CONTINENTAL_CUPS2[continent]) {
    contTier = 2; reachP = BALANCE.subCupReach.c2[lvl] || 0;
  } else if (qual.tier === 3 && CONTINENTAL_CUPS3[continent]) {
    contTier = 3; reachP = BALANCE.subCupReach.c3[lvl] || 0;
  }
  const contM = (countryOf(s.club.countryId) || {}).contMult;
  const contFinal = contTier > 0 && d[4] < reachP * boost * (contM != null ? contM : 1);

  const playoffWin = d[5] < pWin, relegWin = d[6] < pWin, cupWin = d[7] < pWin, contWin = d[8] < pWin;

  // Classement : mêmes fourchettes que playSeason, le dernier tirage fixe la place.
  const at = (lo: number, hi: number) => lo + Math.floor(d[9] * (hi - lo + 1));
  let leaguePos: number;
  if (title) leaguePos = 1;
  else if (playoff) leaguePos = playoffWin ? 2 : at(2, 4);
  else if (relegPlayoff) leaguePos = lvl === "d1" ? at(15, 17) : at(16, 18);
  else if (relegDirect) leaguePos = lvl === "d1" ? at(16, 18) : at(17, 19);
  else {
    const [lo, hi] = leagueRange(lvl, s.club.countryId);
    leaguePos = clamp(at(lo, hi) - Math.round((rating - 6.6) * 2.4), 2, hi + 2); // 1er = champion seulement
  }
  return { title, playoff, playoffWin, relegDirect, relegPlayoff, relegWin, cupFinal, cupWin, contTier, contFinal, contWin, leaguePos };
}

// Mode salle : crédite à CE joueur des trophées CLUB déjà remportés cette
// saison par un coéquipier de la même salle, quand SA PROPRE simulation
// locale ne les a pas tirés. Les carrières de la salle tournent chacune sur
// un RNG local indépendant (aucune vérification serveur, cf. rooms*.sql),
// mais la salle impose le MÊME club à tous : un titre gagné par l'un doit
// compter pour tous, sans quoi le palmarès de la salle paraît arbitraire.
// keys : sous-ensemble de ["league","cup","continental","continental2",
// "continental3","supercup"], déjà filtré par l'appelant (game.ts) pour ne
// garder que ce que CE joueur n'a pas déjà à son compte cette saison — les
// distinctions individuelles (Ballon d'Or, Soulier d'Or...) ne se
// partagent jamais, elles ne sont pas concernées par cette fonction.
export function creditClubTrophies(s: CareerState, keys: string[]) {
  if (!keys || !keys.length) return;
  // Changement de division décidé par un événement chez un membre (investisseur…) :
  // appliqué ici à toute la salle, au passage de la saison (cf. effects.ts).
  const shift = (keys.includes("clubUp") ? 1 : 0) - (keys.includes("clubDown") ? 1 : 0);
  if (shift) {
    const newLvl = shiftClubLevel(s, s.club, shift);
    s.history.push({ age: s.age, text: tx(s, shift > 0 ? "clubInvestor" : "clubDemoted", { div: divShort(newLvl, s.club.countryId) }), impact: shift > 0 ? 8 : -6 });
  }
  keys = keys.filter((k) => k !== "clubUp" && k !== "clubDown");
  if (!keys.length) return;
  const cont = continentOf(s.club.countryId) || "eu";
  const lvl = lvlOf(s, s.club);
  keys.forEach((k) => {
    if (k === "league") {
      s.trophies.league += 1;
      s.leagueTitlesDetail.push({ countryId: s.club.countryId, level: lvl, clubId: s.club.id, year: s.year });
    } else if (k === "cup") {
      s.trophies.cup += 1;
    } else if (k === "continental") {
      s.trophies.continental += 1;
      s.continentalDetail.push({ continent: cont, year: s.year });
    } else if (k === "continental2") {
      s.trophies.continental2 += 1;
      (s.continental2Detail = s.continental2Detail || []).push({ continent: cont, year: s.year });
    } else if (k === "continental3") {
      s.trophies.continental3 += 1;
      (s.continental3Detail = s.continental3Detail || []).push({ continent: cont, year: s.year });
    } else if (k === "supercup") {
      s.trophies.supercup += 1;
      (s.supercupDetail = s.supercupDetail || []).push({ continent: cont, year: s.year });
    }
  });
  // Reflété aussi dans l'historique saison par saison (onglet Parcours).
  if (s.seasons.length) {
    const last = s.seasons[s.seasons.length - 1];
    last.trophies = [...new Set([...(last.trophies || []), ...keys])];
  }
}
