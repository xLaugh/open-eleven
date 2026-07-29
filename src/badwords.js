/* ============================================================
   Liste de mots interdits pour les pseudos (modération).
   SOURCE UNIQUE : éditée ici, elle alimente à la fois
     • le client (account.js) — message immédiat ;
     • le serveur (trigger DB) — via `supabase/badwords.sql`, RÉGÉNÉRÉ
       depuis ce fichier avec `node tools/gen-badwords.js`.
   Pour une liste plus complète : LDNOOBW (github.com/LDNOOBW/
   List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) — copie les
   fichiers `fr` / `en` / `es`… ici, puis régénère le SQL.
   Correspondance en MOT ENTIER + insensible aux accents/casse côté client.
   ============================================================ */
(function (root) {
  var LIST = [
    // --- Français : insultes / vulgarités ---
    "con", "conne", "connard", "connasse", "conard", "conasse",
    "salaud", "salop", "salope", "salopard", "salaupe",
    "pute", "putain", "pute", "pouffiasse", "poufiasse", "pétasse", "petasse",
    "enculé", "encule", "enculer", "enculee", "enculés", "encule",
    "niquer", "nique", "niquez", "niker",
    "fdp", "ntm", "tg", "tafiole", "tapette", "tarlouze", "tarlouse",
    "merde", "merdeux", "merdique", "chier", "chiotte",
    "batard", "bâtard", "batards", "connerie", "couille", "couilles",
    "bite", "biteS", "zboub", "teub", "chatte", "foutre",
    "pd", "pédé", "pede", "pedale", "pédale", "gouine",
    "sucemabite", "ntmr", "fils2pute",
    // --- Français : insultes racistes / haineuses ---
    "negre", "nègre", "negro", "bougnoule", "bougnol", "bicot",
    "youpin", "youpine", "feuj", "raton", "chinetoque", "niakoué", "niakoue",
    "sale arabe", "sale juif", "sale noir", "sale blanc",
    // --- Anglais : profanity ---
    "fuck", "fucker", "fucking", "motherfucker", "fuk", "fck",
    "shit", "bullshit", "shitty", "asshole", "arsehole", "ass",
    "bitch", "bastard", "dick", "dickhead", "cock", "pussy",
    "cunt", "twat", "wanker", "prick", "slut", "whore", "hoe",
    "bollocks", "bugger", "damn", "crap",
    // --- Anglais : slurs (haineux) ---
    "nigger", "nigga", "nigg", "faggot", "fag", "retard", "retarded",
    "chink", "spic", "kike", "coon", "wetback", "tranny", "dyke",
    "gook", "paki", "beaner",
    // --- Sexuel / explicite ---
    "porn", "porno", "sex", "sexe", "boobs", "penis", "vagina", "anal",
    "blowjob", "handjob", "creampie", "hentai", "rape", "raped", "rapist", "viol", "violeur",
    // --- Haine / extrémisme ---
    "nazi", "nazism", "hitler", "heil", "kkk", "isis", "daesh", "jihad",
    "genocide", "genocidaire", "terroriste",
    // --- Espagnol (courant) ---
    "puta", "mierda", "cabron", "cabrón", "pendejo", "coño", "cono", "gilipollas", "maricon", "maricón", "joder",
  ];
  root.OE_BADWORDS = LIST;
  if (typeof module !== "undefined" && module.exports) module.exports = LIST;
})(typeof window !== "undefined" ? window : globalThis);
