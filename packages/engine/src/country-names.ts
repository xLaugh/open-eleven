// Noms de pays avec leur article (« la France », « du Brésil »…).

import type { Entity } from "./types";
import { frElide, deOf } from "./utils";
import { COUNTRIES, ENGINE_TEXT } from "@open-eleven/content";

// --- Noms de pays avec leur article --------------------------------------
// « France ne vous a pas convoqué » → « la France… », « de Brésil » → « du
// Brésil ». L'article se déduit du champ `of` du pays (« de France », « du
// Brésil », « des Pays-Bas », « d'Allemagne »), sauf pour les noms qui n'en
// prennent pas (Cuba, Malte, Haïti…). Vaut pour une nationalité comme pour
// un pays : les deux portent le même nom.
// Désactivé hors du français (ENGINE_TEXT.grammar est traduit par le pack
// anglais) : on renvoie alors le nom nu, comme avant.
export const NO_ARTICLE = new Set(["Sainte-Lucie", "Saint-Vincent-et-les-Grenadines", "Saint-Kitts-et-Nevis", "Montserrat", "Porto Rico", "Taïwan", "Guam", "Macao", "Hong Kong", "São Tomé-et-Príncipe", "Tuvalu", "Kiribati", "Tahiti", "Singapour", "Bahreïn", "Maurice", "Djibouti", "Trinité-et-Tobago", "Cuba", "Curaçao", "Malte", "Saint-Marin", "Gibraltar", "Chypre", "Madagascar", "Saint-Martin", "Sint Maarten", "Bonaire", "Zanzibar", "La Réunion", "Niue", "Aruba", "Anguilla", "Oman", "Antigua-et-Barbuda", "Haïti", "Andorre"]);
export function natForms(ent: Entity | null | undefined) {
  const name: string = ent && ent.name ? ent.name : "";
  // Hors du français, ni article ni élision : « de {nat} » reste « de Marruecos ».
  const fr = ENGINE_TEXT.grammar === "articles-fr";
  const plain = { on: false, plural: false, name, the: name, The: name, of: fr ? deOf(name) : "de " + name, ofPrefix: fr && frElide(name) ? "d'" : "de ", to: "à " + name };
  if (!ent || !name || ENGINE_TEXT.grammar !== "articles-fr") return plain;
  const c = COUNTRIES.find((x) => x.id === (ent.homeCountryId || ent.id));
  const of = c && c.of;
  const m = of && of.match(/^(du |des |d'|de )/);
  if (!m) return plain;
  let the, to;
  if (m[1] === "du ") { the = "le " + name; to = "au " + name; }
  else if (m[1] === "des ") { the = "les " + name; to = "aux " + name; }
  else {
    the = NO_ARTICLE.has(name) ? name : (m[1] === "d'" ? "l'" + name : "la " + name);
    to = "à " + the;
  }
  // « des Pays-Bas », « des États-Unis »… : un nom pluriel, dont le verbe s'accorde.
  return { on: true, plural: m[1] === "des ", name, the, The: the.charAt(0).toUpperCase() + the.slice(1), of, ofPrefix: m[1], to };
}
// Remplace {key} dans un texte par le nom du pays, article compris :
// « de {key} » → « du Brésil », « à {key} » → « au Brésil », et une
// majuscule en début de phrase (« La France vous suit… »).
//
// Accord du verbe : « {key?suit|suivent} » donne la forme du singulier ou du pluriel
// selon que le pays est pluriel (« les Pays-Bas ne vous {nat?a|ont} pas convoqué »).
// Résolu EN PREMIER, et hors du français comme dedans : sans article (anglais), un
// pays n'est jamais traité comme pluriel.
export function subNat(text: string, key: string, ent: Entity | null | undefined): string {
  const f = natForms(ent);
  text = text.replace(new RegExp("\\{" + key + "\\?([^|{}]*)\\|([^|{}]*)\\}", "g"), (all, singular, plural) => (f.plural ? plural : singular));
  const k = "\\{" + key + "\\}";
  if (!f.on) return text.replace(new RegExp("\\bde " + k, "g"), f.of).replace(new RegExp(k, "g"), f.name);
  return text
    .replace(new RegExp("\\bde " + k, "g"), f.of)
    .replace(new RegExp("(^|\\s)à " + k, "g"), (all, p) => p + f.to)
    .replace(new RegExp("(^|[.!?…]\\s+|«\\s*)" + k, "g"), (all, p) => p + f.The)
    .replace(new RegExp(k, "g"), f.the);
}
