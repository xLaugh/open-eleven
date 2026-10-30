/* ============================================================
   Chargement conditionnel du pack de traduction.

   Chaque pack de langue (i18n-data.js pour l'anglais, i18n-es.js, i18n-ar.js) pèse
   plusieurs centaines de ko : inutile de l'imposer aux joueurs francophones, qui sont
   l'immense majorité. On n'insère donc que celui de la langue retenue.

   document.write est ICI VOLONTAIRE : c'est le seul moyen simple d'insérer un
   script qui soit garanti exécuté AVANT i18n.js, lequel traduit les données
   dès son exécution. Un script inséré autrement (appendChild, async) arriverait
   trop tard, et les premiers écrans s'afficheraient en français.

   Le sens de lecture (l'arabe s'écrit de droite à gauche) est posé ici aussi, avant
   le premier affichage : sans cela, la page se dessinerait d'abord à l'envers.

   Ce fichier existait auparavant en <script> inline dans index.html ; il en a
   été extrait pour qu'une Content-Security-Policy stricte (script-src 'self')
   soit possible sans 'unsafe-inline'.
   ============================================================ */
(function () {
  "use strict";
  var PACKS = { en: "i18n-data.js", es: "i18n-es.js", ar: "i18n-ar.js" };
  try {
    var lang = localStorage.getItem("openEleven_lang");
    if (!PACKS[lang]) return;
    document.documentElement.setAttribute("lang", lang);
    if (lang === "ar") document.documentElement.setAttribute("dir", "rtl");
    // On reprend le ?v= de CE script : le pack reste ainsi aligné sur la
    // version du cache sans qu'il y ait un numéro de plus à penser à bumper.
    var me = document.currentScript && document.currentScript.src;
    var q = me && me.indexOf("?v=") !== -1 ? me.slice(me.indexOf("?v=")) : "";
    document.write('<script src="' + PACKS[lang] + q + '"><\/script>');
  } catch (e) {
    /* stockage indisponible (navigation privée stricte) : on reste en français */
  }
})();
