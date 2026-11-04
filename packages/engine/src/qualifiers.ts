// Qualifications des sélections : le monde entier joue ses éliminatoires.
//
// Avant chaque Coupe du Monde et chaque coupe continentale, toutes les nations du
// continent concerné passent par des groupes (rencontres simulées selon leur force),
// puis éventuellement par des barrages. Seuls les qualifiés disputent le tournoi, et
// ses poules sont tirées parmi eux. La nation du joueur suit le même chemin, un peu
// portée par lui s'il en est titulaire.
//
// Calendrier (cycle du jeu) : les qualifications d'une coupe continentale (année %4 == 0)
// se jouent la saison précédente (%4 == 3) ; celles du Mondial (%4 == 2) aussi (%4 == 1).
// Une carrière qui commence l'année même d'un tournoi le trouve déjà qualifié : ses
// qualifications sont alors tirées sur le moment, sans être racontées.
//
// Tout passe par le hasard de la carrière (rng) : un défi du jour ou un duel rejoue
// exactement les mêmes qualifications.

import { rng } from "./rng";
import { clamp } from "./utils";
import { continentOf } from "./clubs";
import { natClubFloorOk } from "./nationality";
import { ovr } from "./player";
import type { CareerState } from "./types";
import { NATIONALITIES } from "@open-eleven/content";

type Nat = (typeof NATIONALITIES)[number];
export type QualComp = "wc" | "cont";

export interface QualRow { id: string; pts: number; gd: number; }
export interface QualResult {
  comp: QualComp;
  year: number;
  hosts: string[];
  qualified: string[];
  /** Parcours de la nation du joueur. */
  mine: {
    stage: "host" | "auto" | "direct" | "playoff_won" | "playoff_lost" | "out" | "none";
    rank?: number;
    table?: QualRow[];
    /** Barrage de la nation du joueur : adversaires du chemin, issue tirée d'avance. */
    playoff?: { opponents: string[]; won: boolean; spot: string | null };
  };
}

// Sud-Amérique : les 10 nations de la CONMEBOL ; le reste des Amériques forme la CONCACAF.
export const CONMEBOL = ["ar", "br", "uy", "co", "cl", "pe", "ec", "py", "bo", "ve"];

// Hôtes réels connus ; au-delà, une rotation (même hôtes pour toutes les carrières).
const WC_HOSTS: Record<number, string[]> = { 2026: ["us", "ca", "mx"], 2030: ["es", "pt", "ma"], 2034: ["sa"] };
const CONT_HOSTS: Record<number, Record<string, string[]>> = { 2028: { eu: ["en", "sco", "wal", "nir", "ie"] }, 2032: { eu: ["it", "tr"] } };

const confOf = (n: Nat): string => {
  const c = continentOf(n.homeCountryId) || "";
  if (c === "am") return CONMEBOL.includes(n.id) ? "conmebol" : "concacaf";
  return c;
};
const contOfConf = (conf: string) => (conf === "conmebol" || conf === "concacaf" ? "am" : conf);

// Choix déterministe (ne consomme pas le hasard de la carrière) : un hôte ne dépend
// que de l'année, pour que le monde soit le même d'une carrière à l'autre.
function hashPick<T>(list: T[], seed: number): T {
  let h = (seed * 2654435761) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12;
  return list[(h >>> 0) % list.length];
}
const strongest = (pool: Nat[], n: number, str: (x: Nat) => number) => [...pool].sort((a, b) => str(b) - str(a)).slice(0, n);

export function hostsOf(comp: QualComp, year: number, continent?: string): string[] {
  const known = comp === "wc" ? WC_HOSTS[year] : CONT_HOSTS[year] && continent ? CONT_HOSTS[year][continent] : undefined;
  const exists = (ids: string[]) => ids.filter((id) => NATIONALITIES.some((n) => n.id === id));
  if (known) return exists(known);
  if (comp === "wc") {
    // Rotation des continents, puis une grande nation de ce continent.
    const conts = ["eu", "am", "af", "as", "eu", "am", "as"];
    const cont = conts[Math.floor((year - 2038) / 4 + 700) % conts.length];
    const pool = NATIONALITIES.filter((n) => continentOf(n.homeCountryId) === cont);
    return [hashPick(strongest(pool, 10, (x) => x.wcWeight ?? x.weight), year).id];
  }
  const pool = NATIONALITIES.filter((n) => continentOf(n.homeCountryId) === continent && (continent !== "am" || CONMEBOL.includes(n.id)));
  if (!pool.length) return [];
  return [hashPick(strongest(pool, 8, (x) => x.weight), year * 7 + (continent || "").length).id];
}

// --- Rencontres ---------------------------------------------------------------------
// Force comparée (Elo simplifié) ; le nul est plus fréquent entre équipes proches.
export function playMatch(a: number, b: number): [number, number] {
  const pa = Math.pow(a, 1.4) / (Math.pow(a, 1.4) + Math.pow(b, 1.4));
  const draw = 0.28 * (1 - Math.abs(pa - 0.5) * 1.4);
  const r = rng();
  const margin = 1 + Math.floor(rng() * (1.5 + Math.abs(pa - 0.5) * 4));
  if (r < draw) return [0, 0];
  return rng() < pa ? [margin, 0] : [0, margin];
}
// Élimination directe (barrage) : pas de nul, le plus fort reste favori.
function knockout(a: number, b: number): boolean {
  const pa = Math.pow(a, 1.2) / (Math.pow(a, 1.2) + Math.pow(b, 1.2));
  return rng() < pa;
}

function shuffle<T>(list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

// Groupes tirés par chapeaux (les plus forts répartis), aller-retour.
function playGroups(teams: Nat[], count: number, str: (n: Nat) => number): QualRow[][] {
  const sorted = [...teams].sort((a, b) => str(b) - str(a));
  const groups: Nat[][] = Array.from({ length: Math.max(1, count) }, () => []);
  for (let p = 0; p < sorted.length; p += groups.length) shuffle(sorted.slice(p, p + groups.length)).forEach((t, i) => groups[i].push(t));
  return groups.map((g) => {
    const rows = new Map(g.map((t) => [t.id, { id: t.id, pts: 0, gd: 0 }]));
    for (let i = 0; i < g.length; i++) for (let j = 0; j < g.length; j++) {
      if (i === j) continue;
      const [x, y] = playMatch(str(g[i]), str(g[j]));
      const a = rows.get(g[i].id)!, b = rows.get(g[j].id)!;
      a.gd += x - y; b.gd += y - x;
      if (x > y) a.pts += 3; else if (y > x) b.pts += 3; else { a.pts += 1; b.pts += 1; }
    }
    return [...rows.values()].sort((a, b) => b.pts - a.pts || b.gd - a.gd);
  });
}
// Classement d'ensemble : d'abord la place dans le groupe, puis les points.
const overall = (groups: QualRow[][]) => groups.flatMap((g) => g.map((r, i) => ({ ...r, pos: i })))
  .sort((a, b) => a.pos - b.pos || b.pts - a.pts || b.gd - a.gd);

// --- Une zone de qualification -------------------------------------------------------
interface ZoneSpec { teams: Nat[]; auto: string[]; direct: number; groups: number; playoffSpots: number; playoffSize: number; extra?: number; }
interface ZoneResult { qualified: string[]; extra: string[]; tables: Map<string, QualRow[]>; ranks: Map<string, number>; paths: { teams: string[]; winner: string }[]; }

function runZone(z: ZoneSpec, str: (n: Nat) => number): ZoneResult {
  const pool = z.teams.filter((t) => !z.auto.includes(t.id));
  const groups = pool.length ? playGroups(pool, Math.min(z.groups, pool.length), str) : [];
  const tables = new Map<string, QualRow[]>(), ranks = new Map<string, number>();
  for (const g of groups) g.forEach((r, i) => { tables.set(r.id, g); ranks.set(r.id, i + 1); });
  const order = overall(groups).map((r) => r.id);
  const qualified = [...z.auto, ...order.slice(0, z.direct)];
  let rest = order.slice(z.direct);
  // Barrages : chemins de `playoffSize` équipes, demi-finales puis finale (le mieux classé reçoit).
  const paths: { teams: string[]; winner: string }[] = [];
  const byId = new Map(z.teams.map((t) => [t.id, t]));
  const cand = rest.slice(0, z.playoffSpots * z.playoffSize);
  for (let p = 0; p < z.playoffSpots && cand.length; p++) {
    const teams = cand.filter((_, i) => i % z.playoffSpots === p);
    if (!teams.length) continue;
    const s = (id: string) => str(byId.get(id)!);
    let winner: string;
    if (teams.length >= 4) {
      const w1 = knockout(s(teams[0]), s(teams[3])) ? teams[0] : teams[3];
      const w2 = knockout(s(teams[1]), s(teams[2])) ? teams[1] : teams[2];
      winner = knockout(s(w1), s(w2)) ? w1 : w2;
    } else if (teams.length >= 2) winner = knockout(s(teams[0]), s(teams[1])) ? teams[0] : teams[1];
    else winner = teams[0];
    paths.push({ teams, winner });
    qualified.push(winner);
  }
  rest = rest.filter((id) => !cand.includes(id));
  const extra = (z.extra ? [...cand.filter((id) => !qualified.includes(id)), ...rest] : []).slice(0, z.extra || 0);
  return { qualified, extra, tables, ranks, paths };
}

// --- Les qualifications d'un tournoi ----------------------------------------------------
function playerMult(s: CareerState): number {
  if (!s.natTeam || !s.natTeam.active || !natClubFloorOk(s)) return 1;
  return 1 + clamp((ovr(s) - 68) / 140, 0, 0.18) * clamp(s.form / 70, 0.6, 1.2);
}

function simulate(s: CareerState, comp: QualComp, year: number): QualResult {
  const mineId = s.nationality.id;
  const mult = playerMult(s);
  const base = (n: Nat) => (comp === "wc" && n.wcWeight != null ? n.wcWeight : n.weight) || 0.02;
  const str = (n: Nat) => base(n) * (n.id === mineId ? mult : 1);
  const myConf = confOf(s.nationality as Nat);
  const result: QualResult = { comp, year, hosts: [], qualified: [], mine: { stage: "none" } };
  const zones: { conf: string; res: ZoneResult; spec: ZoneSpec }[] = [];

  if (comp === "wc") {
    // Quotas du Mondial à 48 : places directes par confédération, et 2 places
    // en barrage intercontinental (6 nations).
    const hosts = hostsOf("wc", year);
    result.hosts = hosts;
    const quotas: Record<string, { q: number; inter: number; league?: boolean; playoff?: number }> = {
      eu: { q: 16, inter: 0, playoff: 4 }, af: { q: 9, inter: 1 }, as: { q: 8, inter: 1 },
      conmebol: { q: 6, inter: 1, league: true }, concacaf: { q: 6, inter: 2 }, oc: { q: 1, inter: 1, league: true },
    };
    for (const [conf, qd] of Object.entries(quotas)) {
      const teams = NATIONALITIES.filter((n) => confOf(n) === conf);
      const auto = hosts.filter((h) => teams.some((t) => t.id === h));
      const playoffSpots = qd.playoff || 0;
      const direct = Math.max(0, qd.q - auto.length - playoffSpots);
      const spec: ZoneSpec = { teams, auto, direct, groups: qd.league ? 1 : Math.max(1, direct), playoffSpots, playoffSize: 4, extra: qd.inter };
      const res = runZone(spec, str);
      zones.push({ conf, res, spec });
      result.qualified.push(...res.qualified);
    }
    // Barrage intercontinental : 6 nations, 2 chemins de 3 (le mieux placé attend en finale).
    const inter = zones.flatMap((z) => z.res.extra);
    const byId = new Map(NATIONALITIES.map((n) => [n.id, n]));
    const seeded = inter.sort((a, b) => str(byId.get(b)!) - str(byId.get(a)!));
    const interPaths: { teams: string[]; winner: string }[] = [];
    for (let p = 0; p < 2; p++) {
      const teams = seeded.filter((_, i) => i % 2 === p);
      if (!teams.length) continue;
      const sid = (id: string) => str(byId.get(id)!);
      let winner = teams[0];
      if (teams.length >= 3) { const semi = knockout(sid(teams[1]), sid(teams[2])) ? teams[1] : teams[2]; winner = knockout(sid(teams[0]), sid(semi)) ? teams[0] : semi; }
      else if (teams.length === 2) winner = knockout(sid(teams[0]), sid(teams[1])) ? teams[0] : teams[1];
      interPaths.push({ teams, winner });
      result.qualified.push(winner);
    }
    zones.push({ conf: "inter", res: { qualified: [], extra: [], tables: new Map(), ranks: new Map(), paths: interPaths }, spec: { teams: [], auto: [], direct: 0, groups: 0, playoffSpots: 2, playoffSize: 3 } });
  } else {
    // Coupe continentale du continent du joueur (les autres n'ont aucune incidence sur lui).
    const cont = contOfConf(myConf);
    const hosts = hostsOf("cont", year, cont);
    result.hosts = hosts;
    const teams = NATIONALITIES.filter((n) => continentOf(n.homeCountryId) === cont);
    let spec: ZoneSpec;
    if (cont === "am") {
      // Copa América : les 10 sud-américains d'office, 6 invités du reste des Amériques.
      const north = teams.filter((t) => !CONMEBOL.includes(t.id));
      const auto = [...teams.filter((t) => CONMEBOL.includes(t.id)).map((t) => t.id), ...hosts.filter((h) => !CONMEBOL.includes(h))];
      spec = { teams: [...teams.filter((t) => CONMEBOL.includes(t.id)), ...north], auto, direct: Math.max(0, 16 - auto.length), groups: 3, playoffSpots: 0, playoffSize: 4 };
    } else if (cont === "oc") {
      // Coupe d'Océanie : les 4 meilleures d'office, 4 places pour les autres.
      const auto = [...new Set([...hosts, ...strongest(teams, 4, (x) => x.weight).map((t) => t.id)])];
      spec = { teams, auto, direct: Math.max(0, 8 - auto.length), groups: 2, playoffSpots: 0, playoffSize: 4 };
    } else {
      // Euro, CAN, Coupe d'Asie : 24 équipes, les 2 premiers de chaque groupe ; l'Euro
      // garde 3 places pour des barrages.
      const playoffSpots = cont === "eu" ? 3 : 0;
      const direct = Math.max(0, 24 - hosts.length - playoffSpots);
      spec = { teams, auto: hosts, direct, groups: Math.ceil(direct / 2), playoffSpots, playoffSize: 4 };
    }
    const res = runZone(spec, str);
    zones.push({ conf: cont, res, spec });
    result.qualified.push(...res.qualified);
  }

  // Le parcours de la nation du joueur, pour le récit et le barrage joué.
  const myZone = zones.find((z) => z.spec.teams.some((t) => t.id === mineId));
  const inPath = (zs: typeof zones) => {
    for (const z of zs) for (const p of z.res.paths) if (p.teams.includes(mineId)) return p;
    return null;
  };
  const path = inPath(zones);
  if (result.hosts.includes(mineId)) result.mine = { stage: "host" };
  else if (myZone && myZone.spec.auto.includes(mineId)) result.mine = { stage: "auto" };
  else if (myZone) {
    const rank = myZone.res.ranks.get(mineId);
    const table = myZone.res.tables.get(mineId);
    if (path) {
      const won = path.winner === mineId;
      result.mine = { stage: won ? "playoff_won" : "playoff_lost", rank, table, playoff: { opponents: path.teams.filter((t) => t !== mineId), won, spot: path.winner } };
    } else result.mine = { stage: result.qualified.includes(mineId) ? "direct" : "out", rank, table };
  }
  return result;
}

// La coupe continentale dépend du continent de la sélection (un binational qui change
// de sélection peut changer de continent) : elle est rangée par continent.
const key = (s: CareerState, comp: QualComp, year: number) =>
  comp === "wc" ? "wc:" + year : "cont:" + contOfConf(confOf(s.nationality as Nat)) + ":" + year;

/** Qualifications de `comp` pour le tournoi de l'année `year`, simulées une seule fois. */
export function qualifiersFor(s: CareerState, comp: QualComp, year: number): QualResult {
  s.world = s.world || {};
  const k = key(s, comp, year);
  if (!s.world[k]) s.world[k] = simulate(s, comp, year);
  return s.world[k];
}

/** La nation du joueur dispute-t-elle ce tournoi ? */
export function isQualified(s: CareerState, comp: QualComp, year: number): boolean {
  return qualifiersFor(s, comp, year).qualified.includes(s.nationality.id);
}

/** Barrage joué par le joueur : son issue remplace celle tirée d'avance pour sa nation. */
export function settleNatPlayoff(s: CareerState, comp: QualComp, year: number, won: boolean): void {
  const q = qualifiersFor(s, comp, year);
  const me = s.nationality.id, p = q.mine.playoff;
  if (!p) return;
  const others = q.qualified.filter((id) => id !== me && id !== p.spot);
  // Le perdant du chemin cède sa place : au joueur s'il gagne, au meilleur adversaire sinon.
  const replacement = won ? me : (p.spot && p.spot !== me ? p.spot : p.opponents[0]);
  q.qualified = [...others, replacement];
  q.mine = { ...q.mine, stage: won ? "playoff_won" : "playoff_lost", playoff: { ...p, won, spot: replacement } };
}
