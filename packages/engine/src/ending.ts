// Fin de carrière : note, score, titre, récit.

import { pick } from "./utils";
import { shopScore } from "./shop";
import { tx } from "./text";
import type { CareerState, HistoryEntry } from "./types";
import { UNTAKEN_PATH_TEMPLATES } from "@open-eleven/content";

// --- Fin de carrière ------------------------------------------------------
export function totalAwards(s: CareerState) {
  return Object.values(s.awardCounts).reduce((a, b) => a + b, 0);
}

// Note de carrière affichée sur la carte finale : l'OVR max, bonifié par
// ce qui fait les monstres sacrés (Ballons d'Or, Mondial, palmarès,
// longévité, sélection). Une carrière légendaire atteint 93-95.
export function careerRating(s: CareerState) {
  const t = s.trophies;
  let bonus = t.ballon * 2 + t.worldCup * 2 + Math.min(3, t.continental) +
    Math.min(1.5, (t.continental2 || 0) * 0.5 + (t.continental3 || 0) * 0.25) +
    Math.min(2, (t.contInt || 0) * 0.7) +
    Math.min(2, t.league * 0.4) + Math.min(1.5, totalAwards(s) * 0.15) +
    (s.natTeam.caps >= 100 ? 1 : 0) + (s.totals.matches >= 700 ? 0.5 : 0) +
    (s.rep >= 90 ? 1 : 0);
  return Math.min(97, Math.round(s.peakOvr + Math.min(11, bonus)));
}

export function computeCareerScore(s: CareerState) {
  const t = s.trophies;
  return Math.round(
    s.peakOvr * 1.0 + s.rep * 0.45 +
    t.worldCup * 20 + t.ballon * 18 + t.continental * 9 + (t.contInt || 0) * 11 +
    (t.natLeague || 0) * 5 + (t.olympic || 0) * 8 + (t.arabCup || 0) * 5 + (t.games || 0) * 3 + (t.continental2 || 0) * 5 + (t.continental3 || 0) * 2 +
    ((t.ballonAsia || 0) + (t.ballonAfrica || 0) + (t.ballonOceania || 0)) * 7 +
    t.league * 4 + t.cup * 2 + (t.leagueCup || 0) * 1.5 + (t.natSupercup || 0) * 1 + t.goldenBoot * 5 +
    Math.min(12, totalAwards(s) * 1.2) +
    Math.min(20, s.natTeam.caps / 6) + Math.min(15, s.totals.goals / 30) +
    s.money * 0.05 + shopScore(s)
  );
}

export function careerTitle(s: CareerState) {
  if (s.careerEnded && s.careerEndReason) {
    if (s.careerEndReason === "medical") {
      return { title: tx(s, "endMedicalTitle"), story: tx(s, "endMedicalStory") };
    }
    // Fin sur blessure : le récit s'adapte à l'âge et au palmarès accompli — un
    // vétéran au vrai vécu n'est pas un « espoir fauché ».
    const sc = computeCareerScore(s);
    if (s.age >= 30 || sc >= 130) {
      return { title: tx(s, "endCutShortTitle"), story: tx(s, "endCutShortStory") };
    }
    if (s.age >= 24) {
      return { title: tx(s, "endFelledTitle"), story: tx(s, "endFelledStory") };
    }
    return { title: tx(s, "endBrokenTitle"), story: tx(s, "endBrokenStory") };
  }
  const score = computeCareerScore(s);
  const t = s.trophies;
  if ((t.worldCup > 0 || t.ballon > 0) && score < 170) {
    return { title: tx(s, "tierSurpriseTitle"), story: tx(s, "tierSurpriseStory") };
  }
  if (score >= 235) return { title: tx(s, "tierLegendTitle"), story: tx(s, "tierLegendStory") };
  if (score >= 196) return { title: tx(s, "tierWorldStarTitle"), story: tx(s, "tierWorldStarStory") };
  if (score >= 148) return { title: tx(s, "tierIntlTitle"), story: tx(s, "tierIntlStory") };
  if (score >= 105) return { title: tx(s, "tierSolidTitle"), story: tx(s, "tierSolidStory") };
  if (score >= 78) return { title: tx(s, "tierHonestTitle"), story: tx(s, "tierHonestStory") };
  return { title: tx(s, "tierQuietTitle"), story: tx(s, "tierQuietStory") };
}

export function pickHighlights(history: HistoryEntry[], count: number) {
  return [...history].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, count);
}

export function buildNarrative(s: CareerState) {
  const base = careerTitle(s);
  const highlights = pickHighlights(s.history, 2).map((h) => h.text).join(" ");
  return { title: base.title, story: highlights ? `${base.story} ${highlights}` : base.story };
}

export function buildUntakenPath(s: CareerState) {
  const moments = s.history.filter((h) => Math.abs(h.impact) >= 5);
  if (!moments.length) return null;
  const chosen = pick(moments.slice(0, 6));
  return pick(UNTAKEN_PATH_TEMPLATES).replace("{age}", String(chosen.age));
}
