// Étoiles du défi du jour et ranked : logique PURE, partagée par le jeu (affichage)
// et le serveur (qui rejoue la partie et applique le résultat). Aucun rng consommé.

import { dailyChallenge, hashInt, replayDaily } from "./challenge";
import { isTopFlightOf } from "./clubs";
import type { CareerState } from "./types";
import { DAILY_OBJECTIVES, DAILY_OBJECTIVE_POOL, DAILY_STAT_THRESHOLDS, RANKED_RULES, RANKED_TIERS } from "@open-eleven/content";

export interface DailyObjective {
  /** club · wc · cont · ballon · goals · cleanSheets · caps */
  kind: string;
  icon: string;
  title: string;
  /** Libellés des paliers ⭐, ⭐⭐, ⭐⭐⭐ (seuils déjà remplis). */
  steps: string[];
  /** Seuils chiffrés (objectifs de statistiques), sinon null. */
  n: number[] | null;
}

function capsThresholds(w: number): number[] {
  const rows = DAILY_STAT_THRESHOLDS.caps;
  return (rows.find((r) => w >= r.minW) || rows[rows.length - 1]).n;
}

/** Objectif du jour : tiré de la date parmi ceux qui ont du sens pour le profil imposé. */
export function dailyObjective(dateKey: string): DailyObjective {
  const ch = dailyChallenge(dateKey);
  const w = ch.nationality.weight;
  const pos = ch.position.id;
  const pool = DAILY_OBJECTIVE_POOL.filter((o) => w >= o.minW);
  const total = pool.reduce((t, o) => t + o.weight, 0);
  let r = hashInt(Number(String(dateKey).replace(/-/g, "")) * 5 + 4) % total;
  let id = pool[0].id;
  for (const o of pool) { if (r < o.weight) { id = o.id; break; } r -= o.weight; }
  let kind = id;
  let n: number[] | null = null;
  if (id === "stats") {
    if (pos === "gk") { kind = "cleanSheets"; n = DAILY_STAT_THRESHOLDS.cleanSheets; }
    else { kind = "goals"; n = (DAILY_STAT_THRESHOLDS.goals as Record<string, number[]>)[pos] || DAILY_STAT_THRESHOLDS.goals.mil; }
  } else if (id === "caps") n = capsThresholds(w);
  const def = (DAILY_OBJECTIVES as Record<string, { icon: string; title: string; labels: Record<string, string> }>)[kind];
  const steps = [1, 2, 3].map((k) => String(def.labels[k]).replace("{n}", n ? String(n[k - 1]) : ""));
  return { kind, icon: def.icon, title: def.title, steps, n };
}

const STAGE_STARS: Record<string, number> = { quarter: 1, semi: 2, final: 3, champion: 3 };

/** Étoiles (0 à 3) d'une carrière terminée pour un objectif donné. */
export function objectiveStars(s: CareerState, obj: DailyObjective): number {
  const t: Record<string, number> = s.trophies || {};
  const reach = (v: number, n: number[]) => (v >= n[2] ? 3 : v >= n[1] ? 2 : v >= n[0] ? 1 : 0);
  switch (obj.kind) {
    case "club": {
      if ((t.continental || 0) + (t.continental2 || 0) + (t.continental3 || 0) > 0) return 3;
      if ((s.leagueTitlesDetail || []).some((l: any) => isTopFlightOf(l.level, l.countryId))) return 2;
      return (t.cup || 0) > 0 ? 1 : 0;
    }
    case "wc":
    case "cont":
      return Math.max(0, ...(s.natRuns || []).filter((r: any) => r.comp === obj.kind).map((r: any) => STAGE_STARS[r.stage] || 0));
    case "ballon": {
      const best = (t.ballon || 0) > 0 ? 1 : s.bestBallonRank || 999;
      return best <= 3 ? 3 : best <= 10 ? 2 : best <= 30 ? 1 : 0;
    }
    case "goals": return reach((s.totals && s.totals.goals) || 0, obj.n || [1e9, 1e9, 1e9]);
    case "cleanSheets": return reach((s.totals && s.totals.cleanSheets) || 0, obj.n || [1e9, 1e9, 1e9]);
    case "caps": return reach((s.natTeam && s.natTeam.caps) || 0, obj.n || [1e9, 1e9, 1e9]);
    default: return 0;
  }
}

/** Étoiles OFFICIELLES d'un défi, à partir du seul journal de choix (ce que le serveur retient). */
export function starsDaily(dateKey: string, choices: number[]): number {
  return objectiveStars(replayDaily(dateKey, choices), dailyObjective(dateKey));
}

// --- Ranked : montée et descente -------------------------------------------------
// tier : 0 (Bronze) → 5 (Légende) · div : 0 (III) → 2 (I), toujours 0 en Légende.
export interface RankedState {
  season: string | null; // « AAAA-MM » : une saison par mois
  tier: number;
  div: number;
  points: number;
  protect: number; // jours protégés restants (cf. RANKED_RULES.protectDays)
  bestTier: number;
  bestDiv: number;
  lastDate: string | null; // dernier jour classé joué
}
export interface RankedStepResult {
  state: RankedState;
  delta: number; // points gagnés ou perdus ce jour (étoiles), avant montée/descente
  decay: number; // points perdus pour inactivité, appliqués avant
  promoted: boolean;
  demoted: boolean;
  newTier: boolean; // arrivée dans un nouveau palier
  /** Saison précédente close par ce jour (archivage côté serveur), sinon null. */
  closedSeason: { season: string; bestTier: number; bestDiv: number } | null;
}

export const RANKED_LEGEND = RANKED_TIERS.length - 1;

export function rankedFresh(): RankedState {
  return { season: null, tier: 0, div: 0, points: 0, protect: 0, bestTier: 0, bestDiv: 0, lastDate: null };
}

const dayNumber = (d: string) => Math.floor(Date.parse(d + "T00:00:00Z") / 86400000);
const above = (a: { tier: number; div: number }, b: { tier: number; div: number }) => a.tier > b.tier || (a.tier === b.tier && a.div > b.div);

/** Applique un jour classé (date, étoiles) à l'état de rang. Pure : renvoie un nouvel état. */
export function rankedStep(prev: RankedState, date: string, stars: number): RankedStepResult {
  const R = RANKED_RULES;
  const s: RankedState = { ...prev };
  const season = date.slice(0, 7);
  let closedSeason: RankedStepResult["closedSeason"] = null;
  // Nouvelle saison (1er du mois) : un palier de moins, division III, points à zéro.
  if (s.season && s.season !== season) {
    closedSeason = { season: s.season, bestTier: s.bestTier, bestDiv: s.bestDiv };
    s.tier = Math.max(0, s.tier - 1);
    s.div = 0; s.points = 0; s.protect = R.protectDays + 1; // début de saison protégé, comme un nouveau palier
    s.bestTier = s.tier; s.bestDiv = s.div;
  }
  s.season = season;
  // Inactivité au sommet : chaque tranche de jours manqués coûte des points.
  let decay = 0;
  if (s.tier >= R.decayFromTier && s.lastDate && !closedSeason) {
    const missed = dayNumber(date) - dayNumber(s.lastDate) - 1;
    if (missed >= R.decayEveryDays) decay = Math.floor(missed / R.decayEveryDays) * R.decayPoints;
  }
  const tierDef = RANKED_TIERS[s.tier];
  const delta = tierDef.gain[Math.max(0, Math.min(3, stars | 0))];
  s.points += delta - decay;
  let promoted = false, demoted = false, newTier = false;
  // Montée : 10 points = une division ; au-dessus de la division I, le palier suivant.
  while (s.tier < RANKED_LEGEND && s.points >= R.pointsPerDivision) {
    s.points -= R.pointsPerDivision;
    s.div += 1;
    promoted = true;
    if (s.div >= R.divisions) {
      s.tier += 1; s.div = 0; newTier = true; s.protect = R.protectDays + 1; // +1 : décompté ci-dessous
      if (s.tier === RANKED_LEGEND) break; // les points de Légende repartent de ce reliquat
    }
  }
  // Descente : sous 0, une division de moins (sauf protection ou tout en bas).
  if (s.points < 0) {
    if (s.protect > 0 || (s.tier === 0 && s.div === 0)) s.points = 0;
    else {
      demoted = true;
      const rest = s.points;
      if (s.tier === RANKED_LEGEND) { s.tier -= 1; s.div = R.divisions - 1; }
      else if (s.div > 0) s.div -= 1;
      else { s.tier -= 1; s.div = R.divisions - 1; }
      s.points = Math.max(0, R.pointsPerDivision + rest);
    }
  }
  if (s.protect > 0) s.protect -= 1;
  if (above(s, { tier: s.bestTier, div: s.bestDiv })) { s.bestTier = s.tier; s.bestDiv = s.div; }
  s.lastDate = date;
  return { state: s, delta, decay, promoted, demoted, newTier, closedSeason };
}

/** Libellé court d'un rang : « Or II », « Légende · 34 pts ». */
export function rankedLabel(st: { tier: number; div: number; points?: number }): string {
  const t = RANKED_TIERS[st.tier] || RANKED_TIERS[0];
  if (st.tier === RANKED_LEGEND) return t.name;
  return t.name + " " + ["III", "II", "I"][st.div];
}
