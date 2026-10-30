// Audit et maintenance des traductions (anglais, espagnol, arabe).
//
// Chaque langue a son pack dans public/ : il associe un texte FRANÇAIS exact du contenu à sa
// traduction. L'anglais garde son dictionnaire d'interface dans src/i18n.ts ; l'espagnol et
// l'arabe portent le leur dans leur pack (window.I18N_UI), pour ne pas alourdir le jeu des
// autres joueurs. Les clés de l'interface sont celles du dictionnaire anglais.
//
//   node packages/web/scripts/i18n.js                         audit de toutes les langues
//   node packages/web/scripts/i18n.js --lang es               audit d'une langue
//   node packages/web/scripts/i18n.js --lang es --missing     textes à traduire, en JSON à remplir
//   node packages/web/scripts/i18n.js --lang es --add f.json  fusionne { "français": "traduction" }
//   node packages/web/scripts/i18n.js --lang es --prune       retire les entrées qui ne servent plus
//
// (sans --lang : l'anglais, comme avant.) Le même parcours que dans le navigateur
// (content/translatable.ts) décide de ce qui est traduisible : l'audit et le jeu ne divergent pas.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import loader from "../../engine/test/load-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const DICT = join(here, "..", "src", "i18n.ts");
export const LANGS = ["en", "es", "ar"];
export const PACK_FILES = { en: "i18n-data.js", es: "i18n-es.js", ar: "i18n-ar.js" };
const packPath = (lang) => join(here, "..", "public", PACK_FILES[lang]);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** Dictionnaire anglais de l'interface (src/i18n.ts) : ses clés sont les textes de l'interface. */
export function uiSource() {
  const src = readFileSync(DICT, "utf8").replace(/\r\n/g, "\n");
  const start = src.indexOf("const EN = {");
  const end = src.indexOf("\n  };\n", start);
  if (start < 0 || end < 0) throw new Error("dictionnaire de l'interface illisible (const EN = { … })");
  return { source: src, entries: new Function("return " + src.slice(start + "const EN = ".length, end + 4).trim().replace(/;$/, ""))() };
}

/** Lit le pack d'une langue : ses entrées de contenu, son interface (espagnol, arabe) et son en-tête. */
export function readPack(lang = "en") {
  const source = readFileSync(packPath(lang), "utf8").replace(/\r\n/g, "\n");
  const marker = "window.I18N_DATA = { " + lang + ": {";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("pack illisible : « " + marker + " » introuvable");
  const sandbox = {};
  new Function("window", source)(sandbox);
  return { header: source.slice(0, start), entries: sandbox.I18N_DATA[lang], ui: sandbox.I18N_UI ? sandbox.I18N_UI[lang] : null, source };
}

/** Réécrit le pack : l'en-tête d'origine, puis une entrée par ligne (l'interface indentée d'un cran de plus). */
export function writePack(lang, header, entries, ui) {
  const lines = (obj, indent) => Object.entries(obj).map(([k, v]) => indent + JSON.stringify(k) + ": " + JSON.stringify(v)).join(",\n");
  let out = header + "window.I18N_DATA = { " + lang + ": {\n" + lines(entries, " ") + "\n} };\n";
  if (ui) out += "window.I18N_UI = { " + lang + ": {\n" + lines(ui, "  ") + "\n} };\n";
  writeFileSync(packPath(lang), out);
}

/** Clés écrites deux fois dans un même fichier (la seconde écraserait la première en silence). */
export function duplicateKeys(source, indent) {
  const re = new RegExp("^" + indent + '("(?:[^"\\\\]|\\\\.)*"):\\s', "gm");
  const seen = new Map();
  for (const m of source.replace(/\r\n/g, "\n").matchAll(re)) {
    const key = JSON.parse(m[1]);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([k]) => k);
}

const marks = (s) => (String(s).match(/\{[^{}]+\}/g) || []).sort().join(" ");
const tags = (s) => (String(s).match(/<\/?[a-z][^>]*>/gi) || []).sort().join(" ");

export function audit(lang = "en") {
  const content = loader.loadContent();
  const texts = content.collectTranslatableTexts();
  const { header, entries, ui, source } = readPack(lang);
  const dict = uiSource();
  // Un manque ne compte que pour un texte de vrais mots (« D1 » ou « 🥇 » restent tels quels).
  const missing = [...texts].filter((t) => content.hasWords(t) && !has(entries, t));
  const unused = Object.keys(entries).filter((k) => !texts.has(k));
  const packDuplicates = duplicateKeys(source, " ");
  const dictDuplicates = lang === "en" ? duplicateKeys(dict.source, "    ") : duplicateKeys(source, "  ");
  const empty = Object.entries({ ...entries, ...(ui || {}) }).filter(([, v]) => typeof v !== "string" || !v.trim()).map(([k]) => k);
  let uiMissing = [], uiUnused = [], mismatch = [];
  if (lang !== "en") {
    uiMissing = Object.keys(dict.entries).filter((k) => !ui || !has(ui, k));
    uiUnused = Object.keys(ui || {}).filter((k) => !has(dict.entries, k));
    // Mêmes marqueurs {…} et mêmes balises que la version anglaise, qui fait référence.
    const en = lang === "en" ? null : readPack("en").entries;
    const check = (map, ref) => {
      for (const [k, v] of Object.entries(map || {})) {
        if (!has(ref, k) || typeof v !== "string") continue;
        if (marks(v) !== marks(ref[k]) || tags(v) !== tags(ref[k])) mismatch.push(k);
      }
    };
    check(entries, en);
    check(ui, dict.entries);
  }
  return { lang, texts, header, entries, ui, missing, unused, packDuplicates, dictDuplicates, empty, uiMissing, uiUnused, mismatch };
}

function report(a) {
  const show = (title, list) => { if (list.length) { console.log("\n" + title); list.slice(0, 25).forEach((t) => console.log("  - " + t.slice(0, 110))); if (list.length > 25) console.log("  … et " + (list.length - 25) + " autres"); } };
  console.log(`\n[${a.lang}] ${a.texts.size} textes traduisibles · ${Object.keys(a.entries).length} entrées dans le pack` + (a.ui ? ` · ${Object.keys(a.ui).length} textes d'interface` : ""));
  show("MANQUENT au pack (le joueur les verrait en français) :", a.missing);
  show("MANQUENT à l'interface :", a.uiMissing);
  show("Entrées sans traduction :", a.empty);
  show("Marqueurs {…} ou balises différents de l'anglais :", a.mismatch);
  show("Clés écrites deux fois dans le pack :", a.packDuplicates);
  show("Clés écrites deux fois dans le dictionnaire de l'interface :", a.dictDuplicates);
  const orphans = a.unused.length + a.uiUnused.length;
  if (orphans) console.log(`\n${orphans} entrée(s) ne correspondent plus à aucun texte (retirables avec --prune).`);
  const failed = a.missing.length || a.uiMissing.length || a.empty.length || a.mismatch.length || a.packDuplicates.length || a.dictDuplicates.length;
  console.log(failed ? "Échec." : "Tout est traduit.");
  return failed ? 1 : 0;
}

function main() {
  const args = process.argv.slice(2);
  const langArg = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null;
  if (langArg && !LANGS.includes(langArg)) throw new Error("langue inconnue : " + langArg + " (" + LANGS.join(", ") + ")");
  const lang = langArg || "en";
  const editing = args.includes("--missing") || args.includes("--add") || args.includes("--prune");
  if (!editing) return LANGS.filter((l) => !langArg || l === langArg).map((l) => report(audit(l))).some(Boolean) ? 1 : 0;

  const a = audit(lang);
  if (args.includes("--missing")) {
    console.log(JSON.stringify(Object.fromEntries([...a.missing, ...a.uiMissing].map((t) => [t, ""])), null, 1));
    return 0;
  }
  if (args.includes("--add")) {
    const file = args[args.indexOf("--add") + 1];
    const add = JSON.parse(readFileSync(file, "utf8"));
    const entries = { ...a.entries };
    const ui = a.ui ? { ...a.ui } : lang === "en" ? null : {};
    const uiKeys = uiSource().entries;
    let added = 0;
    for (const [fr, tr] of Object.entries(add)) {
      if (typeof tr !== "string" || !tr.trim()) throw new Error("traduction vide pour : " + fr.slice(0, 70));
      // Texte du contenu → pack ; texte de l'interface → interface (espagnol, arabe : l'anglais
      // garde la sienne dans src/i18n.ts, à éditer à la main).
      const target = a.texts.has(fr) ? entries : ui && has(uiKeys, fr) ? ui : null;
      if (!target) throw new Error("texte inconnu du contenu" + (lang === "en" ? "" : " et de l'interface") + " : " + fr.slice(0, 70));
      if (has(target, fr) && target[fr] !== tr) throw new Error("déjà traduit autrement : " + fr.slice(0, 70));
      if (!has(target, fr)) { target[fr] = tr; added++; }
    }
    writePack(lang, a.header, entries, ui);
    console.log(added + " entrée(s) ajoutée(s).");
    return 0;
  }
  // --prune
  const entries = Object.fromEntries(Object.entries(a.entries).filter(([k]) => a.texts.has(k)));
  const keep = uiSource().entries;
  const ui = a.ui ? Object.fromEntries(Object.entries(a.ui).filter(([k]) => has(keep, k))) : null;
  writePack(lang, a.header, entries, ui);
  console.log(a.unused.length + a.uiUnused.length + " entrée(s) retirée(s).");
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith("i18n.js")) process.exit(main());
