// Ce qui, dans le contenu, se traduit — et comment on le parcourt.
// Module de logique minimale, partagé par deux appelants qui doivent s'accorder :
//   • l'interface (i18n.ts), qui traduit les textes EN PLACE au chargement quand
//     l'anglais est retenu ;
//   • l'audit (packages/web/scripts/i18n.js, lancé par « npm test »), qui vérifie qu'aucun
//     texte du contenu n'a été oublié par le pack de traduction.
// Le moteur injecte {club}, {name}, {rival}… dans ces textes avant l'affichage : une
// traduction au niveau de la page ne retrouverait jamais la phrase d'origine, d'où une
// traduction à la source, dans les données elles-mêmes.
//
// CLUBS, COACH_NAMES, NAME_POOLS et SPONSOR_BRANDS n'y figurent pas, volontairement :
// ce sont des noms propres.
import { ARAB_CUP, ARAB_CUP_STAGES, AWARDS, COMPETITIONS, CONTINENTAL_BALLON, CONTINENTAL_CUPS, CONTINENTAL_CUPS2, CONTINENTAL_CUPS3, CONTINENTAL_SUPERCUP, GAMES_STAGES, NATIONAL_CUPS, NATIONS_LEAGUE, NL_STAGES, OLYMPIC_STAGES, REGIONAL_GAMES, WC_STAGES, WC_STAGES_48, YOUTH_STAGES, YOUTH_TIERS, YOUTH_U17_CUPS } from "./competitions";
import { LEVELS } from "./clubs";
import { BALANCE } from "./balance";
import { CHANGELOG } from "./changelog";
import { COUNTRIES } from "./countries";
import { EVENTS, MICRO_EVENTS } from "./events";
import { KEY_MOMENTS } from "./moments";
import { NATIONALITIES } from "./nations";
import { ARCHETYPES, ENTOURAGES, LIFESTYLES, ORIGINS, POSITIONS, ROLES, TRAITS, TRAJECTORIES } from "./profile";
import { BADGES, BADGE_CATS, DAILY_QUESTS, LEGEND_QUESTS, PERKS, STREAK_MILESTONES, WEEKLY_CHALLENGES } from "./progression";
import { SPONSOR_TIERS } from "./sponsors";
import { STORIES } from "./stories";
import { BRAND } from "./brand";
import { ENGINE_TEXT, HEADLINES, RIVAL_NEWS_AHEAD, RIVAL_NEWS_BAD, RIVAL_NEWS_BEHIND, RIVAL_NEWS_GOOD, UNTAKEN_PATH_TEMPLATES, WORLD_NEWS } from "./texts";

/** Les propriétés d'une structure dont la valeur est un texte affiché au joueur. */
export const TEXT_KEYS = new Set([
  "text", "title", "desc", "label", "hint", "winText", "failText", "winLabel", "failLabel",
  "championText", "effect", "blurb", "reveal", "sub", "name", "short", "of", "labelBase",
  // Mode Histoire (surnom, époque, accroche de la légende) et signature du jeu.
  "alias", "era", "teaser", "tagline",
]);

/** Structures imbriquées : seules les propriétés de TEXT_KEYS (et les tables « labels ») se traduisent. */
export const TRANSLATABLE_STRUCTURES: Record<string, unknown> = {
  EVENTS, MICRO_EVENTS, KEY_MOMENTS, STORIES, BADGES, BADGE_CATS, DAILY_QUESTS, WEEKLY_CHALLENGES, LEGEND_QUESTS,
  TRAITS, ARCHETYPES, POSITIONS, ORIGINS, LIFESTYLES, ENTOURAGES, TRAJECTORIES, AWARDS, COMPETITIONS,
  // Les coupes secondaires, la supercoupe et le Ballon d'Or continental s'affichent au palmarès :
  // elles ne figuraient pas dans cette liste, et restaient donc en français en anglais.
  CONTINENTAL_CUPS, CONTINENTAL_CUPS2, CONTINENTAL_CUPS3, CONTINENTAL_SUPERCUP, CONTINENTAL_BALLON,
  NATIONAL_CUPS, NATIONS_LEAGUE, ROLES, LEVELS, PERKS, HEADLINES, WORLD_NEWS,
  RIVAL_NEWS_GOOD, RIVAL_NEWS_BAD, RIVAL_NEWS_AHEAD, RIVAL_NEWS_BEHIND, UNTAKEN_PATH_TEMPLATES,
  WC_STAGES, WC_STAGES_48, YOUTH_STAGES, YOUTH_TIERS, OLYMPIC_STAGES, NL_STAGES, ARAB_CUP, ARAB_CUP_STAGES, GAMES_STAGES,
  REGIONAL_GAMES, COUNTRIES, NATIONALITIES, STREAK_MILESTONES,
  // Paliers de sponsoring : title/text du palier, labelBase/desc des offres.
  SPONSOR_TIERS,
  // BALANCE est surtout numérique, mais porte les libellés de blessure
  // (BALANCE.injury.labels), affichés dans l'historique de carrière.
  BALANCE,
  // Notes de mise à jour : titre et lignes de chaque version.
  CHANGELOG,
  // Signature du jeu (BRAND.tagline seulement : le nom, l'adresse et le mot-dièse ne se traduisent pas).
  BRAND,
};

/** Tables plates « identifiant → texte » : TOUTES leurs valeurs se traduisent. */
export const TRANSLATABLE_FLATS: Record<string, Record<string, string>> = { ENGINE_TEXT, YOUTH_U17_CUPS };

export type TextVisitor = (holder: Record<string, any>, key: string, text: string) => void;

/**
 * Un texte contient-il de vrais mots (et non un emoji, un symbole ou un sigle comme « D1 ») ?
 * Il décide si l'ABSENCE d'une traduction est un oubli ; il ne décide pas de traduire ou non :
 * toute chaîne présente dans le pack est traduite, mots ou pas.
 */
export const hasWords = (text: string): boolean => /[A-Za-zÀ-ÿ]{3,}/.test(text);

/**
 * Appelle `visit(porteur, clé, texte)` pour chaque texte traduisible de la structure.
 * `seen` est partagé entre les appels : une structure référencée deux fois n'est vue qu'une.
 */
export function visitTexts(node: unknown, visit: TextVisitor, seen: WeakSet<object> = new WeakSet()): void {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) { for (const item of node) visitTexts(item, visit, seen); return; }
  const holder = node as Record<string, any>;
  for (const key of Object.keys(holder)) {
    const value = holder[key];
    if (typeof value === "string") {
      if (TEXT_KEYS.has(key) && value.length >= 2) visit(holder, key, value);
    } else if (value && typeof value === "object") {
      // Une table nommée « labels » est une table de LIBELLÉS : ses clés sont des
      // identifiants techniques (knock, severe…) et toutes ses valeurs sont affichées.
      if (key === "labels" && !Array.isArray(value)) visitFlat(value, visit);
      else visitTexts(value, visit, seen);
    }
  }
}

/** Idem pour une table plate dont toutes les valeurs sont des textes. */
export function visitFlat(table: Record<string, any>, visit: TextVisitor): void {
  for (const key of Object.keys(table)) if (typeof table[key] === "string" && table[key].length >= 2) visit(table, key, table[key]);
}

/** Tous les textes traduisibles du contenu, sans doublon. */
export function collectTranslatableTexts(): Set<string> {
  const texts = new Set<string>();
  const add: TextVisitor = (_holder, _key, text) => { texts.add(text.trim()); };
  const seen = new WeakSet<object>();
  for (const structure of Object.values(TRANSLATABLE_STRUCTURES)) visitTexts(structure, add, seen);
  for (const flat of Object.values(TRANSLATABLE_FLATS)) visitFlat(flat, add);
  return texts;
}
