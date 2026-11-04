// Double nationalité et barre de sélection selon la nation.

import { rng } from "./rng";
import type { CareerState, LevelId } from "./types";
import { BALANCE, DUAL_NATIONALITY, LEVELS, NATIONALITIES } from "@open-eleven/content";
import { lvlOf } from "./clubs";

// --- Double nationalité ------------------------------------------------------
// Tire la SECONDE nationalité à laquelle le joueur est éligible, ou null. La carte
// DUAL_NATIONALITY est lue dans les deux sens : un Marocain peut être éligible à la
// France, et un Français au Maroc (grands-parents). Consomme au plus 2 rng() et
// TOUJOURS dans le même ordre → rejouable.
export function dualPartnersOf(natId: string) {
  const out = [];
  const direct = DUAL_NATIONALITY[natId];
  if (direct) out.push(...direct);
  for (const from in DUAL_NATIONALITY) {
    if (DUAL_NATIONALITY[from].includes(natId) && !out.includes(from)) out.push(from);
  }
  return out.filter((id) => id !== natId);
}
export function rollDualNat(s: CareerState) {
  const ids = dualPartnersOf(s.nationality.id);
  if (!ids.length) { rng(); return null; } // rng consommé même sans partenaire (ordre stable)
  if (rng() >= BALANCE.dualNatChance) return null;
  const pickId = ids[Math.floor(rng() * ids.length)];
  const nat = NATIONALITIES.find((n) => n.id === pickId);
  return nat ? nat.id : null;
}
export function dualNatOf(s: CareerState) {
  return s.dualNat ? NATIONALITIES.find((n) => n.id === s.dualNat) || null : null;
}
// L'autre nation, une fois le premier choix passé : gardée en mémoire tant
// que le joueur n'a disputé aucun match officiel en sélection A.
export function altNatOf(s: CareerState) {
  return s.dualNatAlt ? NATIONALITIES.find((n) => n.id === s.dualNatAlt) || null : null;
}

// --- Sélection nationale : barre d'OVR selon la force de la nation -----------
// Premier palier dont le seuil de poids est atteint. Les paliers sont ordonnés du
// plus fort au plus faible dans BALANCE.natCallBar.
export function natCallBarFor(s: CareerState) {
  const w = s.nationality.weight;
  const bars = BALANCE.natCallBar;
  for (const t of bars) if (w >= t.minW) return t.ovr;
  return bars[bars.length - 1].ovr;
}

// Le club (celui où l'on joue, prêt compris) est-il d'un niveau que la sélection regarde ?
// Plancher selon la force de la nation (BALANCE.natCallBar[].minLevel). Aucun rng.
export function natClubFloorOk(s: CareerState) {
  const w = s.nationality.weight;
  const bars = BALANCE.natCallBar;
  const tier = bars.find((t) => w >= t.minW) || bars[bars.length - 1];
  const min = LEVELS[tier.minLevel as LevelId];
  const cur = LEVELS[lvlOf(s, s.club)];
  return !min || !cur || cur.rank >= min.rank;
}
