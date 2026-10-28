// Compétitions de club et de sélection, distinctions, étapes de tournoi.

// --- Coupes continentales de CLUBS (une par continent, jamais confondues) -----
// Une "Coupe des Champions" par continent, toutes jouables : la gagner se joue
// en finale interactive (moment "continental_final"). Amérique et Afrique
// contestent la leur comme l'Europe (cf. BALANCE.continentalReach).
import type { Ballon, Dict, Named, RegionalGames, YouthTier } from "./types";

export const CONTINENTAL_CUPS: Dict<Named> = {
  eu: { name: "Coupe des Champions d'Europe", short: "Europe", icon: "🥇" },
  am: { name: "Coupe des Champions d'Amérique", short: "Amérique", icon: "🏆" },
  as: { name: "Coupe des Champions d'Asie", short: "Asie", icon: "🎌" },
  af: { name: "Coupe des Champions d'Afrique", short: "Afrique", icon: "🌍" },
  oc: { name: "Coupe des Champions d'Océanie", short: "Océanie", icon: "🌊" },
};

// --- Coupes continentales de clubs SECONDAIRES (C2/C3) -------------------------
// Pendant de CONTINENTAL_CUPS un cran plus bas, mais PAS uniforme sur les 5
// continents (choix délibéré, pas un oubli) :
//   • C2 (Trophée), vainqueur de Coupe Nationale toutes divisions : Europe,
//     Asie, Afrique, Amérique.
//   • C3 (Bouclier), division juste sous le sommet continental par défaut :
//     Europe et Asie SEULEMENT.
//   • Océanie : aucune des deux — elle ne dispute que sa Coupe des Champions
//     (CONTINENTAL_CUPS.oc), inchangée.
// L'absence d'une clé pour un continent EST la donnée : engine s'en sert
// comme garde (`CONTINENTAL_CUPS2[continent]` falsy → palier non proposé).
export const CONTINENTAL_CUPS2: Dict<Named> = {
  eu: { name: "Trophée d'Europe", icon: "🥈" },
  as: { name: "Trophée d'Asie", icon: "🥈" },
  af: { name: "Trophée d'Afrique", icon: "🥈" },
  am: { name: "Trophée d'Amérique", icon: "🥈" },
};

export const CONTINENTAL_CUPS3: Dict<Named> = {
  eu: { name: "Bouclier d'Europe", icon: "🥉" },
  as: { name: "Bouclier d'Asie", icon: "🥉" },
};

// --- Places continentales de clubs ------------------------------------------------
// Combien de clubs de PREMIÈRE DIVISION d'un pays jouent chaque coupe la saison
// suivante, d'après leur classement : c1 premiers en C1, puis c2 en C2, puis c3 en C3.
// Le vainqueur de la Coupe Nationale garde en plus son billet pour la C2. Un palier
// absent du continent (pas de C2 en Océanie, pas de C3 hors Europe/Asie) n'en ouvre pas.
// Inspiré des vraies attributions : les grands championnats envoient plus de clubs en
// C1 ; les championnats moyens et petits se rattrapent en C2 et surtout en C3 (comme
// la Ligue Conférence, pensée pour eux).
export interface CupSlots { c1: number; c2?: number; c3?: number; }
const EU_MID: CupSlots = { c1: 1, c2: 2, c3: 2 }; // championnats moyens (première division de niveau D1)
export const CLUB_CUP_SLOTS: { byCountry: Dict<CupSlots>; byContinent: Dict<CupSlots> } = {
  byCountry: {
    en: { c1: 4, c2: 1, c3: 1 }, es: { c1: 4, c2: 1, c3: 1 }, it: { c1: 4, c2: 1, c3: 1 }, de: { c1: 4, c2: 1, c3: 1 },
    fr: { c1: 3, c2: 1, c3: 1 },
    pt: { c1: 2, c2: 1, c3: 1 }, nl: { c1: 2, c2: 1, c3: 1 },
    be: { c1: 2, c2: 1, c3: 2 }, tr: { c1: 2, c2: 1, c3: 2 },
    ch: EU_MID, at: EU_MID, sco: EU_MID, gr: EU_MID, dk: EU_MID, cz: EU_MID, hr: EU_MID, rs: EU_MID, ua: EU_MID,
    no: EU_MID, se: EU_MID, pl: EU_MID, ro: EU_MID, sk: EU_MID, ru: EU_MID, hu: EU_MID, ba: EU_MID,
    br: { c1: 4, c2: 2 }, ar: { c1: 4, c2: 2 },
  },
  byContinent: {
    // Petits championnats européens : le champion en C1, le 2e en C2, les 3e et 4e en C3.
    eu: { c1: 1, c2: 1, c3: 2 },
    am: { c1: 2, c2: 1 },
    af: { c1: 2, c2: 1 },
    as: { c1: 2, c2: 1, c3: 1 },
    oc: { c1: 1 },
  },
};

// --- Supercoupes continentales de clubs -----------------------------------------
// Match d'ouverture de saison entre le vainqueur du C1 et celui du C2 (comme la
// Supercoupe de l'UEFA) : n'existe que là où les DEUX paliers coexistent, donc
// pas d'Océanie (aucun C2, cf. CONTINENTAL_CUPS2 ci-dessus).
export const CONTINENTAL_SUPERCUP: Dict<Named> = {
  eu: { name: "Supercoupe d'Europe", icon: "🏅" },
  as: { name: "Supercoupe d'Asie", icon: "🏅" },
  af: { name: "Supercoupe d'Afrique", icon: "🏅" },
  am: { name: "Supercoupe d'Amérique", icon: "🏅" },
};

// --- Ballons d'Or continentaux --------------------------------------------------
// Distinction PARALLÈLE au Ballon d'Or mondial (COMPETITIONS.ballon), pas un lot
// de consolation qui l'exclurait : un joueur peut gagner les deux, la même
// saison ou à des saisons différentes (cf. engine.rollContinentalBallon).
// Pas de version Europe : le Ballon d'Or classique en tient déjà lieu pour les
// joueurs européens (et l'Amérique du Sud, déjà très représentée dans son
// histoire réelle) — réservé aux nationalités asiatiques/africaines/océaniennes.
export const CONTINENTAL_BALLON: Dict<Ballon> = {
  as: { key: "ballonAsia", name: "Ballon d'Or asiatique", icon: "⭐" },
  af: { key: "ballonAfrica", name: "Ballon d'Or africain", icon: "⭐" },
  oc: { key: "ballonOceania", name: "Ballon d'Or océanien", icon: "⭐" },
};

// --- Championnats continentaux de SÉLECTION (l'Euro, la Copa, la CAN) ---------
// Pendant continental de la Coupe du Monde : une compétition par continent de
// nationalité (eu/am/af), disputée les années paires hors Mondial (cf.
// engine.isContinentalYear). À NE PAS confondre avec CONTINENTAL_CUPS (clubs).
export const NATIONAL_CUPS: Dict<Named> = {
  eu: { name: "Championnat d'Europe des Nations", short: "Euro", of: "d'Europe", icon: "🇪🇺",
        championText: "L'Europe entière est à vos pieds : votre nation soulève le trophée continental !" },
  am: { name: "Coupe d'Amérique", short: "Copa América", of: "d'Amérique", icon: "🌎",
        championText: "Tout un continent s'embrase : la Copa América vous appartient !" },
  af: { name: "Coupe d'Afrique des Nations", short: "CAN", of: "d'Afrique", icon: "🌍",
        championText: "L'Afrique vibre d'un seul cœur : Champions d'Afrique, enfin !" },
  as: { name: "Coupe d'Asie des Nations", short: "Coupe d'Asie", of: "d'Asie", icon: "🌏",
        championText: "Le plus grand continent s'incline : votre nation règne sur l'Asie !" },
  oc: { name: "Coupe d'Océanie des Nations", short: "Coupe d'Océanie", of: "d'Océanie", icon: "🏝️",
        championText: "Tout le Pacifique vous acclame : votre nation domine l'Océanie !" },
};

// Ligue des Sélections : compétition de sélections EUROPÉENNE supplémentaire,
// disputée les années "libres" (ni Mondial ni Euro, cf. engine.isNationsLeagueYear),
// au format phase de ligue + Final Four. Trophée secondaire, moins prestigieux
// qu'un Euro. Réservée aux nationalités du continent "eu".
export const NATIONS_LEAGUE = {
  name: "Ligue des Sélections", short: "Ligue des Sél.", of: "de la Ligue des Sélections", icon: "🛡️",
  championText: "Au bout du Final Four, votre nation règne sur la Ligue des Sélections européenne !",
};

// --- Compétitions fictives ---------------------------------------------------
export const COMPETITIONS: Dict<Named> = {
  league: { name: "Championnat National", icon: "🎖️" },
  cup: { name: "Coupe Nationale", icon: "🏵️" },
  continental: { name: "Coupe des Champions", icon: "🥇" },
  worldCup: { name: "Coupe du Monde", icon: "🏆" },
  ballon: { name: "Ballon d'Or", icon: "⭐" },
  goldenBoot: { name: "Soulier d'Or européen", icon: "👟" },
  continental2: { name: "Trophée d'Europe", icon: "🥈" },
  continental3: { name: "Bouclier d'Europe", icon: "🥉" },
  supercup: { name: "Supercoupe d'Europe", icon: "🏅" },
};

// --- Récompenses individuelles de saison --------------------------------------
// Attribuées par engine.rollSeasonAwards selon la saison réalisée. Chaque
// distinction applique ses fx, nourrit le score Ballon d'Or (ballonPts)
// et s'accumule dans le palmarès individuel de fin de carrière.
export const AWARDS: Dict<Named> = {
  league_mvp: { name: "Joueur de la saison", icon: "🏅", fx: { rep: 6, mor: 4, money: 0.4 }, ballonPts: 1.6 },
  young_star: { name: "Espoir de l'année", icon: "🌟", fx: { rep: 5, mor: 4 }, ballonPts: 0.6 },
  top_assist: { name: "Meilleur passeur", icon: "🎯", fx: { rep: 3, mor: 2 }, ballonPts: 0.5 },
  team_of_season: { name: "Équipe type de la saison", icon: "📋", fx: { rep: 3 }, ballonPts: 0.6 },
  cl_mvp: { name: "MVP de la Coupe des Champions", icon: "🥇", fx: { rep: 8, mor: 4, money: 0.6 }, ballonPts: 1.8 },
  wc_golden_ball: { name: "Ballon d'Or du Mondial", icon: "🌍", fx: { rep: 9, mor: 5, money: 0.8 }, ballonPts: 2.5 },
  wc_top_scorer: { name: "Meilleur buteur du Mondial", icon: "⚽", fx: { rep: 6, mor: 4 }, ballonPts: 1.2 },
  cont_top_scorer: { name: "Meilleur buteur du championnat continental", icon: "⚽", fx: { rep: 5, mor: 3 }, ballonPts: 0.9 },
  natl_top_scorer: { name: "Meilleur buteur de la Ligue des Sélections", icon: "⚽", fx: { rep: 4, mor: 3 }, ballonPts: 0.6 },
  oly_top_scorer: { name: "Meilleur buteur du tournoi olympique", icon: "⚽", fx: { rep: 4, mor: 3 }, ballonPts: 0.5 },
  arab_top_scorer: { name: "Meilleur buteur de la Coupe arabe", icon: "⚽", fx: { rep: 4, mor: 3 }, ballonPts: 0.5 },
  games_top_scorer: { name: "Meilleur buteur des Jeux régionaux", icon: "⚽", fx: { rep: 3, mor: 3 }, ballonPts: 0.3 },
  top_scorer: { name: "Meilleur buteur du championnat", icon: "⚽", fx: { rep: 4, mor: 3, money: 0.3 }, ballonPts: 0.7 },
  golden_glove: { name: "Gant d'Or", icon: "🧤", fx: { rep: 5, mor: 3 }, ballonPts: 1.0 },
  revelation: { name: "Révélation de la saison", icon: "💫", fx: { rep: 6, mor: 5 }, ballonPts: 0.8 },
  club_legend: { name: "Légende du club", icon: "🏛️", fx: { rep: 6, mor: 8 }, ballonPts: 0.3 },
};

/* ============================================================
   COUPE DU MONDE — paliers du tournoi, du pire au meilleur.
   baseW : poids de base (modulé par la force de la nation et
   le niveau du joueur dans engine).
   ============================================================ */
export const WC_STAGES = [
  { id: "groups", label: "Élimination en poules", baseW: 30, text: "La désillusion : votre nation sort dès les poules, dans un silence de cathédrale." },
  { id: "r16", label: "Huitième de finale", baseW: 25, text: "L'aventure s'arrête en huitièmes, au terme d'un match à suspense." },
  { id: "quarter", label: "Quart de finale", baseW: 18, text: "Un quart de finale héroïque, perdu au bout de la nuit. La fierté domine." },
  { id: "semi", label: "Demi-finale", baseW: 12, text: "Si proche du rêve : la demi-finale se referme cruellement." },
  { id: "final", label: "Finaliste", baseW: 8, text: "Finale perdue. La deuxième plus belle équipe du monde, et le plus grand des vides." },
  { id: "champion", label: "VAINQUEUR", baseW: 7, text: "AU BOUT DE LA NUIT ! Votre nation est sur le toit du monde, et vous au cœur de la légende !" },
];

// Coupe du Monde à 48 équipes (format 2026) : un tour de plus (seizièmes de
// finale) — le finaliste dispute 8 matchs. RÉSERVÉ AU MONDIAL ; les coupes
// continentales (24 équipes) gardent WC_STAGES et leurs huitièmes.
export const WC_STAGES_48 = [
  { id: "groups", label: "Élimination en poules", baseW: 26, text: "La désillusion : votre nation sort dès les poules d'un Mondial élargi, dans un silence de cathédrale." },
  { id: "r32", label: "Seizième de finale", baseW: 27, text: "L'aventure s'arrête en seizièmes : premier tour à élimination directe, premier couperet." },
  { id: "r16", label: "Huitième de finale", baseW: 22, text: "L'aventure s'arrête en huitièmes, au terme d'un match à suspense." },
  { id: "quarter", label: "Quart de finale", baseW: 18, text: "Un quart de finale héroïque, perdu au bout de la nuit. La fierté domine." },
  { id: "semi", label: "Demi-finale", baseW: 12, text: "Si proche du rêve : la demi-finale se referme cruellement." },
  { id: "final", label: "Finaliste", baseW: 8, text: "Finale perdue. La deuxième plus belle équipe du monde, et le plus grand des vides." },
  { id: "champion", label: "VAINQUEUR", baseW: 7, text: "AU BOUT DE LA NUIT ! Votre nation est sur le toit du monde, et vous au cœur de la légende !" },
];

// ── Sélections de jeunes ──────────────────────────────────────────────────────
// Échelle U17 → U23 gravie selon l'âge, si le niveau suit (ovrNeed = barre OVR
// pour l'âge). Tant qu'on n'est pas en A, on décroche le palier de son âge.
// Les paliers avec `tournament` déclenchent un résultat résumé (une ligne).
// repNeed (optionnel) remplace la barre de réputation calculée. Le palier U17
// (u17: true) joue sa coupe continentale puis, s'il se qualifie, la Coupe du
// Monde U17 — cf. YOUTH_U17_CUPS et engine.youthSelections.
// N'AJOUTER qu'en respectant l'ordre d'âge : la boucle retient le premier
// palier accessible.
export const YOUTH_TIERS: YouthTier[] = [
  { id: "u16", label: "U16", aMin: 16, aMax: 16, ovrNeed: 56, repNeed: 12, tournament: null },
  { id: "u17", label: "U17", aMin: 16, aMax: 17, ovrNeed: 60, repNeed: 16, u17: true, tournament: null },
  { id: "u18", label: "U18", aMin: 17, aMax: 18, ovrNeed: 62, tournament: null },
  { id: "u19", label: "U19", aMin: 18, aMax: 19, ovrNeed: 66, tournament: "Euro U19" },
  { id: "u20", label: "U20", aMin: 19, aMax: 20, ovrNeed: 69, tournament: "Mondial U20" },
  { id: "u21", label: "U21", aMin: 20, aMax: 21, ovrNeed: 72, tournament: "Euro U21" },
  { id: "u23", label: "U23", aMin: 22, aMax: 23, ovrNeed: 74, tournament: null }, // vivier olympique
];

// Coupe continentale U17 des sélections, par continent du pays natal. Une
// demi-finale qualifie pour la Coupe du Monde U17.
export const YOUTH_U17_CUPS: Dict<string> = {
  eu: "Euro U17", af: "Coupe d'Afrique U17", as: "Coupe d'Asie U17",
  am: "Championnat d'Amérique U17", oc: "Championnat d'Océanie U17",
};

// Le nom de la Coupe du Monde U17 vit dans ENGINE_TEXT.youthU17World : une
// simple constante de texte ne pourrait pas être traduite (cf. i18n.ts).
// Résultat d'un tournoi de jeunes (léger, une ligne). games = matchs joués.
export const YOUTH_STAGES = [
  { id: "groups", label: "sorti dès les poules", baseW: 34, games: 3 },
  { id: "quarter", label: "quart de finaliste", baseW: 22, games: 4 },
  { id: "semi", label: "demi-finaliste", baseW: 14, games: 5 },
  { id: "final", label: "finaliste", baseW: 8, games: 6 },
  { id: "champion", label: "VAINQUEUR", baseW: 6, games: 6, champion: true },
];

// ── Jeux Olympiques ───────────────────────────────────────────────────────────
// Tournoi U23 (années %4==3), façon mini-Mondial : poule → quart → demie → finale.
// Médailles or (champion) / argent (finaliste) / bronze (demi-finaliste qui
// GAGNE le match pour la 3e place — cf. engine.playOlympics).
export const OLYMPIC_STAGES = [
  { id: "groups", label: "Élimination en poules", baseW: 30, games: 3, text: "Le rêve olympique s'arrête dès les poules." },
  { id: "quarter", label: "Quart de finale", baseW: 22, games: 4, text: "Quart de finale olympique : l'aventure s'arrête aux portes des médailles." },
  { id: "semi", label: "Demi-finale", baseW: 14, games: 5, text: "Battu en demie, mais le bronze est au bout." },
  { id: "final", label: "Finaliste", baseW: 8, games: 6, text: "Finale olympique disputée jusqu'au dernier souffle." },
  { id: "champion", label: "VAINQUEUR", baseW: 6, games: 6, text: "Sur le toit des Jeux : l'or olympique au cou !" },
];

// ── Coupe arabe ──────────────────────────────────────────────────────────────
// Tournoi de SÉLECTION (équipe A) des nations de la Ligue arabe, Asie et
// Afrique confondues. Disputé les années de Ligue des Sélections (cf.
// engine.isArabCupYear) : cette compétition est réservée à l'Europe, ces
// années-là étaient donc vides pour tous les autres continents.
export const ARAB_CUP = {
  name: "Coupe arabe", short: "Coupe arabe", icon: "🌙",
  championText: "Le monde arabe d'un océan à l'autre vous acclame : la Coupe arabe est à vous !",
};
// Les 22 membres de la Ligue arabe présents dans le jeu.
export const ARAB_NATION_IDS: string[] = [
  "dz", "bh", "km", "dj", "eg", "iq", "jo", "kw", "lb", "ly", "mr",
  "ma", "om", "ps", "qa", "sa", "so", "sd", "sy", "tn", "ae", "ye",
];
// Étapes, dans l'ORDRE croissant de valeur (le rang d'un parcours est son indice).
// Même format que le Mondial : poules → quarts → demies (avec match pour la
// 3ᵉ place) → finale. Le nombre de matchs est porté par l'étape.
export const ARAB_CUP_STAGES = [
  { id: "groups", label: "Éliminé en poules", baseW: 32, games: 3, text: "La Coupe arabe s'arrête dès les poules : trop court, trop tôt." },
  { id: "quarter", label: "Quart de finale", baseW: 22, games: 4, text: "Quart de finale de la Coupe arabe : l'aventure s'arrête aux portes du dernier carré." },
  { id: "semi", label: "Demi-finale", baseW: 14, games: 5, text: "Battu en demie de la Coupe arabe, avec un match pour la 3ᵉ place à disputer." },
  { id: "final", label: "Finaliste", baseW: 8, games: 6, text: "Finale de la Coupe arabe perdue de justesse : l'argent, et le goût des regrets." },
  { id: "champion", label: "VAINQUEUR", baseW: 6, games: 6, text: "Au bout de la Coupe arabe : le trophée est dans vos mains !" },
];

// ── Jeux régionaux ───────────────────────────────────────────────────────────
// L'équivalent continental des Jeux Olympiques, pour chaque continent de
// nationalité hors Europe : tournoi U23 (quelques surclassés), médailles
// or / argent / bronze. `yearMod` : l'année du cycle de quatre ans où il se
// joue (année % 4). Le tournoi est proposé à ceux que le GRAND tournoi de la
// même année n'a pas retenus — Mondial pour l'Asie, Jeux Olympiques ailleurs.
export const REGIONAL_GAMES: Dict<RegionalGames> = {
  as: { name: "Jeux asiatiques", short: "Jeux asiatiques", icon: "🏅", yearMod: 2 },
  af: { name: "Jeux africains", short: "Jeux africains", icon: "🏅", yearMod: 3 },
  am: { name: "Jeux panaméricains", short: "Jeux panaméricains", icon: "🏅", yearMod: 3 },
  oc: { name: "Jeux du Pacifique", short: "Jeux du Pacifique", icon: "🏅", yearMod: 3 },
};
export const GAMES_STAGES = [
  { id: "groups", label: "Élimination en poules", baseW: 30, games: 3, text: "Le tournoi s'arrête dès les poules : il faudra revenir plus fort." },
  { id: "quarter", label: "Quart de finale", baseW: 22, games: 4, text: "Quart de finale : l'aventure s'arrête aux portes des médailles." },
  { id: "semi", label: "Demi-finale", baseW: 14, games: 5, text: "Battu en demie, mais le bronze est au bout." },
  { id: "final", label: "Finaliste", baseW: 8, games: 6, text: "Finale disputée jusqu'au dernier souffle : l'argent, et le goût des regrets." },
  { id: "champion", label: "VAINQUEUR", baseW: 6, games: 6, text: "Sur le toit des Jeux : l'or au cou !" },
];

// Étapes de la Ligue des Sélections (phase de ligue → Final Four). Le nombre de
// matchs est porté par l'étape (pas de poules/8es comme au Mondial).
export const NL_STAGES = [
  { id: "group", label: "Phase de ligue", baseW: 34, games: 6, text: "Parcours honnête en phase de ligue, sans décrocher le Final Four." },
  { id: "final_four", label: "Dernier carré", baseW: 12, games: 7, text: "Qualifié pour le Final Four, sorti en demie au terme d'un beau parcours." },
  { id: "final", label: "Finaliste", baseW: 6, games: 8, text: "Finale perdue de justesse : l'argent, et le goût des regrets." },
  { id: "champion", label: "VAINQUEUR", baseW: 5, games: 8, text: "Sacré au bout du Final Four : la Ligue des Sélections est à vous !" },
];
