/* ============================================================
   Langue de la page et chargement de son pack de traduction.

   Une adresse par langue : / (français), /en/, /es/, /ar/ (cf. scripts/seo.js, qui génère
   ces pages à l'assemblage). C'est l'adresse qui fixe la langue — les moteurs de recherche
   voient ainsi chaque version telle qu'elle est. Un joueur qui a choisi une langue et revient
   sur / y est renvoyé (les moteurs, eux, n'ont aucune préférence enregistrée). En
   développement, les pages /xx/ n'existent pas (pas de repère oe-lang-pages) : la langue
   vient alors seulement de la préférence enregistrée, comme avant.

   Chaque pack de langue (i18n-data.js pour l'anglais, i18n-es.js, i18n-ar.js) pèse
   plusieurs centaines de ko : on n'insère que celui de la langue de la page.

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
  var KEY = "openEleven_lang";
  var PACKS = { en: "i18n-data.js", es: "i18n-es.js", ar: "i18n-ar.js" };
  try {
    var langPages = !!document.querySelector('meta[name="oe-lang-pages"]');
    var m = location.pathname.match(/^\/(en|es|ar)\//);
    var lang = localStorage.getItem(KEY);
    if (langPages) {
      if (m) {
        // L'adresse fait foi, et devient la préférence (i18n.ts la lit ensuite).
        if (lang !== m[1]) localStorage.setItem(KEY, m[1]);
        lang = m[1];
      } else if (PACKS[lang]) {
        location.replace("/" + lang + "/" + location.search + location.hash);
        return;
      } else {
        lang = "fr";
      }
    }
    if (!PACKS[lang]) return;
    document.documentElement.setAttribute("lang", lang);
    if (lang === "ar") document.documentElement.setAttribute("dir", "rtl");
    // On reprend le ?v= de CE script : le pack reste ainsi aligné sur la
    // version du cache sans qu'il y ait un numéro de plus à penser à bumper.
    var me = document.currentScript && document.currentScript.src;
    var q = me && me.indexOf("?v=") !== -1 ? me.slice(me.indexOf("?v=")) : "";
    document.write('<script src="/' + PACKS[lang] + q + '"><\/script>');
  } catch (e) {
    /* stockage indisponible (navigation privée stricte) : on reste en français */
  }
})();
