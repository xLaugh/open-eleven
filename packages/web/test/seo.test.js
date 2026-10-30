// Une adresse par langue pour les moteurs de recherche (cf. scripts/seo.js) : les pages
// générées depuis la vraie index.html, le sitemap et robots.txt.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SEO_META, SITE_LANGS, localizeIndex, pathOf, robotsTxt, sitemapXml } from "../scripts/seo.js";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "index.html"), "utf8");
const SITE = "https://openeleven.laugh.yt";
const get = (page, re) => (page.match(re) || [])[1];

test("les textes français de seo.js sont ceux d'index.html (une seule vérité)", () => {
  assert.equal(get(html, /<title>([^<]*)<\/title>/), SEO_META.fr.title);
  assert.equal(get(html, /<meta name="description" content="([^"]*)"/), SEO_META.fr.description.replace(/"/g, "&quot;"));
});

test("chaque langue a sa page : langue, sens de lecture, titre, description et partage traduits", () => {
  for (const lang of SITE_LANGS) {
    const page = localizeIndex(html, lang, SITE);
    assert.equal(get(page, /<html lang="([^"]*)"/), lang);
    assert.equal(/<html[^>]*dir="rtl"/.test(page), lang === "ar", "sens de lecture de " + lang);
    assert.equal(get(page, /<title>([^<]*)<\/title>/), SEO_META[lang].title);
    assert.equal(get(page, /<meta property="og:locale" content="([^"]*)"/), SEO_META[lang].locale);
    assert.equal(get(page, /<link rel="canonical" href="([^"]*)"/), SITE + pathOf(lang));
    for (const l of SITE_LANGS) assert.ok(page.includes(`hreflang="${l}" href="${SITE}${pathOf(l)}"`), lang + " : lien vers " + l);
    assert.ok(page.includes('hreflang="x-default"'));
    assert.ok(page.includes('<meta name="oe-lang-pages" content="1" />'), "repère des pages de langue");
    // Sous /xx/, les adresses relatives du jeu doivent partir de la racine.
    assert.equal(page.includes('<base href="/" />'), lang !== "fr", "base de " + lang);
    assert.equal((page.match(/<title>/g) || []).length, 1);
  }
  assert.throws(() => localizeIndex("<html></html>", "en", SITE), /introuvable/, "une page incomplète fait échouer l'assemblage");
});

test("la politique de sécurité laisse passer la base vers la racine", () => {
  assert.match(html, /base-uri 'self'/);
  assert.match(readFileSync(join(here, "..", "..", "..", "Caddyfile"), "utf8"), /base-uri 'self'/);
});

test("sitemap et robots.txt", () => {
  const xml = sitemapXml(SITE, "2026-10-30");
  for (const l of SITE_LANGS) assert.ok(xml.includes(`<loc>${SITE}${pathOf(l)}</loc>`), "sitemap : " + l);
  assert.ok(xml.includes(`<loc>${SITE}/privacy.html</loc>`));
  assert.equal((xml.match(/<url>/g) || []).length, SITE_LANGS.length + 1);
  const robots = robotsTxt(SITE);
  assert.match(robots, /Sitemap: https:\/\/openeleven\.laugh\.yt\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/api\//);
});
