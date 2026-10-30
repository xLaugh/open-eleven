// Offres des centres de formation au départ de carrière.

import type { Dict } from "@open-eleven/content";
import type { AcademyOffer, AcademyProfile, LevelId } from "./types";
import { rng } from "./rng";
import { randInt, pick, weightedRandom } from "./utils";
import { clubHomeOf, continentOf, countryOf, levelRank } from "./clubs";
import { BALANCE, CLUBS, CLUBS_BY_LEVEL, ENGINE_TEXT, LEVEL_ORDER } from "@open-eleven/content";

// --- Génération du centre de formation (départ de carrière) ---------------
export const ORIGIN_ACADEMY: Dict<Dict<number>> = {
  formation: { d1: 8, elite: 6, regional: -10 },
  sportif: { elite: 10, d1: 4 },
  quartier: { regional: 10, d2: 4, elite: -4 },
  futsal: { d2: 6, d1: 2 },
  tardif: { regional: 16, d2: 2, d1: -8, elite: -8 },
  prodige: { elite: 12, d1: 6, regional: -12 }, // les grands centres se l'arrachent
};
export const LIFESTYLE_ACADEMY: Dict<Dict<number>> = { pro: { d1: 4, elite: 4 }, balance: {}, street: { elite: -4 } };
// Clés de ENGINE_TEXT, résolues à l'appel (et non ici) pour que la langue
// choisie s'applique : le texte est traduit en place au chargement.
export const ACADEMY_BLURBS: Dict<string> = {
  elite: "academyElite", d1: "academyD1", d2: "academyD2", d3: "academyD3", d4: "academyD4", regional: "academyRegional",
};
export const academyBlurb = (lvl: string) => ENGINE_TEXT[ACADEMY_BLURBS[lvl]] || "";

export function academyOffers(profile: AcademyProfile): AcademyOffer[] {
  const w: Record<string, number> = { ...BALANCE.academyWeights };
  const add = (obj: Dict<number>) => { for (const k in obj) w[k] = (w[k] || 0) + obj[k]; };
  add(ORIGIN_ACADEMY[profile.origin.id] || {});
  add(LIFESTYLE_ACADEMY[profile.lifestyle.id] || {});
  if (profile.entourage && profile.entourage.academy) add(profile.entourage.academy);
  if (profile.potCap >= 88) add({ elite: 10, d1: 6 });
  else if (profile.potCap <= 76) add({ elite: -8 });
  for (const k in w) w[k] = Math.max(0, w[k]);

  const homeId = clubHomeOf(profile.nationality);
  // Uniquement des centres du pays natal : un niveau sans club
  // domestique (ex. élite au Brésil) est simplement inaccessible.
  const clubsAt = (lvl: string) => CLUBS_BY_LEVEL[lvl as LevelId].filter((c) => c.countryId === homeId);
  for (const k in w) if (!clubsAt(k).length) w[k] = 0;
  // Un pays à un seul échelon (micro-pays : régional) peut voir son unique niveau annulé
  // par le profil (« formé au club », « prodige » boudent le régional) : on garde alors
  // ses niveaux existants, faute de quoi aucun centre ne serait proposé.
  if (!Object.keys(w).some((k) => w[k] > 0)) for (const k in w) if (clubsAt(k).length) w[k] = 1;

  // 3 à 4 offres. Un même niveau peut désormais revenir (deux clubs
  // DIFFÉRENTS) : avant, c'était un club par division au plus, si bien
  // qu'un pays à deux échelons ne proposait jamais plus de deux centres.
  // Le poids d'un niveau déjà tiré est réduit, pas annulé, pour garder de
  // la variété quand le pays en a.
  const count = randInt(3, 4);
  // Tirage TOUJOURS consommé (même si aucun club étranger n'est finalement
  // disponible), pour que le déroulé du hasard ne dépende pas du pays.
  const wantAbroad = rng() < BALANCE.academyAbroadChance && homeId !== "br"; // règle des mineurs brésiliens : pas d'exil avant 18 ans
  const domesticCount = wantAbroad ? count - 1 : count;
  const offers: AcademyOffer[] = [];
  const remaining: Record<string, number> = { ...w };
  // Salle « Rivaux » : le centre d'un rival n'est jamais proposé (aucun effet sinon).
  const taken = new Set<string>(profile.blockedClubs || []);
  for (let i = 0; i < domesticCount; i++) {
    const entries = Object.entries(remaining).filter(([lvl, weight]) => weight > 0 && clubsAt(lvl).some((c) => !taken.has(c.id)));
    if (!entries.length) break;
    const [lvl] = weightedRandom(entries, (e) => e[1]);
    remaining[lvl] *= 0.4;
    const club = pick(clubsAt(lvl).filter((c) => !taken.has(c.id)));
    taken.add(club.id);
    offers.push({ club, level: lvl as LevelId, blurb: academyBlurb(lvl) });
  }
  if (!offers.some((o) => o.level === "elite") && clubsAt("elite").some((c) => !taken.has(c.id)) && rng() < BALANCE.academySurpriseChance) {
    offers[offers.length - 1] = {
      club: pick(clubsAt("elite").filter((c) => !taken.has(c.id))), level: "elite",
      blurb: academyBlurb("elite"), surprise: true,
    };
  }
  // Offre venue de l'étranger : un centre du même continent, un cran
  // au-dessus du meilleur centre domestique intéressé (ou du même niveau
  // s'il n'existe rien plus haut). Le prix — le mal du pays — est appliqué
  // par newCareer quand le club de départ n'est pas au pays.
  if (wantAbroad && offers.length) {
    const homeCont = continentOf(homeId);
    const bestIdx = Math.max(...offers.map((o) => LEVEL_ORDER.indexOf(o.level)));
    const abroadAt = (lvl: LevelId) => CLUBS_BY_LEVEL[lvl].filter((c) => {
      const co = countryOf(c.countryId);
      return c.countryId !== homeId && co?.continent === homeCont && !co?.gulf && !taken.has(c.id);
    });
    let lvl = LEVEL_ORDER[Math.min(LEVEL_ORDER.length - 1, bestIdx + 1)];
    let pool = abroadAt(lvl);
    if (!pool.length) { lvl = LEVEL_ORDER[bestIdx]; pool = abroadAt(lvl); }
    if (pool.length) offers.push({ club: pick(pool), level: lvl, blurb: ENGINE_TEXT.academyAbroad, abroad: true });
  }
  offers.sort((a, b) => levelRank(a.level) - levelRank(b.level));
  return offers;
}
