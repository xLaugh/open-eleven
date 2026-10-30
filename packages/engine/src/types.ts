// Types du moteur de jeu : l'ÉTAT d'une carrière et le BILAN d'une saison.
//
// Ils sont décrits champ par champ pour l'essentiel, avec une porte ouverte
// (`[key: string]: any`) : le moteur y pose encore des champs au fil de l'eau
// (drapeaux d'histoire, compteurs ajoutés par lot). Cette porte a vocation à
// se refermer à mesure que le typage se resserre.
//
// Les formes du CONTENU (clubs, pays, nations, événements…) vivent avec lui,
// dans @open-eleven/content ; elles sont réexportées ici par commodité.
import type { LevelId, ContinentId, PositionId, Level, Country, Club, Nationality, Position, Role, Fx, EventOutcome, EventOption, GameEvent } from "@open-eleven/content";
export type { LevelId, ContinentId, PositionId, Level, Country, Club, Nationality, Position, Role, Fx, EventOutcome, EventOption, GameEvent };

export type SquadId = "youth" | "reserve" | "first";

export interface SponsorDeal { id: string; label: string; mult: number; }

export interface SponsorOffer extends SponsorDeal {
  tier: number;
  desc: string;
  repDelta: number;
  disciplineDelta: number;
  money: number;
}

// --- Offres ------------------------------------------------------------------

export interface TransferOffer {
  club: Club;
  fee: number;
  salary: number;
  years: number;
  gulf?: boolean;
  /** Statut proposé (Espoir → Titulaire). */
  role?: number;
}

/** Un prêt : seul le club d'accueil est en jeu (pas d'indemnité ni de contrat). */
export interface LoanOffer { club: Club; loan: true; }

export interface TransferWindow {
  reason: string;
  offers: TransferOffer[];
  contractUp: boolean;
  renewSalary?: number;
  /** Le club ne prolonge pas : il FAUT choisir une offre. */
  noStay?: boolean;
  /** Vétéran sans club : fin de carrière immédiate. */
  retire?: boolean;
}

// --- État d'une carrière -----------------------------------------------------

export interface Trophies {
  league: number; cup: number;
  continental: number; continental2: number; continental3: number; supercup: number;
  worldCup: number; contInt: number; natLeague: number; olympic: number; arabCup: number; games: number;
  ballon: number; goldenBoot: number;
  [key: string]: number;
}

export interface SeasonRecord {
  age: number;
  year: number;
  clubName: string;
  countryId: string;
  level: LevelId;
  matches: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;
  trophies: string[];
  divisionTitle: boolean;
  onLoan: boolean;
  leaguePos: number | null;
  mv: number;
  /** Saison jouée en U17 ou en réserve : chiffres de cette équipe dans `dev`. */
  squad?: SquadId;
  dev?: DevStats;
  /** Sélection A cette saison (tournois compris) — absent si le joueur n'a pas été appelé. */
  nat?: { caps: number; goals: number; assists: number };
  /** Sélections de jeunes cette saison (U17 à U23, Jeux compris) — absent sinon. */
  youthNat?: { caps: number; goals: number };
}

export interface DevStats { matches: number; goals: number; assists: number; cleanSheets: number; }

export interface HistoryEntry { age: number; text: string; impact: number; }

export interface CareerState {
  natRuns: NatRun[];
  name: string;
  nationality: Nationality;
  origin: { id: string; [key: string]: any };
  position: Position;
  lifestyle: { id: string; [key: string]: any };
  entourage: { id: string; [key: string]: any };
  trajectory: { id: string; [key: string]: any };
  age: number;
  year: number;
  club: Club;
  coach: string;
  contract: { salary: number; years: number };
  /** Technique, Physique, Mental, Charisme. */
  stats: { t: number; p: number; m: number; c: number };
  rep: number;
  form: number;
  moral: number;
  discipline: number;
  coachRel: number;
  teamRel: number;
  money: number;
  potCap: number;
  traits: string[];
  flags: { [key: string]: any };
  usedEvents: string[];
  scheduled: { id: string; age: number }[];
  injuryWeeks: number;
  seasonTrophies: string[];
  seasonAwards: string[];
  loan: { parentClub: Club; parentCoach: string; loanClubId: string; parentSquad?: SquadId; rating?: number } | null;
  role: number;
  squad?: SquadId;
  /** Niveaux effectifs des clubs pour CETTE carrière (montées/descentes vécues). */
  clubLevels: { [clubId: string]: LevelId };
  trophies: Trophies;
  totals: DevStats;
  seasons: SeasonRecord[];
  history: HistoryEntry[];
  natTeam: { active: boolean; retired: boolean; caps: number; goals: number; number?: number; [key: string]: any };
  youth: { caps: number; goals: number; tiers: string[] };
  dualNat?: string | null;
  dualNatAlt?: string | null;
  sponsorDeal: SponsorDeal | null;
  sponsorTier?: number;
  peakOvr: number;
  /** Nombre de fois où chaque distinction individuelle a été obtenue. */
  awardCounts: { [awardId: string]: number };
  clubsPlayed: string[];
  retiring: boolean;
  careerEnded: boolean;
  careerEndReason: string | null;
  [key: string]: any;
}

// --- Bilan d'une saison ------------------------------------------------------

export interface SeasonReport {
  age: number;
  year: number;
  clubName: string;
  countryId: string;
  level: LevelId;
  trophies: string[];
  awards: string[];
  lines: { text: string; impact: number }[];
  pendingMoments: any[];
  onLoan: boolean;
  // Toujours renseignés : posés d'emblée à zéro, puis calculés avant que quiconque les lise.
  matches: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  rating: number;
  income?: number;
  squad?: SquadId;
  dev?: DevStats;
  [key: string]: any;
}

// --- Profils, offres et autres formes de travail ---------------------------------

/** Un élément de choix à la création : origine, hygiène de vie, entourage, trajectoire. */
export interface Tagged { id: string; [key: string]: any; }

/** Ce que le joueur (ou le défi du jour) fixe avant la première saison. */
export interface Profile {
  nationality: Nationality;
  position: Position;
  origin: Tagged;
  lifestyle?: Tagged;
  entourage?: Tagged;
  trajectory?: Tagged;
  potCap?: number;
}
export interface NewCareerOptions extends Profile {
  club: Club;
  name?: string;
  startYear?: number;
  clubLevels?: { [clubId: string]: LevelId };
  dualNat?: string | null;
  [key: string]: any;
}

/** Une offre de centre de formation au départ de carrière. */
/** Ce que le centre de formation attend du joueur : tout le profil, potentiel compris. */
export interface AcademyProfile {
  nationality: Nationality; origin: Tagged; lifestyle: Tagged; entourage: Tagged; potCap: number;
  /** Salle « Rivaux » : centres déjà pris par un rival, jamais proposés. */
  blockedClubs?: string[];
}

export interface AcademyOffer {
  club: Club; level: LevelId; blurb: string; surprise?: boolean; abroad?: boolean;
}

/** Ce qu'un événement ou le mercato demande à offersFor (cf. fx.transfer des événements). */
export interface OfferSpec {
  d?: number; toLevel?: LevelId; clubId?: string;
  origin?: boolean; gulf?: boolean; exotic?: boolean; gulfExtra?: boolean;
  home?: boolean; domestic?: boolean; cross?: boolean; direct?: boolean;
  [key: string]: any;
}

/** Valeurs ponctuelles injectées dans un texte ({fee}, {rank}, {rival}…). */
export interface TextVars { rival?: string; [key: string]: string | number | null | undefined; }

/** Une nation ou un pays : ce dont `natForms` a besoin pour écrire son nom. */
export interface Entity { id?: string; name?: string; homeCountryId?: string; }

/** Objectif de saison fixé par le club : un seuil chiffré, ou « un trophée » (sans seuil). */
export type Objective =
  | { type: "goals" | "cs" | "rating" | "top"; n: number; label: string }
  | { type: "trophy"; label: string };

/** Une pastille de résultat affichée après un effet (« +2 Technique »). */
export interface Chip { label: string; kind: string; }

/** Un moment décisif (finale, barrage, derby…) : ses textes et ses options. */
export interface KeyMoment {
  title: string; winText?: string; failText?: string; options: EventOption[];
  [key: string]: any;
}
/** Un moment décisif mis en file pour la saison, avec ce qui le désigne. */
export interface SeasonMomentEntry { type: string; moment: KeyMoment; label?: string; [key: string]: any; }

/** Parcours d'une année dans un tournoi de sélection. */
export interface NatRun { comp: string; year: number; stage: string; third: string | null; }
