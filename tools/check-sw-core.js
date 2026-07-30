/* ============================================================
   Vérifie que CHAQUE entrée du tableau CORE de sw.js existe sur le disque.
   Lancer :  node tools/check-sw-core.js   (code de sortie 1 si un fichier manque)

   POURQUOI CE TEST EXISTE : `caches.addAll()` rejette EN BLOC dès qu'une seule
   URL ne répond pas 2xx. Une entrée pointant un fichier absent fait donc échouer
   l'install du service worker, qui est alors jeté — plus de mode hors-ligne, plus
   d'installation PWA, et plus de purge des anciens caches. Le tout SANS erreur
   visible côté joueur. C'est exactement ce qui s'est produit avec une entrée
   `og-cover.jpg` qui n'a jamais existé dans le dépôt : le worker ne s'est jamais
   installé, et tous les bumps de version de cache étaient sans effet.

   À lancer avant chaque déploiement (et à chaque ajout dans CORE).
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

const block = sw.match(/const CORE = \[([\s\S]*?)\];/);
if (!block) {
  console.error("Impossible de trouver le tableau CORE dans sw.js");
  process.exit(1);
}

const urls = [...block[1].matchAll(/"\.\/([^"]*)"/g)].map((m) => m[1]);
let missing = 0;

for (const url of urls) {
  const file = url.split("?")[0];
  if (file === "") { console.log("OK        ./ (racine)"); continue; } // "./" = index.html servi
  const exists = fs.existsSync(path.join(ROOT, file));
  if (!exists) missing++;
  console.log((exists ? "OK      " : "MANQUANT") + "  " + file);
}

console.log("\n" + urls.length + " entrées dans CORE · " + missing + " manquante(s)");
if (missing) {
  console.error("ÉCHEC : le service worker ne pourra pas s'installer (addAll rejette en bloc).");
  process.exit(1);
}
console.log("OK : le précache peut aboutir.");
