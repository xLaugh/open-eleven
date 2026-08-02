/* ============================================================
   DONNÉES DU JEU v2 — aucune logique ici, uniquement du contenu.
   Toute la mécanique vit dans engine.js, l'UI dans game.js.

   Format des effets ("fx") d'une issue d'événement :
     t / p / m / c : deltas Technique / Physique / Mental / Charisme
     rep           : delta Réputation (0-100, amplifié par la visibilité
                     médiatique du club pour les gains)
     form / mor    : deltas Forme / Moral (jauges 0-100)
     dis           : delta Discipline (hygiène de vie, 0-100)
     coach / team  : deltas Relation coach / Relation vestiaire (0-100)
     money         : delta fortune en M€ (peut être négatif)
     inj           : semaines d'indisponibilité cette saison
     pot           : delta sur le potentiel caché (rare)
     trait         : id d'un trait débloqué (cf. TRAITS)
     flag          : pose un drapeau d'histoire (storylines)
     clearFlag     : retire un drapeau
     transfer      : { d: -2..2 (delta de niveau), cross: bool,
                       gulf: bool } → génère des offres concrètes
     loan          : true → propose un prêt d'une saison (niveau inférieur)
     sched         : { id, inYears } → programme un événement futur
                     (conséquence à retardement, cf. scheduledOnly)
     trophy        : "league" | "cup" | "continental" (gagné cette saison)
     natCall       : true → première convocation en sélection
     natRetire     : true → retraite internationale
     retire        : true → raccroche à la fin de la saison
     end           : "injury" | "medical" → carrière stoppée net

   Conditions ("cond") d'un événement :
     aMin/aMax, levels:["elite"], pos:["att"], origin:"quartier",
     lifestyle:"pro", entourage:"crew", minDis/maxDis, minCoach/maxCoach,
     minTeam/maxTeam, loan:true|false (en prêt ou non),
     minRep/maxRep, minOvr/maxOvr, minMoney, minForm/maxForm,
     minMor/maxMor, flag, notFlag, trait, notTrait,
     nat:true|false (en sélection ou non), wc:true (année de CDM),
     chance: 0-1 (disponibilité aléatoire cette saison-là)
   ============================================================ */

// En Node (simulation, tests), le contenu volumineux vit dans des fichiers
// séparés : on les charge ici pour que le bloc d'export en fin de fichier
// puisse les recenser. Dans le navigateur, index.html les charge avant
// celui-ci et cette condition est simplement fausse.
if (typeof require !== "undefined" && typeof module !== "undefined" && module.exports) {
  require("./data-clubs.js");
  require("./data-moments.js");
  require("./data-events.js");
}

// --- Marque / crédit (personnalisez librement) ------------------------
// Le nom du jeu est injecté partout depuis ici : une seule ligne à
// changer pour rebaptiser le jeu (titre, accueil, fiche partageable).
const BRAND = {
  game: "OPEN ELEVEN",
  author: "", // crédit masqué
  designer: "", // crédit masqué
  tagline: "Écrivez votre légende du football",
  url: "https://openeleven.laugh.yt", // ← domaine d'hébergement RÉEL (ne pas changer sans migrer le site + les images de partage)
  hashtag: "#OpenEleven",
};

// --- Nationalités jouables ----------------------------------------------
// weight : multiplicateur de chances en sélection (CDM, Ballon d'Or).
// img : drapeau officiel (src/img/flag). L'emoji reste utilisé dans les
// textes inline (header, récits). Pour ajouter un pays : une entrée ici,
// ses clubs dans CLUBS, son pool de noms dans NAME_POOLS, et c'est tout.
const NATIONALITIES = [
  { id: "fr", name: "France", flag: "🇫🇷", img: "src/img/flag/Flag_of_France.png", weight: 1, wcWeight: 1, homeCountryId: "fr" },
  { id: "de", name: "Allemagne", flag: "🇩🇪", img: "src/img/flag/Drapeau-Allemagne.png", weight: 0.85, wcWeight: 0.8, homeCountryId: "de" },
  { id: "es", name: "Espagne", flag: "🇪🇸", img: "src/img/flag/Spain_flag_300.png", weight: 1, wcWeight: 0.95, homeCountryId: "es" },
  { id: "it", name: "Italie", flag: "🇮🇹", img: "src/img/flag/Flag_of_Italy_(1946–2003).png", weight: 0.85, wcWeight: 0.45, homeCountryId: "it" },
  { id: "en", name: "Angleterre", flag: "🇬🇧", img: "src/img/flag/Drapeau-Angleterre.png", weight: 0.95, wcWeight: 0.85, homeCountryId: "en" },
  { id: "br", name: "Brésil", flag: "🇧🇷", img: "src/img/flag/Brazil_flag_300.png", weight: 0.95, wcWeight: 0.9, homeCountryId: "br" },
  { id: "ar", name: "Argentine", flag: "🇦🇷", img: "src/img/flag/Flag_of_Argentina.png", weight: 1, wcWeight: 1, homeCountryId: "ar" },
  { id: "nl", name: "Pays-Bas", flag: "🇳🇱", img: "src/img/flag/Flag_of_Netherlands.png", weight: 0.85, wcWeight: 0.6, homeCountryId: "nl" },
  { id: "pt", name: "Portugal", flag: "🇵🇹", img: "src/img/flag/Flag_of_Portugal.png", weight: 0.9, wcWeight: 0.7, homeCountryId: "pt" },
  { id: "be", name: "Belgique", flag: "🇧🇪", img: "src/img/flag/Flag_of_Belgium.png", weight: 0.75, wcWeight: 0.45, homeCountryId: "be" },
  { id: "hr", name: "Croatie", flag: "🇭🇷", img: "src/img/flag/Flag_of_Croatia.png", weight: 0.8, wcWeight: 0.6, homeCountryId: "hr" },
  { id: "aw", name: "Aruba", flag: "🇦🇼", img: "src/img/flag/Flag_of_Aruba.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "aw" },
  { id: "lc", name: "Sainte-Lucie", flag: "🇱🇨", img: "src/img/flag/Flag_of_Saint_Lucia.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "lc" },
  { id: "vc", name: "Saint-Vincent-et-les-Grenadines", flag: "🇻🇨", img: "src/img/flag/Flag_of_Saint_Vincent_and_the_Grenadines.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "vc" },
  { id: "kn", name: "Saint-Kitts-et-Nevis", flag: "🇰🇳", img: "src/img/flag/Flag_of_Saint_Kitts_and_Nevis.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "kn" },
  { id: "dm", name: "Dominique", flag: "🇩🇲", img: "src/img/flag/Flag_of_Dominica.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "dm" },
  { id: "vg", name: "Îles Vierges britanniques", flag: "🇻🇬", img: "src/img/flag/Flag_of_the_British_Virgin_Islands.png", weight: 0.04, wcWeight: 0.005, homeCountryId: "vg" },
  { id: "vi", name: "Îles Vierges américaines", flag: "🇻🇮", img: "src/img/flag/Flag_of_the_United_States_Virgin_Islands.png", weight: 0.04, wcWeight: 0.005, homeCountryId: "vi" },
  { id: "ky", name: "Îles Caïmans", flag: "🇰🇾", img: "src/img/flag/Flag_of_the_Cayman_Islands.png", weight: 0.04, wcWeight: 0.005, homeCountryId: "ky" },
  { id: "ms", name: "Montserrat", flag: "🇲🇸", img: "src/img/flag/Flag_of_Montserrat.png", weight: 0.04, wcWeight: 0.005, homeCountryId: "ms" },
  { id: "ai", name: "Anguilla", flag: "🇦🇮", img: "src/img/flag/Flag_of_Anguilla.png", weight: 0.04, wcWeight: 0.005, homeCountryId: "ai" },
  { id: "tc", name: "Turks-et-Caïcos", flag: "🇹🇨", img: "src/img/flag/Flag_of_the_Turks_and_Caicos_Islands.png", weight: 0.04, wcWeight: 0.005, homeCountryId: "tc" },
  { id: "bz", name: "Belize", flag: "🇧🇿", img: "src/img/flag/Flag_of_Belize.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "bz" },
  { id: "pr", name: "Porto Rico", flag: "🇵🇷", img: "src/img/flag/Flag_of_Puerto_Rico.png", weight: 0.16, wcWeight: 0.02, homeCountryId: "pr" },
  { id: "tw", name: "Taïwan", flag: "🇹🇼", img: "src/img/flag/Flag_of_Taiwan.png", weight: 0.08, wcWeight: 0.01, homeCountryId: "tw" },
  { id: "lk", name: "Sri Lanka", flag: "🇱🇰", img: "src/img/flag/Flag_of_Sri_Lanka.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "lk" },
  { id: "la", name: "Laos", flag: "🇱🇦", img: "src/img/flag/Flag_of_Laos.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "la" },
  { id: "bn", name: "Brunei", flag: "🇧🇳", img: "src/img/flag/Flag_of_Brunei.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "bn" },
  { id: "bt", name: "Bhoutan", flag: "🇧🇹", img: "src/img/flag/Flag_of_Bhutan.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "bt" },
  { id: "tl", name: "Timor oriental", flag: "🇹🇱", img: "src/img/flag/Flag_of_East_Timor.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "tl" },
  { id: "gu", name: "Guam", flag: "🇬🇺", img: "src/img/flag/Flag_of_Guam.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "gu" },
  { id: "mo", name: "Macao", flag: "🇲🇴", img: "src/img/flag/Flag_of_Macau.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "mo" },
  { id: "pk", name: "Pakistan", flag: "🇵🇰", img: "src/img/flag/Flag_of_Pakistan.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "pk" },
  { id: "kg", name: "Kirghizistan", flag: "🇰🇬", img: "src/img/flag/Flag_of_Kyrgyzstan.png", weight: 0.18, wcWeight: 0.03, homeCountryId: "kg" },
  { id: "hk", name: "Hong Kong", flag: "🇭🇰", img: "src/img/flag/Flag_of_Hong_Kong.png", weight: 0.16, wcWeight: 0.02, homeCountryId: "hk" },
  { id: "afg", name: "Afghanistan", flag: "🇦🇫", img: "src/img/flag/Flag_of_Afghanistan.png", weight: 0.16, wcWeight: 0.02, homeCountryId: "afg" },
  { id: "bi", name: "Burundi", flag: "🇧🇮", img: "src/img/flag/Flag_of_Burundi.png", weight: 0.1, wcWeight: 0.01, homeCountryId: "bi" },
  { id: "td", name: "Tchad", flag: "🇹🇩", img: "src/img/flag/Flag_of_Chad.png", weight: 0.08, wcWeight: 0.005, homeCountryId: "td" },
  { id: "so", name: "Somalie", flag: "🇸🇴", img: "src/img/flag/Flag_of_Somalia.png", weight: 0.08, wcWeight: 0.005, homeCountryId: "so" },
  { id: "er", name: "Érythrée", flag: "🇪🇷", img: "src/img/flag/Flag_of_Eritrea.png", weight: 0.07, wcWeight: 0.005, homeCountryId: "er" },
  { id: "ss", name: "Soudan du Sud", flag: "🇸🇸", img: "src/img/flag/Flag_of_South_Sudan.png", weight: 0.07, wcWeight: 0.005, homeCountryId: "ss" },
  { id: "st", name: "São Tomé-et-Príncipe", flag: "🇸🇹", img: "src/img/flag/Flag_of_Sao_Tome_and_Principe.png", weight: 0.07, wcWeight: 0.005, homeCountryId: "st" },
  { id: "ne", name: "Niger", flag: "🇳🇪", img: "src/img/flag/Flag_of_Niger.png", weight: 0.16, wcWeight: 0.02, homeCountryId: "ne" },
  { id: "et", name: "Éthiopie", flag: "🇪🇹", img: "src/img/flag/Flag_of_Ethiopia.png", weight: 0.16, wcWeight: 0.02, homeCountryId: "et" },
  { id: "rw", name: "Rwanda", flag: "🇷🇼", img: "src/img/flag/Flag_of_Rwanda.png", weight: 0.16, wcWeight: 0.02, homeCountryId: "rw" },
  { id: "mw", name: "Malawi", flag: "🇲🇼", img: "src/img/flag/Flag_of_Malawi.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "mw" },
  { id: "bw", name: "Botswana", flag: "🇧🇼", img: "src/img/flag/Flag_of_Botswana.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "bw" },
  { id: "lr", name: "Liberia", flag: "🇱🇷", img: "src/img/flag/Flag_of_Liberia.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "lr" },
  { id: "cf", name: "Centrafrique", flag: "🇨🇫", img: "src/img/flag/Flag_of_the_Central_African_Republic.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "cf" },
  { id: "asa", name: "Samoa américaines", flag: "🇦🇸", img: "src/img/flag/Flag_of_American_Samoa.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "asa" },
  { id: "tv", name: "Tuvalu", flag: "🇹🇻", img: "src/img/flag/Flag_of_Tuvalu.png", weight: 0.04, wcWeight: 0.005, homeCountryId: "tv" },
  { id: "ki", name: "Kiribati", flag: "🇰🇮", img: "src/img/flag/Flag_of_Kiribati.png", weight: 0.04, wcWeight: 0.005, homeCountryId: "ki" },
  { id: "vu", name: "Vanuatu", flag: "🇻🇺", img: "src/img/flag/Flag_of_Vanuatu.png", weight: 0.14, wcWeight: 0.02, homeCountryId: "vu" },
  { id: "ws", name: "Samoa", flag: "🇼🇸", img: "src/img/flag/Flag_of_Samoa.png", weight: 0.13, wcWeight: 0.02, homeCountryId: "ws" },
  { id: "to", name: "Tonga", flag: "🇹🇴", img: "src/img/flag/Flag_of_Tonga.png", weight: 0.13, wcWeight: 0.02, homeCountryId: "to" },
  { id: "ck", name: "Îles Cook", flag: "🇨🇰", img: "src/img/flag/Flag_of_Cook_Islands.png", weight: 0.12, wcWeight: 0.02, homeCountryId: "ck" },
  { id: "nc", name: "Nouvelle-Calédonie", flag: "🇳🇨", img: "src/img/flag/Flag_of_New_Caledonia.png", weight: 0.26, wcWeight: 0.03, homeCountryId: "nc" },
  { id: "fj", name: "Fidji", flag: "🇫🇯", img: "src/img/flag/Flag_of_Fiji.png", weight: 0.24, wcWeight: 0.03, homeCountryId: "fj" },
  { id: "pf", name: "Tahiti", flag: "🇵🇫", img: "src/img/flag/Flag_of_French_Polynesia.png", weight: 0.24, wcWeight: 0.03, homeCountryId: "pf" },
  { id: "sb", name: "Îles Salomon", flag: "🇸🇧", img: "src/img/flag/Flag_of_Solomon_Islands.png", weight: 0.22, wcWeight: 0.03, homeCountryId: "sb" },
  { id: "sg", name: "Singapour", flag: "🇸🇬", img: "src/img/flag/Flag_of_Singapore.png", weight: 0.1, wcWeight: 0.01, homeCountryId: "sg" },
  { id: "np", name: "Népal", flag: "🇳🇵", img: "src/img/flag/Flag_of_Nepal.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "np" },
  { id: "kh", name: "Cambodge", flag: "🇰🇭", img: "src/img/flag/Flag_of_Cambodia.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "kh" },
  { id: "mv", name: "Maldives", flag: "🇲🇻", img: "src/img/flag/Flag_of_Maldives.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "mv" },
  { id: "bd", name: "Bangladesh", flag: "🇧🇩", img: "src/img/flag/Flag_of_Bangladesh.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "bd" },
  { id: "mn", name: "Mongolie", flag: "🇲🇳", img: "src/img/flag/Flag_of_Mongolia.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "mn" },
  { id: "lb", name: "Liban", flag: "🇱🇧", img: "src/img/flag/Flag_of_Lebanon.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "lb" },
  { id: "ps", name: "Palestine", flag: "🇵🇸", img: "src/img/flag/Flag_of_Palestine.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "ps" },
  { id: "id", name: "Indonésie", flag: "🇮🇩", img: "src/img/flag/Flag_of_Indonesia.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "id" },
  { id: "my", name: "Malaisie", flag: "🇲🇾", img: "src/img/flag/Flag_of_Malaysia.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "my" },
  { id: "ph", name: "Philippines", flag: "🇵🇭", img: "src/img/flag/Flag_of_Philippines.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "ph" },
  { id: "tj", name: "Tadjikistan", flag: "🇹🇯", img: "src/img/flag/Flag_of_Tajikistan.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "tj" },
  { id: "tm", name: "Turkménistan", flag: "🇹🇲", img: "src/img/flag/Flag_of_Turkmenistan.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "tm" },
  { id: "kp", name: "Corée du Nord", flag: "🇰🇵", img: "src/img/flag/Flag_of_North_Korea.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "kp" },
  { id: "ye", name: "Yémen", flag: "🇾🇪", img: "src/img/flag/Flag_of_Yemen.png", weight: 0.14, wcWeight: 0.02, homeCountryId: "ye" },
  { id: "mm", name: "Myanmar", flag: "🇲🇲", img: "src/img/flag/Flag_of_Myanmar.png", weight: 0.14, wcWeight: 0.02, homeCountryId: "mm" },
  { id: "bh", name: "Bahreïn", flag: "🇧🇭", img: "src/img/flag/Flag_of_Bahrain.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "bh" },
  { id: "om", name: "Oman", flag: "🇴🇲", img: "src/img/flag/Flag_of_Oman.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "om" },
  { id: "jo", name: "Jordanie", flag: "🇯🇴", img: "src/img/flag/Flag_of_Jordan.png", weight: 0.32, wcWeight: 0.05, homeCountryId: "jo" },
  { id: "kw", name: "Koweït", flag: "🇰🇼", img: "src/img/flag/Flag_of_Kuwait.png", weight: 0.24, wcWeight: 0.04, homeCountryId: "kw" },
  { id: "th", name: "Thaïlande", flag: "🇹🇭", img: "src/img/flag/Flag_of_Thailand.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "th" },
  { id: "vn", name: "Vietnam", flag: "🇻🇳", img: "src/img/flag/Flag_of_Vietnam.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "vn" },
  { id: "in", name: "Inde", flag: "🇮🇳", img: "src/img/flag/Flag_of_India.png", weight: 0.18, wcWeight: 0.02, homeCountryId: "in" },
  { id: "sy", name: "Syrie", flag: "🇸🇾", img: "src/img/flag/Flag_of_Syria.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "sy" },
  { id: "iq", name: "Irak", flag: "🇮🇶", img: "src/img/flag/Flag_of_Iraq.png", weight: 0.35, wcWeight: 0.07, homeCountryId: "iq" },
  { id: "ae", name: "Émirats arabes unis", flag: "🇦🇪", img: "src/img/flag/Flag_of_United_Arab_Emirates.png", weight: 0.3, wcWeight: 0.05, homeCountryId: "ae" },
  { id: "uz", name: "Ouzbékistan", flag: "🇺🇿", img: "src/img/flag/Flag_of_Uzbekistan.png", weight: 0.35, wcWeight: 0.07, homeCountryId: "uz" },
  { id: "km", name: "Comores", flag: "🇰🇲", img: "src/img/flag/Flag_of_Comoros.png", weight: 0.1, wcWeight: 0.01, homeCountryId: "km" },
  { id: "mu", name: "Maurice", flag: "🇲🇺", img: "src/img/flag/Flag_of_Mauritius.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "mu" },
  { id: "dj", name: "Djibouti", flag: "🇩🇯", img: "src/img/flag/Flag_of_Djibouti.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "dj" },
  { id: "sc", name: "Seychelles", flag: "🇸🇨", img: "src/img/flag/Flag_of_Seychelles.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "sc" },
  { id: "sz", name: "Eswatini", flag: "🇸🇿", img: "src/img/flag/Flag_of_Eswatini.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "sz" },
  { id: "ls", name: "Lesotho", flag: "🇱🇸", img: "src/img/flag/Flag_of_Lesotho.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "ls" },
  { id: "zw", name: "Zimbabwe", flag: "🇿🇼", img: "src/img/flag/Flag_of_Zimbabwe.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "zw" },
  { id: "ke", name: "Kenya", flag: "🇰🇪", img: "src/img/flag/Flag_of_Kenya.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "ke" },
  { id: "tg", name: "Togo", flag: "🇹🇬", img: "src/img/flag/Flag_of_Togo.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "tg" },
  { id: "mr", name: "Mauritanie", flag: "🇲🇷", img: "src/img/flag/Flag_of_Mauritania.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "mr" },
  { id: "gw", name: "Guinée-Bissau", flag: "🇬🇼", img: "src/img/flag/Flag_of_Guinea-Bissau.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "gw" },
  { id: "sl", name: "Sierra Leone", flag: "🇸🇱", img: "src/img/flag/Flag_of_Sierra_Leone.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "sl" },
  { id: "ly", name: "Libye", flag: "🇱🇾", img: "src/img/flag/Flag_of_Libya.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "ly" },
  { id: "sd", name: "Soudan", flag: "🇸🇩", img: "src/img/flag/Flag_of_Sudan.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "sd" },
  { id: "na", name: "Namibie", flag: "🇳🇦", img: "src/img/flag/Flag_of_Namibia.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "na" },
  { id: "tz", name: "Tanzanie", flag: "🇹🇿", img: "src/img/flag/Flag_of_Tanzania.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "tz" },
  { id: "cv", name: "Cap-Vert", flag: "🇨🇻", img: "src/img/flag/Flag_of_Cape_Verde.png", weight: 0.35, wcWeight: 0.06, homeCountryId: "cv" },
  { id: "ga", name: "Gabon", flag: "🇬🇦", img: "src/img/flag/Flag_of_Gabon.png", weight: 0.3, wcWeight: 0.06, homeCountryId: "ga" },
  { id: "zm", name: "Zambie", flag: "🇿🇲", img: "src/img/flag/Flag_of_Zambia.png", weight: 0.3, wcWeight: 0.06, homeCountryId: "zm" },
  { id: "ug", name: "Ouganda", flag: "🇺🇬", img: "src/img/flag/Flag_of_Uganda.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "ug" },
  { id: "cg", name: "Congo", flag: "🇨🇬", img: "src/img/flag/Flag_of_Congo.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "cg" },
  { id: "gq", name: "Guinée équatoriale", flag: "🇬🇶", img: "src/img/flag/Flag_of_Equatorial_Guinea.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "gq" },
  { id: "mz", name: "Mozambique", flag: "🇲🇿", img: "src/img/flag/Flag_of_Mozambique.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "mz" },
  { id: "gm", name: "Gambie", flag: "🇬🇲", img: "src/img/flag/Flag_of_Gambia.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "gm" },
  { id: "gh", name: "Ghana", flag: "🇬🇭", img: "src/img/flag/Flag_of_Ghana.png", weight: 0.4, wcWeight: 0.1, homeCountryId: "gh" },
  { id: "ml", name: "Mali", flag: "🇲🇱", img: "src/img/flag/Flag_of_Mali.png", weight: 0.42, wcWeight: 0.1, homeCountryId: "ml" },
  { id: "bf", name: "Burkina Faso", flag: "🇧🇫", img: "src/img/flag/Flag_of_Burkina_Faso.png", weight: 0.38, wcWeight: 0.08, homeCountryId: "bf" },
  { id: "gy", name: "Guyana", flag: "🇬🇾", img: "src/img/flag/Flag_of_Guyana.png", weight: 0.1, wcWeight: 0.01, homeCountryId: "gy" },
  { id: "bm", name: "Bermudes", flag: "🇧🇲", img: "src/img/flag/Flag_of_Bermuda.png", weight: 0.07, wcWeight: 0.005, homeCountryId: "bm" },
  { id: "bb", name: "Barbade", flag: "🇧🇧", img: "src/img/flag/Flag_of_Barbados.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "bb" },
  { id: "bs", name: "Bahamas", flag: "🇧🇸", img: "src/img/flag/Flag_of_the_Bahamas.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "bs" },
  { id: "gd", name: "Grenade", flag: "🇬🇩", img: "src/img/flag/Flag_of_Grenada.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "gd" },
  { id: "ag", name: "Antigua-et-Barbuda", flag: "🇦🇬", img: "src/img/flag/Flag_of_Antigua_and_Barbuda.png", weight: 0.06, wcWeight: 0.005, homeCountryId: "ag" },
  { id: "gt", name: "Guatemala", flag: "🇬🇹", img: "src/img/flag/Flag_of_Guatemala.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "gt" },
  { id: "tt", name: "Trinité-et-Tobago", flag: "🇹🇹", img: "src/img/flag/Flag_of_Trinidad_and_Tobago.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "tt" },
  { id: "ht", name: "Haïti", flag: "🇭🇹", img: "src/img/flag/Flag_of_Haiti.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "ht" },
  { id: "cu", name: "Cuba", flag: "🇨🇺", img: "src/img/flag/Flag_of_Cuba.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "cu" },
  { id: "cw", name: "Curaçao", flag: "🇨🇼", img: "src/img/flag/Flag_of_Curacao.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "cw" },
  { id: "sr", name: "Suriname", flag: "🇸🇷", img: "src/img/flag/Flag_of_Suriname.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "sr" },
  { id: "do", name: "République dominicaine", flag: "🇩🇴", img: "src/img/flag/Flag_of_the_Dominican_Republic.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "do" },
  { id: "ni", name: "Nicaragua", flag: "🇳🇮", img: "src/img/flag/Flag_of_Nicaragua.png", weight: 0.14, wcWeight: 0.02, homeCountryId: "ni" },
  { id: "bo", name: "Bolivie", flag: "🇧🇴", img: "src/img/flag/Flag_of_Bolivia.png", weight: 0.25, wcWeight: 0.04, homeCountryId: "bo" },
  { id: "pa", name: "Panama", flag: "🇵🇦", img: "src/img/flag/Flag_of_Panama.png", weight: 0.32, wcWeight: 0.06, homeCountryId: "pa" },
  { id: "hn", name: "Honduras", flag: "🇭🇳", img: "src/img/flag/Flag_of_Honduras.png", weight: 0.26, wcWeight: 0.04, homeCountryId: "hn" },
  { id: "jm", name: "Jamaïque", flag: "🇯🇲", img: "src/img/flag/Flag_of_Jamaica.png", weight: 0.3, wcWeight: 0.05, homeCountryId: "jm" },
  { id: "pe", name: "Pérou", flag: "🇵🇪", img: "src/img/flag/Flag_of_Peru.png", weight: 0.35, wcWeight: 0.08, homeCountryId: "pe" },
  { id: "cr", name: "Costa Rica", flag: "🇨🇷", img: "src/img/flag/Flag_of_Costa_Rica.png", weight: 0.38, wcWeight: 0.1, homeCountryId: "cr" },
  { id: "mt", name: "Malte", flag: "🇲🇹", img: "src/img/flag/Flag_of_Malta.png", weight: 0.12, wcWeight: 0.01, homeCountryId: "mt" },
  { id: "fo", name: "Îles Féroé", flag: "🇫🇴", img: "src/img/flag/Flag_of_the_Faroe_Islands.png", weight: 0.1, wcWeight: 0.01, homeCountryId: "fo" },
  { id: "ad", name: "Andorre", flag: "🇦🇩", img: "src/img/flag/Flag_of_Andorra.png", weight: 0.07, wcWeight: 0.005, homeCountryId: "ad" },
  { id: "sm", name: "Saint-Marin", flag: "🇸🇲", img: "src/img/flag/Flag_of_San_Marino.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "sm" },
  { id: "li", name: "Liechtenstein", flag: "🇱🇮", img: "src/img/flag/Flag_of_Liechtenstein.png", weight: 0.08, wcWeight: 0.005, homeCountryId: "li" },
  { id: "gi", name: "Gibraltar", flag: "🇬🇮", img: "src/img/flag/Flag_of_Gibraltar.png", weight: 0.07, wcWeight: 0.005, homeCountryId: "gi" },
  { id: "me", name: "Monténégro", flag: "🇲🇪", img: "src/img/flag/Flag_of_Montenegro.png", weight: 0.24, wcWeight: 0.04, homeCountryId: "me" },
  { id: "xk", name: "Kosovo", flag: "🇽🇰", img: "src/img/flag/Flag_of_Kosovo.png", weight: 0.22, wcWeight: 0.03, homeCountryId: "xk" },
  { id: "am", name: "Arménie", flag: "🇦🇲", img: "src/img/flag/Flag_of_Armenia.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "am" },
  { id: "az", name: "Azerbaïdjan", flag: "🇦🇿", img: "src/img/flag/Flag_of_Azerbaijan.png", weight: 0.17, wcWeight: 0.03, homeCountryId: "az" },
  { id: "cy", name: "Chypre", flag: "🇨🇾", img: "src/img/flag/Flag_of_Cyprus.png", weight: 0.18, wcWeight: 0.03, homeCountryId: "cy" },
  { id: "md", name: "Moldavie", flag: "🇲🇩", img: "src/img/flag/Flag_of_Moldova.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "md" },
  { id: "lu", name: "Luxembourg", flag: "🇱🇺", img: "src/img/flag/Flag_of_Luxembourg.png", weight: 0.2, wcWeight: 0.03, homeCountryId: "lu" },
  { id: "lv", name: "Lettonie", flag: "🇱🇻", img: "src/img/flag/Flag_of_Latvia.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "lv" },
  { id: "lt", name: "Lituanie", flag: "🇱🇹", img: "src/img/flag/Flag_of_Lithuania.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "lt" },
  { id: "ee", name: "Estonie", flag: "🇪🇪", img: "src/img/flag/Flag_of_Estonia.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "ee" },
  { id: "kz", name: "Kazakhstan", flag: "🇰🇿", img: "src/img/flag/Flag_of_Kazakhstan.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "kz" },
  { id: "by", name: "Biélorussie", flag: "🇧🇾", img: "src/img/flag/Flag_of_Belarus.png", weight: 0.16, wcWeight: 0.02, homeCountryId: "by" },
  { id: "si", name: "Slovénie", flag: "🇸🇮", img: "src/img/flag/Flag_of_Slovenia.png", weight: 0.4, wcWeight: 0.08, homeCountryId: "si" },
  { id: "is", name: "Islande", flag: "🇮🇸", img: "src/img/flag/Flag_of_Iceland.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "is" },
  { id: "ge", name: "Géorgie", flag: "🇬🇪", img: "src/img/flag/Flag_of_Georgia.png", weight: 0.38, wcWeight: 0.07, homeCountryId: "ge" },
  { id: "al", name: "Albanie", flag: "🇦🇱", img: "src/img/flag/Flag_of_Albania.png", weight: 0.32, wcWeight: 0.06, homeCountryId: "al" },
  { id: "mk", name: "Macédoine du Nord", flag: "🇲🇰", img: "src/img/flag/Flag_of_North_Macedonia.png", weight: 0.26, wcWeight: 0.04, homeCountryId: "mk" },
  { id: "gr", name: "Grèce", flag: "🇬🇷", img: "src/img/flag/Flag_of_Greece.png", weight: 0.35, wcWeight: 0.08, homeCountryId: "gr" },
  { id: "dk", name: "Danemark", flag: "🇩🇰", img: "src/img/flag/Flag_of_Denmark.png", weight: 0.6, wcWeight: 0.3, homeCountryId: "dk" },
  { id: "ro", name: "Roumanie", flag: "🇷🇴", img: "src/img/flag/Flag_of_Romania.png", weight: 0.4, wcWeight: 0.1, homeCountryId: "ro" },
  { id: "sk", name: "Slovaquie", flag: "🇸🇰", img: "src/img/flag/Flag_of_Slovakia.png", weight: 0.4, wcWeight: 0.1, homeCountryId: "sk" },
  { id: "uy", name: "Uruguay", flag: "🇺🇾", img: "src/img/flag/Flag_of_Uruguay.png", weight: 0.7, wcWeight: 0.45, homeCountryId: "uy" },
  { id: "ma", name: "Maroc", flag: "🇲🇦", img: "src/img/flag/Flag_of_Morocco.png", weight: 0.75, wcWeight: 0.4, homeCountryId: "ma" },
  { id: "mx", name: "Mexique", flag: "🇲🇽", img: "src/img/flag/Flag_of_Mexico.png", weight: 0.55, wcWeight: 0.22, homeCountryId: "mx" },
  { id: "co", name: "Colombie", flag: "🇨🇴", img: "src/img/flag/Flag_of_Colombia.png", weight: 0.65, wcWeight: 0.3, homeCountryId: "co" },
  { id: "ch", name: "Suisse", flag: "🇨🇭", img: "src/img/flag/Flag_of_Switzerland.png", weight: 0.6, wcWeight: 0.35, homeCountryId: "ch" },
  { id: "sn", name: "Sénégal", flag: "🇸🇳", img: "src/img/flag/Flag_of_Senegal.png", weight: 0.65, wcWeight: 0.25, homeCountryId: "sn" },
  { id: "tr", name: "Turquie", flag: "🇹🇷", img: "src/img/flag/Flag_of_Turkey.png", weight: 0.55, wcWeight: 0.2, homeCountryId: "tr" },
  { id: "cm", name: "Cameroun", flag: "🇨🇲", img: "src/img/flag/Flag_of_Cameroon.png", weight: 0.45, wcWeight: 0.12, homeCountryId: "cm" },
  { id: "ci", name: "Côte d'Ivoire", flag: "🇨🇮", img: "src/img/flag/Drapeau-CIV.png", weight: 0.5, wcWeight: 0.12, homeCountryId: "ci" },
  { id: "dz", name: "Algérie", flag: "🇩🇿", img: "src/img/flag/Flag_of_Algeria.png", weight: 0.5, wcWeight: 0.12, homeCountryId: "dz" },
  { id: "tn", name: "Tunisie", flag: "🇹🇳", img: "src/img/flag/Flag_of_Tunisia.png", weight: 0.42, wcWeight: 0.1, homeCountryId: "tn" },
  { id: "no", name: "Norvège", flag: "🇳🇴", img: "src/img/flag/Flag_of_Norway.png", weight: 0.55, wcWeight: 0.15, homeCountryId: "no" },
  { id: "fi", name: "Finlande", flag: "🇫🇮", img: "src/img/flag/Flag_of_Finland.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "fi" },
  { id: "se", name: "Suède", flag: "🇸🇪", img: "src/img/flag/Flag_of_Sweden.png", weight: 0.42, wcWeight: 0.12, homeCountryId: "se" },
  { id: "pl", name: "Pologne", flag: "🇵🇱", img: "src/img/flag/Flag_of_Poland.png", weight: 0.5, wcWeight: 0.18, homeCountryId: "pl" },
  { id: "bg", name: "Bulgarie", flag: "🇧🇬", img: "src/img/flag/Flag_of_Bulgaria.png", weight: 0.24, wcWeight: 0.04, homeCountryId: "bg" },
  { id: "jp", name: "Japon", flag: "🇯🇵", img: "src/img/flag/Flag_of_Japan.png", weight: 0.6, wcWeight: 0.25, homeCountryId: "jp" },
  { id: "kr", name: "Corée du Sud", flag: "🇰🇷", img: "src/img/flag/Flag_of_South_Korea.png", weight: 0.55, wcWeight: 0.2, homeCountryId: "kr" },
  { id: "cn", name: "Chine", flag: "🇨🇳", img: "src/img/flag/Flag_of_China.png", weight: 0.22, wcWeight: 0.03, homeCountryId: "cn" },
  { id: "au", name: "Australie", flag: "🇦🇺", img: "src/img/flag/Flag_of_Australia.png", weight: 0.45, wcWeight: 0.14, homeCountryId: "au" },
  { id: "nz", name: "Nouvelle-Zélande", flag: "🇳🇿", img: "src/img/flag/Flag_of_New_Zealand.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "nz" },
  { id: "pg", name: "Papouasie-Nouvelle-Guinée", flag: "🇵🇬", img: "src/img/flag/Flag_of_Papua_New_Guinea.png", weight: 0.12, wcWeight: 0.02, homeCountryId: "pg" },
  { id: "us", name: "États-Unis", flag: "🇺🇸", img: "src/img/flag/Flag_of_the_United_States.png", weight: 0.55, wcWeight: 0.2, homeCountryId: "us" },
  { id: "eg", name: "Égypte", flag: "🇪🇬", img: "src/img/flag/Flag_of_Egypt.png", weight: 0.5, wcWeight: 0.12, homeCountryId: "eg" },
  { id: "za", name: "Afrique du Sud", flag: "🇿🇦", img: "src/img/flag/Flag_of_South_Africa.png", weight: 0.38, wcWeight: 0.07, homeCountryId: "za" },
  { id: "ba", name: "Bosnie-Herzégovine", flag: "🇧🇦", img: "src/img/flag/Flag_of_Bosnia_and_Herzegovina.png", weight: 0.35, wcWeight: 0.08, homeCountryId: "ba" },
  { id: "py", name: "Paraguay", flag: "🇵🇾", img: "src/img/flag/Flag_of_Paraguay.png", weight: 0.38, wcWeight: 0.1, homeCountryId: "py" },
  { id: "cl", name: "Chili", flag: "🇨🇱", img: "src/img/flag/Flag_of_Chile.png", weight: 0.35, wcWeight: 0.08, homeCountryId: "cl" },
  { id: "ca", name: "Canada", flag: "🇨🇦", img: "src/img/flag/Flag_of_Canada.png", weight: 0.45, wcWeight: 0.15, homeCountryId: "ca" },
  { id: "sv", name: "Salvador", flag: "🇸🇻", img: "src/img/flag/Flag_of_El_Salvador.png", weight: 0.2, wcWeight: 0.03, homeCountryId: "sv" },
  { id: "ao", name: "Angola", flag: "🇦🇴", img: "src/img/flag/Flag_of_Angola.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "ao" },
  { id: "mg", name: "Madagascar", flag: "🇲🇬", img: "src/img/flag/Flag_of_Madagascar.png", weight: 0.22, wcWeight: 0.04, homeCountryId: "mg" },
  { id: "ng", name: "Nigeria", flag: "🇳🇬", img: "src/img/flag/Flag_of_Nigeria.png", weight: 0.55, wcWeight: 0.18, homeCountryId: "ng" },
  { id: "sa", name: "Arabie Saoudite", flag: "🇸🇦", img: "src/img/flag/Flag_of_Saudi_Arabia.png", weight: 0.4, wcWeight: 0.1, homeCountryId: "sa" },
  { id: "qa", name: "Qatar", flag: "🇶🇦", img: "src/img/flag/Flag_of_Qatar.png", weight: 0.35, wcWeight: 0.06, homeCountryId: "qa" },
  { id: "ir", name: "Iran", flag: "🇮🇷", img: "src/img/flag/Flag_of_Iran.png", weight: 0.5, wcWeight: 0.14, homeCountryId: "ir" },
  { id: "at", name: "Autriche", flag: "🇦🇹", img: "src/img/flag/Flag_of_Austria.png", weight: 0.6, wcWeight: 0.25, homeCountryId: "at" },
  { id: "ec", name: "Équateur", flag: "🇪🇨", img: "src/img/flag/Flag_of_Ecuador.png", weight: 0.45, wcWeight: 0.15, homeCountryId: "ec" },
  { id: "ua", name: "Ukraine", flag: "🇺🇦", img: "src/img/flag/Flag_of_Ukraine.png", weight: 0.5, wcWeight: 0.15, homeCountryId: "ua" },
  { id: "ru", name: "Russie", flag: "🇷🇺", img: "src/img/flag/Flag_of_Russia.png", weight: 0.35, wcWeight: 0.08, homeCountryId: "ru" },
  { id: "wal", name: "Pays de Galles", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", img: "src/img/flag/Flag_of_Wales.png", weight: 0.4, wcWeight: 0.1, homeCountryId: "wal" },
  { id: "rs", name: "Serbie", flag: "🇷🇸", img: "src/img/flag/Flag_of_Serbia.png", weight: 0.5, wcWeight: 0.15, homeCountryId: "rs" },
  { id: "hu", name: "Hongrie", flag: "🇭🇺", img: "src/img/flag/Flag_of_Hungary.png", weight: 0.5, wcWeight: 0.12, homeCountryId: "hu" },
  { id: "sco", name: "Écosse", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", img: "src/img/flag/Flag_of_Scotland.png", weight: 0.42, wcWeight: 0.1, homeCountryId: "sco" },
  { id: "ie", name: "Irlande", flag: "🇮🇪", img: "src/img/flag/Flag_of_Ireland.png", weight: 0.38, wcWeight: 0.08, homeCountryId: "ie" },
  { id: "nir", name: "Irlande du Nord", flag: "🇬🇧", img: "src/img/flag/Flag_of_Northern_Ireland.png", weight: 0.26, wcWeight: 0.04, homeCountryId: "nir" },
  { id: "ve", name: "Venezuela", flag: "🇻🇪", img: "src/img/flag/Flag_of_Venezuela.png", weight: 0.32, wcWeight: 0.06, homeCountryId: "ve" },
  { id: "cz", name: "Tchéquie", flag: "🇨🇿", img: "src/img/flag/Flag_of_Czech_Republic.png", weight: 0.42, wcWeight: 0.1, homeCountryId: "cz" },
  { id: "cd", name: "RDC", flag: "🇨🇩", img: "src/img/flag/Flag_of_RDC.png", weight: 0.35, wcWeight: 0.07, homeCountryId: "cd" },
  { id: "gn", name: "Guinée", flag: "🇬🇳", img: "src/img/flag/Flag_of_Guinea.png", weight: 0.3, wcWeight: 0.05, homeCountryId: "gn" },
  { id: "bj", name: "Bénin", flag: "🇧🇯", img: "src/img/flag/Flag_of_Benin.png", weight: 0.2, wcWeight: 0.05, homeCountryId: "bj" },
];

// Prénoms/noms par nationalité (génération du joueur et du rival).
const NAME_POOLS = {
  aw: { first: ["Rangelo","Kenji","Shurandy","Gino","Jaïr","Dylano","Rayan","Nigel"], last: ["Maduro","Croes","Kelly","Every","Werleman","Franken","Rasmijn","Bardan"] },
  lc: { first: ["Tremain","Kurt","Anfernee","Vino","Alvinus","Zaine","Nicholas","Julian"], last: ["Alexander","Charlemagne","Emmanuel","Elva","John-Baptiste","Estaphane","Serieux","Bicette"] },
  vc: { first: ["Oalex","Cornelius","Myron","Azinho","Kishorn","Benjie","Tevin","Dorren"], last: ["Andrews","Samuel","Stephens","Roberts","Bascombe","Charles","Velox","Sam"] },
  kn: { first: ["Keithroy","Tishan","Thrizi","Gerard","Tiran","Uraj","Kimaree","Rowan"], last: ["Martin","Browne","Hazel","Williams","Isaac","Claxton","Hodge","Freeman"] },
  dm: { first: ["Julian","Kurlson","Briel","Deshorn","Melvin","Glenson","Alick","Kayan"], last: ["Wade","Prince","Bernard","Charles","Doctrove","Esprit","Cyrille","Toussaint"] },
  vg: { first: ["Troy","Jason","Kenroy","Rohan","Zebedee","Kevin","Andrew","Tereek"], last: ["Caraballo","Skelton","Hodge","Peters","Smith","Springette","Chalwell","Frett"] },
  vi: { first: ["Kwame","Joseph","Curtis","Yohance","Kareem","Rashidi","Duane","Tyshawn"], last: ["James","Charles","Browne","Prince","Nesbitt","David","Turnbull","Petersen"] },
  ky: { first: ["Ronald","Theron","Mark","Wesley","Elliott","Nkosi","Joshewa","Brian"], last: ["Ebanks","Whittaker","Seymour","McField","Frederick","Solomon","Powery","Bodden"] },
  ms: { first: ["Lyle","Brandon","Jay","Vincy","Sean","Zaine","Donald","Rohan"], last: ["Farrell","Griffith","Mendes","Weekes","Allen","Willock","Duberry","Lee"] },
  ai: { first: ["Girdon","Kenrick","Jamie","Josh","Chesney","Delroy","Damian","Tishan"], last: ["Connor","Richardson","Hodge","Gumbs","Rey","Harrigan","Proctor","Webster"] },
  tc: { first: ["Billy","Gavin","Deron","Cardinal","Christopher","Kevin","Sherlant","Damaso"], last: ["Forbes","Williams","Hall","Smith","Been","Handfield","Missick","Gardiner"] },
  bz: { first: ["Deon","Michael","Krisean","Harrison","Ian","Jarret","Nana","Triston"], last: ["McCaulay","Nunez","Flowers","Roches","Gentle","Leslie","August","Cus"] },
  pr: { first: ["Héctor","Sidney","Jonathan","Ricardo","Gerald","Nicolás","Wilfredo","Steven"], last: ["Ramos","Rivera","Otero","Colón","Torres","Marrero","Cardona","Meléndez"] },
  tw: { first: ["Chen","Wu","Hsu","Chiang","Wen","Ming","Chih","Kai"], last: ["Chen","Wang","Lin","Chang","Huang","Yeh","Kao","Hsu"] },
  lk: { first: ["Mohamed","Ishan","Chalana","Dulan","Ahmed","Sujan","Kavindu","Nirmal"], last: ["Fernando","Perera","Silva","Jayasuriya","Nizam","Careem","Issadeen","Rifnas"] },
  la: { first: ["Soukaphone","Khampheng","Kanlaya","Billy","Vilayout","Souliya","Phattana","Bounphachan"], last: ["Vongchiengkham","Sayavutthi","Phaophanit","Inthichack","Kingkeo","Douangchak","Sisongkham","Latsamy"] },
  bn: { first: ["Abdul","Azwan","Hardi","Adi","Faiq","Nazirul","Shahrazen","Haimie"], last: ["Damit","Akbar","Jefri","Hanapi","Suhaimi","Rahman","Latif","Duraman"] },
  bt: { first: ["Chencho","Karma","Tshering","Yeshey","Hari","Nima","Kinley","Sonam"], last: ["Gyeltshen","Dorji","Wangchuk","Namgyal","Penjor","Rai","Subba","Wangdi"] },
  tl: { first: ["Paulo","Rufino","João","Gali","Filomeno","Nélson","Anggisu","Pedro"], last: ["Gama","Freitas","Da Costa","Sarmento","Bota","Oliveira","Barbosa","Soares"] },
  gu: { first: ["Jason","Marcus","Travis","Shane","Devan","John","AJ","Ryan"], last: ["Cunliffe","Borja","Blas","Quinata","Mendiola","San Nicolas","Cepeda","Naputi"] },
  mo: { first: ["Chi","Kin","Wai","Ka","Man","Hou","Weng","Chon"], last: ["Lei","Chan","Lam","Ho","Che","Leong","Ung","Kuok"] },
  pk: { first: ["Hassan","Saddam","Otis","Zesh","Yousuf","McKeal","Rahis","Adeel"], last: ["Bashir","Ali","Hussain","Khan","Nabi","Rehman","Younas","Iqbal"] },
  kg: { first: ["Farkhat","Kimi","Bekzhan","Gulzhigit","Anton","Erbol","Aleksandr","Mirlan"], last: ["Sabyrbekov","Bernhardt","Shamurzaev","Israilov","Zemlianukhin","Kozubaev","Musabekov","Duishobekov"] },
  hk: { first: ["Wai","Chun","Tsz","Ka","Kin","Yat","Hei","Long"], last: ["Cheng","Wong","Chan","Lee","Law","Fung","Tsang","Ju"] },
  afg: { first: ["Faysal","Zohib","Farshad","Omran","Maziar","Noor","Amreddin","Balal"], last: ["Shayesteh","Amiri","Noori","Sharifi","Hotak","Amani","Haidari","Sadat"] },
  bi: { first: ["Fiston","Cédric","Saïdi","Karim","Youssouf","Frédéric","Landry","Blaise"], last: ["Abedi","Nsabimana","Bigirimana","Nahimana","Nduwarugira","Manirakiza","Hakizimana","Ndikumana"] },
  td: { first: ["Ézéchiel","Marius","Casimir","Nathan","Karl","Betoligar","Rodrigue","Yannick"], last: ["Ngadjadoum","Mbaïam","Djim","Kedigui","Allarassem","Ngaba","Doungous","Béral"] },
  so: { first: ["Abdi","Mohamed","Omar","Farhan","Said","Ali","Yusuf","Hassan"], last: ["Aden","Warsame","Ibrahim","Farah","Osman","Nur","Abdulle","Diriye"] },
  er: { first: ["Yonas","Henok","Filmon","Samuel","Robel","Simon","Dawit","Tesfay"], last: ["Tesfagabir","Weldu","Ghebremariam","Habtom","Okbay","Zaid","Berhane","Amanuel"] },
  ss: { first: ["James","Peter","Tiny","Roy","Emmanuel","Makuei","Dominic","Gabriel"], last: ["Moga","Deng","Wani","Lokosang","Ladu","Duku","Ater","Bol"] },
  st: { first: ["Harramiz","Buly","Amilton","Dabo","Kay","Zinho","Nedy","Gilson"], last: ["Lima","Aragão","Bonfim","Do Rosário","Costa","Cravid","Pontes","Neto"] },
  ne: { first: ["Moussa","Ismael","Boubacar","Amadou","Souleymane","Youssouf","Idrissa","Daouda"], last: ["Maazou","Hamidou","Adamou","Koffi","Ibrahim","Zakari","Oumarou","Sadou"] },
  et: { first: ["Getaneh","Shimelis","Yared","Abubeker","Mesud","Surafel","Dawit","Amanuel"], last: ["Kebede","Girma","Tadesse","Bekele","Assefa","Gebre","Hailu","Alemu"] },
  rw: { first: ["Jacques","Olivier","Eric","Yannick","Innocent","Emery","Djihad","Kevin"], last: ["Mugiraneza","Ndayishimiye","Niyonzima","Habimana","Rutanga","Bizimana","Nshuti","Gasana"] },
  mw: { first: ["Chawanangwa","Frank","Richard","Gomezgani","Yamikani","Peter","Charles","Micium"], last: ["Banda","Phiri","Chirwa","Msowoya","Nyirenda","Mkandawire","Kamwendo","Chembezi"] },
  bw: { first: ["Mogakolodi","Onkabetse","Thabang","Segolame","Mothusi","Kabelo","Tumisang","Gape"], last: ["Ngele","Moloi","Sebolai","Amos","Mogaladi","Motlhabankwe","Ditlhokwe","Kgetholetsile"] },
  lr: { first: ["William","Sam","Anthony","Mark","Kpah","Sylvanus","Terrence","Christopher"], last: ["Wleh","Doe","Gonkerwon","Toe","Kollie","Nyanabo","Cooper","Jackollie"] },
  cf: { first: ["Geoffrey","Louis","Yannick","Cédric","Hilaire","Habib","Éloge","Franchisky"], last: ["Kizito","Ngakosso","Yekpe","Yongwa","Namnganda","Mafouta","Doui","Séré"] },
  asa: { first: ["Rawlston","Ramin","Charles","Gene","Tale","Josh","Shalom","Patrick"], last: ["Natia","Suaesi","Ott","Misa","Va","Faapito","Tuiletufuga","Meredith"] },
  tv: { first: ["Alopua","Vaisua","Sione","Katalake","Etimoni","Petaia","Melo","Iotua"], last: ["Panapa","Elisala","Tinilau","Foua","Sopoaga","Manatu","Alefaio","Talavai"] },
  ki: { first: ["Kamoriki","Toromon","Rooti","Katumati","Teretia","Nendo","Tebwauea","Rimon"], last: ["Moote","Kabeaua","Timeon","Katia","Beia","Rabaua","Iaokiri","Tannang"] },
  vu: { first: ["Fenedy","Bong","Jacques","Brian","Tony","Nelson","Azariah","Kensi"], last: ["Simon","Kaltack","Naprapol","Wagavonovono","Iwai","Maleb","Warasi","Alick"] },
  ws: { first: ["Silao","Desmond","Tony","Alvin","Sale","Pele","Muliagatele","Gao"], last: ["Tavita","Faaiuaso","Malo","Toleafoa","Tunoa","Krause","Vaelua","Ah Fook"] },
  to: { first: ["Timote","Lafaele","Unaloto","Sione","Kilifi","Sunia","Sola","Malakai"], last: ["Moala","Vaitohi","Tuivailala","Uhi","Ngata","Faka","Havili","Tuita"] },
  ck: { first: ["Tepaeru","Alan","Harry","Campbell","Junior","Tulua","Ngametua","Sam"], last: ["Taripo","Napa","Piri","Framhein","Maui","Tararo","Elikana","Jim"] },
  nc: { first: ["Georges","César","Bertrand","Jean","Roy","Marius","Antoine","Joël"], last: ["Kaï","Wajoka","Hmae","Gope","Sinédo","Bearune","Wélépane","Kabeu"] },
  fj: { first: ["Setareki","Iosefo","Napolioni","Christopher","Antipas","Samuela","Merrill","Kolinio"], last: ["Seru","Naqelevuki","Dunadamu","Verevou","Baleinadogo","Hughes","Waqa","Tuilau"] },
  pf: { first: ["Teaonui","Lorenzo","Yohann","Alvin","Heimano","Raimana","Tamatoa","Ricky"], last: ["Chong Hue","Tinorua","Bennett","Tepa","Wong","Tetauira","Colombani","Taumihau"] },
  sb: { first: ["Micah","Raphael","Benjamin","Nelson","Joses","Gagame","Atkin","Tigi"], last: ["Lea","Wasi","Talo","Faarodo","Bibilo","Ngava","Omokirio","Kaltavara"] },
  sg: { first: ["Hariss","Faris","Ikhsan","Shawal","Song","Hafiz","Ilhan","Amirul"], last: ["Harun","Fandi","Maulana","Anumanthan","Pennefather","Sahdan","Van Huizen","Aiman"] },
  np: { first: ["Kiran","Anjan","Rohit","Bimal","Sujal","Suman","Ananta","Gorakh"], last: ["Chemjong","Limbu","Tamang","Gurung","Shrestha","Rai","Magar","Thapa"] },
  kh: { first: ["Chan","Sos","Keo","Nub","Reung","Sieng","Prak","Kang"], last: ["Vathanaka","Suchat","Kakada","Kanha","Boret","Chhin","Sothy","Vireak"] },
  mv: { first: ["Ali","Hamza","Ibrahim","Hassan","Naiz","Mohamed","Assad","Nazeeh"], last: ["Ashfaq","Fasir","Umair","Waheed","Rasheed","Yaugoob","Faisal","Nizam"] },
  bd: { first: ["Jamal","Tapu","Rakib","Sohel","Biplu","Mohammed","Sabbir","Rohit"], last: ["Bhuyan","Barman","Hossain","Islam","Rahman","Uddin","Mia","Ahmed"] },
  mn: { first: ["Tsend","Nyam","Ganbold","Bat","Tuguldur","Donorov","Norjmoo","Enkhjin"], last: ["Lumbengarav","Batbaatar","Ganbaatar","Tugsbayar","Dorjsuren","Enkhtaivan","Munkh-Erdene","Otgonbayar"] },
  lb: { first: ["Hassan","Mohamad","Bassel","Rabih","Nader","Karim","Soony","Kassem"], last: ["Maatouk","Haidar","Chahoud","Zein","El Ali","Antar","Dhaini","Kdouh"] },
  ps: { first: ["Oday","Mohammed","Yaser","Musab","Tamer","Islam","Mahmoud","Khaled"], last: ["Dabbagh","Al-Battat","Termanini","Salhi","Yameen","Rashid","Abu-Nahyeh","Kanaan"] },
  id: { first: ["Egy","Witan","Asnawi","Pratama","Rizky","Marselino","Evan","Rachmat"], last: ["Saputra","Wijaya","Setiawan","Ramadhan","Nugroho","Sudirman","Pranata","Firmansyah"] },
  my: { first: ["Safawi","Faisal","Akhyar","Syafiq","Arif","Nik","Hadi","Darren"], last: ["Rasid","Abdullah","Hazwan","Ramli","Baddrol","Talaha","Aziz","Corbin-Ong"] },
  ph: { first: ["Neil","John","Stephan","Amani","Kevin","Bienvenido","Patrick","Sandro"], last: ["Reyes","Santos","Cruz","Aguinaldo","Ramos","Bedic","Tabinas","Gayoso"] },
  tj: { first: ["Manuchehr","Komron","Ehson","Parvizdjon","Shervoni","Nuriddin","Vahdat","Alisher"], last: ["Dzhalilov","Ergashev","Panjshanbe","Nazarov","Rahimov","Vasiev","Tursunov","Hanonov"] },
  tm: { first: ["Arslanmyrat","Altymyrat","Myrat","Wepa","Guwanch","Serdar","Didar","Resul"], last: ["Amanov","Annaev","Orazov","Nurmyradov","Gurbanov","Saparov","Muhadow","Geldiyev"] },
  kp: { first: ["Kwang","Yong","Il","Chol","Song","Kum","Hyok","Jong"], last: ["Kim","Ri","Pak","Han","Choe","So","Kang","Jang"] },
  ye: { first: ["Ala","Ahmed","Nashwan","Waleed","Abdulwasea","Haitham","Mohammed","Fahd"], last: ["Al-Sasi","Al-Hubaishi","Mahdi","Al-Worafi","Al-Sarori","Boqshan","Al-Matari","Omar"] },
  mm: { first: ["Aung","Kyaw","Maung","Yan","Hein","Thiha","Nanda","Win"], last: ["Thu","Naing","Oo","Lwin","Htet","Ko","Soe","Tun"] },
  bh: { first: ["Sayed","Abdulla","Kamil","Mohamed","Jamal","Ahmed","Komail","Sami"], last: ["Al-Aswad","Marhoon","Al-Hashimi","Fardan","Isa","Salman","Al-Rumaihi","Jaafar"] },
  om: { first: ["Ali","Khalid","Ahmed","Muhsen","Zahir","Arshad","Salaah","Harib"], last: ["Al-Habsi","Al-Rawahi","Al-Mukhaini","Kaabi","Al-Alawi","Fawaz","Al-Ghassani","Saad"] },
  jo: { first: ["Yazan","Mousa","Ehsan","Baha","Nizar","Hamza","Anas","Mahmoud"], last: ["Al-Naimat","Al-Rashdan","Haddad","Al-Dardour","Olwan","Abu-Zreig","Al-Arab","Bani-Attiah"] },
  kw: { first: ["Yousef","Bader","Fahad","Sultan","Athbi","Hamad","Faisal","Meshari"], last: ["Al-Rashidi","Al-Ajmi","Al-Enezi","Al-Mutairi","Al-Fadhel","Khaled","Al-Sayed","Burais"] },
  th: { first: ["Sarach","Thitipan","Ekanit","Peeradon","Supachai","Worachit","Narubadin","Weerathep"], last: ["Yooyen","Promrak","Bunmathan","Songkrasin","Thongsong","Kesorat","Suksomkit","Chaikamdee"] },
  vn: { first: ["Quang","Cong","Van","Duc","Tuan","Hoang","Minh","Tien"], last: ["Nguyen","Tran","Le","Pham","Do","Vu","Bui","Dang"] },
  in: { first: ["Sunil","Sandesh","Anirudh","Gurpreet","Manvir","Rahul","Sahal","Brandon"], last: ["Singh","Kumar","Das","Fernandes","Thapa","Colaco","Krishna","Sahni"] },
  sy: { first: ["Omar","Mahmoud","Firas","Osama","Ibrahim","Khaled","Mardik","Ammar"], last: ["Al-Ahmad","Al-Khatib","Kalthoum","Al-Mawas","Mardikian","Al-Dali","Ismaeel","Haj-Mohamad"] },
  iq: { first: ["Ali","Mohammed","Ahmed","Hussein","Mustafa","Bashar","Amjad","Sherko"], last: ["Al-Hamdani","Kadhim","Rashid","Jasim","Salih","Faisal","Adnan","Hassan"] },
  ae: { first: ["Ali","Khalfan","Omar","Majed","Salem","Bandar","Harib","Yousef"], last: ["Al-Hammadi","Khalil","Al-Balushi","Saeed","Rashid","Juma","Mansoor","Al-Naqbi"] },
  uz: { first: ["Odil","Jasur","Otabek","Sardor","Azizbek","Islom","Jaloliddin","Abror"], last: ["Ergashev","Turaev","Nazarov","Yusupov","Karimov","Ismailov","Rashidov","Abdullaev"] },
  km: { first: ["Faïz","Ben","Nakibou","Rafidine","Kassim","Chaker","Ahmed","Youssouf"], last: ["Selemani","Abdou","Mmadi","Bakari","Ali","Soilihi","Hamada","Djoumoi"] },
  mu: { first: ["Jérôme","Kevin","Ashley","Bryan","Jonathan","Adrien","Fabrice","Warren"], last: ["Perle","Sophie","Lagesse","Cundasawmy","Bru","Casla","Nagen","Imrith"] },
  dj: { first: ["Farhan","Abdi","Guedi","Mohamed","Idriss","Warsama","Hassan","Saad"], last: ["Ali","Robleh","Farah","Ismael","Youssouf","Aden","Waberi","Bourhan"] },
  sc: { first: ["Kevin","Rocky","Don","Brandon","Steve","Gilmer","Nelson","Perry"], last: ["Betsy","Nourrice","Zialor","Freminot","Adeline","Melanie","Confait","Rose"] },
  sz: { first: ["Sabelo","Sanele","Felix","Tony","Sandile","Mduduzi","Njabulo","Wonder"], last: ["Dlamini","Nsibande","Mamba","Shongwe","Gamedze","Simelane","Motsa","Ngcamphalala"] },
  ls: { first: ["Tumelo","Nkoto","Motebang","Jane","Bokang","Litšepe","Katleho","Nkau"], last: ["Mokhehle","Ramabele","Kamela","Letsie","Mothebe","Lira","Mahlaba","Thibeli"] },
  zw: { first: ["Knowledge","Marshall","Tino","Khama","Terrence","Prince","Divine","Talent"], last: ["Moyo","Ndlovu","Chiwara","Mudimu","Sibanda","Dube","Makumbe","Chipezeze"] },
  ke: { first: ["Michael","Victor","Masoud","Eric","Cliff","Johanna","Ayub","Erico"], last: ["Otieno","Wanjala","Omondi","Ouma","Kimani","Mwendwa","Owino","Ochieng"] },
  tg: { first: ["Kodjo","Peniel","Serge","Roger","Yao","Komlan","Dové","Klousseh"], last: ["Agbégniadan","Djené","Aholou","Bodjona","Ayité","Dossévi","Akakpo","Womé"] },
  mr: { first: ["Aboubacar","Bakary","Hemeya","Moctar","Ismail","Adama","Yali","Souleymane"], last: ["Diallo","Wagne","Bessam","Yaslem","Sy","Sidi","Dellahi","Tanjy"] },
  gw: { first: ["Frédéric","Zezinho","Mama","Alfa","Braima","Nando","Toni","Carlos"], last: ["Mendy","Có","Djaló","Nanque","Semedo","Baldé","Cassamá","Injai"] },
  sl: { first: ["Mohamed","Kei","Musa","Alhaji","Umaru","Sheku","Osman","Ibrahim"], last: ["Kamara","Sesay","Turay","Bangura","Koroma","Conteh","Fofanah","Mansaray"] },
  ly: { first: ["Ahmed","Mohamed","Muaid","Sanad","Hamdou","Faisal","Ali","Anis"], last: ["Al-Ghazal","Krwaa","Al-Tera","Saltou","Bin Ali","Al-Mabrouk","Zubya","Ecchaikh"] },
  sd: { first: ["Mohamed","Saif","Abu","Yasir","Mustafa","Salah","Ramadan","Nasr"], last: ["Eldin","Bakhit","Tia","Abdelraheem","Kabashi","Musa","Hamed","Adam"] },
  na: { first: ["Peter","Deon","Petrus","Absalom","Riaan","Wangu","Ivan","Llewellyn"], last: ["Hotto","Nakhid","Katupose","Hanamub","Tjiueza","Muzeu","Stephanus","Kambindu"] },
  tz: { first: ["Simon","Himid","Novatus","Feisal","Farid","Ditram","Mudathir","Kelvin"], last: ["Msuva","Ulimwengu","Mnyamosi","Kapombe","Aggrey","Yakuba","Manula","Chama"] },
  cv: { first: ["Nuno","Kevin","Gilson","Jamiro","Steven","Ianique","Dylan","Roberto"], last: ["Tavares","Semedo","Lopes","Fernandes","Monteiro","Correia","Rocha","Delgado"] },
  ga: { first: ["Guélor","Bruno","Didier","Lloyd","Aaron","Johann","Denis","Anthony"], last: ["Ndong","Mabika","Poko","Ekomié","Nzé","Mombo","Mba","Oyono"] },
  zm: { first: ["Emmanuel","Kennedy","Given","Lameck","Clatous","Justin","Fred","Evans"], last: ["Banda","Phiri","Mulenga","Sakala","Tembo","Chirwa","Zulu","Kangwa"] },
  ug: { first: ["Emmanuel","Farouk","Denis","Allan","Khalid","Bobosi","Steven","Isaac"], last: ["Okwi","Miya","Kaddu","Wasswa","Serunkuma","Byaruhanga","Aucho","Mugume"] },
  cg: { first: ["Prince","Delvin","Ravy","Bhaïd","Fernand","Merveil","Junior","Yhoan"], last: ["Ondama","Bakouma","Ngakosso","Bissiki","Massengo","Ontsié","Mavoungou","Bantsimba"] },
  gq: { first: ["Emilio","Iban","Federico","Saul","Basilio","José","Pablo","Carlos"], last: ["Buyla","Obiang","Ganet","Akapo","Nchama","Micha","Envela","Bicoro"] },
  mz: { first: ["Reginaldo","Domingues","Bruno","Clésio","Telinho","Danilo","Nélson","Gildo"], last: ["Sitoe","Macamo","Cumbe","Uamusse","Mahulele","Come","Tembe","Chiquinho"] },
  gm: { first: ["Ebrima","Musa","Modou","Lamin","Bubacarr","Ablie","Assan","Yankuba"], last: ["Jallow","Ceesay","Colley","Sanneh","Touray","Darboe","Njie","Bojang"] },
  gh: { first: ["Kwame","Kofi","Yaw","Emmanuel","Mohammed","Daniel","Isaac","Abdul"], last: ["Mensah","Owusu","Boateng","Asante","Addo","Appiah","Sarpong","Agyemang"] },
  ml: { first: ["Amadou","Moussa","Ibrahima","Modibo","Cheick","Adama","Sekou","Bakary"], last: ["Traoré","Keïta","Coulibaly","Diarra","Sidibé","Konaté","Sangaré","Diallo"] },
  bf: { first: ["Issa","Bertrand","Cyrille","Abdoul","Hassane","Patrick","Adama","Blati"], last: ["Traoré","Ouédraogo","Sanou","Zongo","Kaboré","Nakoulma","Bandé","Compaoré"] },
  gy: { first: ["Trayon","Neil","Sam","Emery","Keanu","Quillan","Daniel","Omari"], last: ["Wilson","Benjamin","Reynolds","Abrams","Pereira","Fraser","Rodrigues","La Rose"] },
  bm: { first: ["Reggie","Dante","Zeiko","Justin","Milan","Willie","Osagi","Damon"], last: ["Bean","Smith","Simons","Trott","Robinson","Tucker","Dill","Outerbridge"] },
  bb: { first: ["Rashad","Hadan","Dario","Nick","Armani","Kadeem","Rico","Zico"], last: ["Harewood","Forde","Griffith","Gittens","Weatherhead","Belgrave","Sealy","Corbin"] },
  bs: { first: ["Lesly","Cameron","Nesley","Kyle","Dante","Woodly","Happy","Gilbert"], last: ["Rolle","Sweeting","Ferguson","Adderley","Bethel","Munroe","Deveaux","Stubbs"] },
  gd: { first: ["Jamal","Shandel","Myles","Delroy","Kithson","Aaron","Revere","Tyrone"], last: ["Charles","Phillip","Modeste","Bishop","Mitchell","Bubb","Straker","Redhead"] },
  ag: { first: ["Quinton","Peter","Myles","Randolph","Kenville","Tamarley","George","Vurlon"], last: ["Griffith","Thomas","Christian","Byers","Freeland","Simon","Weston","Jarvis"] },
  gt: { first: ["Carlos","José","Luis","Marco","Rodrigo","Óscar","Stheven","Jorge"], last: ["López","García","Morales","Ruiz","Girón","Contreras","Ceballos","Chóc"] },
  tt: { first: ["Kevin","Levi","Marvin","Nathan","Alvin","Sheldon","Aubrey","Duane"], last: ["Jones","John","Charles","Baptiste","Phillip","Guerra","Toussaint","Noel"] },
  ht: { first: ["Wilde","Jean","Frantz","Steeven","Ricardo","Kevin","Carl","Djimy"], last: ["Pierre","Jean","Louis","Charles","Joseph","Cadet","Étienne","Mondésir"] },
  cu: { first: ["Yordan","Maikel","Osvaldo","Ariel","Yasmani","Reynier","Onel","Luis"], last: ["Hernández","Pérez","González","Rodríguez","Sánchez","Domínguez","Torres","Alonso"] },
  cw: { first: ["Leandro","Kenji","Roly","Darryl","Shurandy","Gino","Rangelo","Sheldon"], last: ["Martis","Isenia","Sillé","Obispo","Doran","Comvalius","Girigori","Statia"] },
  sr: { first: ["Kelvin","Roberto","Denzel","Ivenzo","Warner","Damil","Stefano","Shaquille"], last: ["Vlijter","Blinker","Landveld","Sordam","Pinas","Emanuels","Tjon","Braafhart"] },
  do: { first: ["Junior","Domingo","Peter","Ángel","Jonathan","Edison","Mariano","Óscar"], last: ["Ramírez","Peña","Reyes","Martínez","De la Cruz","Encarnación","Guzmán","Batista"] },
  ni: { first: ["Juan","Byron","Carlos","Jaime","Luis","Marlon","Emilio","Óscar"], last: ["López","Palacios","Fajardo","Bonilla","Zapata","Aráuz","Montoya","Flores"] },
  bo: { first: ["Marcelo","Carlos","Diego","Bruno","Jhon","Roberto","Moisés","Erwin"], last: ["Mamani","Quispe","Vaca","Justiniano","Arce","Villarroel","Chumacero","Saucedo"] },
  pa: { first: ["Aníbal","Gabriel","Édgar","Ismael","Cecilio","Fidel","Abdiel","Harold"], last: ["Quintero","Murillo","Escobar","Ovalle","Rentería","Godoy","Andrade","Samaniego"] },
  hn: { first: ["Carlos","Bryan","Jorge","Kevin","Deybi","Elmer","Rigoberto","Óscar"], last: ["Discua","Núñez","Palma","Flores","Rodríguez","Lozano","Martínez","Padilla"] },
  jm: { first: ["Leon","Andre","Damion","Bobby","Devon","Ricardo","Shamar","Kemar"], last: ["Brown","Grant","Reid","Powell","Campbell","Morrison","Bailey","Clarke"] },
  pe: { first: ["Diego","Christian","Renato","André","Luis","Sergio","Jefferson","Bryan"], last: ["Quispe","Flores","Rojas","Castillo","Ramos","Vargas","Sánchez","Mendoza"] },
  cr: { first: ["Bryan","Joel","Randall","Óscar","Marco","Allan","David","Kenneth"], last: ["Ramírez","Vargas","Mora","Segura","Calvo","Fonseca","Núñez","Zamora"] },
  mt: { first: ["Luke","Matthew","Jake","Kurt","Ryan","Andrei","Zach","Neil"], last: ["Borg","Camilleri","Farrugia","Grech","Vella","Zammit","Attard","Micallef"] },
  fo: { first: ["Hanus","Gunnar","Jógvan","Rógvi","Sølvi","Bárður","Petur","Heini"], last: ["Joensen","Hansen","Olsen","Jacobsen","Poulsen","Davidsen","Niclasen","Djurhuus"] },
  ad: { first: ["Marc","Jordi","Pol","Aleix","Guillem","Ricard","Cristian","Adrià"], last: ["Rubio","García","Vales","Lima","Sánchez","Fernández","Pujol","Font"] },
  sm: { first: ["Matteo","Luca","Nicola","Alessandro","Marco","Filippo","Davide","Simone"], last: ["Gasperoni","Berardi","Rossi","Zafferani","Guidi","Cervellini","Michelotti","Tomassini"] },
  li: { first: ["Nico","Sandro","Fabio","Yves","Lars","Dennis","Martin","Simon"], last: ["Hasler","Frick","Büchel","Marxer","Beck","Ospelt","Wolfinger","Kaufmann"] },
  gi: { first: ["Liam","Kyle","Aaron","Jayce","Reece","Ethan","Louie","Tjay"], last: ["Torres","Walker","Olivero","Payas","Ferro","Cortes","Bruzon","Mauro"] },
  me: { first: ["Nikola","Marko","Stefan","Luka","Balša","Vuk","Miloš","Petar"], last: ["Popović","Vuković","Đukanović","Radović","Vujović","Knežević","Perović","Božović"] },
  xk: { first: ["Arben","Fisnik","Blerim","Egzon","Valon","Leart","Drilon","Gëzim"], last: ["Krasniqi","Gashi","Morina","Kelmendi","Rexhepi","Bytyqi","Sylejmani","Ademi"] },
  am: { first: ["Aram","Davit","Hovhannes","Narek","Tigran","Vahe","Gor","Armen"], last: ["Sarkisian","Petrosyan","Grigoryan","Hakobyan","Avetisyan","Karapetyan","Manukyan","Harutyunyan"] },
  az: { first: ["Elvin","Rashad","Kamran","Nijat","Rauf","Emin","Tural","Orkhan"], last: ["Aliyev","Mammadov","Hasanov","Guliyev","Huseynov","Ismayilov","Rahimov","Aghayev"] },
  cy: { first: ["Andreas","Christos","Giorgos","Kyriakos","Marios","Petros","Nikos","Panagiotis"], last: ["Georgiou","Christodoulou","Konstantinou","Ioannou","Nicolaou","Charalambous","Michael","Savva"] },
  md: { first: ["Ion","Vasile","Andrei","Mihai","Nicolae","Dumitru","Radu","Sergiu"], last: ["Rusu","Ciobanu","Popa","Cebotari","Rotaru","Lungu","Cazacu","Guțu"] },
  lu: { first: ["Luc","Ben","Tom","Max","Gilles","Yann","Noah","Théo"], last: ["Weis","Schmit","Hoffmann","Muller","Thill","Weber","Reuter","Klein"] },
  lv: { first: ["Jānis","Roberts","Kristers","Artūrs","Edgars","Kaspars","Toms","Rihards"], last: ["Bērziņš","Kalniņš","Ozols","Liepiņš","Krūmiņš","Vītols","Zariņš","Balodis"] },
  lt: { first: ["Tomas","Mantas","Lukas","Deividas","Rokas","Marius","Paulius","Karolis"], last: ["Kazlauskas","Petrauskas","Jankauskas","Stankevičius","Vasiliauskas","Butkus","Žukauskas","Urbonas"] },
  ee: { first: ["Martin","Rasmus","Karl","Henri","Marten","Sander","Robert","Kristjan"], last: ["Tamm","Saar","Mägi","Kask","Kukk","Rebane","Ilves","Pärn"] },
  kz: { first: ["Nurlan","Arman","Timur","Aibek","Daniyar","Yerlan","Askar","Baurzhan"], last: ["Akhmetov","Ospanov","Nurgaliyev","Zhaksybekov","Tulegenov","Bekbolat","Serikov","Amanzholov"] },
  by: { first: ["Aleksandr","Ivan","Dmitry","Yuri","Sergei","Nikolai","Vitali","Andrei"], last: ["Kravchenko","Novik","Savitski","Kozlov","Volkov","Bondarenko","Sidorenko","Yermakov"] },
  si: { first: ["Luka","Jan","Nejc","Žan","Rok","Matej","Tim","Miha"], last: ["Novak","Kovačič","Horvat","Zupančič","Krajnc","Vidmar","Golob","Kos"] },
  is: { first: ["Jón","Sigurður","Gunnar","Ólafur","Arnar","Birkir","Kári","Baldur"], last: ["Jónsson","Sigurðsson","Guðmundsson","Einarsson","Gunnarsson","Ólafsson","Þórsson","Magnússon"] },
  ge: { first: ["Giorgi","Levan","Nika","Davit","Irakli","Zurab","Saba","Luka"], last: ["Beridze","Gelashvili","Kapanadze","Tsiklauri","Lomidze","Chkheidze","Nadiradze","Maisuradze"] },
  al: { first: ["Klodian","Ardit","Endri","Erjon","Kreshnik","Florian","Besnik","Armando"], last: ["Hoxha","Shala","Krasniqi","Berisha","Gjoni","Prifti","Dervishi","Bregu"] },
  mk: { first: ["Stefan","Filip","Marjan","Darko","Bojan","Goran","Nikola","Dejan"], last: ["Stojanov","Petrov","Nikolov","Ilievski","Angelov","Mitrev","Jovanov","Georgiev"] },
  gr: { first: ["Giorgos","Dimitris","Nikos","Kostas","Yannis","Vasilis","Petros","Stavros"], last: ["Papadopoulos","Nikolaidis","Georgiou","Vlachos","Ioannou","Makris","Samaras","Antoniou"] },
  dk: { first: ["Mikkel","Frederik","Mads","Kasper","Emil","Jonas","Rasmus","Anders"], last: ["Jensen","Nielsen","Hansen","Andersen","Pedersen","Larsen","Sørensen","Møller"] },
  ro: { first: ["Andrei","Ionuț","Cristian","Florin","Gabriel","Răzvan","Alexandru","Mihai"], last: ["Popescu","Ionescu","Dumitru","Stan","Munteanu","Radu","Constantin","Marin"] },
  sk: { first: ["Marek","Juraj","Tomáš","Martin","Peter","Lukáš","Michal","Patrik"], last: ["Horváth","Kováč","Varga","Novák","Baláž","Tóth","Krajčí","Hudák"] },
  fr: { first: ["Théo", "Enzo", "Kylian", "Maël", "Rayan", "Antoine", "Jules", "Sofiane"], last: ["Moreau", "Dubois", "Diallo", "Lefèvre", "Marchand", "Girard", "Benali", "Roche"] },
  br: { first: ["Thiago", "Gabriel", "Vinícius", "João", "Caio", "Rafael", "Matheus", "Luan"], last: ["Silva", "Santos", "Oliveira", "Costa", "Ferreira", "Rocha", "Almeida", "Moraes"] },
  en: { first: ["Harry", "Jude", "Ollie", "Marcus", "Callum", "Reece", "Jack", "Theo"], last: ["Walker", "Bennett", "Shaw", "Hughes", "Palmer", "Barnes", "Ward", "Foster"] },
  es: { first: ["Pablo", "Álvaro", "Iker", "Dani", "Sergio", "Marcos", "Adrián", "Unai"], last: ["García", "Navarro", "Torres", "Vidal", "Serrano", "Iglesias", "Romero", "Alonso"] },
  it: { first: ["Matteo", "Lorenzo", "Federico", "Sandro", "Nicolò", "Davide", "Marco", "Gianluca"], last: ["Bianchi", "Ricci", "Conti", "Greco", "Marino", "Ferrara", "Gallo", "Rizzo"] },
  de: { first: ["Leon", "Jamal", "Florian", "Niklas", "Jonas", "Kai", "Timo", "Maximilian"], last: ["Müller", "Wagner", "Fischer", "Becker", "Hoffmann", "Schulz", "Krüger", "Brandt"] },
  pt: { first: ["Miguel", "André", "Pedro", "Ricardo", "Tiago", "Hugo", "Bruno", "Filipe"], last: ["Costa", "Pereira", "Oliveira", "Sousa", "Rodrigues", "Martins", "Gomes", "Lopes"] },
  tr: { first: ["Mehmet", "Mustafa", "Ahmet", "Ali", "Emre", "Burak", "Murat", "Serkan"], last: ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Aydın", "Öztürk"] },
  ma: { first: ["Mohamed", "Youssef", "Karim", "Omar", "Hamza", "Anas", "Reda", "Mehdi"], last: ["Alaoui", "Bennani", "Idrissi", "El Amrani", "Bouchta", "Sqalli", "Berrada", "Lahlou"] },
  sn: { first: ["Moussa", "Abdou", "Ousmane", "Modou", "Cheikh", "Alioune", "Mamadou", "Babacar"], last: ["Diop", "Ndiaye", "Fall", "Sow", "Ba", "Sy", "Diouf", "Sène"] },
  ci: { first: ["Koffi", "Yao", "Konan", "Aboubacar", "Ismaël", "Sékou", "Adama", "Brou"], last: ["Koné", "Kouassi", "Kouadio", "Aka", "Bamba", "Diaby", "Konaté", "N'Guessan"] },
  dz: { first: ["Mohamed", "Amine", "Yacine", "Karim", "Sofiane", "Bilal", "Rachid", "Farid"], last: ["Benali", "Belkacem", "Haddad", "Meziane", "Mansouri", "Cherif", "Bouazza", "Saadi"] },
  nl: { first: ["Bram", "Sem", "Lars", "Thijs", "Tim", "Jesse", "Stijn", "Bas"], last: ["Jansen", "van den Berg", "Bakker", "Smit", "Mulder", "de Boer", "Willems", "Vos"] },
  ar: { first: ["Santiago", "Mateo", "Bautista", "Benjamín", "Tomás", "Joaquín", "Lucas", "Facundo"], last: ["González", "Rodríguez", "Fernández", "López", "García", "Pérez", "Gómez", "Díaz"] },
  tn: { first: ["Mohamed", "Amine", "Wassim", "Bilel", "Nizar", "Oussama", "Hedi", "Skander"], last: ["Ben Ali", "Trabelsi", "Gharbi", "Chaabane", "Nasri", "Bouazizi", "Mejri", "Hamdi"] },
  gn: { first: ["Mamadou", "Ibrahima", "Alpha", "Ousmane", "Sékou", "Aboubacar", "Mohamed", "Thierno"], last: ["Diallo", "Barry", "Bah", "Camara", "Sylla", "Condé", "Touré", "Sow"] },
  cm: { first: ["Jean", "Paul", "Éric", "Serge", "Landry", "Bertrand", "Aurélien", "Hervé"], last: ["Ndongo", "Mbarga", "Fotso", "Ateba", "Etoundi", "Manga", "Owona", "Essomba"] },
  be: { first: ["Thomas", "Louis", "Lucas", "Nathan", "Maxime", "Simon", "Victor", "Arthur"], last: ["Peeters", "Janssens", "Maes", "Wouters", "Claes", "Willems", "Goossens", "De Smet"] },
  ch: { first: ["Luca", "Noah", "Leon", "Elias", "Nico", "Julian", "Fabio", "Samuel"], last: ["Müller", "Meier", "Schmid", "Keller", "Weber", "Huber", "Steiner", "Brunner"] },
  no: { first: ["Håkon", "Magnus", "Emil", "Oskar", "Henrik", "Even", "Sindre", "Jonas"], last: ["Hansen", "Johansen", "Olsen", "Larsen", "Andersen", "Pedersen", "Nilsen", "Kristiansen"] },
  fi: { first: ["Teemu", "Joel", "Onni", "Eetu", "Niko", "Leo", "Aleksi", "Miro"], last: ["Virtanen", "Korhonen", "Nieminen", "Mäkelä", "Hämäläinen", "Laine", "Koskinen", "Heikkinen"] },
  se: { first: ["Erik", "Gustav", "Lars", "Anders", "Johan", "Nils", "Oskar", "Emil"], last: ["Andersson", "Johansson", "Karlsson", "Nilsson", "Eriksson", "Olsson", "Persson", "Svensson"] },
  pl: { first: ["Jakub", "Piotr", "Michał", "Tomasz", "Marcin", "Paweł", "Krzysztof", "Mateusz"], last: ["Nowak", "Kowalski", "Wiśniewski", "Wójcik", "Kowalczyk", "Kamiński", "Kaczmarek", "Mazur"] },
  bg: { first: ["Georgi", "Ivan", "Dimitar", "Nikolay", "Stefan", "Petar", "Aleksandar", "Martin"], last: ["Ivanov", "Georgiev", "Dimitrov", "Petrov", "Kolev", "Stoyanov", "Todorov", "Angelov"] },
  jp: { first: ["Haruto", "Sota", "Yuto", "Ren", "Riku", "Kaito", "Sora", "Hinata"], last: ["Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura"] },
  kr: { first: ["Min-jun", "Seo-jun", "Do-yun", "Ji-ho", "Ha-jun", "Eun-woo", "Si-woo", "Ju-won"], last: ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon"] },
  cn: { first: ["Wei", "Hao", "Jun", "Lei", "Ming", "Peng", "Tao", "Bo"], last: ["Wang", "Li", "Zhang", "Liu", "Chen", "Yang", "Zhao", "Huang"] },
  au: { first: ["Jack", "Liam", "Noah", "Oliver", "William", "Cooper", "Lachlan", "Ethan"], last: ["Smith", "Jones", "Williams", "Brown", "Wilson", "Taylor", "White", "Ryan"] },
  nz: { first: ["James", "Ben", "Riley", "Cody", "Kane", "Tama", "Nikau", "Ari"], last: ["Walker", "Thompson", "Baker", "Ngata", "Wright", "Reid", "Harris", "Rewiti"] },
  pg: { first: ["David", "John", "Peter", "Samuel", "Raymond", "Nigel", "Tau", "Kolu"], last: ["Kila", "Wai", "Aria", "Bai", "Gau", "Namu", "Lohia", "Vada"] },
  us: { first: ["James", "Michael", "David", "Chris", "Tyler", "Brandon", "Kevin", "Jordan"], last: ["Smith", "Johnson", "Williams", "Brown", "Miller", "Davis", "Garcia", "Martinez"] },
  eg: { first: ["Mohamed", "Ahmed", "Mahmoud", "Omar", "Youssef", "Karim", "Mostafa", "Amr"], last: ["Hassan", "Fahmy", "Ibrahim", "Nour", "Fouad", "Rachad", "Adel", "Sami"] },
  za: { first: ["Thabo", "Sipho", "Themba", "Lungelo", "Kagiso", "Bongani", "Lucas", "Ryan"], last: ["Sithole", "Mthembu", "Dlamini", "Zwane", "Molefe", "Nkosi", "Botha", "Radebe"] },
  ba: { first: ["Amar", "Emir", "Haris", "Adnan", "Mirza", "Damir", "Senad", "Tarik"], last: ["Hodžić", "Begić", "Delić", "Mujić", "Softić", "Alić", "Bešić", "Salković"] },
  py: { first: ["Juan", "Óscar", "Diego", "Miguel", "Julio", "Ángel", "Rodrigo", "Cristian"], last: ["González", "Benítez", "Rojas", "Cáceres", "Villalba", "Ortiz", "Ramírez", "Duarte"] },
  cl: { first: ["Matías", "Benjamín", "Vicente", "Cristóbal", "Joaquín", "Diego", "Tomás", "Sebastián"], last: ["Muñoz", "Rojas", "Díaz", "Contreras", "Fuentes", "Morales", "Vergara", "Araya"] },
  ca: { first: ["Liam", "Noah", "Owen", "Ethan", "Lucas", "Nathan", "Aiden", "Mason"], last: ["Roy", "Tremblay", "Gagnon", "Smith", "Wilson", "Martin", "Leblanc", "Côté"] },
  sv: { first: ["José", "Carlos", "Manuel", "Luis", "Rafael", "Mario", "Nelson", "Wilfredo"], last: ["Hernández", "Rodríguez", "Menjívar", "Alas", "Cornejo", "Portillo", "Rivas", "Guevara"] },
  ao: { first: ["João", "Manuel", "Alberto", "Domingos", "Carlos", "Nuno", "Gilberto", "Anísio"], last: ["dos Santos", "Fernandes", "Mateus", "Kiala", "Bento", "Neto", "Lunga", "Cambinda"] },
  mg: { first: ["Tafita", "Andry", "Tojo", "Miora", "Rado", "Nirina", "Faniry", "Tsiory"], last: ["Rakoto", "Rabe", "Randria", "Ratsimba", "Razafy", "Andrianina", "Rasoa", "Andriama"] },
  ng: { first: ["Chidi", "Emeka", "Tunde", "Ifeanyi", "Segun", "Kelechi", "Musa", "Uche"], last: ["Okafor", "Eze", "Adeyemi", "Okonkwo", "Nwosu", "Bello", "Okoro", "Balogun"] },
  sa: { first: ["Mohammed", "Abdullah", "Fahad", "Salman", "Turki", "Nawaf", "Salem", "Yasser"], last: ["Al-Harbi", "Al-Dossari", "Al-Shehri", "Al-Ghamdi", "Al-Qahtani", "Al-Otaibi", "Al-Zahrani", "Al-Malki"] },
  qa: { first: ["Akram", "Hassan", "Karim", "Yusuf", "Tariq", "Jassim", "Nasser", "Khalid"], last: ["Al-Thani", "Al-Kuwari", "Al-Mannai", "Al-Sulaiti", "Al-Naimi", "Al-Emadi", "Al-Ansari", "Al-Marri"] },
  ir: { first: ["Ali", "Reza", "Mehdi", "Amir", "Hossein", "Karim", "Saeed", "Omid"], last: ["Rezaei", "Karimi", "Hosseini", "Ahmadi", "Mohammadi", "Ghorbani", "Nouri", "Jafari"] },
  at: { first: ["Lukas", "Marcel", "David", "Stefan", "Michael", "Andreas", "Florian", "Julian"], last: ["Gruber", "Huber", "Bauer", "Wagner", "Maier", "Steiner", "Moser", "Berger"] },
  ec: { first: ["Juan", "Carlos", "Ángel", "Jefferson", "Bryan", "Moisés", "Christian", "Michael"], last: ["Castillo", "Mendoza", "Zambrano", "Cedeño", "Preciado", "Quiñónez", "Vera", "Ortiz"] },
  ua: { first: ["Oleksandr", "Serhiy", "Mykola", "Taras", "Ihor", "Vitaliy", "Dmytro", "Bohdan"], last: ["Bondarenko", "Tkachenko", "Melnyk", "Boyko", "Shevchuk", "Polishchuk", "Marchenko", "Savchenko"] },
  ru: { first: ["Ivan", "Sergei", "Dmitri", "Alexei", "Nikolai", "Andrei", "Maxim", "Roman"], last: ["Ivanov", "Smirnov", "Petrov", "Sokolov", "Popov", "Volkov", "Kozlov", "Morozov"] },
  wal: { first: ["Dylan", "Rhys", "Owen", "Gareth", "Ieuan", "Cai", "Morgan", "Tomos"], last: ["Jones", "Williams", "Davies", "Evans", "Thomas", "Roberts", "Lewis", "Hughes"] },
  rs: { first: ["Nikola", "Stefan", "Marko", "Luka", "Miloš", "Nemanja", "Aleksandar", "Filip"], last: ["Jovanović", "Petrović", "Nikolić", "Marković", "Đorđević", "Stojanović", "Ilić", "Popović"] },
  hu: { first: ["Bence", "Máté", "Levente", "Dávid", "Ádám", "Balázs", "Gergő", "Zoltán"], last: ["Nagy", "Kovács", "Tóth", "Szabó", "Horváth", "Varga", "Kiss", "Molnár"] },
  sco: { first: ["Callum", "Ryan", "Scott", "Kieran", "Grant", "Lewis", "Finlay", "Angus"], last: ["MacDonald", "Campbell", "Stewart", "Robertson", "Murray", "Fraser", "Ross", "Sinclair"] },
  ie: { first: ["Cian", "Seán", "Conor", "Liam", "Aidan", "Darragh", "Eoin", "Fionn"], last: ["Murphy", "Kelly", "O'Brien", "Ryan", "Byrne", "Walsh", "O'Connor", "Doyle"] },
  nir: { first: ["Jamie", "Corey", "Reece", "Kyle", "Shea", "Caolan", "Dale", "Josh"], last: ["Thompson", "Wilson", "Patterson", "Boyd", "Doherty", "McLaughlin", "Neill", "Ferguson"] },
  ve: { first: ["José", "Luis", "Carlos", "Darwin", "Yeferson", "Eduardo", "Tomás", "Andrés"], last: ["Rojas", "Hernández", "González", "Guerra", "Chacón", "Rivas", "Herrera", "Moreno"] },
  cz: { first: ["Jakub", "Tomáš", "Lukáš", "Martin", "Petr", "Ondřej", "David", "Filip"], last: ["Novák", "Svoboda", "Novotný", "Dvořák", "Černý", "Procházka", "Kučera", "Veselý"] },
  mx: { first: ["José", "Juan", "Luis", "Carlos", "Miguel", "Diego", "Fernando", "Ángel"], last: ["Hernández", "García", "Martínez", "López", "González", "Pérez", "Sánchez", "Ramírez"] },
  co: { first: ["Andrés", "Camilo", "Julián", "Santiago", "Sebastián", "Mateo", "Felipe", "Juan"], last: ["Rodríguez", "Gómez", "González", "Martínez", "García", "López", "Ramírez", "Muñoz"] },
  bj: { first: ["Kévin", "Rodrigue", "Cédric", "Marcel", "David", "Sylvain", "Roland", "Gaël"], last: ["Hounkpatin", "Dossou", "Gbaguidi", "Tossou", "Agbessi", "Aholou", "Houngbédji", "Adjovi"] },
  hr: { first: ["Ivan", "Marko", "Ante", "Tomislav", "Petar", "Filip", "Domagoj", "Karlo"], last: ["Horvat", "Kovačević", "Babić", "Marić", "Jurić", "Novak", "Knežević", "Petrović"] },
  uy: { first: ["Santiago", "Mateo", "Bruno", "Joaquín", "Emiliano", "Gonzalo", "Martín", "Nicolás"], last: ["Rodríguez", "Fernández", "González", "Pérez", "García", "Martínez", "López", "Silva"] },
  cd: { first: ["Jean", "Christian", "Yannick", "Glody", "Trésor", "Gédéon", "Fiston", "Divin"], last: ["Kabongo", "Mukendi", "Ilunga", "Tshimanga", "Kalala", "Kasongo", "Mwamba", "Ngoy"] },
};

// --- Hygiène de vie (choisie à la création) ---------------------------------
// fx appliqués au départ + potBonus sur le potentiel caché.
const LIFESTYLES = [
  { id: "pro", name: "Hygiène de pro", icon: "🥗", desc: "Couché à 22h, diète stricte, zéro écart. Les coéquipiers se moquent, les recruteurs adorent.", fx: { dis: 18, form: 6, c: -4 }, potBonus: 2 },
  { id: "balance", name: "Équilibré", icon: "⚖️", desc: "Sérieux à l'entraînement, détendu en dehors. Ni moine, ni fêtard.", fx: { dis: 6, mor: 4 }, potBonus: 0 },
  { id: "street", name: "La belle vie", icon: "🎉", desc: "Les sorties, les potes, les réseaux. Le talent fera le reste… non ?", fx: { dis: -12, c: 8, mor: 6, form: -4 }, potBonus: -1 },
];

// --- Entourage (choisi à la création) ----------------------------------------
// academy : modificateurs de poids sur le niveau du centre de formation
// qui vous repère. flag : drapeau d'histoire posé dès le départ.
const ENTOURAGES = [
  { id: "family", name: "Famille encadrante", icon: "👨‍👩‍👦", desc: "Des parents présents qui gèrent tout : contrats, école, équilibre.", fx: { dis: 8, m: 4 }, academy: { d1: 6, elite: 2 } },
  { id: "shark", name: "Agent ambitieux", icon: "🦈", desc: "Un jeune agent aux dents longues vous a repéré. Il promet les sommets — et prend sa part.", fx: { rep: 6, dis: -4 }, academy: { elite: 10, d1: 2 }, flag: "shark_agent" },
  { id: "crew", name: "La bande du quartier", icon: "🤙", desc: "Vos amis d'enfance vous suivent partout. Fidèles, bruyants, incontrôlables.", fx: { c: 6, mor: 8, dis: -8 }, academy: { regional: 8, elite: -6 }, flag: "crew_entourage" },
];

// --- Trajectoires de carrière -------------------------------------------
// Tirée en secret à la création (biais selon l'origine), révélée sur la
// fiche finale. Module la vitesse de progression selon l'âge — c'est elle
// qui permet les phénomènes à 85 d'OVR à 20 ans comme les carrières en
// dents de scie. w = poids de tirage.
const TRAJECTORIES = [
  { id: "normal", w: 26, label: "Progression classique", desc: "Une montée en puissance régulière." },
  { id: "steady", w: 13, label: "Lente mais sûre", desc: "Moins de fulgurances, plus de longévité." },
  { id: "early", w: 11, label: "Explosion précoce", desc: "Un talent qui brûle les étapes dès l'adolescence." },
  { id: "late", w: 12, label: "Révélation tardive", desc: "Le déclic arrive quand on ne l'attendait plus." },
  { id: "chaotic", w: 12, label: "Montagnes russes", desc: "Des saisons stratosphériques, d'autres à oublier." },
  { id: "unstable", w: 9, label: "Diamant instable", desc: "Un potentiel immense, un équilibre fragile." },
  { id: "flash", w: 8, label: "Météore", desc: "Phénoménal à 18 ans… puis le plafond arrive vite." },
  { id: "surge", w: 9, label: "Déclic fulgurant", desc: "Banal des années, puis une explosion soudaine." },
];

// --- Numéros de maillot en sélection ------------------------------------
// Le numéro se GAGNE. On débute avec un numéro de bout de banc (21-23), on
// hérite d'un numéro de titulaire en devenant cadre, et les numéros mythiques
// — le 1, le 9, le 10 — sont réservés aux tout meilleurs. Il ne redescend
// jamais : on ne perd pas le 10 après une saison moyenne.
const NAT_NUMBERS = {
  gk: { debut: [23, 22, 16], cadre: [12, 16], star: [1] },
  def: { debut: [21, 15, 13], cadre: [3, 2, 5], star: [4, 6] },
  mil: { debut: [20, 18, 14], cadre: [8, 6, 14], star: [10] },
  att: { debut: [19, 22, 17], cadre: [11, 17], star: [9, 7] },
};

// --- Postes -------------------------------------------------------------
// goalRate/assistRate : rendement offensif de base par match (modulé
// par la technique et la forme dans engine.js).
const POSITIONS = [
  { id: "att", name: "Attaquant", icon: "⚡", goalRate: 0.6, assistRate: 0.18, desc: "Vivre et mourir pour le but. Les statistiques qui font les légendes… et les critiques quand elles se tarissent." },
  { id: "mil", name: "Milieu", icon: "🎩", goalRate: 0.24, assistRate: 0.4, desc: "Le chef d'orchestre. Moins de buts, plus de contrôle : c'est vous qui donnez le tempo du jeu." },
  { id: "def", name: "Défenseur", icon: "🛡️", goalRate: 0.08, assistRate: 0.09, desc: "L'art de l'ombre. Peu de gloire statistique, mais les grandes équipes se construisent derrière." },
  { id: "gk", name: "Gardien", icon: "🧤", goalRate: 0.004, assistRate: 0.01, desc: "Seul face à tous. Un poste ingrat où une carrière se joue sur des réflexes et des nerfs d'acier." },
];

// --- Archétypes de jeu (spécialisation choisie entre 18 et 21 ans) ----------
// mods : multiplicateurs appliqués chaque saison — goals/assists/cs
// (clean sheets), rating (delta sur la note), mGrowth (mental annuel bonus).
// Un archétype rend les statistiques crédibles : un renard des surfaces
// marque plus mais crée moins, un maestro distribue mais défend peu.
const ARCHETYPES = [
  // Attaquants
  { id: "fox", pos: "att", name: "Renard des surfaces", icon: "🦊", desc: "Toujours au bon endroit. Le but avant tout, le reste ensuite.", effect: "+30% buts · −35% passes décisives", mods: { goals: 1.3, assists: 0.65 } },
  { id: "complete", pos: "att", name: "Attaquant complet", icon: "🎯", desc: "Marquer, faire marquer, peser sur chaque défense.", effect: "+8% buts · +15% passes · note +0,05", mods: { goals: 1.08, assists: 1.15, rating: 0.05 } },
  { id: "winger", pos: "att", name: "Ailier dribbleur", icon: "🌀", desc: "Le déséquilibre permanent : un contre un, encore et encore.", effect: "+40% passes décisives · −15% buts", mods: { goals: 0.85, assists: 1.4 } },
  { id: "false9", pos: "att", name: "Faux neuf", icon: "🎭", desc: "Décrocher, aimanter, libérer les autres : l'attaquant chef d'orchestre.", effect: "+55% passes · −25% buts · note +0,05", mods: { goals: 0.75, assists: 1.55, rating: 0.05 } },
  // Milieux
  { id: "anchor", pos: "mil", name: "Sentinelle", icon: "⚓", desc: "L'équilibre de toute l'équipe repose sur vos épaules.", effect: "note +0,15 · peu de stats offensives", mods: { goals: 0.5, assists: 0.75, rating: 0.15 } },
  { id: "b2b", pos: "mil", name: "Box-to-box", icon: "🚂", desc: "Douze kilomètres par match, présent dans les deux surfaces.", effect: "+25% buts · +5% passes", mods: { goals: 1.25, assists: 1.05 } },
  { id: "maestro", pos: "mil", name: "Maestro", icon: "🎼", desc: "Le tempo, les angles, la dernière passe : tout passe par vous.", effect: "+50% passes décisives · −20% buts", mods: { goals: 0.8, assists: 1.5 } },
  { id: "cam", pos: "mil", name: "Meneur offensif", icon: "✨", desc: "Entre les lignes, là où se décident les matchs.", effect: "+35% buts · +25% passes · note −0,05", mods: { goals: 1.35, assists: 1.25, rating: -0.05 } },
  // Défenseurs
  { id: "stopper", pos: "def", name: "Stoppeur", icon: "🧱", desc: "Le duel, l'impact, le kilomètre zéro de la défense.", effect: "note +0,10 · duels gagnés", mods: { goals: 0.9, assists: 0.7, rating: 0.1 } },
  { id: "libero", pos: "def", name: "Défenseur relanceur", icon: "🧭", desc: "La première passe qui casse les lignes part de vos pieds.", effect: "+50% passes décisives · note +0,05", mods: { assists: 1.5, rating: 0.05 } },
  { id: "wingback", pos: "def", name: "Latéral offensif", icon: "🛩️", desc: "Un couloir entier pour vous, de votre surface à la leur.", effect: "+90% passes · +30% buts · note −0,05", mods: { goals: 1.3, assists: 1.9, rating: -0.05 } },
  { id: "boss", pos: "def", name: "Patron de la défense", icon: "🛡️", desc: "La voix qui organise, replace et rassure toute une équipe.", effect: "note +0,15 · mental +1 par saison", mods: { rating: 0.15, mGrowth: 1 } },
  // Gardiens
  { id: "line", pos: "gk", name: "Gardien de ligne", icon: "🥅", desc: "Sur sa ligne, tout simplement infranchissable.", effect: "+15% clean sheets", mods: { cs: 1.15 } },
  { id: "sweeper", pos: "gk", name: "Gardien moderne", icon: "🧹", desc: "Onzième joueur de champ, première relance de l'équipe.", effect: "+5% clean sheets · relances décisives · note +0,05", mods: { cs: 1.05, assists: 2, rating: 0.05 } },
  { id: "aerial", pos: "gk", name: "Maître des airs", icon: "🪂", desc: "Chaque centre est une prise, chaque corner un soulagement.", effect: "+10% clean sheets · note +0,05", mods: { cs: 1.1, rating: 0.05 } },
  { id: "reflex", pos: "gk", name: "Gardien réflexes", icon: "⚡", desc: "L'arrêt impossible, votre spécialité.", effect: "+20% clean sheets", mods: { cs: 1.2 } },
];

// --- Origines sociales ----------------------------------------------------
// startStats : { t, p, m, c, rep } — visibles par le joueur cette fois.
const ORIGINS = [
  { id: "formation", name: "Centre de formation classique", desc: "Un parcours académique, encadré et rigoureux depuis le plus jeune âge.", startStats: { t: 56, p: 54, m: 50, c: 42, rep: 18 } },
  { id: "sportif", name: "Fils de sportif pro", desc: "Un nom qui ouvre des portes, et une pression qui ne vous quitte jamais.", startStats: { t: 52, p: 55, m: 44, c: 55, rep: 32 } },
  { id: "quartier", name: "Quartier populaire", desc: "Tout appris dans la rue et sur des terrains vagues, à la dure.", startStats: { t: 60, p: 52, m: 58, c: 45, rep: 10 } },
  { id: "futsal", name: "Prodige du futsal", desc: "Des pieds en or forgés en salle. Le grand terrain reste à apprivoiser.", startStats: { t: 64, p: 42, m: 48, c: 46, rep: 14 } },
  { id: "tardif", name: "Révélé sur le tard", desc: "Personne ne croyait en vous. Le physique et la rage comme seuls bagages.", startStats: { t: 47, p: 60, m: 62, c: 38, rep: 5 } },
  { id: "prodige", name: "Prodige du foot", desc: "Un talent hors norme repéré très jeune : un cran au-dessus des autres dès le départ, mais l'attente qui pèse sur vos épaules est immense.", startStats: { t: 62, p: 56, m: 56, c: 50, rep: 26 } },
];

// --- Pays de club ---------------------------------------------------------
// gulf : destination "fin de carrière dorée" (salaires gonflés sur base élite,
// mais visibilité médiatique ÷2 et Ballon d'Or hors de portée ; jamais atteinte
// par un transfert ordinaire ni par un prêt — uniquement via une offre "or du
// désert"). salaryMult : multiplicateur de salaire local.
const COUNTRIES = [
  { id: "fr", name: "France", flag: "🇫🇷", img: "src/img/flag/Flag_of_France.png", of: "de France", salaryMult: 1, growthMult: 1, mediaMult: 1, continent: "eu" },
  { id: "de", name: "Allemagne", flag: "🇩🇪", img: "src/img/flag/Drapeau-Allemagne.png", of: "d'Allemagne", salaryMult: 1.05, growthMult: 1, mediaMult: 1, continent: "eu" },
  { id: "es", name: "Espagne", flag: "🇪🇸", img: "src/img/flag/Spain_flag_300.png", of: "d'Espagne", salaryMult: 1.1, growthMult: 1, mediaMult: 1, continent: "eu" },
  { id: "it", name: "Italie", flag: "🇮🇹", img: "src/img/flag/Flag_of_Italy_(1946–2003).png", of: "d'Italie", salaryMult: 1, growthMult: 1, mediaMult: 1, continent: "eu" },
  { id: "en", name: "Angleterre", flag: "🇬🇧", img: "src/img/flag/Drapeau-Angleterre.png", of: "d'Angleterre", salaryMult: 1.4, growthMult: 1, mediaMult: 1, continent: "eu" },
  { id: "br", name: "Brésil", flag: "🇧🇷", img: "src/img/flag/Brazil_flag_300.png", of: "du Brésil", salaryMult: 0.6, growthMult: 0.95, mediaMult: 0.9, continent: "am" },
  { id: "ar", name: "Argentine", flag: "🇦🇷", img: "src/img/flag/Flag_of_Argentina.png", of: "d'Argentine", salaryMult: 0.6, growthMult: 0.95, mediaMult: 0.9, continent: "am" },
  { id: "nl", name: "Pays-Bas", flag: "🇳🇱", img: "src/img/flag/Flag_of_Netherlands.png", of: "des Pays-Bas", salaryMult: 0.72, growthMult: 0.92, mediaMult: 0.82, contMult: 0.35, continent: "eu" },
  { id: "pt", name: "Portugal", flag: "🇵🇹", img: "src/img/flag/Flag_of_Portugal.png", of: "du Portugal", salaryMult: 0.7, growthMult: 0.9, mediaMult: 0.8, contMult: 0.3, continent: "eu" },
  { id: "be", name: "Belgique", flag: "🇧🇪", img: "src/img/flag/Flag_of_Belgium.png", of: "de Belgique", salaryMult: 0.75, growthMult: 0.92, mediaMult: 0.8, continent: "eu" },
  { id: "hr", name: "Croatie", flag: "🇭🇷", img: "src/img/flag/Flag_of_Croatia.png", of: "de Croatie", salaryMult: 0.55, growthMult: 0.85, mediaMult: 0.7, continent: "eu" },
  { id: "aw", name: "Aruba", flag: "🇦🇼", img: "src/img/flag/Flag_of_Aruba.png", of: "d'Aruba", salaryMult: 0.4, growthMult: 0.74, mediaMult: 0.42, continent: "am" },
  { id: "lc", name: "Sainte-Lucie", flag: "🇱🇨", img: "src/img/flag/Flag_of_Saint_Lucia.png", of: "de Sainte-Lucie", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "am" },
  { id: "vc", name: "Saint-Vincent-et-les-Grenadines", flag: "🇻🇨", img: "src/img/flag/Flag_of_Saint_Vincent_and_the_Grenadines.png", of: "de Saint-Vincent-et-les-Grenadines", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "am" },
  { id: "kn", name: "Saint-Kitts-et-Nevis", flag: "🇰🇳", img: "src/img/flag/Flag_of_Saint_Kitts_and_Nevis.png", of: "de Saint-Kitts-et-Nevis", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "am" },
  { id: "dm", name: "Dominique", flag: "🇩🇲", img: "src/img/flag/Flag_of_Dominica.png", of: "de Dominique", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "am" },
  { id: "vg", name: "Îles Vierges britanniques", flag: "🇻🇬", img: "src/img/flag/Flag_of_the_British_Virgin_Islands.png", of: "des Îles Vierges britanniques", salaryMult: 0.36, growthMult: 0.73, mediaMult: 0.4, continent: "am" },
  { id: "vi", name: "Îles Vierges américaines", flag: "🇻🇮", img: "src/img/flag/Flag_of_the_United_States_Virgin_Islands.png", of: "des Îles Vierges américaines", salaryMult: 0.38, growthMult: 0.73, mediaMult: 0.4, continent: "am" },
  { id: "ky", name: "Îles Caïmans", flag: "🇰🇾", img: "src/img/flag/Flag_of_the_Cayman_Islands.png", of: "des Îles Caïmans", salaryMult: 0.4, growthMult: 0.73, mediaMult: 0.4, continent: "am" },
  { id: "ms", name: "Montserrat", flag: "🇲🇸", img: "src/img/flag/Flag_of_Montserrat.png", of: "de Montserrat", salaryMult: 0.36, growthMult: 0.73, mediaMult: 0.4, continent: "am" },
  { id: "ai", name: "Anguilla", flag: "🇦🇮", img: "src/img/flag/Flag_of_Anguilla.png", of: "d'Anguilla", salaryMult: 0.36, growthMult: 0.73, mediaMult: 0.4, continent: "am" },
  { id: "tc", name: "Turks-et-Caïcos", flag: "🇹🇨", img: "src/img/flag/Flag_of_the_Turks_and_Caicos_Islands.png", of: "des Turks-et-Caïcos", salaryMult: 0.36, growthMult: 0.73, mediaMult: 0.4, continent: "am" },
  { id: "bz", name: "Belize", flag: "🇧🇿", img: "src/img/flag/Flag_of_Belize.png", of: "du Belize", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.48, continent: "am" },
  { id: "pr", name: "Porto Rico", flag: "🇵🇷", img: "src/img/flag/Flag_of_Puerto_Rico.png", of: "de Porto Rico", salaryMult: 0.42, growthMult: 0.78, mediaMult: 0.5, continent: "am" },
  { id: "tw", name: "Taïwan", flag: "🇹🇼", img: "src/img/flag/Flag_of_Taiwan.png", of: "de Taïwan", salaryMult: 0.42, growthMult: 0.76, mediaMult: 0.46, continent: "as" },
  { id: "lk", name: "Sri Lanka", flag: "🇱🇰", img: "src/img/flag/Flag_of_Sri_Lanka.png", of: "du Sri Lanka", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "la", name: "Laos", flag: "🇱🇦", img: "src/img/flag/Flag_of_Laos.png", of: "du Laos", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "bn", name: "Brunei", flag: "🇧🇳", img: "src/img/flag/Flag_of_Brunei.png", of: "du Brunei", salaryMult: 0.42, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "bt", name: "Bhoutan", flag: "🇧🇹", img: "src/img/flag/Flag_of_Bhutan.png", of: "du Bhoutan", salaryMult: 0.34, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "tl", name: "Timor oriental", flag: "🇹🇱", img: "src/img/flag/Flag_of_East_Timor.png", of: "du Timor oriental", salaryMult: 0.34, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "gu", name: "Guam", flag: "🇬🇺", img: "src/img/flag/Flag_of_Guam.png", of: "de Guam", salaryMult: 0.4, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "mo", name: "Macao", flag: "🇲🇴", img: "src/img/flag/Flag_of_Macau.png", of: "de Macao", salaryMult: 0.42, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "pk", name: "Pakistan", flag: "🇵🇰", img: "src/img/flag/Flag_of_Pakistan.png", of: "du Pakistan", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "kg", name: "Kirghizistan", flag: "🇰🇬", img: "src/img/flag/Flag_of_Kyrgyzstan.png", of: "du Kirghizistan", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.5, continent: "as" },
  { id: "hk", name: "Hong Kong", flag: "🇭🇰", img: "src/img/flag/Flag_of_Hong_Kong.png", of: "de Hong Kong", salaryMult: 0.44, growthMult: 0.79, mediaMult: 0.5, continent: "as" },
  { id: "afg", name: "Afghanistan", flag: "🇦🇫", img: "src/img/flag/Flag_of_Afghanistan.png", of: "d'Afghanistan", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.48, continent: "as" },
  { id: "bi", name: "Burundi", flag: "🇧🇮", img: "src/img/flag/Flag_of_Burundi.png", of: "du Burundi", salaryMult: 0.36, growthMult: 0.75, mediaMult: 0.44, continent: "af" },
  { id: "td", name: "Tchad", flag: "🇹🇩", img: "src/img/flag/Flag_of_Chad.png", of: "du Tchad", salaryMult: 0.34, growthMult: 0.74, mediaMult: 0.42, continent: "af" },
  { id: "so", name: "Somalie", flag: "🇸🇴", img: "src/img/flag/Flag_of_Somalia.png", of: "de Somalie", salaryMult: 0.34, growthMult: 0.74, mediaMult: 0.42, continent: "af" },
  { id: "er", name: "Érythrée", flag: "🇪🇷", img: "src/img/flag/Flag_of_Eritrea.png", of: "d'Érythrée", salaryMult: 0.34, growthMult: 0.74, mediaMult: 0.42, continent: "af" },
  { id: "ss", name: "Soudan du Sud", flag: "🇸🇸", img: "src/img/flag/Flag_of_South_Sudan.png", of: "du Soudan du Sud", salaryMult: 0.34, growthMult: 0.74, mediaMult: 0.42, continent: "af" },
  { id: "st", name: "São Tomé-et-Príncipe", flag: "🇸🇹", img: "src/img/flag/Flag_of_Sao_Tome_and_Principe.png", of: "de São Tomé-et-Príncipe", salaryMult: 0.34, growthMult: 0.74, mediaMult: 0.42, continent: "af" },
  { id: "ne", name: "Niger", flag: "🇳🇪", img: "src/img/flag/Flag_of_Niger.png", of: "du Niger", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.48, continent: "af" },
  { id: "et", name: "Éthiopie", flag: "🇪🇹", img: "src/img/flag/Flag_of_Ethiopia.png", of: "d'Éthiopie", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.48, continent: "af" },
  { id: "rw", name: "Rwanda", flag: "🇷🇼", img: "src/img/flag/Flag_of_Rwanda.png", of: "du Rwanda", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.48, continent: "af" },
  { id: "mw", name: "Malawi", flag: "🇲🇼", img: "src/img/flag/Flag_of_Malawi.png", of: "du Malawi", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.48, continent: "af" },
  { id: "bw", name: "Botswana", flag: "🇧🇼", img: "src/img/flag/Flag_of_Botswana.png", of: "du Botswana", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.48, continent: "af" },
  { id: "lr", name: "Liberia", flag: "🇱🇷", img: "src/img/flag/Flag_of_Liberia.png", of: "du Liberia", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.48, continent: "af" },
  { id: "cf", name: "Centrafrique", flag: "🇨🇫", img: "src/img/flag/Flag_of_the_Central_African_Republic.png", of: "de Centrafrique", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.48, continent: "af" },
  { id: "asa", name: "Samoa américaines", flag: "🇦🇸", img: "src/img/flag/Flag_of_American_Samoa.png", of: "des Samoa américaines", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "oc" },
  { id: "tv", name: "Tuvalu", flag: "🇹🇻", img: "src/img/flag/Flag_of_Tuvalu.png", of: "de Tuvalu", salaryMult: 0.34, growthMult: 0.73, mediaMult: 0.4, continent: "oc" },
  { id: "ki", name: "Kiribati", flag: "🇰🇮", img: "src/img/flag/Flag_of_Kiribati.png", of: "de Kiribati", salaryMult: 0.34, growthMult: 0.73, mediaMult: 0.4, continent: "oc" },
  { id: "vu", name: "Vanuatu", flag: "🇻🇺", img: "src/img/flag/Flag_of_Vanuatu.png", of: "du Vanuatu", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.46, continent: "oc" },
  { id: "ws", name: "Samoa", flag: "🇼🇸", img: "src/img/flag/Flag_of_Samoa.png", of: "du Samoa", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.46, continent: "oc" },
  { id: "to", name: "Tonga", flag: "🇹🇴", img: "src/img/flag/Flag_of_Tonga.png", of: "des Tonga", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.46, continent: "oc" },
  { id: "ck", name: "Îles Cook", flag: "🇨🇰", img: "src/img/flag/Flag_of_Cook_Islands.png", of: "des Îles Cook", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.46, continent: "oc" },
  { id: "nc", name: "Nouvelle-Calédonie", flag: "🇳🇨", img: "src/img/flag/Flag_of_New_Caledonia.png", of: "de Nouvelle-Calédonie", salaryMult: 0.42, growthMult: 0.8, mediaMult: 0.5, continent: "oc" },
  { id: "fj", name: "Fidji", flag: "🇫🇯", img: "src/img/flag/Flag_of_Fiji.png", of: "des Fidji", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.5, continent: "oc" },
  { id: "pf", name: "Tahiti", flag: "🇵🇫", img: "src/img/flag/Flag_of_French_Polynesia.png", of: "de Tahiti", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.5, continent: "oc" },
  { id: "sb", name: "Îles Salomon", flag: "🇸🇧", img: "src/img/flag/Flag_of_Solomon_Islands.png", of: "des Îles Salomon", salaryMult: 0.38, growthMult: 0.79, mediaMult: 0.48, continent: "oc" },
  { id: "sg", name: "Singapour", flag: "🇸🇬", img: "src/img/flag/Flag_of_Singapore.png", of: "de Singapour", salaryMult: 0.46, growthMult: 0.78, mediaMult: 0.46, continent: "as" },
  { id: "np", name: "Népal", flag: "🇳🇵", img: "src/img/flag/Flag_of_Nepal.png", of: "du Népal", salaryMult: 0.36, growthMult: 0.75, mediaMult: 0.42, continent: "as" },
  { id: "kh", name: "Cambodge", flag: "🇰🇭", img: "src/img/flag/Flag_of_Cambodia.png", of: "du Cambodge", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "mv", name: "Maldives", flag: "🇲🇻", img: "src/img/flag/Flag_of_Maldives.png", of: "des Maldives", salaryMult: 0.38, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "bd", name: "Bangladesh", flag: "🇧🇩", img: "src/img/flag/Flag_of_Bangladesh.png", of: "du Bangladesh", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "mn", name: "Mongolie", flag: "🇲🇳", img: "src/img/flag/Flag_of_Mongolia.png", of: "de Mongolie", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "as" },
  { id: "lb", name: "Liban", flag: "🇱🇧", img: "src/img/flag/Flag_of_Lebanon.png", of: "du Liban", salaryMult: 0.42, growthMult: 0.78, mediaMult: 0.5, continent: "as" },
  { id: "ps", name: "Palestine", flag: "🇵🇸", img: "src/img/flag/Flag_of_Palestine.png", of: "de Palestine", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "as" },
  { id: "id", name: "Indonésie", flag: "🇮🇩", img: "src/img/flag/Flag_of_Indonesia.png", of: "d'Indonésie", salaryMult: 0.42, growthMult: 0.78, mediaMult: 0.5, continent: "as" },
  { id: "my", name: "Malaisie", flag: "🇲🇾", img: "src/img/flag/Flag_of_Malaysia.png", of: "de Malaisie", salaryMult: 0.42, growthMult: 0.78, mediaMult: 0.5, continent: "as" },
  { id: "ph", name: "Philippines", flag: "🇵🇭", img: "src/img/flag/Flag_of_Philippines.png", of: "des Philippines", salaryMult: 0.42, growthMult: 0.78, mediaMult: 0.5, continent: "as" },
  { id: "tj", name: "Tadjikistan", flag: "🇹🇯", img: "src/img/flag/Flag_of_Tajikistan.png", of: "du Tadjikistan", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "as" },
  { id: "tm", name: "Turkménistan", flag: "🇹🇲", img: "src/img/flag/Flag_of_Turkmenistan.png", of: "du Turkménistan", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "as" },
  { id: "kp", name: "Corée du Nord", flag: "🇰🇵", img: "src/img/flag/Flag_of_North_Korea.png", of: "de Corée du Nord", salaryMult: 0.36, growthMult: 0.78, mediaMult: 0.48, continent: "as" },
  { id: "ye", name: "Yémen", flag: "🇾🇪", img: "src/img/flag/Flag_of_Yemen.png", of: "du Yémen", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.48, continent: "as" },
  { id: "mm", name: "Myanmar", flag: "🇲🇲", img: "src/img/flag/Flag_of_Myanmar.png", of: "du Myanmar", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.48, continent: "as" },
  { id: "bh", name: "Bahreïn", flag: "🇧🇭", img: "src/img/flag/Flag_of_Bahrain.png", of: "de Bahreïn", salaryMult: 0.5, growthMult: 0.8, mediaMult: 0.52, continent: "as" },
  { id: "om", name: "Oman", flag: "🇴🇲", img: "src/img/flag/Flag_of_Oman.png", of: "d'Oman", salaryMult: 0.5, growthMult: 0.8, mediaMult: 0.52, continent: "as" },
  { id: "jo", name: "Jordanie", flag: "🇯🇴", img: "src/img/flag/Flag_of_Jordan.png", of: "de Jordanie", salaryMult: 0.44, growthMult: 0.8, mediaMult: 0.52, continent: "as" },
  { id: "kw", name: "Koweït", flag: "🇰🇼", img: "src/img/flag/Flag_of_Kuwait.png", of: "du Koweït", salaryMult: 0.52, growthMult: 0.8, mediaMult: 0.52, continent: "as" },
  { id: "th", name: "Thaïlande", flag: "🇹🇭", img: "src/img/flag/Flag_of_Thailand.png", of: "de Thaïlande", salaryMult: 0.44, growthMult: 0.8, mediaMult: 0.53, continent: "as" },
  { id: "vn", name: "Vietnam", flag: "🇻🇳", img: "src/img/flag/Flag_of_Vietnam.png", of: "du Vietnam", salaryMult: 0.42, growthMult: 0.8, mediaMult: 0.53, continent: "as" },
  { id: "in", name: "Inde", flag: "🇮🇳", img: "src/img/flag/Flag_of_India.png", of: "d'Inde", salaryMult: 0.42, growthMult: 0.8, mediaMult: 0.53, continent: "as" },
  { id: "sy", name: "Syrie", flag: "🇸🇾", img: "src/img/flag/Flag_of_Syria.png", of: "de Syrie", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.5, continent: "as" },
  { id: "iq", name: "Irak", flag: "🇮🇶", img: "src/img/flag/Flag_of_Iraq.png", of: "d'Irak", salaryMult: 0.48, growthMult: 0.8, mediaMult: 0.54, continent: "as" },
  { id: "ae", name: "Émirats arabes unis", flag: "🇦🇪", img: "src/img/flag/Flag_of_United_Arab_Emirates.png", of: "des Émirats arabes unis", salaryMult: 1.8, growthMult: 0.82, mediaMult: 0.56, continent: "as", gulf: true },
  { id: "uz", name: "Ouzbékistan", flag: "🇺🇿", img: "src/img/flag/Flag_of_Uzbekistan.png", of: "d'Ouzbékistan", salaryMult: 0.44, growthMult: 0.8, mediaMult: 0.53, continent: "as" },
  { id: "km", name: "Comores", flag: "🇰🇲", img: "src/img/flag/Flag_of_Comoros.png", of: "des Comores", salaryMult: 0.38, growthMult: 0.76, mediaMult: 0.44, continent: "af" },
  { id: "mu", name: "Maurice", flag: "🇲🇺", img: "src/img/flag/Flag_of_Mauritius.png", of: "de Maurice", salaryMult: 0.38, growthMult: 0.75, mediaMult: 0.43, continent: "af" },
  { id: "dj", name: "Djibouti", flag: "🇩🇯", img: "src/img/flag/Flag_of_Djibouti.png", of: "de Djibouti", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "af" },
  { id: "sc", name: "Seychelles", flag: "🇸🇨", img: "src/img/flag/Flag_of_Seychelles.png", of: "des Seychelles", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "af" },
  { id: "sz", name: "Eswatini", flag: "🇸🇿", img: "src/img/flag/Flag_of_Eswatini.png", of: "d'Eswatini", salaryMult: 0.37, growthMult: 0.74, mediaMult: 0.42, continent: "af" },
  { id: "ls", name: "Lesotho", flag: "🇱🇸", img: "src/img/flag/Flag_of_Lesotho.png", of: "du Lesotho", salaryMult: 0.37, growthMult: 0.74, mediaMult: 0.42, continent: "af" },
  { id: "zw", name: "Zimbabwe", flag: "🇿🇼", img: "src/img/flag/Flag_of_Zimbabwe.png", of: "du Zimbabwe", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.5, continent: "af" },
  { id: "ke", name: "Kenya", flag: "🇰🇪", img: "src/img/flag/Flag_of_Kenya.png", of: "du Kenya", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.5, continent: "af" },
  { id: "tg", name: "Togo", flag: "🇹🇬", img: "src/img/flag/Flag_of_Togo.png", of: "du Togo", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.5, continent: "af" },
  { id: "mr", name: "Mauritanie", flag: "🇲🇷", img: "src/img/flag/Flag_of_Mauritania.png", of: "de Mauritanie", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "af" },
  { id: "gw", name: "Guinée-Bissau", flag: "🇬🇼", img: "src/img/flag/Flag_of_Guinea-Bissau.png", of: "de Guinée-Bissau", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "af" },
  { id: "sl", name: "Sierra Leone", flag: "🇸🇱", img: "src/img/flag/Flag_of_Sierra_Leone.png", of: "de Sierra Leone", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.5, continent: "af" },
  { id: "ly", name: "Libye", flag: "🇱🇾", img: "src/img/flag/Flag_of_Libya.png", of: "de Libye", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "af" },
  { id: "sd", name: "Soudan", flag: "🇸🇩", img: "src/img/flag/Flag_of_Sudan.png", of: "du Soudan", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.5, continent: "af" },
  { id: "na", name: "Namibie", flag: "🇳🇦", img: "src/img/flag/Flag_of_Namibia.png", of: "de Namibie", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "af" },
  { id: "tz", name: "Tanzanie", flag: "🇹🇿", img: "src/img/flag/Flag_of_Tanzania.png", of: "de Tanzanie", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.5, continent: "af" },
  { id: "cv", name: "Cap-Vert", flag: "🇨🇻", img: "src/img/flag/Flag_of_Cape_Verde.png", of: "du Cap-Vert", salaryMult: 0.42, growthMult: 0.8, mediaMult: 0.55, continent: "af" },
  { id: "ga", name: "Gabon", flag: "🇬🇦", img: "src/img/flag/Flag_of_Gabon.png", of: "du Gabon", salaryMult: 0.42, growthMult: 0.8, mediaMult: 0.55, continent: "af" },
  { id: "zm", name: "Zambie", flag: "🇿🇲", img: "src/img/flag/Flag_of_Zambia.png", of: "de Zambie", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.54, continent: "af" },
  { id: "ug", name: "Ouganda", flag: "🇺🇬", img: "src/img/flag/Flag_of_Uganda.png", of: "d'Ouganda", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.53, continent: "af" },
  { id: "cg", name: "Congo", flag: "🇨🇬", img: "src/img/flag/Flag_of_Congo.png", of: "du Congo", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.53, continent: "af" },
  { id: "gq", name: "Guinée équatoriale", flag: "🇬🇶", img: "src/img/flag/Flag_of_Equatorial_Guinea.png", of: "de Guinée équatoriale", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.52, continent: "af" },
  { id: "mz", name: "Mozambique", flag: "🇲🇿", img: "src/img/flag/Flag_of_Mozambique.png", of: "du Mozambique", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.52, continent: "af" },
  { id: "gm", name: "Gambie", flag: "🇬🇲", img: "src/img/flag/Flag_of_Gambia.png", of: "de Gambie", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.53, continent: "af" },
  { id: "gh", name: "Ghana", flag: "🇬🇭", img: "src/img/flag/Flag_of_Ghana.png", of: "du Ghana", salaryMult: 0.42, growthMult: 0.8, mediaMult: 0.56, continent: "af" },
  { id: "ml", name: "Mali", flag: "🇲🇱", img: "src/img/flag/Flag_of_Mali.png", of: "du Mali", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.54, continent: "af" },
  { id: "bf", name: "Burkina Faso", flag: "🇧🇫", img: "src/img/flag/Flag_of_Burkina_Faso.png", of: "du Burkina Faso", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.54, continent: "af" },
  { id: "gy", name: "Guyana", flag: "🇬🇾", img: "src/img/flag/Flag_of_Guyana.png", of: "du Guyana", salaryMult: 0.38, growthMult: 0.76, mediaMult: 0.45, continent: "am" },
  { id: "bm", name: "Bermudes", flag: "🇧🇲", img: "src/img/flag/Flag_of_Bermuda.png", of: "des Bermudes", salaryMult: 0.4, growthMult: 0.75, mediaMult: 0.44, continent: "am" },
  { id: "bb", name: "Barbade", flag: "🇧🇧", img: "src/img/flag/Flag_of_Barbados.png", of: "de Barbade", salaryMult: 0.35, growthMult: 0.74, mediaMult: 0.42, continent: "am" },
  { id: "bs", name: "Bahamas", flag: "🇧🇸", img: "src/img/flag/Flag_of_the_Bahamas.png", of: "des Bahamas", salaryMult: 0.35, growthMult: 0.73, mediaMult: 0.4, continent: "am" },
  { id: "gd", name: "Grenade", flag: "🇬🇩", img: "src/img/flag/Flag_of_Grenada.png", of: "de Grenade", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "am" },
  { id: "ag", name: "Antigua-et-Barbuda", flag: "🇦🇬", img: "src/img/flag/Flag_of_Antigua_and_Barbuda.png", of: "d'Antigua-et-Barbuda", salaryMult: 0.36, growthMult: 0.74, mediaMult: 0.42, continent: "am" },
  { id: "gt", name: "Guatemala", flag: "🇬🇹", img: "src/img/flag/Flag_of_Guatemala.png", of: "du Guatemala", salaryMult: 0.4, growthMult: 0.79, mediaMult: 0.52, continent: "am" },
  { id: "tt", name: "Trinité-et-Tobago", flag: "🇹🇹", img: "src/img/flag/Flag_of_Trinidad_and_Tobago.png", of: "de Trinité-et-Tobago", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "am" },
  { id: "ht", name: "Haïti", flag: "🇭🇹", img: "src/img/flag/Flag_of_Haiti.png", of: "d'Haïti", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "am" },
  { id: "cu", name: "Cuba", flag: "🇨🇺", img: "src/img/flag/Flag_of_Cuba.png", of: "de Cuba", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.5, continent: "am" },
  { id: "cw", name: "Curaçao", flag: "🇨🇼", img: "src/img/flag/Flag_of_Curacao.png", of: "de Curaçao", salaryMult: 0.42, growthMult: 0.79, mediaMult: 0.52, continent: "am" },
  { id: "sr", name: "Suriname", flag: "🇸🇷", img: "src/img/flag/Flag_of_Suriname.png", of: "du Suriname", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "am" },
  { id: "do", name: "République dominicaine", flag: "🇩🇴", img: "src/img/flag/Flag_of_the_Dominican_Republic.png", of: "de République dominicaine", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "am" },
  { id: "ni", name: "Nicaragua", flag: "🇳🇮", img: "src/img/flag/Flag_of_Nicaragua.png", of: "du Nicaragua", salaryMult: 0.38, growthMult: 0.78, mediaMult: 0.5, continent: "am" },
  { id: "bo", name: "Bolivie", flag: "🇧🇴", img: "src/img/flag/Flag_of_Bolivia.png", of: "de Bolivie", salaryMult: 0.42, growthMult: 0.8, mediaMult: 0.55, continent: "am" },
  { id: "pa", name: "Panama", flag: "🇵🇦", img: "src/img/flag/Flag_of_Panama.png", of: "du Panama", salaryMult: 0.44, growthMult: 0.8, mediaMult: 0.55, continent: "am" },
  { id: "hn", name: "Honduras", flag: "🇭🇳", img: "src/img/flag/Flag_of_Honduras.png", of: "du Honduras", salaryMult: 0.42, growthMult: 0.8, mediaMult: 0.55, continent: "am" },
  { id: "jm", name: "Jamaïque", flag: "🇯🇲", img: "src/img/flag/Flag_of_Jamaica.png", of: "de Jamaïque", salaryMult: 0.45, growthMult: 0.8, mediaMult: 0.56, continent: "am" },
  { id: "pe", name: "Pérou", flag: "🇵🇪", img: "src/img/flag/Flag_of_Peru.png", of: "du Pérou", salaryMult: 0.5, growthMult: 0.83, mediaMult: 0.6, continent: "am" },
  { id: "cr", name: "Costa Rica", flag: "🇨🇷", img: "src/img/flag/Flag_of_Costa_Rica.png", of: "du Costa Rica", salaryMult: 0.48, growthMult: 0.82, mediaMult: 0.58, continent: "am" },
  { id: "mt", name: "Malte", flag: "🇲🇹", img: "src/img/flag/Flag_of_Malta.png", of: "de Malte", salaryMult: 0.4, growthMult: 0.76, mediaMult: 0.45, continent: "eu" },
  { id: "fo", name: "Îles Féroé", flag: "🇫🇴", img: "src/img/flag/Flag_of_the_Faroe_Islands.png", of: "des Îles Féroé", salaryMult: 0.4, growthMult: 0.76, mediaMult: 0.44, continent: "eu" },
  { id: "ad", name: "Andorre", flag: "🇦🇩", img: "src/img/flag/Flag_of_Andorra.png", of: "d'Andorre", salaryMult: 0.35, growthMult: 0.74, mediaMult: 0.42, continent: "eu" },
  { id: "sm", name: "Saint-Marin", flag: "🇸🇲", img: "src/img/flag/Flag_of_San_Marino.png", of: "de Saint-Marin", salaryMult: 0.35, growthMult: 0.73, mediaMult: 0.4, continent: "eu" },
  { id: "li", name: "Liechtenstein", flag: "🇱🇮", img: "src/img/flag/Flag_of_Liechtenstein.png", of: "du Liechtenstein", salaryMult: 0.42, growthMult: 0.76, mediaMult: 0.44, continent: "eu" },
  { id: "gi", name: "Gibraltar", flag: "🇬🇮", img: "src/img/flag/Flag_of_Gibraltar.png", of: "de Gibraltar", salaryMult: 0.38, growthMult: 0.74, mediaMult: 0.42, continent: "eu" },
  { id: "me", name: "Monténégro", flag: "🇲🇪", img: "src/img/flag/Flag_of_Montenegro.png", of: "du Monténégro", salaryMult: 0.45, growthMult: 0.8, mediaMult: 0.55, continent: "eu" },
  { id: "xk", name: "Kosovo", flag: "🇽🇰", img: "src/img/flag/Flag_of_Kosovo.png", of: "du Kosovo", salaryMult: 0.42, growthMult: 0.79, mediaMult: 0.54, continent: "eu" },
  { id: "am", name: "Arménie", flag: "🇦🇲", img: "src/img/flag/Flag_of_Armenia.png", of: "d'Arménie", salaryMult: 0.42, growthMult: 0.79, mediaMult: 0.52, continent: "eu" },
  { id: "az", name: "Azerbaïdjan", flag: "🇦🇿", img: "src/img/flag/Flag_of_Azerbaijan.png", of: "d'Azerbaïdjan", salaryMult: 0.48, growthMult: 0.8, mediaMult: 0.54, continent: "eu" },
  { id: "cy", name: "Chypre", flag: "🇨🇾", img: "src/img/flag/Flag_of_Cyprus.png", of: "de Chypre", salaryMult: 0.5, growthMult: 0.8, mediaMult: 0.56, continent: "eu" },
  { id: "md", name: "Moldavie", flag: "🇲🇩", img: "src/img/flag/Flag_of_Moldova.png", of: "de Moldavie", salaryMult: 0.4, growthMult: 0.78, mediaMult: 0.5, continent: "eu" },
  { id: "lu", name: "Luxembourg", flag: "🇱🇺", img: "src/img/flag/Flag_of_Luxembourg.png", of: "du Luxembourg", salaryMult: 0.55, growthMult: 0.82, mediaMult: 0.56, continent: "eu" },
  { id: "lv", name: "Lettonie", flag: "🇱🇻", img: "src/img/flag/Flag_of_Latvia.png", of: "de Lettonie", salaryMult: 0.44, growthMult: 0.8, mediaMult: 0.53, continent: "eu" },
  { id: "lt", name: "Lituanie", flag: "🇱🇹", img: "src/img/flag/Flag_of_Lithuania.png", of: "de Lituanie", salaryMult: 0.44, growthMult: 0.8, mediaMult: 0.53, continent: "eu" },
  { id: "ee", name: "Estonie", flag: "🇪🇪", img: "src/img/flag/Flag_of_Estonia.png", of: "d'Estonie", salaryMult: 0.46, growthMult: 0.8, mediaMult: 0.54, continent: "eu" },
  { id: "kz", name: "Kazakhstan", flag: "🇰🇿", img: "src/img/flag/Flag_of_Kazakhstan.png", of: "du Kazakhstan", salaryMult: 0.46, growthMult: 0.79, mediaMult: 0.52, continent: "eu" },
  { id: "by", name: "Biélorussie", flag: "🇧🇾", img: "src/img/flag/Flag_of_Belarus.png", of: "de Biélorussie", salaryMult: 0.44, growthMult: 0.79, mediaMult: 0.53, continent: "eu" },
  { id: "si", name: "Slovénie", flag: "🇸🇮", img: "src/img/flag/Flag_of_Slovenia.png", of: "de Slovénie", salaryMult: 0.52, growthMult: 0.83, mediaMult: 0.62, continent: "eu" },
  { id: "is", name: "Islande", flag: "🇮🇸", img: "src/img/flag/Flag_of_Iceland.png", of: "d'Islande", salaryMult: 0.55, growthMult: 0.84, mediaMult: 0.62, continent: "eu" },
  { id: "ge", name: "Géorgie", flag: "🇬🇪", img: "src/img/flag/Flag_of_Georgia.png", of: "de Géorgie", salaryMult: 0.44, growthMult: 0.82, mediaMult: 0.58, continent: "eu" },
  { id: "al", name: "Albanie", flag: "🇦🇱", img: "src/img/flag/Flag_of_Albania.png", of: "d'Albanie", salaryMult: 0.45, growthMult: 0.82, mediaMult: 0.58, continent: "eu" },
  { id: "mk", name: "Macédoine du Nord", flag: "🇲🇰", img: "src/img/flag/Flag_of_North_Macedonia.png", of: "de Macédoine du Nord", salaryMult: 0.44, growthMult: 0.82, mediaMult: 0.56, continent: "eu" },
  { id: "gr", name: "Grèce", flag: "🇬🇷", img: "src/img/flag/Flag_of_Greece.png", of: "de Grèce", salaryMult: 0.6, growthMult: 0.85, mediaMult: 0.68, continent: "eu" },
  { id: "dk", name: "Danemark", flag: "🇩🇰", img: "src/img/flag/Flag_of_Denmark.png", of: "du Danemark", salaryMult: 0.68, growthMult: 0.9, mediaMult: 0.72, continent: "eu" },
  { id: "ro", name: "Roumanie", flag: "🇷🇴", img: "src/img/flag/Flag_of_Romania.png", of: "de Roumanie", salaryMult: 0.5, growthMult: 0.84, mediaMult: 0.62, continent: "eu" },
  { id: "sk", name: "Slovaquie", flag: "🇸🇰", img: "src/img/flag/Flag_of_Slovakia.png", of: "de Slovaquie", salaryMult: 0.55, growthMult: 0.85, mediaMult: 0.62, continent: "eu" },
  { id: "uy", name: "Uruguay", flag: "🇺🇾", img: "src/img/flag/Flag_of_Uruguay.png", of: "d'Uruguay", salaryMult: 0.45, growthMult: 0.83, mediaMult: 0.68, continent: "am" },
  { id: "ma", name: "Maroc", flag: "🇲🇦", img: "src/img/flag/Flag_of_Morocco.png", of: "du Maroc", salaryMult: 0.42, growthMult: 0.78, mediaMult: 0.62, continent: "af" },
  { id: "mx", name: "Mexique", flag: "🇲🇽", img: "src/img/flag/Flag_of_Mexico.png", of: "du Mexique", salaryMult: 0.6, growthMult: 0.85, mediaMult: 0.72, continent: "am" },
  { id: "co", name: "Colombie", flag: "🇨🇴", img: "src/img/flag/Flag_of_Colombia.png", of: "de Colombie", salaryMult: 0.45, growthMult: 0.82, mediaMult: 0.68, continent: "am" },
  { id: "ch", name: "Suisse", flag: "🇨🇭", img: "src/img/flag/Flag_of_Switzerland.png", of: "de Suisse", salaryMult: 0.72, growthMult: 0.9, mediaMult: 0.75, continent: "eu" },
  { id: "sn", name: "Sénégal", flag: "🇸🇳", img: "src/img/flag/Flag_of_Senegal.png", of: "du Sénégal", salaryMult: 0.4, growthMult: 0.77, mediaMult: 0.6, continent: "af" },
  { id: "tr", name: "Turquie", flag: "🇹🇷", img: "src/img/flag/Flag_of_Turkey.png", of: "de Turquie", salaryMult: 0.75, growthMult: 0.85, mediaMult: 0.78, continent: "eu" },
  { id: "cm", name: "Cameroun", flag: "🇨🇲", img: "src/img/flag/Flag_of_Cameroon.png", of: "du Cameroun", salaryMult: 0.4, growthMult: 0.76, mediaMult: 0.6, continent: "af" },
  { id: "ci", name: "Côte d'Ivoire", flag: "🇨🇮", img: "src/img/flag/Drapeau-CIV.png", of: "de Côte d'Ivoire", salaryMult: 0.4, growthMult: 0.77, mediaMult: 0.6, continent: "af" },
  { id: "dz", name: "Algérie", flag: "🇩🇿", img: "src/img/flag/Flag_of_Algeria.png", of: "d'Algérie", salaryMult: 0.4, growthMult: 0.77, mediaMult: 0.6, continent: "af" },
  { id: "tn", name: "Tunisie", flag: "🇹🇳", img: "src/img/flag/Flag_of_Tunisia.png", of: "de Tunisie", salaryMult: 0.4, growthMult: 0.76, mediaMult: 0.6, continent: "af" },
  { id: "no", name: "Norvège", flag: "🇳🇴", img: "src/img/flag/Flag_of_Norway.png", of: "de Norvège", salaryMult: 0.6, growthMult: 0.85, mediaMult: 0.7, continent: "eu" },
  { id: "fi", name: "Finlande", flag: "🇫🇮", img: "src/img/flag/Flag_of_Finland.png", of: "de Finlande", salaryMult: 0.5, growthMult: 0.82, mediaMult: 0.6, continent: "eu" },
  { id: "se", name: "Suède", flag: "🇸🇪", img: "src/img/flag/Flag_of_Sweden.png", of: "de Suède", salaryMult: 0.6, growthMult: 0.9, mediaMult: 0.7, continent: "eu" },
  { id: "pl", name: "Pologne", flag: "🇵🇱", img: "src/img/flag/Flag_of_Poland.png", of: "de Pologne", salaryMult: 0.55, growthMult: 0.9, mediaMult: 0.7, continent: "eu" },
  { id: "bg", name: "Bulgarie", flag: "🇧🇬", img: "src/img/flag/Flag_of_Bulgaria.png", of: "de Bulgarie", salaryMult: 0.45, growthMult: 0.82, mediaMult: 0.6, continent: "eu" },
  { id: "kr", name: "Corée du Sud", flag: "🇰🇷", img: "src/img/flag/Flag_of_South_Korea.png", of: "de Corée du Sud", salaryMult: 0.55, growthMult: 0.88, mediaMult: 0.65, continent: "as" },
  { id: "cn", name: "Chine", flag: "🇨🇳", img: "src/img/flag/Flag_of_China.png", of: "de Chine", salaryMult: 0.6, growthMult: 0.85, mediaMult: 0.6, continent: "as" },
  { id: "au", name: "Australie", flag: "🇦🇺", img: "src/img/flag/Flag_of_Australia.png", of: "d'Australie", salaryMult: 0.6, growthMult: 0.85, mediaMult: 0.6, continent: "oc" },
  { id: "nz", name: "Nouvelle-Zélande", flag: "🇳🇿", img: "src/img/flag/Flag_of_New_Zealand.png", of: "de Nouvelle-Zélande", salaryMult: 0.42, growthMult: 0.8, mediaMult: 0.5, continent: "oc" },
  { id: "pg", name: "Papouasie-Nouvelle-Guinée", flag: "🇵🇬", img: "src/img/flag/Flag_of_Papua_New_Guinea.png", of: "de Papouasie-Nouvelle-Guinée", salaryMult: 0.3, growthMult: 0.72, mediaMult: 0.4, continent: "oc" },
  { id: "cd", name: "RDC", flag: "🇨🇩", img: "src/img/flag/Flag_of_RDC.png", of: "de RDC", salaryMult: 0.35, growthMult: 0.74, mediaMult: 0.55, continent: "af" },
  { id: "gn", name: "Guinée", flag: "🇬🇳", img: "src/img/flag/Flag_of_Guinea.png", of: "de Guinée", salaryMult: 0.35, growthMult: 0.74, mediaMult: 0.55, continent: "af" },
  { id: "bj", name: "Bénin", flag: "🇧🇯", img: "src/img/flag/Flag_of_Benin.png", of: "du Bénin", salaryMult: 0.33, growthMult: 0.73, mediaMult: 0.53, continent: "af" },
  { id: "sa", name: "Arabie Saoudite", flag: "🇸🇦", img: "src/img/flag/Flag_of_Saudi_Arabia.png", of: "d'Arabie Saoudite", salaryMult: 2.6, growthMult: 0.78, mediaMult: 0.5, continent: "as", gulf: true },
  { id: "qa", name: "Qatar", flag: "🇶🇦", img: "src/img/flag/Flag_of_Qatar.png", of: "du Qatar", salaryMult: 2.2, growthMult: 0.78, mediaMult: 0.5, continent: "as", gulf: true },
  { id: "ir", name: "Iran", flag: "🇮🇷", img: "src/img/flag/Flag_of_Iran.png", of: "d'Iran", salaryMult: 0.4, growthMult: 0.8, mediaMult: 0.5, continent: "as" },
  { id: "at", name: "Autriche", flag: "🇦🇹", img: "src/img/flag/Flag_of_Austria.png", of: "d'Autriche", salaryMult: 0.68, growthMult: 0.86, mediaMult: 0.7, continent: "eu" },
  { id: "ec", name: "Équateur", flag: "🇪🇨", img: "src/img/flag/Flag_of_Ecuador.png", of: "d'Équateur", salaryMult: 0.5, growthMult: 0.84, mediaMult: 0.6, continent: "am" },
  { id: "ua", name: "Ukraine", flag: "🇺🇦", img: "src/img/flag/Flag_of_Ukraine.png", of: "d'Ukraine", salaryMult: 0.6, growthMult: 0.85, mediaMult: 0.65, continent: "eu" },
  { id: "ru", name: "Russie", flag: "🇷🇺", img: "src/img/flag/Flag_of_Russia.png", of: "de Russie", salaryMult: 0.7, growthMult: 0.85, mediaMult: 0.65, continent: "eu" },
  { id: "wal", name: "Pays de Galles", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", img: "src/img/flag/Flag_of_Wales.png", of: "du Pays de Galles", salaryMult: 0.62, growthMult: 0.86, mediaMult: 0.68, continent: "eu" },
  { id: "rs", name: "Serbie", flag: "🇷🇸", img: "src/img/flag/Flag_of_Serbia.png", of: "de Serbie", salaryMult: 0.58, growthMult: 0.85, mediaMult: 0.62, continent: "eu" },
  { id: "hu", name: "Hongrie", flag: "🇭🇺", img: "src/img/flag/Flag_of_Hungary.png", of: "de Hongrie", salaryMult: 0.6, growthMult: 0.85, mediaMult: 0.64, continent: "eu" },
  { id: "sco", name: "Écosse", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", img: "src/img/flag/Flag_of_Scotland.png", of: "d'Écosse", salaryMult: 0.66, growthMult: 0.86, mediaMult: 0.7, continent: "eu" },
  { id: "ie", name: "Irlande", flag: "🇮🇪", img: "src/img/flag/Flag_of_Ireland.png", of: "d'Irlande", salaryMult: 0.62, growthMult: 0.86, mediaMult: 0.68, continent: "eu" },
  { id: "nir", name: "Irlande du Nord", flag: "🇬🇧", img: "src/img/flag/Flag_of_Northern_Ireland.png", of: "d'Irlande du Nord", salaryMult: 0.58, growthMult: 0.85, mediaMult: 0.62, continent: "eu" },
  { id: "ve", name: "Venezuela", flag: "🇻🇪", img: "src/img/flag/Flag_of_Venezuela.png", of: "du Venezuela", salaryMult: 0.45, growthMult: 0.82, mediaMult: 0.58, continent: "am" },
  { id: "cz", name: "Tchéquie", flag: "🇨🇿", img: "src/img/flag/Flag_of_Czech_Republic.png", of: "de Tchéquie", salaryMult: 0.62, growthMult: 0.86, mediaMult: 0.66, continent: "eu" },
  { id: "us", name: "États-Unis", flag: "🇺🇸", img: "src/img/flag/Flag_of_the_United_States.png", of: "des États-Unis", salaryMult: 0.85, growthMult: 0.85, mediaMult: 0.72, continent: "am" },
  { id: "eg", name: "Égypte", flag: "🇪🇬", img: "src/img/flag/Flag_of_Egypt.png", of: "d'Égypte", salaryMult: 0.42, growthMult: 0.82, mediaMult: 0.55, continent: "af" },
  { id: "za", name: "Afrique du Sud", flag: "🇿🇦", img: "src/img/flag/Flag_of_South_Africa.png", of: "d'Afrique du Sud", salaryMult: 0.45, growthMult: 0.82, mediaMult: 0.58, continent: "af" },
  { id: "ba", name: "Bosnie-Herzégovine", flag: "🇧🇦", img: "src/img/flag/Flag_of_Bosnia_and_Herzegovina.png", of: "de Bosnie", salaryMult: 0.5, growthMult: 0.85, mediaMult: 0.6, continent: "eu" },
  { id: "py", name: "Paraguay", flag: "🇵🇾", img: "src/img/flag/Flag_of_Paraguay.png", of: "du Paraguay", salaryMult: 0.5, growthMult: 0.85, mediaMult: 0.62, continent: "am" },
  { id: "cl", name: "Chili", flag: "🇨🇱", img: "src/img/flag/Flag_of_Chile.png", of: "du Chili", salaryMult: 0.55, growthMult: 0.86, mediaMult: 0.65, continent: "am" },
  { id: "ca", name: "Canada", flag: "🇨🇦", img: "src/img/flag/Flag_of_Canada.png", of: "du Canada", salaryMult: 0.62, growthMult: 0.85, mediaMult: 0.68, continent: "am" },
  { id: "sv", name: "Salvador", flag: "🇸🇻", img: "src/img/flag/Flag_of_El_Salvador.png", of: "du Salvador", salaryMult: 0.35, growthMult: 0.78, mediaMult: 0.5, continent: "am" },
  { id: "ao", name: "Angola", flag: "🇦🇴", img: "src/img/flag/Flag_of_Angola.png", of: "d'Angola", salaryMult: 0.4, growthMult: 0.8, mediaMult: 0.55, continent: "af" },
  { id: "mg", name: "Madagascar", flag: "🇲🇬", img: "src/img/flag/Flag_of_Madagascar.png", of: "de Madagascar", salaryMult: 0.32, growthMult: 0.76, mediaMult: 0.48, continent: "af" },
  { id: "ng", name: "Nigeria", flag: "🇳🇬", img: "src/img/flag/Flag_of_Nigeria.png", of: "du Nigeria", salaryMult: 0.45, growthMult: 0.82, mediaMult: 0.62, continent: "af" },
  { id: "jp", name: "Japon", flag: "🇯🇵", img: "src/img/flag/Flag_of_Japan.png", of: "du Japon", salaryMult: 0.7, growthMult: 0.9, mediaMult: 0.7, continent: "as" },
];

// --- Coupes continentales de CLUBS (une par continent, jamais confondues) -----
// Une "Coupe des Champions" par continent, toutes jouables : la gagner se joue
// en finale interactive (moment "continental_final"). Amérique et Afrique
// contestent la leur comme l'Europe (cf. BALANCE.continentalReach).
const CONTINENTAL_CUPS = {
  eu: { name: "Coupe des Champions d'Europe", short: "Europe", icon: "🥇" },
  am: { name: "Coupe des Champions d'Amérique", short: "Amérique", icon: "🏆" },
  as: { name: "Coupe des Champions d'Asie", short: "Asie", icon: "🎌" },
  af: { name: "Coupe des Champions d'Afrique", short: "Afrique", icon: "🌍" },
  oc: { name: "Coupe des Champions d'Océanie", short: "Océanie", icon: "🌊" },
};

// --- Championnats continentaux de SÉLECTION (l'Euro, la Copa, la CAN) ---------
// Pendant continental de la Coupe du Monde : une compétition par continent de
// nationalité (eu/am/af), disputée les années paires hors Mondial (cf.
// engine.isContinentalYear). À NE PAS confondre avec CONTINENTAL_CUPS (clubs).
const NATIONAL_CUPS = {
  eu: { name: "Championnat d'Europe des Nations", short: "Euro", of: "d'Europe", icon: "🇪🇺",
        championText: "L'Europe entière est à vos pieds : votre nation soulève le trophée continental !" },
  am: { name: "Coupe d'Amérique", short: "Copa América", of: "d'Amérique", icon: "🌎",
        championText: "Tout un continent s'embrase : la Copa América vous appartient !" },
  af: { name: "Coupe d'Afrique des Nations", short: "CAN", of: "d'Afrique", icon: "🌍",
        championText: "L'Afrique vibre d'un seul cœur : Champions d'Afrique, enfin !" },
  as: { name: "Coupe d'Asie des Nations", short: "Coupe d'Asie", of: "d'Asie", icon: "🌏",
        championText: "Le plus grand continent s'incline : votre nation règne sur l'Asie !" },
  oc: { name: "Coupe d'Océanie des Nations", short: "Coupe d'Océanie", of: "d'Océanie", icon: "🏝️",
        championText: "Tout le Pacifique vous acclame : votre nation domine l'Océanie !" },
};

// Ligue des Sélections : compétition de sélections EUROPÉENNE supplémentaire,
// disputée les années "libres" (ni Mondial ni Euro, cf. engine.isNationsLeagueYear),
// au format phase de ligue + Final Four. Trophée secondaire, moins prestigieux
// qu'un Euro. Réservée aux nationalités du continent "eu".
const NATIONS_LEAGUE = {
  name: "Ligue des Sélections", short: "Ligue des Sél.", of: "de la Ligue des Sélections", icon: "🛡️",
  championText: "Au bout du Final Four, votre nation règne sur la Ligue des Sélections européenne !",
};

// --- Double nationalité ---------------------------------------------------
// Couloirs migratoires réels : un joueur né/formé ici est fréquemment éligible
// à la sélection d'en face (parents ou grands-parents). La liste est LUE DANS
// LES DEUX SENS — un Français peut être éligible au Maroc, et l'inverse.
// Chaque entrée : id de nation → nations partenaires plausibles.
// Ce n'est pas une base juridique, c'est une table de plausibilité de jeu :
// l'intérêt est le DILEMME (petite nation où l'on est titulaire et capitaine,
// contre grande nation où la sélection se mérite mais où tout est possible).
const DUAL_NATIONALITY = {
  ma: ["fr", "es", "nl", "be"],
  dz: ["fr"],
  tn: ["fr", "it"],
  sn: ["fr"],
  ml: ["fr"],
  ci: ["fr", "be"],
  cm: ["fr"],
  cd: ["be", "fr"],
  ng: ["en"],
  gh: ["en", "de"],
  jm: ["en"],
  tt: ["en"],
  gy: ["en"],
  ke: ["en"],
  za: ["en", "nl"],
  eg: ["it"],
  tr: ["de", "nl", "at"],
  pl: ["de", "en"],
  hr: ["de", "at", "au"],
  rs: ["ch", "at", "de"],
  ba: ["ch", "at", "de", "se"],
  al: ["ch", "it", "gr"],
  xk: ["ch", "de", "se"],
  mk: ["ch", "it"],
  cv: ["pt", "nl"],
  ao: ["pt"],
  br: ["pt", "it", "es", "jp"],
  ar: ["it", "es"],
  uy: ["it", "es"],
  sr: ["nl"],
  cw: ["nl"],
  mx: ["us"],
  pr: ["us"],
  do: ["us", "es"],
  ph: ["us", "es"],
  ht: ["fr", "us", "ca"],
  ie: ["en"],
  sco: ["en"],
  wal: ["en"],
  nz: ["au"],
  fj: ["au", "nz"],
  ws: ["nz", "au"],
  in: ["en"],
  pk: ["en"],
  bd: ["en"],
  so: ["se", "no", "en"],
  er: ["se", "no"],
  iq: ["se", "de"],
  sy: ["se", "de"],
  lb: ["fr", "br"],
  ir: ["de", "se"],
  am: ["fr"],
  ge: ["de"],
  ua: ["pl", "de"],
  md: ["ro", "it"],
  ro: ["it", "es"],
  gr: ["de", "au"],
  kr: ["us"],
};

// --- Statut au club (rôle) ------------------------------------------
// Cran de statut vis-à-vis du coach, du plus faible au plus fort. `pt` = temps
// de jeu de base (ancre) ; `expect` = note de saison à tenir pour garder le poste.
// L'ordre du tableau EST le rang (index 0→4) ; s.role stocke cet index.
// « Espoir » est réservé aux JEUNES (≤ ROLE_ESPOIR_MAX_AGE) : passé cet âge on
// n'est plus un pari sur l'avenir, le plancher devient « Sporadique ».
const ROLES = [
  // `expect` monte franchement dans le HAUT de l'échelle : avec des attentes trop
  // basses partout, tout le monde cliquetait vers Titulaire et s'y verrouillait
  // (67 % des saisons mesurées) — le système à 5 crans n'en avait plus qu'un. Le bas
  // reste clément (un remplaçant ne doit pas être puni d'être remplaçant).
  { id: "espoir", label: "Espoir", icon: "🌱", pt: 0.12, expect: 5.0, desc: "Un pari sur l'avenir : peu de minutes, mais tu apprends au haut niveau." },
  { id: "sporadique", label: "Sporadique", icon: "🔸", pt: 0.30, expect: 5.5, desc: "Utilisé au compte-gouttes, souvent sur le banc." },
  { id: "rotation", label: "Rotation", icon: "🔄", pt: 0.52, expect: 6.0, desc: "Dans la rotation : environ une titularisation sur deux." },
  { id: "important", label: "Important", icon: "⭐", pt: 0.74, expect: 6.4, desc: "Cadre de la rotation, presque toujours sur la feuille." },
  { id: "titulaire", label: "Titulaire", icon: "👑", pt: 0.93, expect: 6.7, desc: "Indiscutable : tu joues, mais on attend beaucoup de toi." },
];
const ROLE_ESPOIR_MAX_AGE = 20; // au-delà, plancher = Sporadique (index 1)

// --- Compétitions fictives ---------------------------------------------------
const COMPETITIONS = {
  league: { name: "Championnat National", icon: "🎖️" },
  cup: { name: "Coupe Nationale", icon: "🏵️" },
  continental: { name: "Coupe des Champions", icon: "🥇" },
  worldCup: { name: "Coupe du Monde", icon: "🏆" },
  ballon: { name: "Ballon d'Or", icon: "⭐" },
  goldenBoot: { name: "Soulier d'Or européen", icon: "👟" },
  continental2: { name: "Trophée d'Europe", icon: "🥈" },
  continental3: { name: "Bouclier d'Europe", icon: "🥉" },
};

// --- Récompenses individuelles de saison --------------------------------------
// Attribuées par engine.rollSeasonAwards selon la saison réalisée. Chaque
// distinction applique ses fx, nourrit le score Ballon d'Or (ballonPts)
// et s'accumule dans le palmarès individuel de fin de carrière.
const AWARDS = {
  league_mvp: { name: "Joueur de la saison", icon: "🏅", fx: { rep: 6, mor: 4, money: 0.4 }, ballonPts: 1.6 },
  young_star: { name: "Espoir de l'année", icon: "🌟", fx: { rep: 5, mor: 4 }, ballonPts: 0.6 },
  top_assist: { name: "Meilleur passeur", icon: "🎯", fx: { rep: 3, mor: 2 }, ballonPts: 0.5 },
  team_of_season: { name: "Équipe type de la saison", icon: "📋", fx: { rep: 3 }, ballonPts: 0.6 },
  cl_mvp: { name: "MVP de la Coupe des Champions", icon: "🥇", fx: { rep: 8, mor: 4, money: 0.6 }, ballonPts: 1.8 },
  wc_golden_ball: { name: "Ballon d'Or du Mondial", icon: "🌍", fx: { rep: 9, mor: 5, money: 0.8 }, ballonPts: 2.5 },
  wc_top_scorer: { name: "Meilleur buteur du Mondial", icon: "⚽", fx: { rep: 6, mor: 4 }, ballonPts: 1.2 },
  top_scorer: { name: "Meilleur buteur du championnat", icon: "⚽", fx: { rep: 4, mor: 3, money: 0.3 }, ballonPts: 0.7 },
  golden_glove: { name: "Gant d'Or", icon: "🧤", fx: { rep: 5, mor: 3 }, ballonPts: 1.0 },
  revelation: { name: "Révélation de la saison", icon: "💫", fx: { rep: 6, mor: 5 }, ballonPts: 0.8 },
  club_legend: { name: "Légende du club", icon: "🏛️", fx: { rep: 6, mor: 8 }, ballonPts: 0.3 },
};

// --- Entraîneurs (noms générés) ---------------------------------------------
const COACH_NAMES = [
  "R. Falcone", "J. Van Dael", "M. Herrera", "P. Leroy", "K. Adeyemi",
  "S. Novotný", "A. Guimarães", "T. Eriksson", "D. Marchetti", "H. Weiss",
  "L. Fontaine", "C. Ferraro", "O. Sørensen", "B. Quintana", "G. Marlow",
];

// --- Traits de personnalité --------------------------------------------------
const TRAITS = {
  clutch: { name: "Sang froid", icon: "🧊", desc: "Décisif dans les grands rendez-vous." },
  showman: { name: "Showman", icon: "🎭", desc: "La foule vous adore, les caméras aussi." },
  leader: { name: "Leader né", icon: "🗣️", desc: "Le vestiaire vous suit les yeux fermés." },
  ironman: { name: "Increvable", icon: "🦾", desc: "Un corps qui encaisse tout." },
  glass: { name: "Verre fêlé", icon: "🩼", desc: "Votre corps vous lâche trop souvent." },
  mercenary: { name: "Mercenaire", icon: "🪙", desc: "L'argent d'abord, le cœur ensuite." },
  loyal: { name: "Cœur de club", icon: "❤️", desc: "Fidèle envers et contre tout." },
  genius: { name: "Génie précoce", icon: "✨", desc: "Un talent qui saute aux yeux." },
  party: { name: "Fêtard", icon: "🥂", desc: "Les nuits sont longues, les matins difficiles." },
  zen: { name: "Zen", icon: "🧘", desc: "Imperturbable, quoi qu'il arrive." },
};

/* ============================================================
   NEWS DU RIVAL & BRÈVES DU MONDE — lignes d'ambiance du récap.
   {rival} = nom du rival. Good = saison réussie du rival.
   ============================================================ */
const RIVAL_NEWS_GOOD = [
  "📰 {rival} enchaîne les récitals : la presse en fait son favori pour les trophées.",
  "📰 {rival} rend une copie monumentale en match couperet. La comparaison avec vous fait rage.",
  "📰 Transfert retentissant : {rival} rejoint un cador et prend une dimension nouvelle.",
  "📰 {rival} soulève un trophée majeur et nargue ses détracteurs.",
  "📰 Les statistiques de {rival} affolent l'Europe entière cette saison.",
];
// Duel médiatique direct avec le rival (choisi selon qui domine la carrière)
const RIVAL_NEWS_AHEAD = [
  "📊 Le débat est relancé : la presse vous place devant {rival} dans la hiérarchie de votre génération.",
  "📊 Sondage du magazine OneFootball : 61% des fans vous préfèrent à {rival}.",
  "📊 {rival} l'admet à demi-mot en interview : « Il a une longueur d'avance sur moi, pour l'instant. »",
];
const RIVAL_NEWS_BEHIND = [
  "📊 Le verdict des observateurs est cruel : {rival} a pris une longueur d'avance dans votre duel de génération.",
  "📊 Une du magazine Onze d'Or : « {rival}, le patron de sa génération ». Votre nom n'apparaît qu'en page 12.",
  "📊 « Et lui, il en est où ? » : le documentaire consacré à {rival} vous réduit à un second rôle.",
];
const RIVAL_NEWS_BAD = [
  "📰 Saison compliquée pour {rival}, relégué sur le banc de son club.",
  "📰 {rival} traverse une polémique après des propos maladroits en interview.",
  "📰 Blessure au genou pour {rival} : plusieurs mois d'absence.",
  "📰 Le transfert de {rival} vire au fiasco : déjà des rumeurs de départ.",
  "📰 {rival} traverse un passage à vide depuis trois mois. Les critiques pleuvent.",
];
const WORLD_NEWS = [
  "🗞️ Un club anglais bat le record du transfert le plus cher pour un remplaçant.",
  "🗞️ La fédération teste l'arbitrage 100% automatisé : les polémiques doublent.",
  "🗞️ Un gardien marque de la tête à la 97e : but de l'année assuré.",
  "🗞️ Scandale des pelouses hybrides : trois stades sanctionnés.",
  "🗞️ Un international annonce sa reconversion... dans l'élevage d'alpagas.",
  "🗞️ Le Ballon d'Or ajoute une cérémonie des « pires simulations ». Succès immédiat.",
  "🗞️ Un club islandais se qualifie en Coupe des Champions : conte de fées nordique.",
  "🗞️ Une IA prédit les résultats du championnat : 12% de réussite. Les experts respirent.",
];

/* ============================================================
   COUPE DU MONDE — paliers du tournoi, du pire au meilleur.
   baseW : poids de base (modulé par la force de la nation et
   le niveau du joueur dans engine.js).
   ============================================================ */
const WC_STAGES = [
  { id: "groups", label: "Élimination en poules", baseW: 30, text: "La désillusion : votre nation sort dès les poules, dans un silence de cathédrale." },
  { id: "r16", label: "Huitième de finale", baseW: 25, text: "L'aventure s'arrête en huitièmes, au terme d'un match à suspense." },
  { id: "quarter", label: "Quart de finale", baseW: 18, text: "Un quart de finale héroïque, perdu au bout de la nuit. La fierté domine." },
  { id: "semi", label: "Demi-finale", baseW: 12, text: "Si proche du rêve : la demi-finale se referme cruellement." },
  { id: "final", label: "Finaliste", baseW: 8, text: "Finale perdue. La deuxième plus belle équipe du monde, et le plus grand des vides." },
  { id: "champion", label: "CHAMPION DU MONDE", baseW: 7, text: "AU BOUT DE LA NUIT ! Votre nation est sur le toit du monde, et vous au cœur de la légende !" },
];

// Coupe du Monde à 48 équipes (format 2026) : un tour de plus (seizièmes de
// finale) — le finaliste dispute 8 matchs. RÉSERVÉ AU MONDIAL ; les coupes
// continentales (24 équipes) gardent WC_STAGES et leurs huitièmes.
const WC_STAGES_48 = [
  { id: "groups", label: "Élimination en poules", baseW: 26, text: "La désillusion : votre nation sort dès les poules d'un Mondial élargi, dans un silence de cathédrale." },
  { id: "r32", label: "Seizième de finale", baseW: 27, text: "L'aventure s'arrête en seizièmes : premier tour à élimination directe, premier couperet." },
  { id: "r16", label: "Huitième de finale", baseW: 22, text: "L'aventure s'arrête en huitièmes, au terme d'un match à suspense." },
  { id: "quarter", label: "Quart de finale", baseW: 18, text: "Un quart de finale héroïque, perdu au bout de la nuit. La fierté domine." },
  { id: "semi", label: "Demi-finale", baseW: 12, text: "Si proche du rêve : la demi-finale se referme cruellement." },
  { id: "final", label: "Finaliste", baseW: 8, text: "Finale perdue. La deuxième plus belle équipe du monde, et le plus grand des vides." },
  { id: "champion", label: "CHAMPION DU MONDE", baseW: 7, text: "AU BOUT DE LA NUIT ! Votre nation est sur le toit du monde, et vous au cœur de la légende !" },
];

// ── Sélections de jeunes ──────────────────────────────────────────────────────
// Échelle U17 → U23 gravie selon l'âge, si le niveau suit (ovrNeed = barre OVR
// pour l'âge). Tant qu'on n'est pas en A, on décroche le palier de son âge.
// Les paliers avec `tournament` déclenchent un résultat résumé (une ligne).
const YOUTH_TIERS = [
  { id: "u17", label: "U17", aMin: 15, aMax: 17, ovrNeed: 58, tournament: "Mondial U17" },
  { id: "u18", label: "U18", aMin: 17, aMax: 18, ovrNeed: 62, tournament: null },
  { id: "u19", label: "U19", aMin: 18, aMax: 19, ovrNeed: 66, tournament: "Euro U19" },
  { id: "u20", label: "U20", aMin: 19, aMax: 20, ovrNeed: 69, tournament: "Mondial U20" },
  { id: "u21", label: "U21", aMin: 20, aMax: 21, ovrNeed: 72, tournament: "Euro U21" },
  { id: "u23", label: "U23", aMin: 22, aMax: 23, ovrNeed: 74, tournament: null }, // vivier olympique
];
// Résultat d'un tournoi de jeunes (léger, une ligne). games = matchs joués.
const YOUTH_STAGES = [
  { id: "groups", label: "sorti dès les poules", baseW: 34, games: 3 },
  { id: "quarter", label: "quart de finaliste", baseW: 22, games: 4 },
  { id: "semi", label: "demi-finaliste", baseW: 14, games: 5 },
  { id: "final", label: "finaliste", baseW: 8, games: 6 },
  { id: "champion", label: "VAINQUEUR", baseW: 6, games: 6, champion: true },
];

// ── Jeux Olympiques ───────────────────────────────────────────────────────────
// Tournoi U23 (années %4==3), façon mini-Mondial : poule → quart → demie → finale.
// Médailles or (champion) / argent (finaliste) / bronze (demi-finaliste).
const OLYMPIC_STAGES = [
  { id: "groups", label: "Élimination en poules", baseW: 30, games: 3, text: "Le rêve olympique s'arrête dès les poules." },
  { id: "quarter", label: "Quart de finale", baseW: 22, games: 4, text: "Quart de finale olympique : l'aventure s'arrête aux portes des médailles." },
  { id: "semi", label: "Demi-finale", baseW: 14, games: 5, text: "Battu en demie, mais le bronze est au bout." },
  { id: "final", label: "Finaliste", baseW: 8, games: 6, text: "Finale olympique disputée jusqu'au dernier souffle." },
  { id: "champion", label: "CHAMPION OLYMPIQUE", baseW: 6, games: 6, text: "Sur le toit des Jeux : l'or olympique au cou !" },
];

// Étapes de la Ligue des Sélections (phase de ligue → Final Four). Le nombre de
// matchs est porté par l'étape (pas de poules/8es comme au Mondial).
const NL_STAGES = [
  { id: "group", label: "Phase de ligue", baseW: 34, games: 6, text: "Parcours honnête en phase de ligue, sans décrocher le Final Four." },
  { id: "final_four", label: "Dernier carré", baseW: 12, games: 7, text: "Qualifié pour le Final Four, sorti en demie au terme d'un beau parcours." },
  { id: "final", label: "Finaliste", baseW: 6, games: 8, text: "Finale perdue de justesse : l'argent, et le goût des regrets." },
  { id: "champion", label: "VAINQUEUR", baseW: 5, games: 8, text: "Sacré au bout du Final Four : la Ligue des Sélections est à vous !" },
];

/* ============================================================
   CONFIG D'ÉQUILIBRAGE — tous les curseurs du moteur.
   Chaque niveau de club a un impact réel et cohérent :
   budget (salaryBase/feeMult), infrastructures (growthInfra),
   visibilité médiatique (mediaVisibility → gains de réputation),
   concurrence au poste (expectedLevel), accès aux trophées.
   ============================================================ */
const BALANCE = {
  startYear: 2026,
  ageMin: 16,
  ageMax: 50, // rideau absolu (était 42) : jouer au-delà de 42 est possible mais rarissime, à très bas niveau (D3/Rég.), sauf gardien
  // --- Longévité & crépuscule (cf. engine.advanceYear / longevityScore) ---
  // Sous retireFloor : aucune pression de retraite, la carrière suit son cours.
  // Au-delà, une pression croissante peut déclencher la décision « une saison de
  // plus ? » ; le pivot recule avec la longévité (gardien, Increvable, discipline).
  retireFloor: 33,
  retireBaseAge: 34, // âge-pivot de la pression, avant modulation par la longévité
  // Reconduction en sélection : à partir de intlRetainAge, un international n'est
  // gardé que s'il tient encore le niveau. La barre d'OVR MONTE avec l'âge
  // (intlRetainOvr + (âge - intlRetainAge) * intlRetainStep) : seuls les tout
  // meilleurs jouent encore à 37-40 ans ; les autres sont remerciés.
  intlRetainAge: 32,
  intlRetainOvr: 74,
  intlRetainStep: 1.5,
  intlRetainRating: 6.6, // note de la dernière saison en-dessous de laquelle un vétéran n'est plus reconduit
  // Longévité par poste : un gardien ou un défenseur reste sélectionnable bien
  // plus vieux qu'un attaquant (moins dépendant de l'explosivité). La valeur
  // ABAISSE la barre d'OVR requise (≈ années de sélection gagnées).
  intlRetainPos: { gk: 8, def: 4, mil: 1, att: 0 },
  // Barre d'OVR pour être appelé en sélection A, par FORCE DE NATION (à 24 ans et
  // plus ; les tranches plus jeunes ajoutent natCallAgeOffset). Une petite fédération
  // appelle des joueurs de niveau moyen faute de mieux ; la France, non.
  // Table de PALIERS et non formule : la progression voulue n'est pas linéaire
  // (−2 seulement entre les toutes premières nations, puis des marches plus larges).
  // Premier palier dont minW est atteint → sa valeur. N'ouvre pas la porte aux
  // trophées : les tournois restent filtrés par natW élevé à une puissance.
  natCallBar: [
    { minW: 0.85, ovr: 78 }, // France, Brésil, Angleterre, Allemagne, Espagne…
    { minW: 0.55, ovr: 76 }, // Portugal, Nigeria, Croatie, Uruguay, Danemark…
    { minW: 0.35, ovr: 70 }, // Maroc, Suisse, Ghana, Turquie, Sénégal…
    { minW: 0.12, ovr: 65 }, // Kosovo, Luxembourg, Haïti, Cap-Vert…
    { minW: 0, ovr: 60 },    // Saint-Marin, Andorre, Pakistan…
  ],
  // Surcoût d'OVR pour être appelé PLUS JEUNE (s'ajoute à la barre de la nation).
  natCallAgeOffset: { u19: 8, u21: 4, u24: 1 },
  // Abaissement de la barre de RÉPUTATION selon la faiblesse de la nation.
  natCallWeightRep: 24,
  // OVR attendu d'un titulaire (plus c'est haut, plus la concurrence est rude)
  expectedLevel: { regional: 46, d3: 49, d2: 55, d1: 67, elite: 80 },
  // Statut au club (rôle) : seuils de marge (OVR − expectedLevel) → cran de rôle,
  // et probabilité qu'une recrue star débarque à ton poste (te rétrograde).
  role: { margins: [6, 2, -2, -6], starSignChance: 0.14 },
  // Barre de recrutement : OVR minimum pour qu'un club de ce niveau vous SIGNE
  // quand il s'agit de MONTER d'un cran. Grimper se mérite — mais à 82 la barre
  // d'élite était au-dessus du peakOvr p90 : 90 % des carrières ne voyaient JAMAIS
  // l'élite (donc ni Ligue des Champions, ni Ballon d'Or, ni salaires d'élite).
  signingBar: { regional: 40, d3: 48, d2: 56, d1: 70, elite: 78 },
  // Marge de l'objectif de club : la cible vaut ce % de l'espérance de production.
  // Réglé par type, car les deux formules n'ont pas la même dispersion.
  objectiveSlack: { goals: 0.95, cs: 1.08 },
  // Barres de note attendue, par niveau. La note de saison part de 5,4 et ne monte
  // qu'avec l'OVR : exiger 6,5 partout ne réussissait qu'un tiers du temps.
  objectiveRating: { elite: 6.6, d1: 6.4, other: 6.15 },
  // Références de normalisation des multiplicateurs de pays. growthMult/mediaMult
  // sont calibrés « 1 = top championnat » et ne dépassent JAMAIS 1 : les brancher
  // tels quels appliquait un malus GLOBAL (−18 % croissance, −40 % visibilité) au
  // lieu de DIFFÉRENCIER les pays. On divise par la moyenne pondérée par le nombre
  // de clubs → effet moyen neutre, écarts entre pays conservés.
  countryGrowthRef: 0.82,
  countryMediaRef: 0.6,
  // Probabilité d'être éligible à une SECONDE sélection, quand la nation figure dans
  // DUAL_NATIONALITY. Volontairement minoritaire : la double nationalité doit rester
  // une carrière particulière, pas la norme.
  dualNatChance: 0.3,
  // Note de saison en dessous de laquelle la relégation est DIRECTE (sans barrage) :
  // une saison catastrophique ne se rattrape pas sur un match.
  relegDirectRating: 5.6,
  matchesByLevel: { regional: [30, 38], d3: [33, 41], d2: [36, 44], d1: [40, 48], elite: [44, 54] },
  // Titre de division (ne compte comme trophée national qu'en d1/élite)
  titleChance: { regional: 0.12, d3: 0.1, d2: 0.08, d1: 0.06, elite: 0.3 },
  cupChance: { regional: 0.004, d3: 0.01, d2: 0.02, d1: 0.08, elite: 0.18 },
  // Chance d'ATTEINDRE la finale continentale (la gagner se joue en moment
  // décisif). Hors d'Europe, la D1 EST le sommet (pas de clubs "élite") : elle
  // conteste donc sa Coupe des Champions comme l'élite européenne conteste la sienne.
  continentalReach: {
    eu: { elite: 0.17, d1: 0.03, d2: 0, d3: 0, regional: 0 },
    other: { elite: 0.17, d1: 0.15, d2: 0, d3: 0, regional: 0 },
  },
  // Coupes d'Europe secondaires (clubs). C2 = Trophée d'Europe (vainqueur de
  // Coupe Nationale, TOUTES divisions) ; C3 = Bouclier d'Europe (D1 européenne
  // par défaut). Uniquement en Europe. Portée d'ATTEINDRE la finale (× teamBoost).
  euroReach: {
    c2: { elite: 0.22, d1: 0.16, d2: 0.08, d3: 0.06, regional: 0.04 },
    c3: { d1: 0.15 },
  },
  // Récompenses C2/C3 (le C1 garde son barème codé en dur, ternaire eu/hors-eu).
  euroReward: {
    2: { money: 0.6, rep: 4, moral: 9, impact: 11, ballon: 0.7 },
    3: { money: 0.35, rep: 3, moral: 8, impact: 8, ballon: 0 },
  },
  // --- Blessures (système « Corps & Carrière ») -------------------------------
  // Un tirage de blessure par saison (dans playSeason). Gravité graduée, durées
  // en semaines (l'échelle du jeu : injuryFactor = 1 - injuryWeeks/42). Les
  // grosses (grave/catastrophe) débordent sur la/les saison(s) suivante(s) via
  // s.chronicWeeks, et peuvent — TRÈS rarement — mettre fin à la carrière.
  injury: {
    baseChance: 0.09,      // occurrence de base par saison
    ageStep: 0.006,        // + par an après 29 ans (usure)
    youthReduce: 0.03,     // - risque avant 21 ans
    minutesCoef: 0.05,     // exposition : (pt - 0.5) * coef (plus on joue, plus on s'expose)
    hygieneAdd: 0.05,      // discipline < 40
    historyAdd: 0.025,     // + par grosse blessure passée (fragilité acquise)
    glassAdd: 0.06, ironmanAdd: -0.05,
    minChance: 0.03, maxChance: 0.45,
    seasonCap: 40,         // au-delà : le surplus part en dette chronique
    carryCap: 24,          // semaines de dette reversées par saison suivante
    severeThreshold: 22,   // >= : grosse blessure (flag big_injury + injuryHistory++)
    // Paliers (poids = fréquence relative QUAND une blessure survient) ; mor/form
    // = choc immédiat ; interactive = carte « chemin du retour » ; endChance = base
    // de fin de carrière (grave/catastrophe uniquement).
    tiers: [
      { id: "knock",        w: 52,  min: 2,  max: 5,  mor: 2,  form: 3,  big: false },
      { id: "strain",       w: 30,  min: 6,  max: 12, mor: 4,  form: 6,  big: false },
      { id: "serious",      w: 13,  min: 14, max: 24, mor: 8,  form: 10, big: true, up: true, interactive: true },
      { id: "severe",       w: 4.5, min: 28, max: 45, mor: 12, form: 14, big: true, up: true, interactive: true, endChance: 0.035 },
      { id: "catastrophic", w: 0.5, min: 46, max: 70, mor: 16, form: 18, big: true, up: true, interactive: true, endChance: 0.12 },
    ],
    severityBiasAge: 0.05, severityBiasHistory: 0.08, severityBiasGlass: 0.20, // décale vers le grave
    endAgeStep: 0.004, endHistory: 0.010, endGlass: 1.5, endIronman: 0.4, endCap: 0.10,
    labels: { knock: "Petit pépin", strain: "Blessure musculaire", serious: "Blessure sérieuse", severe: "Grave blessure", catastrophic: "Blessure catastrophique" },
    growthDamp: 60,        // g *= clamp(1 - seasonInj/growthDamp, 0.55, 1) (croissance freinée, récupérable)
    tournamentSkip: 28,    // seasonInj >= : rate la CDM / coupe continentale de la saison
  },
  // Salaire annuel de base en M€ (modulé par OVR, réputation, pays)
  salaryBase: { regional: 0.03, d3: 0.05, d2: 0.09, d1: 0.9, elite: 5.0 },
  // Indemnités que le niveau peut aligner
  feeMult: { regional: 0.12, d3: 0.2, d2: 0.3, d1: 0.7, elite: 1.2 },
  // Qualité des infrastructures → vitesse de progression
  growthInfra: { regional: 0.85, d3: 0.88, d2: 0.95, d1: 1.1, elite: 1.25 },
  // Exposition médiatique → amplification des gains de réputation
  mediaVisibility: { regional: 0.55, d3: 0.65, d2: 0.75, d1: 1.0, elite: 1.3 },
  // Poids de base du niveau de centre de formation au départ
  academyWeights: { regional: 34, d3: 32, d2: 30, d1: 24, elite: 12 },
  academySurpriseChance: 0.05, // un grand centre mise sur un profil modeste
  microChance: 0.6, // proba d'au moins une brève de saison
  windowRandomChance: 0.12, // mercato spontané sans raison particulière
  noOfferChance: 0.15, // proba qu'une fenêtre annoncée n'apporte aucune offre
  coachChangeChance: 0.16, // proba de changement d'entraîneur par intersaison
  wcBaseChampion: 0.42, // multiplicateur du palier "finale atteinte" (x natWeight)
  contBaseChampion: 0.6, // sacre continental : plus accessible que le Mondial (moins d'équipes)
  earlyEndChance: 0.008, // fin de carrière brutale (16-18 ans), par saison
  // --- Ballon d'Or (modèle à points de saison, cf. engine.rollBallon) ---
  // Volontairement RARE : un sacre doit rester un événement, même pour un
  // très grand joueur (cible ~1 carrière sur 5 qui atteint le sommet).
  // Lecture de la cible ci-dessus : ~20 % des carrières QUI ATTEIGNENT LE SOMMET,
  // pas 20 % de toutes les carrières. Avec ~14 % des carrières qui touchent l'élite,
  // ça vise ≈3 % de sacres sur l'ensemble. Mesuré avant réglage : 0,7 % (soit ~5 %
  // des carrières d'élite) — les conditions CONJONCTIVES (niveau + OVR + rép + note)
  // sont chacune rares et se multiplient. Planchers assouplis d'un cran et pente
  // relevée, le verrou principal restant l'accès à l'élite (cf. signingBar).
  ballonMinOvr: 83,
  ballonMinRep: 70,
  ballonCap: 0.4, // plafond de proba sur une saison stratosphérique
  ballonPtsFloor: 2.6, // points de saison en deçà desquels le sacre est hors de portée
  ballonSlope: 0.058, // pente : proba par point de saison au-dessus du plancher
  ballonMomentum: 1.2, // multiplicateur après un 1er ou 2e Ballon d'Or (statut)
  ballonDynasty: 0.2, // multiplicateur à partir du 4e (raréfaction extrême)
  // --- Vie des clubs : montées, descentes, changements de dimension ---
  relegationChance: { d1: 0.045, d2: 0.07, d3: 0.08 }, // par saison, modulé par vos perfs
  // Les géants historiques (élite de base) ne coulent presque jamais en D2
  eliteRelegShield: 0.25,
  playoffChance: { regional: 0.17, d3: 0.14, d2: 0.12 }, // barrage de montée si saison solide
  clubRiseSeasons: 2, // saisons consécutives dans le haut du classement pour
  clubFadeSeasons: 2, // changer de dimension (d1→élite) ou décliner (élite→d1)
  // --- Moments décisifs de saison ---
  derbyMomentChance: 0.06, // par saison
  oldClubMomentChance: 0.4, // la saison qui suit un transfert
  cupFinalReachMult: 1.7, // proba d'atteindre la finale = cupChance × ce facteur
  // --- Meilleurs buteurs : titre domestique & Soulier d'Or européen ---
  topScorerGoals: { regional: 20, d3: 21, d2: 22, d1: 24, elite: 26 }, // seuil de buts par niveau
  topScorerChance: 0.4, // proba de coiffer la concurrence une fois le seuil atteint
  goldenShoeCoef: { elite: 2, d1: 1.5 }, // coefficients européens (D2/rég. inéligibles)
  goldenShoePts: 56, // buts × coefficient requis pour prétendre au Soulier d'Or
  goldenShoeChance: 0.4,
  // --- Talent générationnel (pépite qui explose dès l'adolescence) ---
  // Tirage caché à la création : chance de base + bonus selon les choix
  // (origine, hygiène, entourage), plafonnée. Le meilleur profil approche 5 %.
  prodigyBase: 0.012,
  prodigyOrigin: { prodige: 0.02, futsal: 0.016, quartier: 0.011, sportif: 0.009, formation: 0.006, tardif: 0 },
  prodigyLifestyle: { pro: 0.011, balance: 0.003, street: -0.004 },
  prodigyEntourage: { shark: 0.011, family: 0.007, crew: -0.002 },
  prodigyChanceCap: 0.05, // plafond de probabilité (meilleur profil possible)
  prodigyPotMin: 90, // potentiel caché d'un prodige (débloque enfin la 5ᵉ étoile)
  prodigyPotMax: 97,
};

/* ============================================================
   TEXTES DU MOTEUR — les phrases que engine.js écrit dans
   l'historique de carrière, les récaps et les pastilles d'effet.

   Elles vivaient auparavant en dur dans engine.js, ce qui mélangeait
   simulation et présentation : le moteur est censé calculer, data.js
   fournir les mots (c'est déjà le cas de HEADLINES, WC_STAGES,
   RIVAL_NEWS_*, UNTAKEN_PATH_TEMPLATES). Les rassembler ici les rend
   aussi traduisibles par le même mécanisme que le reste du contenu.

   Marqueurs : {club} {name} {nat} {country} {coach} {year} {age} sont
   substitués depuis l'état de carrière ; les autres ({div}, {fee},
   {rank}…) sont fournis par l'appelant. « de {x} » applique l'élision
   française (« de {club} » → « d'Osaka »).
   Rendu par engine.tx(s, clé, valeurs).
   ============================================================ */
const ENGINE_TEXT = {
  // Phase 2 : premier match professionnel et match d'adieu.
  momDebut: "Premier match professionnel",
  momDebutWin: "Baptême du feu réussi",
  momDebutFail: "Des débuts à oublier",
  debutWin: "Premiers pas en professionnel avec {club} en {year} — le début de tout.",
  debutFail: "Débuts professionnels manqués avec {club} ({year}) : la première impression est à refaire.",
  momAdieu: "Le match d'adieu",
  momAdieuWin: "Sorti par la grande porte",
  momAdieuFail: "Une sortie discrète",
  adieuWin: "Match d'adieu avec {club} en {year} — un stade entier debout pour vous.",
  adieuFail: "Match d'adieu avec {club} en {year} : le rideau tombe en silence.",
  // --- Sélection nationale & jeunes ---
  natSwitch: "Choix international : {target} plutôt que {from}.",
  firstCap: "Première convocation avec {nat}.",
  firstCapYoung: "Première convocation avec {nat} — à seulement {age} ans !",
  natRetire: "Fin de l'aventure en sélection avec {nat} : place à la nouvelle génération.",
  youthCall: "Sélectionné en {tier} de {nat}.",
  youthWin: "Vainqueur du {tournament} {year} !",

  // --- Coupe du Monde, continental, Ligue des Sélections, JO ---
  wcStage: "{stage} de la Coupe du Monde {year}.",
  wcChampion: "Champion du monde {year} avec {nat} !",
  wcFinalist: "Finaliste de la Coupe du Monde {year} — si près du rêve.",
  contChampion: "Champion {cupOf} {year} avec {nat} !",
  contFinalist: "Finaliste {cupOf} {year} — l'argent au goût amer.",
  contSemi: "Demi-finaliste {cupOf} {year}.",
  nlWinner: "Vainqueur {cupOf} {year} avec {nat} !",
  nlFinalist: "Finaliste {cupOf} {year}.",
  nlSemi: "Dernier carré {cupOf} {year}.",
  olyGold: "🥇 Champion olympique {year} avec {nat} !",
  olySilver: "🥈 Médaille d'argent olympique {year}.",
  olyBronze: "🥉 Médaille de bronze olympique {year}.",

  // --- Distinctions individuelles ---
  award: "{icon} {awardName} {year}.",
  ballon: "Ballon d'Or {year} — le monde à vos pieds.",
  ballonPodium: "Sur le podium du Ballon d'Or {year} ({rank}ᵉ).",
  goldenBoot: "Soulier d'Or européen {year} — meilleur buteur du continent.",
  prodigy: "À {age} ans, le monde entier parle déjà de vous comme d'un phénomène.",
  captain: "Nommé capitaine de {club}.",

  // --- Vie du club : titres, montées, descentes ---
  leagueTitle: "Champion national {year} avec {club}.",
  divTitlePromo: "Champion de {div} {year} avec {club} — la montée !",
  relegated: "Relégation de {club} en {year} — une saison noire.",
  promoWin: "Montée décrochée en barrage avec {club} ({year}) !",
  promoLoss: "Barrage de montée perdu avec {club} ({year}).",
  stayWin: "Maintien arraché en barrage avec {club} ({year}) !",
  stayLoss: "Relégation de {club} au bout du barrage ({year}).",
  cupWin: "Vainqueur de la {cupName} {year} avec {club}.",
  cupLoss: "Finale de {cupName} perdue en {year}.",
  contCupWin: "Vainqueur de la {cupName} avec {club} ({year}) !",
  contCupLossTop: "Finale de {cupName} perdue en {year} — si près du toit du continent.",
  contCupLoss: "Finale de {cupName} perdue en {year}.",
  clubInvestor: "Un investisseur propulse {club} en {div}.",
  clubUp: "{seasonClub} évolue désormais en {div} — l'ascension continue.",
  clubElite: "{seasonClub} change de dimension et rejoint l'élite européenne.",
  clubFade: "{seasonClub} n'est plus que l'ombre du géant qu'il fut.",

  // --- Blessures ---
  injury: "{label} ({weeks} sem.) en {year}.",
  careerEndInjury: "{label} : votre carrière s'arrête net en {year}.",
  injuryBack: "Retour de blessure réussi en {year} — le pire est derrière vous.",
  injuryRelapse: "Rechute en {year} : la convalescence s'éternise.",

  // --- Transferts & prêts ---
  transfer: "Transfert à {toClub} pour {fee}.",
  loanOut: "Prêté une saison à {toClub} pour s'aguerrir.",
  loanBackGood: "Retour de prêt convaincant : {parentClub} compte enfin sur vous.",
  loanBackOk: "Retour de prêt à {parentClub}, avec une copie honnête.",
  loanBackBad: "Un prêt raté : {parentClub} doute ouvertement de vous.",

  // Rival anonyme, quand aucun nom n'est fourni au rendu d'un texte.
  rivalFallback: "votre grand rival",

  // --- Divisions & centres de formation ---
  divElite: "Élite",
  divRegional: "Rég.",
  academyElite: "Centre d'élite — infrastructures de pointe, concurrence féroce",
  academyD1: "Centre professionnel réputé — un cap sérieux vers le haut niveau",
  academyD2: "Club formateur solide — du temps de jeu et de vrais éducateurs",
  academyD3: "Club modeste mais structuré — peu de moyens, beaucoup de terrain",
  academyRegional: "Club local — l'école de la débrouille, près des vôtres",

  // --- Coupe du Monde & Jeux Olympiques (intitulés de phase) ---
  wcInFinal: "En finale !",
  wcFinalText: "Votre nation renverse tout sur son passage : LA FINALE ! À 90 minutes du toit du monde.",
  wcChampionLabel: "CHAMPION DU MONDE",
  olyCupName: "Jeux Olympiques",
  olyGoldLabel: "MÉDAILLE D'OR",
  olySilverLabel: "Médaille d'argent",
  olyBronzeLabel: "Médaille de bronze",

  // --- Moments décisifs : intitulé, issue gagnée, issue perdue ---
  momInjury: "Coup dur",
  momInjuryWin: "De retour, plus fort",
  momInjuryFail: "Convalescence prolongée",
  momPromo: "Barrage de montée en {div}",
  momPromoWin: "MONTÉE !",
  momPromoFail: "Échec en barrage",
  momStay: "Barrage de maintien",
  momStayWin: "MAINTIEN ARRACHÉ !",
  momStayFail: "Relégation au bout du barrage",
  momCup: "Finale de la Coupe Nationale",
  momCupWin: "VAINQUEUR !",
  momCupFail: "Finale perdue",
  momCont: "Finale · {cupName}",
  momContWin: "SACRE CONTINENTAL !",
  momCont2Win: "TROPHÉE D'EUROPE REMPORTÉ !",
  momCont3Win: "BOUCLIER D'EUROPE REMPORTÉ !",
  momContFail: "Finale continentale perdue",
  momContEuFail: "Finale européenne perdue",
  momOldClub: "Retrouvailles avec votre ancien club",
  momOldClubWin: "Retrouvailles maîtrisées",
  momOldClubFail: "Soirée compliquée",
  momDerby: "Le derby",
  momDerbyWin: "Derby remporté !",
  momDerbyFail: "Derby perdu",

  // --- Pastilles d'effet ---
  chipRep: "{sign}{n} Réputation",
  chipNatCall: "🌍 Sélection : {target}",
  chipRolePromo: "⬆️ Promu : {role}",
  chipRoleDemo: "⬇️ Rétrogradé : {role}",
  chipBan: "⛔ {weeks} semaines hors du groupe",
  chipRetire: "👋 Retraite en fin de saison",

  // --- Objectif fixé par le club ---
  objRating: "Note de saison ≥ {n}",
  objTrophy: "Ramener un trophée majeur",

  // --- Lignes de récap de saison ---
  lineDiscipline: "Des écarts d'hygiène de vie répétés se paient sur le terrain.",
  lineCaptain: "🅒 Le vestiaire vous confie le brassard de capitaine.",
  lineYouthCall: "🎽 Première convocation avec les {tier} de {nat}.",

  // --- Mercato : pourquoi la fenêtre s'ouvre ---
  winLoanBuy: "{club2} n'a pas oublié votre prêt réussi : offre de transfert définitif sur la table.",
  winContractEnd: "Votre contrat expire : il faut trancher.",
  winNoRenew: "Vos statistiques n'ont pas convaincu : {club} ne prolonge pas votre contrat. À vous de rebondir ailleurs.",
  winPromoted: "La montée de {club} fait de vous une cible : rester pour l'aventure, ou viser encore plus haut ?",
  winRelegated: "La relégation de {club} ouvre votre bon de sortie.",
  winNoGameTime: "Votre temps de jeu famélique alerte tout le marché.",
  winBigSeason: "Votre saison XXL affole les recruteurs.",
  winListed: "Le club vous a placé sur la liste des transferts : le marché s'organise.",
  winRumours: "Le mercato s'agite autour de votre nom.",
  winOldGk: "L'élite vous juge trop vieux, mais un gardien chevronné trouve toujours preneur, un ou deux crans plus bas.",
  winTooOld: "Passé 42 ans, plus aucun cador ne mise sur vous : seuls des clubs modestes vous ouvrent encore leurs portes.",
  winTooWeak: "Trop juste pour ce niveau : le club vous remercie. Direction l'échelon inférieur pour vous relancer.",
  lineEuroTicket: "🇪🇺 Sacre en Coupe Nationale : vous voilà qualifié pour une coupe d'Europe la saison prochaine !",

  // --- Verdicts de rivalité (fiche finale) ---
  verdictYouEnded: "Le destin ne vous aura pas laissé la moindre chance de rivaliser. {rival} aura eu l'opportunité de construire la carrière qui vous a échappé.",
  verdictRivalEnded: "{rival} n'aura même pas eu la chance de faire ses preuves. Le destin vous aura été bien plus favorable qu'à lui.",
  verdictCrushing: "Vous surpassez très largement {rival} : cette rivalité n'en aura jamais vraiment été une.",
  verdictClearWin: "Vous prenez clairement le dessus sur {rival} au fil des années.",
  verdictTight: "Une rivalité aussi intense que serrée avec {rival} — tout aurait pu basculer à tout moment.",
  verdictBehind: "{rival} vous aura devancé sur la majeure partie de votre carrière.",
  verdictCrushed: "{rival} aura eu la carrière que vous auriez rêvé d'avoir.",

  // --- Titres de fin de carrière (fiche finale) ---
  endMedicalTitle: "Carrière jamais commencée",
  endMedicalStory: "Un diagnostic médical implacable a mis fin à vos espoirs avant même vos débuts professionnels. Une histoire qui aurait pu être si différente.",
  endCutShortTitle: "Carrière écourtée par la blessure",
  endCutShortStory: "Une blessure de trop a refermé le rideau plus tôt que vous ne l'auriez voulu. Mais le chemin parcouru, lui, personne ne pourra vous l'enlever.",
  endFelledTitle: "Carrière fauchée en plein vol",
  endFelledStory: "En pleine ascension, une blessure implacable a tout arrêté net. On ne saura jamais jusqu'où vous seriez allé — et c'est peut-être ça, le plus cruel.",
  endBrokenTitle: "Carrière brisée",
  endBrokenStory: "Une blessure sévère a stoppé net votre progression, alors que tout semblait encore possible. Le destin en a décidé autrement.",
  tierSurpriseTitle: "Star inattendue",
  tierSurpriseStory: "Rien ne laissait présager un tel sommet, et pourtant vous avez soulevé le plus grand des trophées. Une carrière que personne n'avait vue venir.",
  tierLegendTitle: "Légende du football mondial",
  tierLegendStory: "Votre nom restera gravé parmi les plus grands. Les gamins du monde entier porteront votre maillot pendant des décennies.",
  tierWorldStarTitle: "Star mondiale",
  tierWorldStarStory: "Vous avez marqué votre époque et forcé le respect de tout un sport, bien au-delà des frontières de vos clubs.",
  tierIntlTitle: "Joueur de classe internationale",
  tierIntlStory: "Une carrière remarquable, de celles qui remplissent les stades et les albums de vignettes.",
  tierSolidTitle: "Carrière solide et respectée",
  tierSolidStory: "Sans être une superstar, vous avez mené une carrière dont vous pouvez être fier, reconnue par vos pairs.",
  tierHonestTitle: "Honnête professionnel",
  tierHonestStory: "Une carrière sans éclat majeur, mais menée avec sérieux jusqu'au bout, loin des projecteurs.",
  tierQuietTitle: "Carrière discrète",
  tierQuietStory: "Le grand public ne retiendra pas votre nom, mais vous avez vécu de votre passion, et ça n'a pas de prix.",
};

/* ============================================================
   PERCENTILES DE SCORE — seuils des centiles 1→99 du score de
   carrière (computeCareerScore) sur 50 000 carrières simulées.
   Affiché sur la fiche finale : « meilleure que X % des destins ».
   À régénérer avec `node simulate.js 50000 table` si BALANCE ou
   les événements changent sensiblement.
   ============================================================ */
const SCORE_PERCENTILES = [
  63, 72, 84, 88, 91, 93, 94, 95, 97, 98, 99, 100, 100, 101, 102, 103, 104, 105, 105, 106,
  107, 107, 108, 109, 110, 110, 111, 112, 112, 113, 114, 114, 115, 116, 116, 117, 118, 119, 119, 120,
  121, 122, 122, 123, 124, 125, 125, 126, 127, 128, 129, 130, 131, 132, 133, 133, 134, 135, 136, 137,
  138, 139, 140, 142, 143, 144, 145, 146, 147, 148, 150, 151, 152, 153, 155, 156, 158, 159, 160, 162,
  164, 165, 167, 169, 171, 173, 176, 178, 180, 183, 186, 189, 193, 196, 201, 207, 214, 224, 241
];

/* ============================================================
   UNES DE PRESSE — titre généré dans le récap selon la saison.
   {name} = joueur, {club} = club. Choisi par engine.headlineFor.
   ============================================================ */
const HEADLINES = {
  wonder: [
    "« {name}, saison stratosphérique : jusqu'où ira-t-il ? »",
    "« La planète foot s'incline : {name} a écœuré tout le monde »",
    "« {name} : le niveau au-dessus, tout simplement »",
  ],
  trophy: [
    "« {club} sur le toit, {name} au sommet »",
    "« Une armoire à trophées qui déborde : {name} encore titré »",
  ],
  solid: [
    "« {name}, la valeur sûre de {club} »",
    "« Régularité, sérieux, efficacité : la saison pleine de {name} »",
  ],
  flop: [
    "« Que se passe-t-il avec {name} ? Une saison à oublier »",
    "« {name}, l'année blanche : le déclassement guette »",
  ],
  benched: [
    "« {name}, l'homme invisible de {club} »",
    "« Banc, tribunes, doutes : l'hiver sans fin de {name} »",
  ],
  // Jeunes joueurs : la presse ne les enterre pas, elle les couve. On parle
  // d'avenir, de pépite en devenir, jamais d'« hiver sans fin ».
  prospect: [
    "« {name}, futur prodige : le talent brut ne demande qu'à éclore »",
    "« On murmure déjà son nom : {name}, la pépite que {club} couve »",
    "« Déjà dans la cour des grands à son âge : {name}, c'est rare »",
    "« Diamant brut : {name} prépare son heure, patience »",
    "« Le futur a un nom à {club}, et c'est {name} »",
    "« {name}, la promesse dont tout le monde parle déjà »",
  ],
  injury: [
    "« L'infirmerie, seule adversaire que {name} n'a pas su dribbler »",
    "« Saison en pointillés pour {name} : le corps a dit stop »",
  ],
};

// --- Chemin non emprunté ----------------------------------------------------
const UNTAKEN_PATH_TEMPLATES = [
  "À {age} ans, un autre chemin s'offrait à vous. Nul ne saura jamais où il vous aurait mené.",
  "Vous repensez parfois à ce choix fait à {age} ans. Une autre version de votre carrière existe peut-être, quelque part.",
  "Il y a cette décision prise à {age} ans… et si vous aviez emprunté l'autre voie ? Le mystère restera entier.",
  "À {age} ans, votre destin s'est joué sur un fil. L'option que vous n'avez pas choisie reste à jamais une inconnue.",
  "Ce jour-là, à {age} ans, une bifurcation s'est présentée. Vous ne saurez jamais ce qu'elle vous aurait réservé.",
];

/* ============================================================
   BADGES — méta-progression entre les parties (localStorage).
   hint : indice montré tant que le badge est verrouillé.
   desc : condition exacte, révélée après déblocage (avec le
   contexte d'obtention mémorisé par game.js).
   secret : ni nom ni indice avant déblocage — pur mystère.
   cat : catégorie d'affichage (cf. BADGE_CATS). Débloquer tous
   les autres badges révèle le Graal (badge "platine").
   ============================================================ */
/* ============================================================
   QUÊTES — rétention & défis. Trois niveaux d'engagement :
   • DAILY_QUESTS   : pool réparti en 3 paliers de difficulté
     (tier 1 facile → 3 difficile). Chaque jour, le jeu tire 1 quête
     par palier — 3 quêtes du jour, mixant accessible et ambitieux.
   • WEEKLY_CHALLENGES : 1 défi par semaine, plus exigeant.
   • LEGEND_QUESTS  : défis légendaires thématiques et spectaculaires,
     1 par semaine en rotation (« champion du monde avec l'Italie »,
     « Coupe des Champions avec un club parti du régional »…).
   Sélection déterministe à partir de la date (identique pour tous).
   Conditions évaluées par game.js (questFulfilled) en fin de carrière.
   pts : récompense affichée, cumulée dans le score de quêtes.
   ============================================================ */
const DAILY_QUESTS = [
  // --- Palier 1 · Facile (10 pts) ------------------------------------------
  { id: "q_defensive", tier: 1, pts: 10, icon: "🧤", name: "Côté obscur", desc: "Terminer une carrière de défenseur ou de gardien." },
  { id: "q_exotic", tier: 1, pts: 10, icon: "🏜️", name: "L'or du désert", desc: "Signer dans un club du Golfe (Arabie Saoudite, Qatar ou Émirats)." },
  { id: "q_low_title", tier: 1, pts: 10, icon: "🌾", name: "Gloire de l'ombre", desc: "Être champion de D2 ou de division régionale." },
  { id: "q_fr_career", tier: 1, pts: 10, icon: "🇫🇷", name: "Cocorico", desc: "Terminer une carrière complète avec un joueur français." },
  { id: "q_cup", tier: 1, pts: 10, icon: "🏵️", name: "Coupe de feu", desc: "Remporter une coupe nationale." },
  { id: "q_ballon_top30", tier: 1, pts: 10, icon: "⭐", name: "Dans la lumière", desc: "Être classé au Ballon d'Or (top 30) au moins une fois." },
  // --- Palier 2 · Moyen (25 pts) -------------------------------------------
  { id: "q_leader", tier: 2, pts: 25, icon: "🗣️", name: "Porte-voix", desc: "Décrocher le trait Leader né." },
  { id: "q_one_club", tier: 2, pts: 25, icon: "❤️", name: "Fidèle", desc: "Une carrière complète sans transfert définitif." },
  { id: "q_3countries", tier: 2, pts: 25, icon: "🌍", name: "Passeport chargé", desc: "Jouer dans 3 pays différents." },
  { id: "q_young_int", tier: 2, pts: 25, icon: "🐤", name: "Pépite", desc: "Être international A avant 21 ans." },
  { id: "q_moments3", tier: 2, pts: 25, icon: "🎬", name: "Grand soir", desc: "Réussir 3 moments décisifs dans une même carrière." },
  { id: "q_no_elite", tier: 2, pts: 25, icon: "⚒️", name: "Sans les géants", desc: "Carrière complète sans jamais jouer dans un club de l'élite." },
  { id: "q_fortune", tier: 2, pts: 25, icon: "💰", name: "Jackpot", desc: "Amasser 40 M€ de fortune personnelle." },
  { id: "q_cl", tier: 2, pts: 25, icon: "🥇", name: "Nuit européenne", desc: "Remporter une coupe continentale." },
  { id: "q_continental_nt", tier: 2, pts: 25, icon: "🌍", name: "Roi du continent", desc: "Remporter un championnat continental de sélection (Euro, Copa América ou CAN)." },
  { id: "q_double", tier: 2, pts: 25, icon: "🎭", name: "Le doublé", desc: "Gagner le championnat ET la coupe nationale la même saison." },
  { id: "q_derby3", tier: 2, pts: 25, icon: "🔥", name: "Roi du derby", desc: "Faire basculer 3 derbies dans une même carrière." },
  { id: "q_top_scorer", tier: 2, pts: 25, icon: "⚽", name: "Gâchette", desc: "Finir meilleur buteur de votre championnat." },
  // --- Palier 3 · Difficile (50 pts) ---------------------------------------
  { id: "q_rating90", tier: 3, pts: 50, icon: "💯", name: "Machine", desc: "Finir avec une note de carrière de 90 ou plus." },
  { id: "q_wc", tier: 3, pts: 50, icon: "🏆", name: "Sur le toit du monde", desc: "Remporter la Coupe du Monde avec votre nation." },
  { id: "q_globe", tier: 3, pts: 50, icon: "✈️", name: "Le globe-trotter", desc: "Jouer sur 3 continents dans une même carrière." },
  { id: "q_100caps", tier: 3, pts: 50, icon: "🎽", name: "Centurion", desc: "Atteindre 100 sélections nationales." },
  { id: "q_wc_it", tier: 3, pts: 50, icon: "🇮🇹", name: "La Squadra", desc: "Devenir champion du monde avec l'Italie." },
  { id: "q_samba", tier: 3, pts: 50, icon: "🇧🇷", name: "Samba d'or", desc: "Remporter le Ballon d'Or avec un joueur brésilien." },
  { id: "q_goleador", tier: 3, pts: 50, icon: "⚽", name: "Goleador", desc: "Marquer 300 buts en carrière." },
  { id: "q_awards5", tier: 3, pts: 50, icon: "🏅", name: "Collectionneur", desc: "Cumuler 5 distinctions individuelles dans une même carrière." },
  { id: "q_golden_shoe", tier: 3, pts: 50, icon: "👟", name: "Soulier d'Or", desc: "Remporter le Soulier d'Or européen (buts × coefficient du championnat)." },
];

const WEEKLY_CHALLENGES = [
  { id: "w_prodige", pts: 60, icon: "🚀", name: "La carrière du prodige", desc: "Atteindre 85 de général avant 23 ans." },
  { id: "w_patron", pts: 60, icon: "👑", name: "Le patron du vestiaire", desc: "Décrocher le trait Leader né ET un titre de champion." },
  { id: "w_remontada", pts: 60, icon: "🏔️", name: "La remontada", desc: "Partir d'un club régional et gagner un titre de première division." },
  { id: "w_last_contract", pts: 60, icon: "🌇", name: "Le dernier contrat", desc: "Signer dans le Golfe (Arabie Saoudite, Qatar ou Émirats) après 33 ans." },
  { id: "w_double_ballon", pts: 60, icon: "🌟", name: "La dynastie", desc: "Remporter 2 Ballons d'Or dans une même carrière." },
  { id: "w_five_clubs", pts: 60, icon: "🧳", name: "L'aventurier", desc: "Porter les couleurs d'au moins 5 clubs différents." },
  { id: "w_goals400", pts: 60, icon: "💣", name: "L'artificier", desc: "Marquer 400 buts en carrière." },
];

// Défis légendaires : le sel du jeu. Un par semaine, en rotation.
const LEGEND_QUESTS = [
  { id: "l_epopee_cl", pts: 120, icon: "🏔️", name: "L'Épopée d'Europe", desc: "Remporter la Coupe des Champions avec un club que vous avez connu au niveau régional." },
  { id: "l_squadra", pts: 120, icon: "🇮🇹", name: "Il Campione del Mondo", desc: "Devenir champion du monde avec l'Italie." },
  { id: "l_from_dust", pts: 120, icon: "🌱", name: "Parti de rien", desc: "Débuter au niveau régional et soulever un trophée continental dans la même carrière." },
  { id: "l_samba_rey", pts: 120, icon: "👑", name: "O Rei", desc: "Avec un Brésilien : remporter le Ballon d'Or ET la Coupe du Monde." },
  { id: "l_kaiser", pts: 120, icon: "🦅", name: "Der Kaiser", desc: "Avec un Allemand : 100 sélections et un Ballon d'Or." },
  { id: "l_grand_chelem", pts: 120, icon: "🏰", name: "Le Grand Chelem", desc: "Être champion de première division dans les 5 grands pays d'Europe." },
  { id: "l_nomad", pts: 120, icon: "🧭", name: "Sans frontières", desc: "Jouer dans 4 pays différents dans une même carrière." },
  { id: "l_dynastie", pts: 120, icon: "🌟", name: "La Dynastie", desc: "Remporter 3 Ballons d'Or dans une même carrière." },
];

const BADGE_CATS = [
  { id: "precocite", name: "Précocité", icon: "🐣" },
  { id: "trophees", name: "Trophées & distinctions", icon: "🏆" },
  { id: "championnats", name: "Championnats", icon: "🎖️" },
  { id: "performances", name: "Performances", icon: "📊" },
  { id: "selection", name: "Sélection nationale", icon: "🎽" },
  { id: "parcours", name: "Parcours & fidélité", icon: "🧭" },
  { id: "secret", name: "Secrets", icon: "❓" },
  { id: "graal", name: "Le Graal", icon: "💎" },
];

const BADGES = [
  // --- Précocité ---
  { id: "wonderkid", cat: "precocite", icon: "🚀", name: "Prodige", hint: "Exploser avant l'heure…", desc: "Atteindre 85 de niveau général avant 22 ans." },
  { id: "prodigy", cat: "precocite", icon: "✨", name: "Élu précoce", hint: "La gloire n'attend pas le nombre des années…", desc: "Remporter un Ballon d'Or avant 24 ans." },
  { id: "early_cap", cat: "precocite", icon: "🐤", name: "Premier de cordée", hint: "Le maillot national avant même la majorité…", desc: "Être convoqué en sélection A avant 19 ans." },
  { id: "youth_prospect", cat: "precocite", icon: "🌱", name: "Graine de crack", hint: "Repéré dès les catégories de jeunes…", desc: "Être sélectionné avec les U17 de votre nation." },
  // --- Trophées & distinctions ---
  { id: "first_ballon_or", cat: "trophees", icon: "⭐", name: "Ballon d'Or", hint: "La plus haute distinction individuelle…", desc: "Remporter au moins un Ballon d'Or." },
  { id: "ballon_3", cat: "trophees", icon: "🌟", name: "Dynastie", hint: "Régner, encore et encore…", desc: "Remporter 3 Ballons d'Or dans une même carrière." },
  { id: "golden_boots", cat: "trophees", icon: "👟", name: "Serial buteur", hint: "Le meilleur devant le but, plusieurs fois…", desc: "Remporter 3 Souliers d'Or dans une même carrière." },
  { id: "award_10", cat: "trophees", icon: "🏅", name: "Vitrine pleine", hint: "Les récompenses s'empilent…", desc: "Cumuler 10 distinctions individuelles dans une même carrière." },
  { id: "wc_golden_badge", cat: "trophees", icon: "🌍", name: "Roi du Mondial", hint: "Le meilleur, sur la plus grande scène…", desc: "Être élu meilleur joueur d'une Coupe du Monde." },
  { id: "triple", cat: "trophees", icon: "🎯", name: "Triplé mythique", secret: true, desc: "Gagner le championnat, la Coupe des Champions et la Coupe du Monde la même saison.", hint: "Trois trophées majeurs, une seule saison…" },
  // --- Championnats ---
  { id: "champ_3pays", cat: "championnats", icon: "🗺️", name: "Conquérant", hint: "Un titre ici, un titre là-bas, un titre ailleurs…", desc: "Être champion (toutes divisions) dans 3 pays différents." },
  { id: "champ_big5", cat: "championnats", icon: "🏰", name: "Grand Chelem", hint: "Les cinq royaumes d'Europe, un par un…", desc: "Remporter le championnat de première division dans les 5 grands pays européens." },
  { id: "champ_d1d2", cat: "championnats", icon: "🪜", name: "Double étage", hint: "Champion en bas, champion en haut…", desc: "Gagner une D2 et une D1 dans le même pays." },
  { id: "champ_2continents", cat: "championnats", icon: "✈️", name: "Champion des deux mondes", hint: "Un titre de chaque côté de l'océan…", desc: "Être champion sur deux continents différents." },
  { id: "champ_epopee", cat: "championnats", icon: "🏔️", name: "L'Épopée", hint: "Du fin fond du football à son sommet, ensemble…", desc: "Gagner un titre de première division avec un club que vous aviez déjà mené au titre en division inférieure." },
  { id: "champ_sans_elite", cat: "championnats", icon: "⚒️", name: "À la force du poignet", hint: "Tout gagner, sans jamais rejoindre les géants…", desc: "Gagner 2 championnats de première division sans jamais jouer dans un club de l'élite." },
  // --- Performances ---
  { id: "prolific_scorer", cat: "performances", icon: "⚽", name: "Buteur historique", hint: "Faire trembler les filets, encore et encore…", desc: "Marquer 450 buts en carrière." },
  { id: "iron_man", cat: "performances", icon: "🦾", name: "Increvable", hint: "Une longévité hors du commun…", desc: "Disputer 800 matchs professionnels." },
  { id: "ageless", cat: "performances", icon: "🕰️", name: "L'Éternel", hint: "Défier le temps, saison après saison…", desc: "Disputer une saison à 40 ans ou plus." },
  { id: "mathusalem", cat: "performances", icon: "⏳", name: "Mathusalem", hint: "Repousser encore les limites de l'âge…", desc: "Disputer une saison à 45 ans ou plus." },
  { id: "wall", cat: "performances", icon: "🧱", name: "La Muraille", hint: "Une cage inviolable, saison après saison…", desc: "En tant que gardien, cumuler 150 clean sheets en carrière." },
  { id: "moment_5", cat: "performances", icon: "🎬", name: "Monsieur les grands soirs", hint: "Quand tout brûle, certains respirent…", desc: "Réussir 5 moments décisifs dans une même carrière." },
  { id: "derby_3", cat: "performances", icon: "🔥", name: "Roi du derby", hint: "La ville n'a qu'un seul patron…", desc: "Faire basculer 3 derbies dans une même carrière." },
  // --- Sélection nationale ---
  { id: "world_cup", cat: "selection", icon: "🏆", name: "Champion du monde", hint: "Le rêve ultime de tout gamin…", desc: "Remporter la Coupe du Monde avec votre nation." },
  { id: "centurion", cat: "selection", icon: "🎽", name: "Centurion", hint: "Porter cent fois le maillot national…", desc: "Atteindre 100 sélections avec votre nation." },
  { id: "nations_league", cat: "selection", icon: "🛡️", name: "Roi d'Europe des sélections", hint: "Dominer le continent entre deux grands tournois…", desc: "Remporter la Ligue des Sélections avec votre nation." },
  { id: "olympic_gold", cat: "selection", icon: "🥇", name: "Champion olympique", hint: "L'or au cou, sur la plus grande scène amateur…", desc: "Remporter la médaille d'or aux Jeux Olympiques." },
  // --- Parcours & fidélité ---
  { id: "legend_tier", cat: "parcours", icon: "👑", name: "Légende vivante", hint: "Atteindre le sommet absolu…", desc: "Terminer une carrière avec le rang « Légende du football mondial »." },
  { id: "one_club", cat: "parcours", icon: "❤️", name: "Une vie, un club", hint: "La fidélité absolue, du début à la fin…", desc: "Réussir une belle carrière sans jamais être transféré (les prêts sont tolérés)." },
  { id: "captain_100", cat: "parcours", icon: "🅒", name: "Capitaine centurion", hint: "Cent fois le brassard au bras…", desc: "Disputer 100 matchs ou plus en tant que capitaine." },
  { id: "homecoming", cat: "parcours", icon: "🏡", name: "L'enfant du pays", hint: "Revenir finir là où tout a commencé…", desc: "Terminer sa carrière dans son club formateur, après avoir porté d'autres couleurs." },
  { id: "three_countries", cat: "parcours", icon: "🌍", name: "Globe-trotter", hint: "Le football n'a pas de frontières…", desc: "Jouer dans au moins 3 pays différents." },
  { id: "well_traveled", cat: "parcours", icon: "🧳", name: "Voyageur assidu", hint: "Beaucoup de vestiaires, beaucoup de maillots…", desc: "Porter les couleurs d'au moins 5 clubs." },
  { id: "moneybags", cat: "parcours", icon: "💰", name: "Nabab", hint: "Une fortune à faire pâlir les émirs…", desc: "Amasser 100 M€ de fortune personnelle." },
  { id: "rival_slayer", cat: "parcours", icon: "⚔️", name: "Némésis", hint: "Dominer son rival, encore et encore…", desc: "Surpasser votre rival 3 carrières de suite." },
  { id: "showtime", cat: "parcours", icon: "🎭", name: "Idole des foules", hint: "Plus qu'un joueur : un spectacle…", desc: "Finir une carrière avec le trait Showman et 88+ de réputation." },
  { id: "quest_streak7", cat: "parcours", icon: "🔥", name: "L'Habitué", hint: "Revenir, jour après jour…", desc: "Accomplir au moins une quête du jour 7 jours d'affilée." },
  { id: "quest_20", cat: "parcours", icon: "🎯", name: "Chasseur de quêtes", hint: "Les défis sont une seconde nature…", desc: "Accomplir 20 quêtes ou défis au total." },
  // --- Secrets ---
  { id: "comeback", cat: "secret", icon: "🔄", name: "Renaissance", secret: true, desc: "Mener une carrière complète juste après une carrière brisée.", hint: "Repartir de zéro après le pire…" },
  { id: "survivor", cat: "secret", icon: "🩹", name: "Miraculé", secret: true, desc: "Terminer une carrière complète malgré une blessure très grave.", hint: "Le corps a lâché, pas vous…" },
  { id: "panenka_or", cat: "secret", icon: "🥄", name: "La Cuillère", secret: true, desc: "Réussir une panenka dans une finale.", hint: "Une audace folle au pire moment…" },
  { id: "double_agent", cat: "secret", icon: "😈", name: "Ennemi public", secret: true, desc: "Signer chez le club rival juré de vos supporters.", hint: "Trahir ceux qui vous chantaient…" },
  // --- Le Graal ---
  { id: "platine", cat: "graal", icon: "💎", name: "Palmarès Absolu", hint: "Tout. Absolument tout…", desc: "Débloquer tous les autres badges du jeu." },
];

/* ============================================================
   AVANTAGES DE DÉPART (boutique de jetons) — méta-progression.
   Les jetons se gagnent en accomplissant des quêtes ; on les
   dépense ici pour DÉBLOQUER un avantage (achat définitif), puis
   on ÉQUIPE jusqu'à 2 avantages actifs pour ses prochaines
   carrières NORMALES. Le Défi du jour les ignore (équité).
   cost : prix en jetons. fx : appliqué à la création (game.js
   applyPerks) — pot = potentiel caché, t/p/m/c = stats, rep,
   money (M€), trait = trait de départ (id d'un TRAITS).
   ============================================================ */
const PERKS = [
  { id: "scout", icon: "📣", name: "Déjà repéré", cost: 200, desc: "Réputation de départ +15 : les recruteurs vous connaissent déjà.", fx: { rep: 15 } },
  { id: "nest_egg", icon: "💰", name: "Cuillère d'argent", cost: 250, desc: "Vous débutez avec +2 M€ d'avance sur les autres.", fx: { money: 2 } },
  { id: "gifted", icon: "🎓", name: "Don précoce", cost: 400, desc: "+4 en Technique dès vos premiers pas chez les pros.", fx: { t: 4 } },
  { id: "prodige", icon: "🌟", name: "Pépite", cost: 600, desc: "+6 de potentiel caché : un plafond plus haut, souvent une étoile de plus.", fx: { pot: 6 } },
  { id: "captain", icon: "🗣️", name: "Tempérament de chef", cost: 800, desc: "Vous démarrez avec le trait Leader né.", fx: { trait: "leader" } },
];
const PERK_SLOTS = 2; // nombre d'avantages équipables simultanément

/* ============================================================
   SÉRIE DE QUÊTES — paliers récompensés (long terme).
   La série n'a PAS de plafond : chaque palier atteint verse des
   jetons (une fois par série — retomber à zéro ré-arme les paliers,
   pour donner envie de reconstruire). Un JOKER de gel est gagné
   tous les 7 jours de série (2 max en réserve) : un jour manqué
   est pardonné automatiquement, la série survit.
   ============================================================ */
const STREAK_MILESTONES = [
  { days: 3, jetons: 10 },
  { days: 7, jetons: 25 },
  { days: 14, jetons: 50 },
  { days: 30, jetons: 120 },
  { days: 60, jetons: 250 },
  { days: 100, jetons: 400 },
  { days: 200, jetons: 800 },
  { days: 365, jetons: 2000 },
];

/* ============================================================
   MODE HISTOIRE — revivre des carrières de légende (masquées).
   Une histoire = un profil imposé + une époque (startYear) + des
   événements scriptés (beats → s.scheduled, événements marqués
   scheduledOnly dans EVENTS : jamais tirés au hasard) + un score
   de légende à battre (baseline, échelle computeCareerScore).
   Les légendes sont « inspirées de » et JAMAIS nommées : la
   reconnaissance fait partie du jeu (cf. reveal en fin de run).
   cost : prix en jetons (0 = offerte). Le reste du run est LIBRE.
   ============================================================ */
const STORIES = [
  {
    id: "maestro",
    alias: "Le Maestro",
    icon: "🎩",
    cost: 0, // première histoire offerte : on goûte avant d'acheter
    era: "1988 → années 2000",
    startYear: 1988,
    teaser: "Un gamin des quartiers nord de Marseille, un toucher de balle venu d'ailleurs, un caractère volcanique. Parti d'un petit club de la Côte, il a tout gagné — avant la fin que le monde entier a vue. Réécrivez-la.",
    profile: { nationality: "fr", position: "mil", origin: "quartier" },
    potCap: 94,
    trajectory: "normal",
    baseline: 238,
    startClubId: "fr_cannes", // le club de la Côte où tout a commencé
    clubLevels: { fr_cannes: "d2", fr_bordeaux: "d1" }, // niveaux d'ÉPOQUE (fin 80s / 90s)
    beats: [
      { id: "ev_story_maestro_host", age: 16 },
      { id: "ev_story_maestro_clio", age: 18 },
      { id: "ev_story_maestro_roulette", age: 19 },
      { id: "ev_story_maestro_girondin", age: 20 },
      { id: "ev_story_maestro_bleus", age: 22 },
      { id: "ev_story_maestro_italy", age: 24 },
      { id: "ev_story_maestro_wc_home", age: 26 },
      { id: "ev_story_maestro_record", age: 29 },
      { id: "ev_story_maestro_volley", age: 30 },
    ],
    // Finale de la Coupe du Monde SCÉNARISÉE : le moteur garantit à la nation
    // d'atteindre la finale l'année où le joueur a cet âge (2006), et ce moment
    // décisif REMPLACE la finale générique (cf. engine.playWorldCup). C'est LE
    // choix du carton rouge — enfin joué là où il doit l'être.
    wcFinal: {
      age: 34,
      title: "FINALE DE LA COUPE DU MONDE",
      text: "Prolongation de la finale, vos toutes dernières minutes de footballeur. Le défenseur qui vous colle depuis une heure insulte votre famille — une fois de trop. Un milliard de téléspectateurs retiennent leur souffle.",
      options: [
        { id: "calm", label: "Garder votre calme — réécrire l'Histoire", hint: "Légendaire", base: 0.72, repWin: 6, traitWin: "zen", flag: "maestro_calm",
          winText: "Vous fixez l'horizon, respirez, et repartez jouer. Aux tirs au but, la délivrance : CHAMPION DU MONDE. L'Histoire retiendra le sacre — pas le geste que vous n'avez jamais commis.",
          failText: "Vous restez maître de vous jusqu'au bout. Les tirs au but, pourtant, tournent mal : finaliste. Mais vous quittez la scène mondiale la tête haute, à jamais digne." },
        { id: "headbutt", label: "Répondre, quoi qu'il en coûte", hint: "Le destin originel", base: 0.06, repFail: -6, flag: "maestro_redcard",
          winText: "Le coup part — carton rouge. Et pourtant, dans un dernier miracle, vos coéquipiers vous sacrent aux tirs au but. Champions… mais l'image du geste vous poursuivra pour toujours.",
          failText: "Le coup part — carton rouge direct. Vous quittez la pelouse sous les yeux du monde entier, et vos coéquipiers s'inclinent aux tirs au but. Le destin, encore, s'est répété." },
      ],
    },
    reveal: "Cette histoire s'inspire librement d'un maître à jouer des années 90-2000 : la famille d'accueil de la Côte, la voiture rouge du premier but, le doublé de la 63e minute pour sa première en Bleu, la serviette du transfert du siècle, la volée en finale européenne… et le coup de sang de trop, en mondovision. Vous connaissez la fin originale. Vous venez d'écrire la vôtre.",
    // Drapeaux posés par les beats : listés sur la fiche finale s'ils ont été vécus
    moments: {
      maestro_clio: "🚗 la voiture rouge du premier but",
      maestro_bleus: "🐓 le doublé de la 63e minute",
      maestro_napkin: "💎 la serviette du transfert du siècle",
      maestro_volley: "☄️ la volée du siècle",
      maestro_calm: "🧘 le calme de 2006, réécrit",
    },
  },
];

// --- Export Node (engine.js / simulate.js) ---------------------------------
// Langue principale par pays, pour les événements d'intégration/langue à
// l'étranger. Un pays ABSENT de cette table parle "sa propre langue" (unique) :
// s'y expatrier compte alors toujours comme un dépaysement linguistique. Seuls
// les groupes multi-pays sont listés — ainsi un Argentin qui signe en Espagne
// (tous deux "es") ne subit AUCUN choc de langue.
const COUNTRY_LANG = {
  // Espagnol
  es: "es", ar: "es", mx: "es", uy: "es", cl: "es", co: "es", ve: "es", ec: "es", py: "es", sv: "es",
  // Portugais
  pt: "pt", br: "pt", ao: "pt",
  // Anglais
  en: "en", us: "en", sco: "en", nir: "en", wal: "en", ie: "en", ng: "en", za: "en", ca: "en", au: "en", nz: "en", pg: "en",
  // Français
  fr: "fr", be: "fr", ci: "fr", sn: "fr", cm: "fr", cd: "fr", gn: "fr", bj: "fr", mg: "fr",
  // Allemand
  de: "de", at: "de", ch: "de",
  // Arabe
  dz: "ar", ma: "ar", tn: "ar", eg: "ar", sa: "ar", qa: "ar",
};

if (typeof module !== "undefined" && module.exports) {
  const dataExports = {
    BRAND, NATIONALITIES, NAME_POOLS, LIFESTYLES, ENTOURAGES, TRAJECTORIES,
    ARCHETYPES, POSITIONS, NAT_NUMBERS, ORIGINS, COUNTRIES, CONTINENTAL_CUPS, NATIONAL_CUPS, NATIONS_LEAGUE, NL_STAGES, LEVELS, ROLES, ROLE_ESPOIR_MAX_AGE,
    LEVEL_ORDER, DUAL_NATIONALITY, CLUBS, CLUBS_BY_LEVEL, COMPETITIONS, COACH_NAMES, TRAITS,
    AWARDS, KEY_MOMENTS,
    EVENTS, MICRO_EVENTS, RIVAL_NEWS_GOOD, RIVAL_NEWS_BAD, RIVAL_NEWS_AHEAD,
    RIVAL_NEWS_BEHIND, WORLD_NEWS, WC_STAGES, WC_STAGES_48, YOUTH_TIERS, YOUTH_STAGES, OLYMPIC_STAGES, BALANCE, HEADLINES,
    UNTAKEN_PATH_TEMPLATES, DAILY_QUESTS, WEEKLY_CHALLENGES, LEGEND_QUESTS, BADGE_CATS, BADGES,
    PERKS, PERK_SLOTS, STORIES, SCORE_PERCENTILES, STREAK_MILESTONES, COUNTRY_LANG,
    ENGINE_TEXT,
  };
  Object.assign(global, dataExports);
  module.exports = dataExports;
}
