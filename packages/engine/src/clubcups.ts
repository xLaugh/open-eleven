// Coupes continentales de clubs : qui les joue, et qui finit où en championnat.
//
// On s'y qualifie au classement de la saison PASSÉE en première division, selon les
// places du pays (CLUB_CUP_SLOTS) ; le vainqueur de la Coupe Nationale garde en plus
// son billet pour la C2 (cf. season.ts). Les clubs élite ne sont plus qualifiés
// d'office : ils finissent seulement plus souvent en haut du classement.
//
// Rien ici ne consomme le hasard de la carrière : la qualification se lit dans l'état,
// et le classement passé d'un club qu'on rejoint est tiré d'un hachage (club, année),
// le même pour toutes les carrières — et pour tous les membres d'une salle.
import { BALANCE, CLUB_CUP_SLOTS, CLUBS, CONTINENTAL_CUPS, CONTINENTAL_CUPS2, CONTINENTAL_CUPS3, type CupSlots } from "@open-eleven/content";
import { continentOf } from "./clubs";
import type { CareerState, LevelId } from "./types";

export type CupTier = 0 | 1 | 2 | 3;

let elitePays: Set<string> | null = null;
/** Le championnat de ce pays compte-t-il des clubs élite ? Ils y occupent alors le haut du tableau. */
export function hasEliteClubs(countryId: string): boolean {
  elitePays ??= new Set(CLUBS.filter((c) => c.level === "elite").map((c) => c.countryId));
  return elitePays.has(countryId);
}

/**
 * Fourchette de classement hors titre (la 1re place est celle du champion). Les clubs
 * élite tournent entre la 2e et la 6e place ; un D1 ordinaire d'un pays qui a des clubs
 * élite finit derrière eux — une grande saison du joueur peut le hisser plus haut.
 */
export function leagueRange(lvl: LevelId, countryId: string): [number, number] {
  if (lvl === "elite") return [2, 6];
  if (lvl === "d1") return hasEliteClubs(countryId) ? [5, 15] : [2, 12];
  return [4, 14];
}

/** Chance de titre (ou de titre de division) d'un club de ce niveau, dans ce pays. */
export function titleChanceFor(lvl: LevelId, countryId: string): number {
  const base = BALANCE.titleChance[lvl] || 0;
  return lvl === "d1" && hasEliteClubs(countryId) ? base * BALANCE.d1TitleInEliteLeague : base;
}

function slotsOf(countryId: string): CupSlots {
  const cont = continentOf(countryId) || "eu";
  return CLUB_CUP_SLOTS.byCountry[countryId] || CLUB_CUP_SLOTS.byContinent[cont] || { c1: 1 };
}

/** Coupe ouverte par ce rang de première division (0 : aucune). */
export function tierForRank(countryId: string, rank: number | null | undefined): CupTier {
  if (!rank || rank < 1) return 0;
  const cont = continentOf(countryId) || "eu";
  const slots = slotsOf(countryId);
  let n = slots.c1;
  if (rank <= n) return 1;
  if (slots.c2 && CONTINENTAL_CUPS2[cont]) { n += slots.c2; if (rank <= n) return 2; }
  if (slots.c3 && CONTINENTAL_CUPS3[cont]) { n += slots.c3; if (rank <= n) return 3; }
  return 0;
}

/** La coupe d'un palier sur un continent (null si ce palier n'y existe pas). */
export function cupOf(tier: CupTier, countryId: string) {
  const cont = continentOf(countryId) || "eu";
  if (tier === 1) return CONTINENTAL_CUPS[cont] || CONTINENTAL_CUPS.eu;
  if (tier === 2) return CONTINENTAL_CUPS2[cont] || null;
  if (tier === 3) return CONTINENTAL_CUPS3[cont] || null;
  return null;
}

// Hachage FNV-1a ramené dans [0, 1) : le « monde » ne dépend que du club et de l'année.
function unit(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** Classement d'un club une saison où le joueur n'y était pas : mêmes chances que s'il l'avait jouée, sans lui. */
export function simulatedRank(clubId: string, year: number, lvl: LevelId, countryId: string): number {
  if (unit(clubId + "|" + year + "|titre") < titleChanceFor(lvl, countryId)) return 1;
  const [lo, hi] = leagueRange(lvl, countryId);
  return lo + Math.floor(unit(clubId + "|" + year + "|rang") * (hi - lo + 1));
}

/**
 * Fin de saison : le classement final décide de la coupe de la saison suivante. Gardé
 * dans l'état (contNext) avec le club et l'année, pour ne valoir que pour CE club.
 */
export function noteClubQualification(s: CareerState, leaguePos: number | null | undefined, isTopFlight: boolean): CupTier {
  const tier = isTopFlight ? tierForRank(s.club.countryId, leaguePos) : 0;
  s.contNext = { clubId: s.club.id, year: s.year, tier, rank: leaguePos ?? null };
  return tier;
}

/**
 * Coupe jouée cette saison par le club du joueur, au titre du classement. Le joueur y
 * était la saison passée : c'est son classement qui compte. Sinon (transfert, prêt,
 * premier club), on simule celui du club, au niveau qui est le sien aujourd'hui.
 */
export function seasonCupTier(s: CareerState, lvl: LevelId, isTopFlight: boolean): { tier: CupTier; rank: number | null; simulated: boolean } {
  const prev = s.contNext;
  if (prev && prev.clubId === s.club.id && prev.year === s.year - 1) return { tier: prev.tier, rank: prev.rank, simulated: false };
  if (!isTopFlight) return { tier: 0, rank: null, simulated: true };
  const rank = simulatedRank(s.club.id, s.year - 1, lvl, s.club.countryId);
  return { tier: tierForRank(s.club.countryId, rank), rank, simulated: true };
}
