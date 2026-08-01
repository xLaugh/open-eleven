/* ============================================================
   Chargement conditionnel du pack de traduction.

   Le pack de contenu (i18n-data.js) pèse ~370 ko : inutile de l'imposer aux
   joueurs francophones, qui sont l'immense majorité. On ne l'insère donc que
   si l'anglais a été retenu.

   document.write est ICI VOLONTAIRE : c'est le seul moyen simple d'insérer un
   script qui soit garanti exécuté AVANT i18n.js, lequel traduit les données
   dès son exécution. Un script inséré autrement (appendChild, async) arriverait
   trop tard, et les premiers écrans s'afficheraient en français.

   Ce fichier existait auparavant en <script> inline dans index.html ; il en a
   été extrait pour qu'une Content-Security-Policy stricte (script-src 'self')
   soit possible sans 'unsafe-inline'.
   ============================================================ */
(function () {
  "use strict";
  try {
    if (localStorage.getItem("openEleven_lang") !== "en") return;
    // On reprend le ?v= de CE script : le pack reste ainsi aligné sur la
    // version du cache sans qu'il y ait un numéro de plus à penser à bumper.
    var me = document.currentScript && document.currentScript.src;
    var q = me && me.indexOf("?v=") !== -1 ? me.slice(me.indexOf("?v=")) : "";
    document.write('<script src="i18n-data.js' + q + '"><\/script>');
  } catch (e) {
    /* stockage indisponible (navigation privée stricte) : on reste en français */
  }
})();
