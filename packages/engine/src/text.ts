// Rendu des textes : substitution des marqueurs {club}, {nat}…

import { deOf } from "./utils";
import { subNat } from "./country-names";
import { dualNatOf, altNatOf } from "./nationality";
import { countryOf } from "./clubs";
import type { CareerState, TextVars } from "./types";
import { CONTINENTAL_CUPS, ENGINE_TEXT } from "@open-eleven/content";

// --- Rendu des textes (templating) --------------------------------------
export function renderText(s: CareerState, text: string, extra?: TextVars): string {
  if (!text) return "";
  const country = countryOf(s.club.countryId);
  const contCup = (CONTINENTAL_CUPS[country ? country.continent : ""] || CONTINENTAL_CUPS.eu).name;
  // Noms de pays, article compris (cf. subNat) : {nat} la sélection du
  // joueur, {dualNat} la seconde sélection possible (vide si aucune — les
  // événements qui l'emploient sont filtrés par cond.dual), {altNat} l'autre
  // nation encore accessible après le premier choix, {country} le pays du club.
  // Élision française (« de {club} » → « d'Osaka »), seulement en français : l'espagnol
  // écrit « de Osaka » (ENGINE_TEXT.grammar est traduit par chaque pack de langue).
  const of = ENGINE_TEXT.grammar === "articles-fr" ? deOf : (v: unknown) => "de " + String(v ?? "");
  let out = subNat(subNat(subNat(subNat(text, "nat", s.nationality), "dualNat", dualNatOf(s)), "altNat", altNatOf(s)), "country", country)
    .replace(/\bde \{club\}/g, of(s.club.name))
    .replace(/\bde \{name\}/g, of(s.name))
    .replace(/\{club\}/g, s.club.name)
    .replace(/\{coach\}/g, s.coach)
    .replace(/\{contCup\}/g, contCup) // coupe continentale du club (Europe/Amériques/Afrique…)
    .replace(/\{name\}/g, s.name)
    .replace(/\{year\}/g, String(s.year))
    .replace(/\{age\}/g, String(s.age));
  if (extra && extra.rival) out = out.replace(/\{rival\}/g, extra.rival);
  else out = out.replace(/\{rival\}/g, ENGINE_TEXT.rivalFallback);
  // Valeurs ponctuelles fournies par l'appelant ({fee}, {rank}, {div}…).
  // Deux formes acceptées : « de {x} » pour l'élision française, et « {x} ».
  if (extra) {
    for (const k in extra) {
      if (k === "rival") continue;
      const v = extra[k] == null ? "" : String(extra[k]);
      out = out.replace(new RegExp("\\bde \\{" + k + "\\}", "g"), of(v))
               .replace(new RegExp("\\{" + k + "\\}", "g"), v);
    }
  }
  return out;
}

// Gabarit de texte joueur : il vit dans content (ENGINE_TEXT), pas ici —
// engine simule, content fournit les mots. Repli silencieux sur une chaîne
// vide si la clé manque, pour ne jamais afficher d'identifiant technique.
export function tx(s: CareerState, key: string, extra?: TextVars): string {
  const tpl = ENGINE_TEXT[key];
  return tpl ? renderText(s, tpl, extra) : "";
}
