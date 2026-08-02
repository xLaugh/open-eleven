/* ============================================================
   Service worker — Open Eleven (PWA : installable + hors-ligne).
   Stratégie SANS piège de version périmée :
   • HTML (navigation) → network-first : toujours la dernière version
     en ligne, repli sur le cache uniquement hors-ligne.
   • Autres assets (JS/CSS/images) → cache-first : sûr car les JS/CSS
     sont versionnés par ?v= dans index.html (une nouvelle version =
     nouvelle URL = nouveau téléchargement).
   ⚠️ À CHAQUE DÉPLOIEMENT : bumper CACHE (ci-dessous) en même temps
   que le ?v= d'index.html — l'ancien cache est alors purgé.
   ============================================================ */
const CACHE = "open-eleven-v10.61";
const CORE = [
  "./", "./index.html",
  "./style.css?v=10.61", "./data-clubs.js?v=10.61", "./data-moments.js?v=10.61", "./data-events.js?v=10.61", "./data.js?v=10.61", "./engine.js?v=10.61", "./game.js?v=10.61", "./game-card.js?v=10.61", "./i18n-boot.js?v=10.61", "./i18n-data.js?v=10.61", "./i18n.js?v=10.61", "./sw-register.js?v=10.61",
  "./src/vendor/supabase.js?v=10.61", "./src/supabase-config.js?v=10.61", "./src/badwords.js?v=10.61", "./account.js?v=10.61",
  "./site.webmanifest", "./favicon.svg", "./privacy.html",
  "./src/img/logo-11-mark.png",
  "./src/img/icon-512.png", "./src/img/icon-192.png", "./src/img/icon-maskable-512.png",
];

// Précache TOLÉRANT : addAll() rejette en bloc dès qu'UNE seule URL répond autre
// chose que 2xx, ce qui fait échouer l'install et jeter le worker — donc plus de
// hors-ligne, plus d'installation PWA, et plus de purge des anciens caches. C'est
// exactement ce qui s'est produit avec une entrée de CORE pointant un fichier
// absent. On met donc chaque asset en cache indépendamment : un asset manquant
// dégrade le hors-ligne pour LUI SEUL au lieu de tout casser silencieusement.
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // laisser passer GA & tiers

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match("./index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      const cp = r.clone();
      caches.open(CACHE).then((c) => c.put(req, cp));
      return r;
    }))
  );
});
