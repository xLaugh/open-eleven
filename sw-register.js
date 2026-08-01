/* ============================================================
   Enregistrement du service worker (PWA : installable + hors-ligne).

   Extrait d'un <script> inline d'index.html pour permettre une
   Content-Security-Policy stricte (script-src 'self', sans 'unsafe-inline').

   L'échec est volontairement silencieux : un service worker indisponible
   (navigation privée, contexte non sécurisé, refus du navigateur) ne doit
   jamais empêcher de jouer — le jeu fonctionne entièrement sans lui.
   ============================================================ */
(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () { /* hors-ligne indisponible, sans conséquence */ });
  });
})();
