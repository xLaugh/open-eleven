// Les traductions suivent le contenu : un texte ajouté ou modifié sans être retraduit fait
// échouer ces tests, au lieu de s'afficher en français pour le joueur.
// (Détail et remèdes : node packages/web/scripts/i18n.js --lang <en|es|ar>)
import assert from "node:assert/strict";
import test from "node:test";
import { LANGS, audit } from "../scripts/i18n.js";

for (const lang of LANGS) {
  const a = audit(lang);
  const hint = "« node packages/web/scripts/i18n.js --lang " + lang + " --missing »";

  test(`[${lang}] tout texte traduisible du contenu a sa traduction`, () => {
    assert.deepEqual(a.missing.slice(0, 10), [], a.missing.length + " texte(s) sans traduction — voir " + hint);
  });

  test(`[${lang}] aucune entrée n'est vide`, () => {
    assert.deepEqual(a.empty, []);
  });

  test(`[${lang}] aucune clé n'est écrite deux fois (la seconde écraserait la première en silence)`, () => {
    assert.deepEqual(a.packDuplicates, [], "pack de traduction du contenu");
    assert.deepEqual(a.dictDuplicates, [], "dictionnaire de l'interface");
  });

  test(`[${lang}] le pack ne garde pas d'entrées orphelines`, () => {
    // Quand on réécrit un texte français, l'ancienne entrée ne sert plus à rien : --prune la retire.
    assert.deepEqual([...a.unused, ...a.uiUnused].slice(0, 10), [], a.unused.length + a.uiUnused.length + " entrée(s) orpheline(s)");
  });

  test(`[${lang}] les textes d'accord de pays (marques {nat?a|ont}) sont traduits sans marque`, () => {
    // Hors du français, le pays n'a pas d'accord grammatical : la traduction ne doit contenir aucune marque.
    for (const [fr, tr] of Object.entries(a.entries)) {
      if (/\{\w+\?[^{}]*\}/.test(fr)) assert.ok(!/\{\w+\?[^{}]*\}/.test(tr), "marque d'accord dans la traduction de : " + fr.slice(0, 60));
    }
  });

  if (lang !== "en") {
    test(`[${lang}] l'interface est traduite entièrement`, () => {
      assert.deepEqual(a.uiMissing.slice(0, 10), [], a.uiMissing.length + " texte(s) d'interface sans traduction — voir " + hint);
    });

    test(`[${lang}] mêmes marqueurs {…} et balises que la version anglaise`, () => {
      assert.deepEqual(a.mismatch.slice(0, 10), [], a.mismatch.length + " traduction(s) aux marqueurs différents");
    });
  }
}
