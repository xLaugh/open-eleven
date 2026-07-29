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
const CACHE = "open-eleven-v10.20";
const CORE = [
  "./", "./index.html",
  "./style.css?v=10.20", "./data.js?v=10.20", "./engine.js?v=10.20", "./game.js?v=10.20",
  "./src/vendor/supabase.js?v=10.20", "./src/supabase-config.js?v=10.20", "./src/badwords.js?v=10.20", "./account.js?v=10.20",
  "./site.webmanifest", "./favicon.svg", "./privacy.html",
  "./src/img/logo-11-mark.png",
  "./src/img/icon-512.png", "./src/img/icon-192.png", "./src/img/icon-maskable-512.png", "./src/img/og-cover.jpg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
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
