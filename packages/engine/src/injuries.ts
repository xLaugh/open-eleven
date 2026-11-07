// Blessures.

import type { InjuryTier } from "@open-eleven/content";
import { hasPurchase } from "./shop";
import { rng } from "./rng";
import { clamp, randInt, weightedRandom } from "./utils";
import { hasTrait } from "./player";
import type { CareerState } from "./types";
import { BALANCE, SHOP_EFFECTS } from "@open-eleven/content";

// --- Blessures --------------------------------------------------------------
// Applique une blessure : modulation traits, répartition saison / dette
// chronique, drapeaux de fragilité. AUCUN rng. Retourne les semaines modulées.
export function applyInjury(s: CareerState, rawWeeks: number, forceBig?: boolean) {
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
export function rollInjury(s: CareerState, pt: number) {
  const B = BALANCE.injury;
  let p = B.baseChance;
  if (s.age > 29) p += (s.age - 29) * B.ageStep;
  if (s.age <= 20) p -= B.youthReduce;
  p += Math.max(0, pt - 0.5) * B.minutesCoef;
  if (s.discipline < 40) p += B.hygieneAdd;
  p += (s.injuryHistory || 0) * B.historyAdd;
  if (hasTrait(s, "glass")) p += B.glassAdd;
  else if (hasTrait(s, "ironman")) p += B.ironmanAdd;
  if (hasPurchase(s, "trainer")) p *= SHOP_EFFECTS.trainerInjuryMult; // préparateur physique perso
  p = clamp(p, B.minChance, B.maxChance);
  if (rng() >= p) return null;
  const bias = clamp(Math.max(0, s.age - 30) * B.severityBiasAge + (s.injuryHistory || 0) * B.severityBiasHistory + (hasTrait(s, "glass") ? B.severityBiasGlass : 0), 0, 1);
  const tier = weightedRandom(B.tiers, (t) => (t.up ? t.w * (1 + bias * 2) : t.w / (1 + bias)));
  return { tier, weeks: randInt(tier.min, tier.max) };
}
export function injuryTier(id: string) { return BALANCE.injury.tiers.find((t) => t.id === id); }
// Probabilité de fin de carrière (rarissime) d'une grave/catastrophe. AUCUN rng.
export function injuryEndChance(s: CareerState, tier: InjuryTier | undefined) {
  const B = BALANCE.injury;
  if (!tier || !tier.endChance) return 0;
  let p = tier.endChance + Math.max(0, s.age - 30) * B.endAgeStep + (s.injuryHistory || 0) * B.endHistory;
  if (hasTrait(s, "glass")) p *= B.endGlass;
  else if (hasTrait(s, "ironman")) p *= B.endIronman;
  return clamp(p, 0, B.endCap);
}
