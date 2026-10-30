// Assemblage de l'interface. Deux pages (le jeu, la politique de
// confidentialité) ; le contenu et le moteur viennent des paquets voisins,
// lus directement depuis leurs sources TypeScript.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { defineConfig } from "vite";
import { SITE_LANGS, localizeIndex, robotsTxt, sitemapXml } from "./scripts/seo.js";

const root = import.meta.dirname;
const apiTarget = process.env.API_URL || "http://localhost:3000";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Version de cache : une empreinte de TOUT ce qui est publié. Elle ne change
// que si un fichier change — plus aucun numéro à avancer à la main.
//  • dans les pages, elle remplace __BUILD__ (le ?v= des scripts de public/) ;
//  • dans sw.js, elle nomme le cache et accompagne la liste des fichiers à
//    garder pour le hors-ligne, établie d'après ce qui a réellement été écrit.
function buildVersion() {
  let dist = "";
  const pages = new Map();
  return {
    name: "open-eleven:build-version",
    apply: "build",
    configResolved(config) { dist = resolve(config.root, config.build.outDir); },
    closeBundle() {
      // Une adresse par langue (cf. scripts/seo.js), avant l'empreinte : elles en font partie.
      const site = (readFileSync(resolve(root, "../content/src/brand.ts"), "utf8").match(/url: "([^"]+)"/) || [])[1];
      if (!site) throw new Error("adresse du site introuvable (content/src/brand.ts)");
      const base = readFileSync(join(dist, "index.html"), "utf8");
      for (const lang of SITE_LANGS) {
        const dir = lang === "fr" ? dist : join(dist, lang);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "index.html"), localizeIndex(base, lang, site));
      }
      writeFileSync(join(dist, "robots.txt"), robotsTxt(site));
      writeFileSync(join(dist, "sitemap.xml"), sitemapXml(site, new Date().toISOString().slice(0, 10)));

      const url = (f) => relative(dist, f).split("\\").join("/");
      const files = walk(dist).sort();
      const hash = createHash("sha256");
      for (const f of files) hash.update(url(f)).update(readFileSync(f));
      const version = hash.digest("hex").slice(0, 10);

      for (const f of files.filter((f) => f.endsWith(".html"))) {
        writeFileSync(f, readFileSync(f, "utf8").replaceAll("__BUILD__", version));
        pages.set(url(f), true);
      }
      // Hors-ligne : les pages, l'application, les scripts de public/ tels que
      // les pages les demandent (avec leur ?v=), l'habillage. Ni les drapeaux
      // ni le pack de traduction : ils entrent en cache à la première lecture.
      const versioned = ["i18n-boot.js"];
      for (const u of versioned) if (!existsSync(join(dist, u))) throw new Error("sw.js : fichier hors-ligne absent de l'assemblage : " + u);
      const core = ["./", ...SITE_LANGS.filter((l) => l !== "fr").map((l) => "./" + l + "/"), ...files.map(url).filter((u) =>
        u.endsWith(".html") || u.startsWith("assets/") || u.startsWith("src/fonts/") ||
        ["site.webmanifest", "favicon.svg", "src/img/logo-11-mark.png", "src/img/icon-192.png", "src/img/icon-512.png", "src/img/icon-maskable-512.png"].includes(u),
      ).map((u) => "./" + u), ...versioned.map((u) => "./" + u + "?v=" + version)];
      const sw = join(dist, "sw.js");
      writeFileSync(sw, readFileSync(sw, "utf8").replace("__BUILD__", version).replace("\"__CORE__\"", core.map((u) => JSON.stringify(u)).join(", ")));
      console.log("version de cache " + version + " · " + core.length + " fichiers hors-ligne");
    },
  };
}

// En développement, __BUILD__ reste tel quel dans les pages : sans effet.
export default defineConfig({
  root,
  plugins: [buildVersion()],
  build: {
    target: "es2020",
    // Le contenu (1 200 clubs, 300 événements, leurs textes) pèse l'essentiel
    // de l'application : un seul fichier d'environ 900 ko, 270 ko compressé.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: { index: resolve(root, "index.html"), privacy: resolve(root, "privacy.html") },
    },
  },
  // Le serveur du jeu (packages/server) répond sous /api, WebSocket compris.
  server: { port: 5173, strictPort: true, proxy: { "/api": { target: apiTarget, ws: true } } },
  preview: { port: 4173, strictPort: true, proxy: { "/api": { target: apiTarget, ws: true } } },
});
