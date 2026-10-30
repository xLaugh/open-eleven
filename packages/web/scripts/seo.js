// Une adresse par langue, pour les moteurs de recherche : / (français), /en/, /es/, /ar/.
//
// Le jeu est le même partout : seule l'adresse fixe la langue (cf. public/i18n-boot.js). Les
// pages /xx/ sont générées à l'assemblage depuis index.html : leurs titre, description et
// aperçu de partage sont traduits ici, avec la langue et le sens de lecture de la page, une
// adresse canonique et les liens hreflang qui relient les quatre versions. On produit aussi
// robots.txt et sitemap.xml. Rien à maintenir à la main, hormis ces quelques phrases.

export const SITE_LANGS = ["fr", "en", "es", "ar"];
const RTL = ["ar"];

/** Titre, description et aperçu de partage de chaque version (le français est celui d'index.html). */
export const SEO_META = {
  fr: {
    locale: "fr_FR",
    title: "Open Eleven — Écrivez votre légende du football",
    description: "Open Eleven : un jeu de carrière de footballeur où chaque choix compte. Écrivez votre légende saison après saison — transferts, Ballon d'Or, Coupe du Monde. Gratuit, dans votre navigateur.",
    ogDescription: "Un jeu de carrière de footballeur où chaque choix compte. Écrivez votre légende : transferts, Ballon d'Or, Coupe du Monde. Jouez gratuitement.",
    twitterDescription: "Un jeu de carrière de footballeur où chaque choix compte. Transferts, Ballon d'Or, Coupe du Monde — écrivez votre légende.",
  },
  en: {
    locale: "en_GB",
    title: "Open Eleven — Write your football legend",
    description: "Open Eleven: a football career game where every choice counts. Write your legend season after season — transfers, Ballon d'Or, World Cup. Free, in your browser.",
    ogDescription: "A football career game where every choice counts. Write your legend: transfers, Ballon d'Or, World Cup. Play for free.",
    twitterDescription: "A football career game where every choice counts. Transfers, Ballon d'Or, World Cup — write your legend.",
  },
  es: {
    locale: "es_ES",
    title: "Open Eleven — Escribe tu leyenda del fútbol",
    description: "Open Eleven: un juego de carrera de futbolista donde cada decisión cuenta. Escribe tu leyenda temporada tras temporada: fichajes, Balón de Oro, Mundial. Gratis, en tu navegador.",
    ogDescription: "Un juego de carrera de futbolista donde cada decisión cuenta. Escribe tu leyenda: fichajes, Balón de Oro, Mundial. Juega gratis.",
    twitterDescription: "Un juego de carrera de futbolista donde cada decisión cuenta. Fichajes, Balón de Oro, Mundial: escribe tu leyenda.",
  },
  ar: {
    locale: "ar_AR",
    title: "Open Eleven — اكتب أسطورتك في كرة القدم",
    description: "Open Eleven: لعبة مسيرة لاعب كرة قدم، كل خيار فيها له وزنه. اكتب أسطورتك موسمًا بعد موسم: انتقالات، الكرة الذهبية، كأس العالم. مجانية، في متصفحك.",
    ogDescription: "لعبة مسيرة لاعب كرة قدم، كل خيار فيها له وزنه. اكتب أسطورتك: انتقالات، الكرة الذهبية، كأس العالم. العب مجانًا.",
    twitterDescription: "لعبة مسيرة لاعب كرة قدم، كل خيار فيها له وزنه. انتقالات، الكرة الذهبية، كأس العالم: اكتب أسطورتك.",
  },
};

export const pathOf = (lang) => (lang === "fr" ? "/" : "/" + lang + "/");
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Liens hreflang (les quatre versions, et le français par défaut). */
export function alternatesHtml(site) {
  return SITE_LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${site}${pathOf(l)}" />`).join("\n") +
    `\n<link rel="alternate" hreflang="x-default" href="${site}/" />`;
}

/**
 * La page d'une langue, d'après index.html (déjà assemblé). Échoue si une balise attendue
 * manque : une page à moitié traduite ne doit jamais partir en ligne.
 */
export function localizeIndex(html, lang, site) {
  const m = SEO_META[lang];
  if (!m) throw new Error("langue inconnue : " + lang);
  let out = html;
  const set = (re, value, what) => {
    if (!re.test(out)) throw new Error("index.html : balise introuvable (" + what + ")");
    out = out.replace(re, value);
  };
  set(/<html lang="[^"]*"[^>]*>/, `<html lang="${lang}"${RTL.includes(lang) ? ' dir="rtl"' : ""}>`, "html");
  set(/<title>[^<]*<\/title>/, `<title>${attr(m.title)}</title>`, "title");
  set(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${attr(m.description)}" />`, "description");
  set(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${attr(m.title)}" />`, "og:title");
  set(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${attr(m.ogDescription)}" />`, "og:description");
  set(/<meta property="og:locale" content="[^"]*" \/>/, `<meta property="og:locale" content="${m.locale}" />` +
    SITE_LANGS.filter((l) => l !== lang).map((l) => `\n<meta property="og:locale:alternate" content="${SEO_META[l].locale}" />`).join(""), "og:locale");
  set(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${attr(m.title)}" />`, "twitter:title");
  set(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${attr(m.twitterDescription)}" />`, "twitter:description");
  // Sous /en/, les adresses relatives du jeu (drapeaux, avatars, packs de traduction…) se
  // résolvent depuis la racine. Le repère oe-lang-pages dit au chargeur que les pages de
  // langue existent (en développement, elles n'existent pas : pas de redirection).
  const head = (lang === "fr" ? "" : '<base href="/" />\n') +
    `<link rel="canonical" href="${site}${pathOf(lang)}" />\n<meta property="og:url" content="${site}${pathOf(lang)}" />\n` +
    alternatesHtml(site) + '\n<meta name="oe-lang-pages" content="1" />';
  set(/<meta charset="UTF-8" \/>/, '<meta charset="UTF-8" />\n' + head, "charset");
  return out;
}

export function robotsTxt(site) {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`;
}

/** Les quatre versions du jeu (reliées entre elles) et la page de confidentialité. */
export function sitemapXml(site, date) {
  const alt = SITE_LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${site}${pathOf(l)}"/>`).join("\n") +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/"/>`;
  const urls = SITE_LANGS.map((l) => `  <url>\n    <loc>${site}${pathOf(l)}</loc>\n    <lastmod>${date}</lastmod>\n${alt}\n  </url>`);
  urls.push(`  <url>\n    <loc>${site}/privacy.html</loc>\n    <lastmod>${date}</lastmod>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}
