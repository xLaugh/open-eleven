// Objectif de saison fixé par le club.

import { rng } from "./rng";
import { tx } from "./text";
import { playingTimeFactor } from "./role";
import { lvlOf } from "./clubs";
import { hasEliteClubs } from "./clubcups";
import { ovr } from "./player";
import type { CareerState, Objective, SeasonReport } from "./types";
import { BALANCE } from "@open-eleven/content";

// --- Objectif de saison fixé par le club --------------------------------------
export function setSeasonObjective(s: CareerState) {
  const lvl = lvlOf(s, s.club);
  if (rng() < 0.5) {
    // La cible est dérivée de l'ESPÉRANCE RÉELLE de production, avec les MÊMES
    // constantes que playSeason (matchs attendus × rendement du poste × perf), et
    // surtout pondérée par le temps de jeu que le STATUT au club autorise.
    // Avant, le « 38 » supposait une saison pleine : un Espoir (pt≈0,12, ~5 matchs)
    // recevait la même cible qu'un Titulaire — objectif souvent mathématiquement
    // hors de portée, et chaque échec coûte coachRel/moral, donc du temps de jeu :
    // une spirale qui frappait précisément les jeunes et les remplaçants.
    // playingTimeFactor ne consomme aucun rng : sûr à appeler ici.
    const [mMin, mMax] = BALANCE.matchesByLevel[lvl];
    const pt = playingTimeFactor(s);
    const expMatches = ((mMin + mMax) / 2) * pt;
    const perf = 0.32 + s.stats.t / 160 + (s.form - 60) / 400 + (s.moral - 60) / 600;
    if (s.position.id === "att") {
      const n = Math.max(2, Math.round(expMatches * s.position.goalRate * perf * BALANCE.objectiveSlack.goals));
      return { type: "goals", n, label: `Marquer ${n} buts` };
    }
    if (s.position.id === "gk") {
      const n = Math.max(2, Math.round(expMatches * (0.18 + ovr(s) / 280) * BALANCE.objectiveSlack.cs));
      return { type: "cs", n, label: `${n} clean sheets` };
    }
    // Note attendue : la formule de note applique déjà un malus (pt − 0,7) × 0,8 aux
    // faibles temps de jeu. Exiger une note fixe d'un remplaçant le punissait donc
    // deux fois — on retire exactement ce malus de la barre.
    const base = BALANCE.objectiveRating[lvl] || BALANCE.objectiveRating.other;
    const n = Math.round(Math.max(5.6, base + Math.min(0, (pt - 0.7) * 0.8)) * 10) / 10;
    return { type: "rating", n, label: tx(s, "objRating", { n: n.toFixed(1) }) };
  }
  // Cibles « top N » élargies d'un cran : le classement du club suit désormais la
  // note du joueur (cf. leaguePos), mais il reste largement tiré au sort — viser
  // le top 5 d'un randInt(4,14) ne réussissait qu'une fois sur trois, et chaque
  // échec coûte de la confiance du coach, donc du temps de jeu.
  if (lvl === "elite") return { type: "trophy", label: tx(s, "objTrophy") };
  // Un D1 d'un pays à clubs élite finit derrière eux (cf. clubcups.ts) : cible élargie.
  if (lvl === "d1") return hasEliteClubs(s.club.countryId)
    ? { type: "top", n: 10, label: "Accrocher le top 10" }
    : { type: "top", n: 8, label: "Accrocher le top 8" };
  if (lvl === "d2") return { type: "top", n: 7, label: "Jouer la montée (top 7)" };
  if (lvl === "d3") return { type: "top", n: 8, label: "Jouer la montée (top 8)" };
  return { type: "top", n: 10, label: "Viser le haut de tableau (top 10)" };
}

export function objectiveMet(obj: Objective | null | undefined, report: SeasonReport) {
  if (!obj) return false;
  if (obj.type === "goals") return report.goals >= obj.n;
  if (obj.type === "cs") return report.cleanSheets >= obj.n;
  if (obj.type === "rating") return report.rating >= obj.n;
  if (obj.type === "trophy") return report.trophies.length > 0;
  if (obj.type === "top") return report.leaguePos <= obj.n;
  return false;
}
