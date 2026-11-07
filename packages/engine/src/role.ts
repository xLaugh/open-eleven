// Statut au club et temps de jeu.

import { rng } from "./rng";
import { hasPurchase } from "./shop";
import { clamp } from "./utils";
import { countryOf, lvlOf } from "./clubs";
import { ovr, hasTrait } from "./player";
import type { CareerState, Club, SeasonReport } from "./types";
import { BALANCE, ROLES, ROLE_ESPOIR_MAX_AGE, SHOP_EFFECTS } from "@open-eleven/content";

// --- Statut au club (rôle) --------------------------------------------------
// Rôle proposé sur une offre : dérivé de ta marge (OVR − niveau attendu du club),
// modulé par l'âge/potentiel (un jeune crack dans un grand club = projet) et le
// contexte (le Golfe construit autour de ses signatures). Retourne un INDEX 0→4.
// Plancher de statut : « Espoir » n'a de sens que pour un jeune. Passé
// ROLE_ESPOIR_MAX_AGE, on ne peut plus redescendre en dessous de « Sporadique ».
export function roleFloor(s: CareerState) { return s.age <= ROLE_ESPOIR_MAX_AGE ? 0 : 1; }

export function roleForClub(s: CareerState, club: Club) {
  const bar = BALANCE.expectedLevel[lvlOf(s, club)];
  const margin = ovr(s) - bar;
  const m = BALANCE.role.margins;
  let idx = margin >= m[0] ? 4 : margin >= m[1] ? 3 : margin >= m[2] ? 2 : margin >= m[3] ? 1 : 0;
  const lvl = lvlOf(s, club);
  const big = lvl === "elite" || lvl === "d1";
  if (s.age <= 20 && big && idx > 1) idx -= 1;                              // recruté pour l'avenir
  if ((countryOf(club.countryId) || {}).gulf) idx = Math.min(4, idx + 1);  // le Golfe titularise ses recrues
  if (s.flags && s.flags.prodigy && s.age <= 20) idx = Math.max(idx, 3);   // un crack est lancé
  return clamp(idx, roleFloor(s), 4);
}
export function roleOf(s: CareerState) { return ROLES[typeof s.role === "number" ? clamp(s.role, 0, 4) : 2]; }

// Revue de statut en fin de saison (dynamique) : promotion si tu dépasses
// l'attente et que le coach te fait confiance ; rétrogradation si tu es sous
// l'attente, si la confiance s'effondre, ou si une recrue star débarque à ton
// poste. Sautée la 1re saison au club (le rôle vient d'être signé).
export function reviewRole(s: CareerState, report: SeasonReport) {
  if (s.loan || (s.seasonsAtClub || 0) < 1) return;
  const role = roleOf(s);
  const r = report.rating || 6;
  const from = typeof s.role === "number" ? s.role : 2;
  const floor = roleFloor(s); // plus d'« Espoir » passé 20 ans
  let idx = from, reason = null;
  // Promotion plus exigeante (+0,9 au lieu de +0,6, et 45 % au lieu de 70 %) :
  // sinon la moindre saison correcte faisait grimper, jusqu'au verrouillage en
  // Titulaire. Monter d'un cran doit rester un évènement.
  if (r >= role.expect + 0.9 && s.coachRel >= 60 && idx < 4 && rng() < 0.45) { idx++; reason = "up"; }
  else if ((r <= role.expect - 0.7 || s.coachRel < 32) && idx > floor && rng() < 0.75) { idx--; reason = "down"; }
  else if (idx >= 2 && rng() < BALANCE.role.starSignChance) { idx--; reason = "signing"; }
  if (idx < floor) idx = floor;
  if (idx !== from) {
    s.role = idx;
    s.coachRel = clamp(s.coachRel + (idx > from ? 4 : -3), 5, 100);
    report.roleChange = { from, to: idx, reason };
  }
}

// --- Temps de jeu -----------------------------------------------------------
export function playingTimeFactor(s: CareerState) {
  const role = roleOf(s);
  let pt = role.pt + (s.coachRel - 55) / 180; // le rôle ANCRE, la confiance du coach module
  // Confiance du coach : quand elle s'effondre, tu ne joues plus, peu importe
  // ton statut. Un vrai levier, pas un détail cosmétique.
  if (s.coachRel < 22) pt -= 0.32;
  else if (s.coachRel < 38) pt -= 0.13;
  // Mise à l'écart décidée par le club (défiance persistante, cf. fin de
  // playSeason) : un cran au-dessus de la simple pénalité de confiance
  // ci-dessus. Fonction volontairement PURE (appelée deux fois par saison,
  // depuis setSeasonObjective ET ici) : la consommation du flag se fait
  // ailleurs, dans playSeason, une seule fois.
  if (s.frozenOut) pt -= 0.35;
  if (s.loan) pt += 0.22;
  if (s.flags.prodigy && s.age <= 20) pt += 0.2; // on lance les cracks très tôt
  // Rotation du vétéran : après 32 ans, la jeunesse pousse et le temps de jeu
  // s'érode un peu chaque saison — sauf les gardiens, qui enchaînent tard.
  if (s.age > 32 && s.position.id !== "gk") pt -= (s.age - 32) * 0.03;
  return clamp(pt, 0.05, 1);
}

// Aptitude à durer (recalculée chaque saison : un trait gagné en cours de route
// compte). Repousse le pivot de la pression de retraite. ~[-6, +10].
export function longevityScore(s: CareerState) {
  let L = 0;
  L += s.position.id === "gk" ? 4 : s.position.id === "def" ? 2 : s.position.id === "mil" ? 1 : 0;
  if (hasTrait(s, "ironman")) L += 4;
  if (hasTrait(s, "glass")) L -= 4;
  if (hasTrait(s, "zen")) L += 1;
  L += (s.discipline - 50) / 12;
  L += (s.stats.p - 60) / 15;
  if (hasPurchase(s, "trainer")) L += SHOP_EFFECTS.trainerLongevity; // préparateur physique perso
  return L;
}
