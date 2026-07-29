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
  { id: "de", name: "Allemagne", flag: "🇩🇪", img: "src/img/flag/Drapeau-Allemagne.png", weight: 0.95, wcWeight: 0.95, homeCountryId: "de" },
  { id: "es", name: "Espagne", flag: "🇪🇸", img: "src/img/flag/Spain_flag_300.png", weight: 0.95, wcWeight: 0.9, homeCountryId: "es" },
  { id: "it", name: "Italie", flag: "🇮🇹", img: "src/img/flag/Flag_of_Italy_(1946–2003).png", weight: 0.9, wcWeight: 0.9, homeCountryId: "it" },
  { id: "en", name: "Angleterre", flag: "🇬🇧", img: "src/img/flag/Drapeau-Angleterre.png", weight: 0.95, wcWeight: 0.88, homeCountryId: "en" },
  { id: "br", name: "Brésil", flag: "🇧🇷", img: "src/img/flag/Brazil_flag_300.png", weight: 1, wcWeight: 1, homeCountryId: "br" },
  { id: "ar", name: "Argentine", flag: "🇦🇷", img: "src/img/flag/Flag_of_Argentina.png", weight: 1, wcWeight: 1, homeCountryId: "ar" },
  { id: "nl", name: "Pays-Bas", flag: "🇳🇱", img: "src/img/flag/Flag_of_Netherlands.png", weight: 0.7, wcWeight: 0.45, homeCountryId: "nl" },
  { id: "pt", name: "Portugal", flag: "🇵🇹", img: "src/img/flag/Flag_of_Portugal.png", weight: 0.6, wcWeight: 0.42, homeCountryId: "pt" },
  { id: "be", name: "Belgique", flag: "🇧🇪", img: "src/img/flag/Flag_of_Belgium.png", weight: 0.6, wcWeight: 0.38, homeCountryId: "be" },
  { id: "hr", name: "Croatie", flag: "🇭🇷", img: "src/img/flag/Flag_of_Croatia.png", weight: 0.55, wcWeight: 0.34, homeCountryId: "hr" },
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
  { id: "jo", name: "Jordanie", flag: "🇯🇴", img: "src/img/flag/Flag_of_Jordan.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "jo" },
  { id: "kw", name: "Koweït", flag: "🇰🇼", img: "src/img/flag/Flag_of_Kuwait.png", weight: 0.24, wcWeight: 0.04, homeCountryId: "kw" },
  { id: "th", name: "Thaïlande", flag: "🇹🇭", img: "src/img/flag/Flag_of_Thailand.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "th" },
  { id: "vn", name: "Vietnam", flag: "🇻🇳", img: "src/img/flag/Flag_of_Vietnam.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "vn" },
  { id: "in", name: "Inde", flag: "🇮🇳", img: "src/img/flag/Flag_of_India.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "in" },
  { id: "sy", name: "Syrie", flag: "🇸🇾", img: "src/img/flag/Flag_of_Syria.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "sy" },
  { id: "iq", name: "Irak", flag: "🇮🇶", img: "src/img/flag/Flag_of_Iraq.png", weight: 0.35, wcWeight: 0.08, homeCountryId: "iq" },
  { id: "ae", name: "Émirats arabes unis", flag: "🇦🇪", img: "src/img/flag/Flag_of_United_Arab_Emirates.png", weight: 0.32, wcWeight: 0.06, homeCountryId: "ae" },
  { id: "uz", name: "Ouzbékistan", flag: "🇺🇿", img: "src/img/flag/Flag_of_Uzbekistan.png", weight: 0.3, wcWeight: 0.06, homeCountryId: "uz" },
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
  { id: "cv", name: "Cap-Vert", flag: "🇨🇻", img: "src/img/flag/Flag_of_Cape_Verde.png", weight: 0.3, wcWeight: 0.06, homeCountryId: "cv" },
  { id: "ga", name: "Gabon", flag: "🇬🇦", img: "src/img/flag/Flag_of_Gabon.png", weight: 0.3, wcWeight: 0.06, homeCountryId: "ga" },
  { id: "zm", name: "Zambie", flag: "🇿🇲", img: "src/img/flag/Flag_of_Zambia.png", weight: 0.3, wcWeight: 0.06, homeCountryId: "zm" },
  { id: "ug", name: "Ouganda", flag: "🇺🇬", img: "src/img/flag/Flag_of_Uganda.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "ug" },
  { id: "cg", name: "Congo", flag: "🇨🇬", img: "src/img/flag/Flag_of_Congo.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "cg" },
  { id: "gq", name: "Guinée équatoriale", flag: "🇬🇶", img: "src/img/flag/Flag_of_Equatorial_Guinea.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "gq" },
  { id: "mz", name: "Mozambique", flag: "🇲🇿", img: "src/img/flag/Flag_of_Mozambique.png", weight: 0.26, wcWeight: 0.05, homeCountryId: "mz" },
  { id: "gm", name: "Gambie", flag: "🇬🇲", img: "src/img/flag/Flag_of_Gambia.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "gm" },
  { id: "gh", name: "Ghana", flag: "🇬🇭", img: "src/img/flag/Flag_of_Ghana.png", weight: 0.45, wcWeight: 0.15, homeCountryId: "gh" },
  { id: "ml", name: "Mali", flag: "🇲🇱", img: "src/img/flag/Flag_of_Mali.png", weight: 0.4, wcWeight: 0.12, homeCountryId: "ml" },
  { id: "bf", name: "Burkina Faso", flag: "🇧🇫", img: "src/img/flag/Flag_of_Burkina_Faso.png", weight: 0.38, wcWeight: 0.1, homeCountryId: "bf" },
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
  { id: "bo", name: "Bolivie", flag: "🇧🇴", img: "src/img/flag/Flag_of_Bolivia.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "bo" },
  { id: "pa", name: "Panama", flag: "🇵🇦", img: "src/img/flag/Flag_of_Panama.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "pa" },
  { id: "hn", name: "Honduras", flag: "🇭🇳", img: "src/img/flag/Flag_of_Honduras.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "hn" },
  { id: "jm", name: "Jamaïque", flag: "🇯🇲", img: "src/img/flag/Flag_of_Jamaica.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "jm" },
  { id: "pe", name: "Pérou", flag: "🇵🇪", img: "src/img/flag/Flag_of_Peru.png", weight: 0.45, wcWeight: 0.14, homeCountryId: "pe" },
  { id: "cr", name: "Costa Rica", flag: "🇨🇷", img: "src/img/flag/Flag_of_Costa_Rica.png", weight: 0.42, wcWeight: 0.12, homeCountryId: "cr" },
  { id: "mt", name: "Malte", flag: "🇲🇹", img: "src/img/flag/Flag_of_Malta.png", weight: 0.12, wcWeight: 0.01, homeCountryId: "mt" },
  { id: "fo", name: "Îles Féroé", flag: "🇫🇴", img: "src/img/flag/Flag_of_the_Faroe_Islands.png", weight: 0.1, wcWeight: 0.01, homeCountryId: "fo" },
  { id: "ad", name: "Andorre", flag: "🇦🇩", img: "src/img/flag/Flag_of_Andorra.png", weight: 0.07, wcWeight: 0.005, homeCountryId: "ad" },
  { id: "sm", name: "Saint-Marin", flag: "🇸🇲", img: "src/img/flag/Flag_of_San_Marino.png", weight: 0.05, wcWeight: 0.005, homeCountryId: "sm" },
  { id: "li", name: "Liechtenstein", flag: "🇱🇮", img: "src/img/flag/Flag_of_Liechtenstein.png", weight: 0.08, wcWeight: 0.005, homeCountryId: "li" },
  { id: "gi", name: "Gibraltar", flag: "🇬🇮", img: "src/img/flag/Flag_of_Gibraltar.png", weight: 0.07, wcWeight: 0.005, homeCountryId: "gi" },
  { id: "me", name: "Monténégro", flag: "🇲🇪", img: "src/img/flag/Flag_of_Montenegro.png", weight: 0.2, wcWeight: 0.04, homeCountryId: "me" },
  { id: "xk", name: "Kosovo", flag: "🇽🇰", img: "src/img/flag/Flag_of_Kosovo.png", weight: 0.18, wcWeight: 0.03, homeCountryId: "xk" },
  { id: "am", name: "Arménie", flag: "🇦🇲", img: "src/img/flag/Flag_of_Armenia.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "am" },
  { id: "az", name: "Azerbaïdjan", flag: "🇦🇿", img: "src/img/flag/Flag_of_Azerbaijan.png", weight: 0.17, wcWeight: 0.03, homeCountryId: "az" },
  { id: "cy", name: "Chypre", flag: "🇨🇾", img: "src/img/flag/Flag_of_Cyprus.png", weight: 0.18, wcWeight: 0.03, homeCountryId: "cy" },
  { id: "md", name: "Moldavie", flag: "🇲🇩", img: "src/img/flag/Flag_of_Moldova.png", weight: 0.15, wcWeight: 0.02, homeCountryId: "md" },
  { id: "lu", name: "Luxembourg", flag: "🇱🇺", img: "src/img/flag/Flag_of_Luxembourg.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "lu" },
  { id: "lv", name: "Lettonie", flag: "🇱🇻", img: "src/img/flag/Flag_of_Latvia.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "lv" },
  { id: "lt", name: "Lituanie", flag: "🇱🇹", img: "src/img/flag/Flag_of_Lithuania.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "lt" },
  { id: "ee", name: "Estonie", flag: "🇪🇪", img: "src/img/flag/Flag_of_Estonia.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "ee" },
  { id: "kz", name: "Kazakhstan", flag: "🇰🇿", img: "src/img/flag/Flag_of_Kazakhstan.png", weight: 0.16, wcWeight: 0.03, homeCountryId: "kz" },
  { id: "by", name: "Biélorussie", flag: "🇧🇾", img: "src/img/flag/Flag_of_Belarus.png", weight: 0.18, wcWeight: 0.03, homeCountryId: "by" },
  { id: "si", name: "Slovénie", flag: "🇸🇮", img: "src/img/flag/Flag_of_Slovenia.png", weight: 0.3, wcWeight: 0.06, homeCountryId: "si" },
  { id: "is", name: "Islande", flag: "🇮🇸", img: "src/img/flag/Flag_of_Iceland.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "is" },
  { id: "ge", name: "Géorgie", flag: "🇬🇪", img: "src/img/flag/Flag_of_Georgia.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "ge" },
  { id: "al", name: "Albanie", flag: "🇦🇱", img: "src/img/flag/Flag_of_Albania.png", weight: 0.28, wcWeight: 0.05, homeCountryId: "al" },
  { id: "mk", name: "Macédoine du Nord", flag: "🇲🇰", img: "src/img/flag/Flag_of_North_Macedonia.png", weight: 0.26, wcWeight: 0.04, homeCountryId: "mk" },
  { id: "gr", name: "Grèce", flag: "🇬🇷", img: "src/img/flag/Flag_of_Greece.png", weight: 0.5, wcWeight: 0.15, homeCountryId: "gr" },
  { id: "dk", name: "Danemark", flag: "🇩🇰", img: "src/img/flag/Flag_of_Denmark.png", weight: 0.55, wcWeight: 0.22, homeCountryId: "dk" },
  { id: "ro", name: "Roumanie", flag: "🇷🇴", img: "src/img/flag/Flag_of_Romania.png", weight: 0.42, wcWeight: 0.12, homeCountryId: "ro" },
  { id: "sk", name: "Slovaquie", flag: "🇸🇰", img: "src/img/flag/Flag_of_Slovakia.png", weight: 0.4, wcWeight: 0.1, homeCountryId: "sk" },
  { id: "uy", name: "Uruguay", flag: "🇺🇾", img: "src/img/flag/Flag_of_Uruguay.png", weight: 0.55, wcWeight: 0.5, homeCountryId: "uy" },
  { id: "ma", name: "Maroc", flag: "🇲🇦", img: "src/img/flag/Flag_of_Morocco.png", weight: 0.45, wcWeight: 0.22, homeCountryId: "ma" },
  { id: "mx", name: "Mexique", flag: "🇲🇽", img: "src/img/flag/Flag_of_Mexico.png", weight: 0.42, wcWeight: 0.18, homeCountryId: "mx" },
  { id: "co", name: "Colombie", flag: "🇨🇴", img: "src/img/flag/Flag_of_Colombia.png", weight: 0.42, wcWeight: 0.18, homeCountryId: "co" },
  { id: "ch", name: "Suisse", flag: "🇨🇭", img: "src/img/flag/Flag_of_Switzerland.png", weight: 0.4, wcWeight: 0.16, homeCountryId: "ch" },
  { id: "sn", name: "Sénégal", flag: "🇸🇳", img: "src/img/flag/Flag_of_Senegal.png", weight: 0.4, wcWeight: 0.16, homeCountryId: "sn" },
  { id: "tr", name: "Turquie", flag: "🇹🇷", img: "src/img/flag/Flag_of_Turkey.png", weight: 0.4, wcWeight: 0.15, homeCountryId: "tr" },
  { id: "cm", name: "Cameroun", flag: "🇨🇲", img: "src/img/flag/Flag_of_Cameroon.png", weight: 0.38, wcWeight: 0.12, homeCountryId: "cm" },
  { id: "ci", name: "Côte d'Ivoire", flag: "🇨🇮", img: "src/img/flag/Drapeau-CIV.png", weight: 0.36, wcWeight: 0.12, homeCountryId: "ci" },
  { id: "dz", name: "Algérie", flag: "🇩🇿", img: "src/img/flag/Flag_of_Algeria.png", weight: 0.34, wcWeight: 0.12, homeCountryId: "dz" },
  { id: "tn", name: "Tunisie", flag: "🇹🇳", img: "src/img/flag/Flag_of_Tunisia.png", weight: 0.32, wcWeight: 0.1, homeCountryId: "tn" },
  { id: "no", name: "Norvège", flag: "🇳🇴", img: "src/img/flag/Flag_of_Norway.png", weight: 0.3, wcWeight: 0.1, homeCountryId: "no" },
  { id: "fi", name: "Finlande", flag: "🇫🇮", img: "src/img/flag/Flag_of_Finland.png", weight: 0.25, wcWeight: 0.05, homeCountryId: "fi" },
  { id: "se", name: "Suède", flag: "🇸🇪", img: "src/img/flag/Flag_of_Sweden.png", weight: 0.45, wcWeight: 0.15, homeCountryId: "se" },
  { id: "pl", name: "Pologne", flag: "🇵🇱", img: "src/img/flag/Flag_of_Poland.png", weight: 0.5, wcWeight: 0.18, homeCountryId: "pl" },
  { id: "bg", name: "Bulgarie", flag: "🇧🇬", img: "src/img/flag/Flag_of_Bulgaria.png", weight: 0.3, wcWeight: 0.1, homeCountryId: "bg" },
  { id: "jp", name: "Japon", flag: "🇯🇵", img: "src/img/flag/Flag_of_Japan.png", weight: 0.42, wcWeight: 0.13, homeCountryId: "jp" },
  { id: "kr", name: "Corée du Sud", flag: "🇰🇷", img: "src/img/flag/Flag_of_South_Korea.png", weight: 0.4, wcWeight: 0.12, homeCountryId: "kr" },
  { id: "cn", name: "Chine", flag: "🇨🇳", img: "src/img/flag/Flag_of_China.png", weight: 0.2, wcWeight: 0.05, homeCountryId: "cn" },
  { id: "au", name: "Australie", flag: "🇦🇺", img: "src/img/flag/Flag_of_Australia.png", weight: 0.4, wcWeight: 0.12, homeCountryId: "au" },
  { id: "nz", name: "Nouvelle-Zélande", flag: "🇳🇿", img: "src/img/flag/Flag_of_New_Zealand.png", weight: 0.22, wcWeight: 0.05, homeCountryId: "nz" },
  { id: "pg", name: "Papouasie-Nouvelle-Guinée", flag: "🇵🇬", img: "src/img/flag/Flag_of_Papua_New_Guinea.png", weight: 0.12, wcWeight: 0.02, homeCountryId: "pg" },
  { id: "us", name: "États-Unis", flag: "🇺🇸", img: "src/img/flag/Flag_of_the_United_States.png", weight: 0.5, wcWeight: 0.18, homeCountryId: "us" },
  { id: "eg", name: "Égypte", flag: "🇪🇬", img: "src/img/flag/Flag_of_Egypt.png", weight: 0.42, wcWeight: 0.08, homeCountryId: "eg" },
  { id: "za", name: "Afrique du Sud", flag: "🇿🇦", img: "src/img/flag/Flag_of_South_Africa.png", weight: 0.32, wcWeight: 0.07, homeCountryId: "za" },
  { id: "ba", name: "Bosnie-Herzégovine", flag: "🇧🇦", img: "src/img/flag/Flag_of_Bosnia_and_Herzegovina.png", weight: 0.35, wcWeight: 0.1, homeCountryId: "ba" },
  { id: "py", name: "Paraguay", flag: "🇵🇾", img: "src/img/flag/Flag_of_Paraguay.png", weight: 0.4, wcWeight: 0.12, homeCountryId: "py" },
  { id: "cl", name: "Chili", flag: "🇨🇱", img: "src/img/flag/Flag_of_Chile.png", weight: 0.45, wcWeight: 0.14, homeCountryId: "cl" },
  { id: "ca", name: "Canada", flag: "🇨🇦", img: "src/img/flag/Flag_of_Canada.png", weight: 0.35, wcWeight: 0.1, homeCountryId: "ca" },
  { id: "sv", name: "Salvador", flag: "🇸🇻", img: "src/img/flag/Flag_of_El_Salvador.png", weight: 0.2, wcWeight: 0.04, homeCountryId: "sv" },
  { id: "ao", name: "Angola", flag: "🇦🇴", img: "src/img/flag/Flag_of_Angola.png", weight: 0.28, wcWeight: 0.06, homeCountryId: "ao" },
  { id: "mg", name: "Madagascar", flag: "🇲🇬", img: "src/img/flag/Flag_of_Madagascar.png", weight: 0.22, wcWeight: 0.04, homeCountryId: "mg" },
  { id: "ng", name: "Nigeria", flag: "🇳🇬", img: "src/img/flag/Flag_of_Nigeria.png", weight: 0.55, wcWeight: 0.2, homeCountryId: "ng" },
  { id: "sa", name: "Arabie Saoudite", flag: "🇸🇦", img: "src/img/flag/Flag_of_Saudi_Arabia.png", weight: 0.3, wcWeight: 0.08, homeCountryId: "sa" },
  { id: "qa", name: "Qatar", flag: "🇶🇦", img: "src/img/flag/Flag_of_Qatar.png", weight: 0.2, wcWeight: 0.05, homeCountryId: "qa" },
  { id: "ir", name: "Iran", flag: "🇮🇷", img: "src/img/flag/Flag_of_Iran.png", weight: 0.35, wcWeight: 0.08, homeCountryId: "ir" },
  { id: "at", name: "Autriche", flag: "🇦🇹", img: "src/img/flag/Flag_of_Austria.png", weight: 0.45, wcWeight: 0.12, homeCountryId: "at" },
  { id: "ec", name: "Équateur", flag: "🇪🇨", img: "src/img/flag/Flag_of_Ecuador.png", weight: 0.4, wcWeight: 0.1, homeCountryId: "ec" },
  { id: "ua", name: "Ukraine", flag: "🇺🇦", img: "src/img/flag/Flag_of_Ukraine.png", weight: 0.45, wcWeight: 0.12, homeCountryId: "ua" },
  { id: "ru", name: "Russie", flag: "🇷🇺", img: "src/img/flag/Flag_of_Russia.png", weight: 0.5, wcWeight: 0.15, homeCountryId: "ru" },
  { id: "wal", name: "Pays de Galles", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", img: "src/img/flag/Flag_of_Wales.png", weight: 0.4, wcWeight: 0.1, homeCountryId: "wal" },
  { id: "rs", name: "Serbie", flag: "🇷🇸", img: "src/img/flag/Flag_of_Serbia.png", weight: 0.45, wcWeight: 0.12, homeCountryId: "rs" },
  { id: "hu", name: "Hongrie", flag: "🇭🇺", img: "src/img/flag/Flag_of_Hungary.png", weight: 0.42, wcWeight: 0.1, homeCountryId: "hu" },
  { id: "sco", name: "Écosse", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", img: "src/img/flag/Flag_of_Scotland.png", weight: 0.45, wcWeight: 0.12, homeCountryId: "sco" },
  { id: "ie", name: "Irlande", flag: "🇮🇪", img: "src/img/flag/Flag_of_Ireland.png", weight: 0.42, wcWeight: 0.1, homeCountryId: "ie" },
  { id: "nir", name: "Irlande du Nord", flag: "🇬🇧", img: "src/img/flag/Flag_of_Northern_Ireland.png", weight: 0.35, wcWeight: 0.08, homeCountryId: "nir" },
  { id: "ve", name: "Venezuela", flag: "🇻🇪", img: "src/img/flag/Flag_of_Venezuela.png", weight: 0.38, wcWeight: 0.08, homeCountryId: "ve" },
  { id: "cz", name: "Tchéquie", flag: "🇨🇿", img: "src/img/flag/Flag_of_Czech_Republic.png", weight: 0.45, wcWeight: 0.12, homeCountryId: "cz" },
  { id: "cd", name: "RDC", flag: "🇨🇩", img: "src/img/flag/Flag_of_RDC.png", weight: 0.28, wcWeight: 0.08, homeCountryId: "cd" },
  { id: "gn", name: "Guinée", flag: "🇬🇳", img: "src/img/flag/Flag_of_Guinea.png", weight: 0.25, wcWeight: 0.07, homeCountryId: "gn" },
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

// --- Niveaux de clubs ----------------------------------------------------------
// 4 échelons, du sommet européen au football régional. Chaque niveau a un
// impact réel (cf. BALANCE) : budget, infrastructures, visibilité médiatique,
// concurrence au poste, accès à la sélection, temps de jeu.
const LEVELS = {
  elite: { name: "D1 · Élite", short: "Élite", rank: 4 },
  d1: { name: "Première division", short: "D1", rank: 3 },
  d2: { name: "Deuxième division", short: "D2", rank: 2 },
  d3: { name: "Troisième division", short: "D3", rank: 1 },
  regional: { name: "Football régional", short: "Rég.", rank: 0 },
};
const LEVEL_ORDER = ["regional", "d3", "d2", "d1", "elite"];

// --- Statut au club (rôle) ------------------------------------------
// Cran de statut vis-à-vis du coach, du plus faible au plus fort. `pt` = temps
// de jeu de base (ancre) ; `expect` = note de saison à tenir pour garder le poste.
// L'ordre du tableau EST le rang (index 0→4) ; s.role stocke cet index.
const ROLES = [
  { id: "espoir", label: "Espoir", icon: "🌱", pt: 0.12, expect: 5.6, desc: "Un pari sur l'avenir : peu de minutes, mais tu apprends au haut niveau." },
  { id: "sporadique", label: "Sporadique", icon: "🔸", pt: 0.30, expect: 6.0, desc: "Utilisé au compte-gouttes, souvent sur le banc." },
  { id: "rotation", label: "Rotation", icon: "🔄", pt: 0.52, expect: 6.3, desc: "Dans la rotation : environ une titularisation sur deux." },
  { id: "important", label: "Important", icon: "⭐", pt: 0.74, expect: 6.6, desc: "Cadre de la rotation, presque toujours sur la feuille." },
  { id: "titulaire", label: "Titulaire", icon: "👑", pt: 0.93, expect: 6.8, desc: "Indiscutable : tu joues, mais on attend beaucoup de toi." },
];

// --- Clubs ----------------------------------------------------------
// Noms inspirés de vrais clubs/villes, par pays jouable + destinations
// exotiques. colors (optionnel) : couleurs du maillot en emoji.
// img (optionnel) : logo du club dans src/img/club (fallback automatique).
const CLUBS = [
  { id: "fr_paris", name: "Paris", level: "elite", countryId: "fr", colors: "🔴🔵" },
  { id: "fr_marseille", name: "Marseille", level: "elite", countryId: "fr", colors: "🔵⚪" },
  { id: "fr_lyon", name: "Lyon", level: "elite", countryId: "fr", colors: "🔴🔵" },
  { id: "fr_monaco", name: "Monaco", level: "elite", countryId: "fr", colors: "🔴⚪" },
  { id: "fr_lille", name: "Lille", level: "elite", countryId: "fr", colors: "🔴⚪" },
  { id: "fr_brest", name: "Brest", level: "elite", countryId: "fr", colors: "🔴⚪" },
  { id: "fr_rennes", name: "Rennes", level: "elite", countryId: "fr", colors: "🔴⚫" },
  { id: "fr_nice", name: "Nice", level: "elite", countryId: "fr", colors: "🔴⚫" },
  { id: "fr_lens", name: "Lens", level: "elite", countryId: "fr", colors: "🔴🟡" },
  { id: "fr_strasbourg", name: "Strasbourg", level: "elite", countryId: "fr", colors: "🔵" },
  { id: "fr_toulouse", name: "Toulouse", level: "d1", countryId: "fr", colors: "🟣⚪" },
  { id: "fr_clermont", name: "Clermont", level: "d1", countryId: "fr", colors: "🔴🔵" },
  { id: "fr_lemans", name: "Le Mans", level: "d1", countryId: "fr", colors: "🔴🟡" },
  { id: "fr_troyes", name: "Troyes", level: "d1", countryId: "fr", colors: "🔵⚪" },
  { id: "fr_auxerre", name: "Auxerre", level: "d1", countryId: "fr", colors: "🔵⚪" },
  { id: "fr_angers", name: "Angers", level: "d1", countryId: "fr", colors: "⚫⚪" },
  { id: "fr_bordeaux", name: "Bordeaux", level: "d1", countryId: "fr", colors: "🔵⚪" },
  { id: "fr_grenoble", name: "Grenoble", level: "d1", countryId: "fr", colors: "🔵⚪" },
  { id: "fr_metz", name: "Metz", level: "d1", countryId: "fr", colors: "🔴⚪" },
  { id: "fr_lehavre", name: "Le Havre", level: "d1", countryId: "fr", colors: "🔵⚪" },
  { id: "fr_saintetienne", name: "Saint-Étienne", level: "d1", countryId: "fr", colors: "🟢⚪" },
  { id: "fr_montpellier", name: "Montpellier", level: "d1", countryId: "fr", colors: "🔵🟠" },
  { id: "fr_nantes", name: "Nantes", level: "d1", countryId: "fr", colors: "🟡🟢" },
  { id: "fr_annecy", name: "Annecy", level: "d1", countryId: "fr", colors: "🔴⚪" },
  { id: "fr_nancy", name: "Nancy", level: "d1", countryId: "fr", colors: "🔴⚪" },
  { id: "fr_sochaux", name: "Sochaux", level: "d1", countryId: "fr", colors: "🟡🔵" },
  { id: "fr_pau", name: "Pau", level: "d2", countryId: "fr", colors: "⚫⚪" },
  { id: "fr_laval", name: "Laval", level: "d2", countryId: "fr", colors: "⚫🟠" },
  { id: "fr_dijon", name: "Dijon", level: "d2", countryId: "fr", colors: "🔴⚪" },
  { id: "fr_guingamp", name: "Guingamp", level: "d2", countryId: "fr", colors: "🔴⚫" },
  { id: "fr_amiens", name: "Amiens", level: "d2", countryId: "fr", colors: "⚫⚪" },
  { id: "fr_rodez", name: "Rodez", level: "d2", countryId: "fr", colors: "🟡🔴" },
  { id: "fr_cannes", name: "Cannes", level: "d2", countryId: "fr", colors: "🔴⚪" },
  { id: "fr_aubervilliers", name: "Aubervilliers", level: "d2", countryId: "fr", colors: "🔵⚪" },
  { id: "fr_quimper", name: "Quimper", level: "d2", countryId: "fr", colors: "⚫⚪" },
  { id: "fr_rouen", name: "Rouen", level: "d2", countryId: "fr", colors: "🔴⚪" },
  { id: "fr_fleury", name: "Fleury", level: "d3", countryId: "fr", colors: "🔴⚫" },
  { id: "fr_orleans", name: "Orleans", level: "d3", countryId: "fr", colors: "🔴🟡" },
  { id: "fr_thionville", name: "Thionville", level: "d3", countryId: "fr", colors: "⚪" },
  { id: "fr_bastia", name: "Bastia", level: "d3", countryId: "fr", colors: "🔵⚪" },
  { id: "fr_versailles", name: "Versailles", level: "d3", countryId: "fr", colors: "🔵⚪" },
  { id: "fr_lesherbiers", name: "Les Herbiers", level: "d3", countryId: "fr", colors: "🔴⚫" },
  { id: "fr_villefranche", name: "Villefranche", level: "d3", countryId: "fr", colors: "🔵⚪" },
  { id: "fr_laroche", name: "La Roche", level: "d3", countryId: "fr", colors: "🔴⚪" },
  { id: "fr_bourgenbresse", name: "Bourg-en-Bresse", level: "d3", countryId: "fr", colors: "🔵⚪" },
  { id: "de_munich", name: "Munich", level: "elite", countryId: "de", colors: "🔴⚪" },
  { id: "de_dortmund", name: "Dortmund", level: "elite", countryId: "de", colors: "🟡⚫" },
  { id: "de_leipzig", name: "Leipzig", level: "elite", countryId: "de", colors: "⚪🔴" },
  { id: "de_leverkusen", name: "Leverkusen", level: "elite", countryId: "de", colors: "⚫🔴" },
  { id: "de_schalke", name: "Schalke", level: "d1", countryId: "de", colors: "🔵⚪" },
  { id: "de_frankfurt", name: "Frankfurt", level: "d1", countryId: "de", colors: "⚫🔴" },
  { id: "de_stuttgart", name: "Stuttgart", level: "d1", countryId: "de", colors: "🔴⚪" },
  { id: "de_monchengladbar", name: "Monchengladbar", level: "d1", countryId: "de", colors: "⚫⚪" },
  { id: "de_freibourg", name: "Freibourg", level: "d1", countryId: "de", colors: "🔴⚫" },
  { id: "de_hoffenheim", name: "Hoffenheim", level: "d1", countryId: "de", colors: "🔵⚪" },
  { id: "de_wolfsburg", name: "Wolfsburg", level: "d1", countryId: "de", colors: "🟢⚪" },
  { id: "de_hambourg", name: "Hambourg", level: "d2", countryId: "de", colors: "🔵⚪" },
  { id: "de_cologne", name: "Cologne", level: "d2", countryId: "de", colors: "🔴⚪" },
  { id: "de_hanovre", name: "Hanovre", level: "d2", countryId: "de", colors: "🔴⚫" },
  { id: "de_nurnberg", name: "Nurnberg", level: "d2", countryId: "de", colors: "🔴⚪" },
  { id: "de_stpaul", name: "St Paul", level: "d3", countryId: "de", colors: "🟤⚪" },
  { id: "de_heidenheim", name: "Heidenheim", level: "d3", countryId: "de", colors: "🔴🔵" },
  { id: "de_nienborg", name: "Nienborg", level: "d3", countryId: "de", colors: "🔴⚪" },
  { id: "de_wulfrath", name: "Wülfrath", level: "d3", countryId: "de" },
  { id: "de_manfort", name: "Manfort", level: "d3", countryId: "de" },
  { id: "es_madrid", name: "Madrid", level: "elite", countryId: "es", colors: "⚪" },
  { id: "es_barcelona", name: "Barcelona", level: "elite", countryId: "es", colors: "🔵🔴" },
  { id: "es_atleticas", name: "Atleticas", level: "elite", countryId: "es", colors: "🔴⚪" },
  { id: "es_sevilla", name: "Sevilla", level: "elite", countryId: "es", colors: "⚪🔴" },
  { id: "es_bilbao", name: "Bilbao", level: "d1", countryId: "es", colors: "🔴⚪" },
  { id: "es_valencia", name: "Valencia", level: "d1", countryId: "es", colors: "⚪🟠" },
  { id: "es_villarreal", name: "Villarreal", level: "d1", countryId: "es", colors: "🟡🔵" },
  { id: "es_societad", name: "Societad", level: "d1", countryId: "es", colors: "🔵⚪" },
  { id: "es_malaga", name: "Malaga", level: "d1", countryId: "es", colors: "🔵⚪" },
  { id: "es_vigo", name: "Vigo", level: "d1", countryId: "es", colors: "🔵⚪" },
  { id: "es_laspalmas", name: "Las Palmas", level: "d1", countryId: "es", colors: "🟡🔵" },
  { id: "es_saragosse", name: "Saragosse", level: "d2", countryId: "es", colors: "⚪🔵" },
  { id: "es_eibar", name: "Eibar", level: "d2", countryId: "es", colors: "🔵🔴" },
  { id: "es_mallorque", name: "Mallorque", level: "d2", countryId: "es", colors: "🔴⚫" },
  { id: "es_andorre", name: "Andorre", level: "d2", countryId: "es", colors: "🔵🟡" },
  { id: "es_grenade", name: "Grenade", level: "d3", countryId: "es", colors: "🔴⚪" },
  { id: "es_alcorcon", name: "Alcorcón", level: "d3", countryId: "es", colors: "🟡🔵" },
  { id: "es_albacete", name: "Albacete", level: "d3", countryId: "es", colors: "⚪⚫" },
  { id: "es_toledo", name: "Toledo", level: "d3", countryId: "es", colors: "🟢⚪" },
  { id: "it_milan", name: "Milan", level: "elite", countryId: "it", colors: "🔴⚫" },
  { id: "it_international", name: "International", level: "elite", countryId: "it", colors: "🔵⚫" },
  { id: "it_naples", name: "Naples", level: "elite", countryId: "it", colors: "🔵⚪" },
  { id: "it_juventurin", name: "Juventurin", level: "elite", countryId: "it", colors: "⚫⚪" },
  { id: "it_rome", name: "Rome", level: "elite", countryId: "it", colors: "🔴🟡" },
  { id: "it_lazioregione", name: "Lazio Regione", level: "d1", countryId: "it", colors: "🔵⚪" },
  { id: "it_florence", name: "Florence", level: "d1", countryId: "it", colors: "🟣⚪" },
  { id: "it_bologne", name: "Bologne", level: "d1", countryId: "it", colors: "🔴🔵" },
  { id: "it_bergame", name: "Bergame", level: "d1", countryId: "it", colors: "⚫🔵" },
  { id: "it_come", name: "Come", level: "d1", countryId: "it", colors: "🔵⚪" },
  { id: "it_parme", name: "Parme", level: "d1", countryId: "it", colors: "🟡🔵" },
  { id: "it_udine", name: "Udine", level: "d1", countryId: "it", colors: "⚫⚪" },
  { id: "it_modene", name: "Modene", level: "d1", countryId: "it", colors: "🟡🔵" },
  { id: "it_palerme", name: "Palerme", level: "d2", countryId: "it", colors: "🩷⚫" },
  { id: "it_bari", name: "Bari", level: "d2", countryId: "it", colors: "🔴⚪" },
  { id: "it_spezia", name: "Spezia", level: "d2", countryId: "it", colors: "⚪⚫" },
  { id: "it_padoue", name: "Padoue", level: "d2", countryId: "it", colors: "⚪🔴" },
  { id: "it_cesena", name: "Cesena", level: "d2", countryId: "it", colors: "⚪⚫" },
  { id: "it_piacenza", name: "Piacenza", level: "d3", countryId: "it", colors: "🔴⚫" },
  { id: "it_vigolzone", name: "Vigolzone", level: "d3", countryId: "it", colors: "⚪🔴" },
  { id: "it_sicilia", name: "Sicilia", level: "d3", countryId: "it" },
  { id: "it_foggia", name: "Foggia", level: "d3", countryId: "it", colors: "🔴⚪" },
  { id: "en_united", name: "United", level: "elite", countryId: "en", colors: "🔴⚪" },
  { id: "en_liverpool", name: "Liverpool", level: "elite", countryId: "en", colors: "🔴⚪" },
  { id: "en_city", name: "City", level: "elite", countryId: "en", colors: "🔵⚪" },
  { id: "en_londonblue", name: "London Blue", level: "elite", countryId: "en", colors: "🔵⚪" },
  { id: "en_gunners", name: "Gunners", level: "elite", countryId: "en", colors: "🔴⚪" },
  { id: "en_brighton", name: "Brighton", level: "d1", countryId: "en", colors: "🔵⚪" },
  { id: "en_newcastle", name: "Newcastle", level: "d1", countryId: "en", colors: "⚫⚪" },
  { id: "en_everton", name: "Everton", level: "d1", countryId: "en", colors: "🔵⚪" },
  { id: "en_forest", name: "Forest", level: "d1", countryId: "en", colors: "🔴⚪" },
  { id: "en_brentford", name: "Brentford", level: "d1", countryId: "en", colors: "🔴⚪" },
  { id: "en_southampton", name: "Southampton", level: "d1", countryId: "en", colors: "🔴⚪" },
  { id: "en_leeds", name: "Leeds", level: "d1", countryId: "en", colors: "⚪🟡" },
  { id: "en_crystal", name: "Crystal", level: "d1", countryId: "en", colors: "🔴🔵" },
  { id: "en_westlondon", name: "West London", level: "d2", countryId: "en", colors: "⚪⚫" },
  { id: "en_sheffield", name: "Sheffield", level: "d2", countryId: "en", colors: "🔴⚫" },
  { id: "en_portsmouth", name: "Portsmouth", level: "d2", countryId: "en", colors: "🔵⚪" },
  { id: "en_wolf", name: "Wolf", level: "d2", countryId: "en", colors: "🟡⚫" },
  { id: "en_middlesbrough", name: "Middlesbrough", level: "d2", countryId: "en", colors: "🔴⚪" },
  { id: "en_wrexham", name: "Wrexham", level: "d3", countryId: "en", colors: "🔴⚪" },
  { id: "en_lutin", name: "Lutin", level: "d3", countryId: "en", colors: "🟠🔵" },
  { id: "en_grimsby", name: "Grimsby", level: "d3", countryId: "en", colors: "⚫⚪" },
  { id: "en_dover", name: "Dover", level: "d3", countryId: "en", colors: "⚪⚫" },
  { id: "en_canterbury", name: "Canterbury", level: "d3", countryId: "en", colors: "🟢⚪" },
  { id: "pt_lisbonne", name: "Lisbonne", level: "elite", countryId: "pt", colors: "🔴⚪" },
  { id: "pt_porto", name: "Porto", level: "elite", countryId: "pt", colors: "🔵⚪" },
  { id: "pt_sporting", name: "Sporting", level: "elite", countryId: "pt", colors: "🟢⚪" },
  { id: "pt_braga", name: "Braga", level: "elite", countryId: "pt", colors: "🔴⚪" },
  { id: "pt_guimaraes", name: "Guimarães", level: "elite", countryId: "pt", colors: "⚪⚫" },
  { id: "pt_rioave", name: "Rio Ave", level: "d1", countryId: "pt", colors: "🟢⚪" },
  { id: "pt_santaclara", name: "Santa Clara", level: "d1", countryId: "pt", colors: "🔴⚪" },
  { id: "pt_famalicao", name: "Famalicão", level: "d1", countryId: "pt", colors: "🔵⚪" },
  { id: "pt_arouca", name: "Arouca", level: "d1", countryId: "pt", colors: "🔵⚪" },
  { id: "pt_gilvicente", name: "Gil Vicente", level: "d1", countryId: "pt", colors: "🔴⚪" },
  { id: "pt_moreirense", name: "Moreirense", level: "d1", countryId: "pt", colors: "🟢⚪" },
  { id: "pt_estoril", name: "Estoril", level: "d1", countryId: "pt", colors: "🔵🟡" },
  { id: "pt_tondela", name: "Tondela", level: "d2", countryId: "pt", colors: "🟡🟢" },
  { id: "pt_penafiel", name: "Penafiel", level: "d2", countryId: "pt", colors: "🔴⚪" },
  { id: "pt_vizela", name: "Vizela", level: "d2", countryId: "pt", colors: "🔵⚪" },
  { id: "pt_feirense", name: "Feirense", level: "d2", countryId: "pt", colors: "🔵⚪" },
  { id: "pt_leiria", name: "Leiria", level: "d2", countryId: "pt", colors: "🔴⚪" },
  { id: "pt_torreense", name: "Torreense", level: "d3", countryId: "pt", colors: "🔴⚪" },
  { id: "pt_belenenses", name: "Belenenses", level: "d3", countryId: "pt", colors: "🔵⚪" },
  { id: "pt_setubal", name: "Setúbal", level: "d3", countryId: "pt", colors: "🔴⚪" },
  { id: "pt_boavista", name: "Boavista", level: "d3", countryId: "pt", colors: "⚫⚪" },
  { id: "nl_amsterdam", name: "Amsterdam", level: "elite", countryId: "nl", colors: "🔴⚪" },
  { id: "nl_utrecht", name: "Utrecht", level: "elite", countryId: "nl", colors: "🔴⚪" },
  { id: "nl_groningue", name: "Groningue", level: "elite", countryId: "nl", colors: "🟢⚪" },
  { id: "nl_twente", name: "Twente", level: "elite", countryId: "nl", colors: "🔴⚪" },
  { id: "nl_nimegue", name: "Nimègue", level: "d1", countryId: "nl", colors: "🔴⚫" },
  { id: "nl_heerenveen", name: "Heerenveen", level: "d1", countryId: "nl", colors: "🔵⚪" },
  { id: "nl_zwolle", name: "Zwolle", level: "d1", countryId: "nl", colors: "🔵⚪" },
  { id: "nl_sittard", name: "Sittard", level: "d1", countryId: "nl", colors: "🟡🟢" },
  { id: "nl_rotterdam", name: "Rotterdam", level: "d1", countryId: "nl", colors: "🔴⚪" },
  { id: "nl_eindhoven", name: "Eindhoven", level: "d1", countryId: "nl", colors: "🔴⚪" },
  { id: "nl_alkmaar", name: "Alkmaar", level: "d2", countryId: "nl", colors: "🔴⚪" },
  { id: "nl_vitesse", name: "Vitesse", level: "d2", countryId: "nl", colors: "🟡⚫" },
  { id: "nl_waalwijk", name: "Waalwijk", level: "d2", countryId: "nl", colors: "🟡🔵" },
  { id: "nl_maastricht", name: "Maastricht", level: "d2", countryId: "nl", colors: "🔴⚪" },
  { id: "nl_volendam", name: "Volendam", level: "d3", countryId: "nl", colors: "🟠⚪" },
  { id: "nl_almere", name: "Almere", level: "d3", countryId: "nl", colors: "🔴⚪" },
  { id: "nl_enschede", name: "Enschede", level: "d3", countryId: "nl", colors: "🔴⚪" },
  { id: "nl_almelo", name: "Almelo", level: "d3", countryId: "nl", colors: "🔴⚪" },
  { id: "br_rio", name: "Rio", level: "d1", countryId: "br", colors: "🔴⚫" },
  { id: "br_saopaulo", name: "São Paulo", level: "d1", countryId: "br", colors: "⚪🔴" },
  { id: "br_palmeira", name: "Palmeira", level: "d1", countryId: "br", colors: "🟢⚪" },
  { id: "br_santo", name: "Santo", level: "d1", countryId: "br", colors: "⚪⚫" },
  { id: "br_brasillia", name: "Brasillia", level: "d1", countryId: "br" },
  { id: "br_portoallegre", name: "Porto Allegre", level: "d1", countryId: "br", colors: "🔵⚫" },
  { id: "br_bragantino", name: "Bragantino", level: "d2", countryId: "br", colors: "🔴⚪" },
  { id: "br_chapeco", name: "Chapeco", level: "d2", countryId: "br", colors: "🟢⚪" },
  { id: "br_vitoria", name: "Vitoria", level: "d2", countryId: "br", colors: "🔴⚫" },
  { id: "br_recife", name: "Recife", level: "d2", countryId: "br", colors: "🔴⚫" },
  { id: "br_curitiba", name: "Curitiba", level: "d3", countryId: "br", colors: "🔴⚫" },
  { id: "br_varzea", name: "Várzea", level: "d3", countryId: "br" },
  { id: "br_goias", name: "Goiás", level: "d3", countryId: "br", colors: "🟢⚪" },
  { id: "br_salvador", name: "Salvador", level: "d3", countryId: "br", colors: "🔵🔴" },
  { id: "ar_boca", name: "Boca", level: "d1", countryId: "ar", colors: "🔵🟡" },
  { id: "ar_river", name: "River", level: "d1", countryId: "ar", colors: "🔴⚪" },
  { id: "ar_racing", name: "Racing", level: "d1", countryId: "ar", colors: "🔵⚪" },
  { id: "ar_independiente", name: "Independiente", level: "d1", countryId: "ar", colors: "🔴⚪" },
  { id: "ar_sanlorenzo", name: "San Lorenzo", level: "d2", countryId: "ar", colors: "🔵🔴" },
  { id: "ar_tigre", name: "Tigre", level: "d2", countryId: "ar", colors: "🔵🔴" },
  { id: "ar_estudiantes", name: "Estudiantes", level: "d2", countryId: "ar", colors: "🔴⚪" },
  { id: "ar_rosario", name: "Rosario", level: "d3", countryId: "ar", colors: "🔵🟡" },
  { id: "ar_lanus", name: "Lanús", level: "d3", countryId: "ar", colors: "🟤⚪" },
  { id: "ma_berkane", name: "Berkane", level: "d1", countryId: "ma", colors: "🟠⚫" },
  { id: "ma_raja", name: "Raja", level: "d1", countryId: "ma", colors: "🟢⚪" },
  { id: "ma_rabat", name: "Rabat", level: "d1", countryId: "ma", colors: "🔴🟢" },
  { id: "ma_wydad", name: "Wydad", level: "d1", countryId: "ma", colors: "🔴⚪" },
  { id: "ma_agadir", name: "Agadir", level: "d1", countryId: "ma", colors: "🔴⚪" },
  { id: "ma_tanger", name: "Tanger", level: "d1", countryId: "ma", colors: "⚪🔵" },
  { id: "ma_fes", name: "Fès", level: "d2", countryId: "ma", colors: "🔵⚪" },
  { id: "ma_oujda", name: "Oujda", level: "d2", countryId: "ma", colors: "⚫⚪" },
  { id: "ma_khenifra", name: "Khénifra", level: "d2", countryId: "ma", colors: "🔴⚪" },
  { id: "ma_soualem", name: "Soualem", level: "d2", countryId: "ma", colors: "🔵⚪" },
  { id: "dz_setif", name: "Setif", level: "d1", countryId: "dz", colors: "⚫⚪" },
  { id: "dz_chlef", name: "Chlef", level: "d1", countryId: "dz", colors: "🔴⚪" },
  { id: "dz_oran", name: "Oran", level: "d1", countryId: "dz", colors: "🔴⚪" },
  { id: "dz_alger", name: "Alger", level: "d1", countryId: "dz", colors: "🟢🔴" },
  { id: "dz_bechar", name: "Bechar", level: "d1", countryId: "dz", colors: "🟡🔵" },
  { id: "dz_bejaia", name: "Bejaia", level: "d2", countryId: "dz", colors: "🔵⚪" },
  { id: "dz_constantine", name: "Constantine", level: "d2", countryId: "dz", colors: "⚫🟢" },
  { id: "dz_jskabylie", name: "JS Kabylie", level: "d2", countryId: "dz", colors: "🟡🟢" },
  { id: "dz_algiers", name: "Algiers", level: "d2", countryId: "dz", colors: "🔴⚫" },
  { id: "sn_dakar", name: "Dakar", level: "d2", countryId: "sn", colors: "🟡🔵" },
  { id: "sn_rufisque", name: "Rufisque", level: "d2", countryId: "sn", colors: "🔴⚪" },
  { id: "sn_sacrecur", name: "Sacré-Cœur", level: "d2", countryId: "sn", colors: "🔴⚫" },
  { id: "sn_jaraaf", name: "Jaraaf", level: "d2", countryId: "sn", colors: "🟢⚪" },
  { id: "sn_ziguinchor", name: "Ziguinchor", level: "d2", countryId: "sn", colors: "🟢⚪" },
  { id: "sn_gf", name: "GF", level: "d3", countryId: "sn", colors: "🔴⚪" },
  { id: "sn_teungueth", name: "Teungueth", level: "d3", countryId: "sn", colors: "🔵⚪" },
  { id: "sn_goree", name: "Gorée", level: "d3", countryId: "sn", colors: "🔴⚪" },
  { id: "ci_bouake", name: "Bouaké", level: "d2", countryId: "ci", colors: "🔵⚪" },
  { id: "ci_mimosa", name: "Mimosa", level: "d2", countryId: "ci", colors: "🟡⚫" },
  { id: "ci_plateau", name: "Plateau", level: "d2", countryId: "ci", colors: "🔵⚪" },
  { id: "ci_sanpedro", name: "San Pedro", level: "d2", countryId: "ci", colors: "🔴⚪" },
  { id: "ci_tchologo", name: "Tchologo", level: "d2", countryId: "ci", colors: "🟡🔵" },
  { id: "ci_stadeabidjan", name: "Stade Abidjan", level: "d3", countryId: "ci", colors: "🔵⚪" },
  { id: "ci_yamoussoukro", name: "Yamoussoukro", level: "d3", countryId: "ci", colors: "🔵⚪" },
  { id: "ci_sassandra", name: "Sassandra", level: "d3", countryId: "ci", colors: "🔵⚪" },
  { id: "tn_esperance", name: "Espérance", level: "d1", countryId: "tn", colors: "🟡🔴" },
  { id: "tn_africaintunis", name: "Africain Tunis", level: "d1", countryId: "tn", colors: "⚪🔴" },
  { id: "tn_sfax", name: "Sfax", level: "d1", countryId: "tn", colors: "⚪⚫" },
  { id: "tn_etoilesousse", name: "Étoile Sousse", level: "d1", countryId: "tn", colors: "⚪🔴" },
  { id: "tn_monastir", name: "Monastir", level: "d2", countryId: "tn", colors: "⚪🔵" },
  { id: "tn_stadetunis", name: "Stade Tunis", level: "d2", countryId: "tn", colors: "🔴🟢" },
  { id: "gn_renaissance", name: "Renaissance", level: "d2", countryId: "gn", colors: "🔴⚪" },
  { id: "gn_horoya", name: "Horoya", level: "d2", countryId: "gn", colors: "🔴⚪" },
  { id: "gn_hafia", name: "Hafia", level: "d2", countryId: "gn", colors: "🟢⚪" },
  { id: "gn_kamsar", name: "Kamsar", level: "d2", countryId: "gn", colors: "🟡🔴" },
  { id: "gn_kaloum", name: "Kaloum", level: "d3", countryId: "gn", colors: "🟡🟢" },
  { id: "gn_sangaredi", name: "Sangaredi", level: "d3", countryId: "gn", colors: "🔵⚪" },
  { id: "cm_dynamo", name: "Dynamo", level: "d2", countryId: "cm", colors: "🟡⚫" },
  { id: "cm_colombes", name: "Colombes", level: "d2", countryId: "cm", colors: "🔴⚪" },
  { id: "cm_bafang", name: "Bafang", level: "d2", countryId: "cm", colors: "🟡🔴" },
  { id: "cm_coton", name: "Coton", level: "d2", countryId: "cm", colors: "🟢🟡" },
  { id: "cm_canon", name: "Canon", level: "d3", countryId: "cm", colors: "🟢🔴" },
  { id: "cm_panthere", name: "Panthère", level: "d3", countryId: "cm", colors: "🟢🟡" },
  { id: "be_anderlecht", name: "Anderlecht", level: "d1", countryId: "be", colors: "🟣⚪" },
  { id: "be_bruges", name: "Bruges", level: "d1", countryId: "be", colors: "🔵⚫" },
  { id: "be_liege", name: "Liège", level: "d1", countryId: "be", colors: "🔴⚪" },
  { id: "be_cercle", name: "Cercle", level: "d2", countryId: "be", colors: "🟢⚪" },
  { id: "be_anvers", name: "Anvers", level: "d2", countryId: "be", colors: "🔴⚪" },
  { id: "be_genk", name: "Genk", level: "d3", countryId: "be", colors: "🔵⚪" },
  { id: "ch_bale", name: "Bâle", level: "d1", countryId: "ch", colors: "🔴🔵" },
  { id: "ch_berne", name: "Berne", level: "d1", countryId: "ch", colors: "🟡⚫" },
  { id: "ch_zurich", name: "Zürich", level: "d1", countryId: "ch", colors: "🔵⚪" },
  { id: "ch_geneve", name: "Genève", level: "d1", countryId: "ch", colors: "🔴⚪" },
  { id: "ch_sion", name: "Sion", level: "d2", countryId: "ch", colors: "🔴⚪" },
  { id: "ch_lugano", name: "Lugano", level: "d2", countryId: "ch", colors: "⚫⚪" },
  { id: "no_rosenborg", name: "Rosenborg", level: "d1", countryId: "no", colors: "⚫⚪" },
  { id: "no_tromso", name: "Tromso", level: "d1", countryId: "no", colors: "🔴⚪" },
  { id: "no_viking", name: "Viking", level: "d1", countryId: "no", colors: "🔴⚪" },
  { id: "no_molde", name: "Molde", level: "d2", countryId: "no", colors: "🔵⚪" },
  { id: "no_bod", name: "Bodø", level: "d2", countryId: "no", colors: "🟡⚫" },
  { id: "fi_hjk", name: "HJK Helsinki", level: "d2", countryId: "fi", colors: "🔵⚪" },
  { id: "fi_kups", name: "KuPS", level: "d2", countryId: "fi", colors: "🟡⚫" },
  { id: "fi_inter", name: "Inter Turku", level: "d2", countryId: "fi", colors: "🔵⚫" },
  { id: "fi_sjk", name: "SJK", level: "d3", countryId: "fi", colors: "⚫⚪" },
  { id: "fi_ilves", name: "Ilves", level: "d3", countryId: "fi", colors: "🟢🔵" },
  { id: "se_malmo", name: "Malmö FF", level: "d1", countryId: "se", colors: "🔵⚪" },
  { id: "se_aik", name: "AIK Stockholm", level: "d1", countryId: "se", colors: "⚫🟡" },
  { id: "se_goteborg", name: "IFK Göteborg", level: "d1", countryId: "se", colors: "🔵⚪" },
  { id: "se_hammarby", name: "Hammarby", level: "d2", countryId: "se", colors: "🟢⚪" },
  { id: "se_djurgarden", name: "Djurgården", level: "d2", countryId: "se", colors: "🔵🔴" },
  { id: "pl_legia", name: "Legia Varsovie", level: "d1", countryId: "pl", colors: "🟢⚪" },
  { id: "pl_lech", name: "Lech Poznań", level: "d1", countryId: "pl", colors: "🔵⚪" },
  { id: "pl_rakow", name: "Raków", level: "d1", countryId: "pl", colors: "🔴🔵" },
  { id: "pl_wisla", name: "Wisła Cracovie", level: "d2", countryId: "pl", colors: "🔴⚪" },
  { id: "pl_gornik", name: "Górnik Zabrze", level: "d2", countryId: "pl", colors: "🔵⚪" },
  { id: "bg_ludogorets", name: "Ludogorets", level: "d2", countryId: "bg", colors: "🟢⚪" },
  { id: "bg_cska", name: "CSKA Sofia", level: "d2", countryId: "bg", colors: "🔴⚪" },
  { id: "bg_levski", name: "Levski Sofia", level: "d2", countryId: "bg", colors: "🔵⚪" },
  { id: "bg_lokomotiv", name: "Lokomotiv Plovdiv", level: "d3", countryId: "bg", colors: "🔴⚫" },
  { id: "bg_botev", name: "Botev Plovdiv", level: "d3", countryId: "bg", colors: "🟡⚫" },
  { id: "kr_jeonbuk", name: "Jeonbuk Hyundai", level: "d1", countryId: "kr", colors: "🟢⚪" },
  { id: "kr_ulsan", name: "Ulsan HD", level: "d1", countryId: "kr", colors: "🔵⚪" },
  { id: "kr_seoul", name: "FC Seoul", level: "d1", countryId: "kr", colors: "🔴⚫" },
  { id: "kr_pohang", name: "Pohang Steelers", level: "d2", countryId: "kr", colors: "🔴⚫" },
  { id: "kr_suwon", name: "Suwon Bluewings", level: "d2", countryId: "kr", colors: "🔵⚪" },
  { id: "cn_shanghai", name: "Shanghai Port", level: "d1", countryId: "cn", colors: "🔴⚫" },
  { id: "cn_shenhua", name: "Shanghai Shenhua", level: "d1", countryId: "cn", colors: "🔵⚪" },
  { id: "cn_beijing", name: "Beijing Guoan", level: "d1", countryId: "cn", colors: "🟢⚪" },
  { id: "cn_shandong", name: "Shandong Taishan", level: "d2", countryId: "cn", colors: "🟠⚫" },
  { id: "cn_chengdu", name: "Chengdu Rongcheng", level: "d2", countryId: "cn", colors: "🔴🟡" },
  { id: "au_melbcity", name: "Melbourne City", level: "d1", countryId: "au", colors: "🔵⚪" },
  { id: "au_sydney", name: "Sydney FC", level: "d1", countryId: "au", colors: "🔵⚪" },
  { id: "au_victory", name: "Melbourne Victory", level: "d1", countryId: "au", colors: "🔵⚪" },
  { id: "au_wsw", name: "Western Sydney", level: "d2", countryId: "au", colors: "🔴⚫" },
  { id: "au_adelaide", name: "Adelaide United", level: "d2", countryId: "au", colors: "🔴⚪" },
  { id: "nz_aucklandfc", name: "Auckland FC", level: "d2", countryId: "nz", colors: "🔵⚪" },
  { id: "nz_phoenix", name: "Wellington Phoenix", level: "d2", countryId: "nz", colors: "🟡⚫" },
  { id: "nz_aucklandcity", name: "Auckland City", level: "d2", countryId: "nz", colors: "🔵⚪" },
  { id: "nz_waitakere", name: "Waitakere United", level: "d3", countryId: "nz", colors: "🔵🟡" },
  { id: "nz_canterbury", name: "Canterbury United", level: "d3", countryId: "nz", colors: "🔴⚫" },
  { id: "pg_hekari", name: "Hekari United", level: "d3", countryId: "pg", colors: "🔴🟡" },
  { id: "pg_laecity", name: "Lae City", level: "d3", countryId: "pg", colors: "🟢⚪" },
  { id: "pg_toti", name: "Toti City", level: "d3", countryId: "pg", colors: "🔵⚪" },
  { id: "pg_besta", name: "Besta United", level: "regional", countryId: "pg", colors: "🟠⚫" },
  { id: "pg_morobe", name: "Morobe Wawens", level: "regional", countryId: "pg", colors: "🔴⚪" },
  { id: "mx_puebla", name: "Puebla", level: "d1", countryId: "mx", colors: "🔴⚪" },
  { id: "mx_monterrey", name: "Monterrey", level: "d1", countryId: "mx", colors: "🔵⚪" },
  { id: "mx_tijuana", name: "Tijuana", level: "d1", countryId: "mx", colors: "🔴⚪" },
  { id: "mx_america", name: "America", level: "d2", countryId: "mx", colors: "🟡🔵" },
  { id: "mx_tigre", name: "Tigre", level: "d2", countryId: "mx", colors: "🟡🔵" },
  { id: "mx_pachuca", name: "Pachuca", level: "d3", countryId: "mx", colors: "🔵⚪" },
  { id: "mx_puma", name: "Puma", level: "d3", countryId: "mx", colors: "🔵🟡" },
  { id: "co_pasto", name: "Pasto", level: "d1", countryId: "co", colors: "🔴⚪" },
  { id: "co_millionaros", name: "Millionaros", level: "d1", countryId: "co", colors: "🔵⚪" },
  { id: "co_medellin", name: "Medellín", level: "d1", countryId: "co", colors: "🟢⚪" },
  { id: "co_barranquilla", name: "Barranquilla", level: "d2", countryId: "co", colors: "🔵🔴" },
  { id: "co_manizales", name: "Manizales", level: "d2", countryId: "co", colors: "🔵⚫" },
  { id: "bj_cotonou", name: "Cotonou", level: "d3", countryId: "bj", colors: "🟡⚫" },
  { id: "bj_toffo", name: "Toffo", level: "d3", countryId: "bj", colors: "🔵⚪" },
  { id: "bj_ouidah", name: "Ouidah", level: "d3", countryId: "bj", colors: "🔵⚪" },
  { id: "bj_daagbe", name: "Daagbé", level: "d3", countryId: "bj", colors: "🟢⚪" },
  { id: "bj_grandpopo", name: "Grand Popo", level: "regional", countryId: "bj", colors: "🟢⚪" },
  { id: "bj_abomey", name: "Abomey", level: "regional", countryId: "bj", colors: "🔴🟢" },
  { id: "hr_zagreb", name: "Zagreb", level: "d1", countryId: "hr", colors: "🔵🔴" },
  { id: "hr_split", name: "Split", level: "d1", countryId: "hr", colors: "🔴⚪" },
  { id: "hr_rijeka", name: "Rijeka", level: "d1", countryId: "hr", colors: "⚪🔵" },
  { id: "hr_osijek", name: "Osijek", level: "d2", countryId: "hr", colors: "⚪🔵" },
  { id: "hr_varazdin", name: "Varaždin", level: "d2", countryId: "hr", colors: "🔵⚪" },
  { id: "aw_oranjestad", name: "Oranjestad", level: "regional", countryId: "aw", colors: "🔵🟡" },
  { id: "aw_san_nicolas", name: "San Nicolas", level: "regional", countryId: "aw", colors: "🔴⚪" },
  { id: "aw_noord", name: "Noord", level: "regional", countryId: "aw", colors: "🟢⚪" },
  { id: "aw_savaneta", name: "Savaneta", level: "regional", countryId: "aw", colors: "🟡🔵" },
  { id: "lc_castries", name: "Castries", level: "regional", countryId: "lc", colors: "🔵🟡" },
  { id: "lc_vieux_fort", name: "Vieux Fort", level: "regional", countryId: "lc", colors: "🔴⚪" },
  { id: "lc_soufriere", name: "Soufrière", level: "regional", countryId: "lc", colors: "🟢⚪" },
  { id: "lc_gros_islet", name: "Gros Islet", level: "regional", countryId: "lc", colors: "🟡🔵" },
  { id: "vc_kingstown", name: "Kingstown", level: "regional", countryId: "vc", colors: "🔵🟢" },
  { id: "vc_chateaubelair", name: "Chateaubelair", level: "regional", countryId: "vc", colors: "🔴⚪" },
  { id: "vc_byera", name: "Byera", level: "regional", countryId: "vc", colors: "🟢⚪" },
  { id: "vc_layou", name: "Layou", level: "regional", countryId: "vc", colors: "🟡🔵" },
  { id: "kn_basseterre", name: "Basseterre", level: "regional", countryId: "kn", colors: "🟢🔴" },
  { id: "kn_charlestown", name: "Charlestown", level: "regional", countryId: "kn", colors: "🔵⚪" },
  { id: "kn_sandy_point", name: "Sandy Point", level: "regional", countryId: "kn", colors: "🟢⚪" },
  { id: "kn_cayon", name: "Cayon", level: "regional", countryId: "kn", colors: "🟡🔵" },
  { id: "dm_roseau", name: "Roseau", level: "regional", countryId: "dm", colors: "🟢🟡" },
  { id: "dm_salisbury", name: "Salisbury", level: "regional", countryId: "dm", colors: "🔵⚪" },
  { id: "dm_marigot", name: "Marigot", level: "regional", countryId: "dm", colors: "🔴⚪" },
  { id: "dm_berekua", name: "Berekua", level: "regional", countryId: "dm", colors: "🟡🔵" },
  { id: "vg_road_town", name: "Road Town", level: "regional", countryId: "vg", colors: "🔵⚪" },
  { id: "vg_great_harbour", name: "Great Harbour", level: "regional", countryId: "vg", colors: "🔴⚪" },
  { id: "vg_cane_garden", name: "Cane Garden", level: "regional", countryId: "vg", colors: "🟢⚪" },
  { id: "vg_east_end", name: "East End", level: "regional", countryId: "vg", colors: "🟡🔵" },
  { id: "vi_charlotte_amalie", name: "Charlotte Amalie", level: "regional", countryId: "vi", colors: "🔵🟡" },
  { id: "vi_christiansted", name: "Christiansted", level: "regional", countryId: "vi", colors: "🔴⚪" },
  { id: "vi_frederiksted", name: "Frederiksted", level: "regional", countryId: "vi", colors: "🟢⚪" },
  { id: "vi_cruz_bay", name: "Cruz Bay", level: "regional", countryId: "vi", colors: "🟡🔵" },
  { id: "ky_savannah", name: "Savannah", level: "regional", countryId: "ky", colors: "🔴🔵" },
  { id: "ky_west_bay", name: "West Bay", level: "regional", countryId: "ky", colors: "🟢⚪" },
  { id: "ky_bodden_town", name: "Bodden Town", level: "regional", countryId: "ky", colors: "🔵⚪" },
  { id: "ky_north_side", name: "North Side", level: "regional", countryId: "ky", colors: "🟡🔴" },
  { id: "ms_brades", name: "Brades", level: "regional", countryId: "ms", colors: "🟢🟠" },
  { id: "ms_little_bay", name: "Little Bay", level: "regional", countryId: "ms", colors: "🔵⚪" },
  { id: "ms_salem", name: "Salem", level: "regional", countryId: "ms", colors: "🔴⚪" },
  { id: "ms_cudjoe_head", name: "Cudjoe Head", level: "regional", countryId: "ms", colors: "🟡🔵" },
  { id: "ai_the_valley", name: "The Valley", level: "regional", countryId: "ai", colors: "🔵🟠" },
  { id: "ai_sandy_ground", name: "Sandy Ground", level: "regional", countryId: "ai", colors: "🔴⚪" },
  { id: "ai_blowing_point", name: "Blowing Point", level: "regional", countryId: "ai", colors: "🟢⚪" },
  { id: "ai_island_harbour", name: "Island Harbour", level: "regional", countryId: "ai", colors: "🟡🔵" },
  { id: "tc_cockburn_town", name: "Cockburn Town", level: "regional", countryId: "tc", colors: "🔵🟡" },
  { id: "tc_providenciales", name: "Providenciales", level: "regional", countryId: "tc", colors: "🔴⚪" },
  { id: "tc_grand_turk", name: "Grand Turk", level: "regional", countryId: "tc", colors: "🟢⚪" },
  { id: "tc_bottle_creek", name: "Bottle Creek", level: "regional", countryId: "tc", colors: "🟡🔵" },
  { id: "bz_belize_city", name: "Belize City", level: "d3", countryId: "bz", colors: "🔵🔴" },
  { id: "bz_belmopan", name: "Belmopan", level: "d3", countryId: "bz", colors: "🟢⚪" },
  { id: "bz_san_ignacio", name: "San Ignacio", level: "d3", countryId: "bz", colors: "🔴⚪" },
  { id: "bz_orange_walk", name: "Orange Walk", level: "regional", countryId: "bz", colors: "🟡🔵" },
  { id: "bz_dangriga", name: "Dangriga", level: "regional", countryId: "bz", colors: "🟠⚪" },
  { id: "pr_san_juan", name: "San Juan", level: "d3", countryId: "pr", colors: "🔵⚪" },
  { id: "pr_bayamon", name: "Bayamón", level: "d3", countryId: "pr", colors: "🔴⚪" },
  { id: "pr_ponce", name: "Ponce", level: "d3", countryId: "pr", colors: "🟢⚪" },
  { id: "pr_carolina", name: "Carolina", level: "regional", countryId: "pr", colors: "🟡🔵" },
  { id: "pr_caguas", name: "Caguas", level: "regional", countryId: "pr", colors: "🟠⚪" },
  { id: "tw_taipei", name: "Taipei", level: "regional", countryId: "tw", colors: "🔵⚪" },
  { id: "tw_kaohsiung", name: "Kaohsiung", level: "regional", countryId: "tw", colors: "🔴⚪" },
  { id: "tw_taichung", name: "Taichung", level: "regional", countryId: "tw", colors: "🟢⚪" },
  { id: "tw_tainan", name: "Tainan", level: "regional", countryId: "tw", colors: "🟡🔵" },
  { id: "lk_colombo", name: "Colombo", level: "regional", countryId: "lk", colors: "🟠🔴" },
  { id: "lk_kandy", name: "Kandy", level: "regional", countryId: "lk", colors: "🔵⚪" },
  { id: "lk_galle", name: "Galle", level: "regional", countryId: "lk", colors: "🟢⚪" },
  { id: "lk_jaffna", name: "Jaffna", level: "regional", countryId: "lk", colors: "🟡🔴" },
  { id: "la_vientiane", name: "Vientiane", level: "regional", countryId: "la", colors: "🔴🔵" },
  { id: "la_pakse", name: "Pakse", level: "regional", countryId: "la", colors: "🟢⚪" },
  { id: "la_savannakhet", name: "Savannakhet", level: "regional", countryId: "la", colors: "🔵⚪" },
  { id: "la_luang_prabang", name: "Luang Prabang", level: "regional", countryId: "la", colors: "🟡🔴" },
  { id: "bn_bandar_seri_begawan", name: "Bandar Seri Begawan", level: "regional", countryId: "bn", colors: "🟡⚫" },
  { id: "bn_kuala_belait", name: "Kuala Belait", level: "regional", countryId: "bn", colors: "🔴⚪" },
  { id: "bn_seria", name: "Seria", level: "regional", countryId: "bn", colors: "🔵⚪" },
  { id: "bn_tutong", name: "Tutong", level: "regional", countryId: "bn", colors: "🟢⚪" },
  { id: "bt_thimphou", name: "Thimphou", level: "regional", countryId: "bt", colors: "🟠🟡" },
  { id: "bt_phuntsholing", name: "Phuntsholing", level: "regional", countryId: "bt", colors: "🔴⚪" },
  { id: "bt_paro", name: "Paro", level: "regional", countryId: "bt", colors: "🔵⚪" },
  { id: "bt_punakha", name: "Punakha", level: "regional", countryId: "bt", colors: "🟢⚪" },
  { id: "tl_dili", name: "Dili", level: "regional", countryId: "tl", colors: "🔴🟡" },
  { id: "tl_baucau", name: "Baucau", level: "regional", countryId: "tl", colors: "🔵⚪" },
  { id: "tl_maliana", name: "Maliana", level: "regional", countryId: "tl", colors: "🟢⚪" },
  { id: "tl_suai", name: "Suai", level: "regional", countryId: "tl", colors: "🟡🔴" },
  { id: "gu_hagatna", name: "Hagåtña", level: "regional", countryId: "gu", colors: "🔵🔴" },
  { id: "gu_dededo", name: "Dededo", level: "regional", countryId: "gu", colors: "🟢⚪" },
  { id: "gu_tamuning", name: "Tamuning", level: "regional", countryId: "gu", colors: "🔵⚪" },
  { id: "gu_mangilao", name: "Mangilao", level: "regional", countryId: "gu", colors: "🟡🔴" },
  { id: "mo_macao", name: "Macao", level: "regional", countryId: "mo", colors: "🟢⚪" },
  { id: "mo_taipa", name: "Taipa", level: "regional", countryId: "mo", colors: "🔴⚪" },
  { id: "mo_coloane", name: "Coloane", level: "regional", countryId: "mo", colors: "🔵⚪" },
  { id: "mo_cotai", name: "Cotai", level: "regional", countryId: "mo", colors: "🟡🟢" },
  { id: "pk_karachi", name: "Karachi", level: "regional", countryId: "pk", colors: "🟢⚪" },
  { id: "pk_lahore", name: "Lahore", level: "regional", countryId: "pk", colors: "🔴⚪" },
  { id: "pk_islamabad", name: "Islamabad", level: "regional", countryId: "pk", colors: "🔵⚪" },
  { id: "pk_faisalabad", name: "Faisalabad", level: "regional", countryId: "pk", colors: "🟡🟢" },
  { id: "kg_bichkek", name: "Bichkek", level: "d3", countryId: "kg", colors: "🔴🟡" },
  { id: "kg_och", name: "Och", level: "d3", countryId: "kg", colors: "🔵⚪" },
  { id: "kg_djalal_abad", name: "Djalal-Abad", level: "d3", countryId: "kg", colors: "🟢⚪" },
  { id: "kg_karakol", name: "Karakol", level: "regional", countryId: "kg", colors: "🟡🔴" },
  { id: "kg_tokmok", name: "Tokmok", level: "regional", countryId: "kg", colors: "🟠⚪" },
  { id: "hk_hong_kong", name: "Hong Kong", level: "d3", countryId: "hk", colors: "🔴⚪" },
  { id: "hk_kowloon", name: "Kowloon", level: "d3", countryId: "hk", colors: "🔵⚪" },
  { id: "hk_tsuen_wan", name: "Tsuen Wan", level: "d3", countryId: "hk", colors: "🟢⚪" },
  { id: "hk_sha_tin", name: "Sha Tin", level: "regional", countryId: "hk", colors: "🟡🔴" },
  { id: "hk_tuen_mun", name: "Tuen Mun", level: "regional", countryId: "hk", colors: "🟠⚪" },
  { id: "afg_kaboul", name: "Kaboul", level: "d3", countryId: "afg", colors: "⚫🔴" },
  { id: "afg_herat", name: "Herat", level: "d3", countryId: "afg", colors: "🟢⚪" },
  { id: "afg_kandahar", name: "Kandahar", level: "d3", countryId: "afg", colors: "🔵⚪" },
  { id: "afg_mazar_e_charif", name: "Mazar-e-Charif", level: "regional", countryId: "afg", colors: "🟡🔴" },
  { id: "afg_djalalabad", name: "Djalalabad", level: "regional", countryId: "afg", colors: "🟠⚪" },
  { id: "bi_bujumbura", name: "Bujumbura", level: "regional", countryId: "bi", colors: "🔴🟢" },
  { id: "bi_gitega", name: "Gitega", level: "regional", countryId: "bi", colors: "🔵⚪" },
  { id: "bi_ngozi", name: "Ngozi", level: "regional", countryId: "bi", colors: "🟢⚪" },
  { id: "bi_rumonge", name: "Rumonge", level: "regional", countryId: "bi", colors: "🟡🔴" },
  { id: "td_n_djamena", name: "N'Djaména", level: "regional", countryId: "td", colors: "🔵🟡" },
  { id: "td_moundou", name: "Moundou", level: "regional", countryId: "td", colors: "🔴⚪" },
  { id: "td_sarh", name: "Sarh", level: "regional", countryId: "td", colors: "🟢⚪" },
  { id: "td_abeche", name: "Abéché", level: "regional", countryId: "td", colors: "🟡🔵" },
  { id: "so_mogadiscio", name: "Mogadiscio", level: "regional", countryId: "so", colors: "🔵⚪" },
  { id: "so_hargeisa", name: "Hargeisa", level: "regional", countryId: "so", colors: "🟢⚪" },
  { id: "so_kismayo", name: "Kismayo", level: "regional", countryId: "so", colors: "🔴⚪" },
  { id: "so_bosaso", name: "Bosaso", level: "regional", countryId: "so", colors: "🟡🔵" },
  { id: "er_asmara", name: "Asmara", level: "regional", countryId: "er", colors: "🔴🟢" },
  { id: "er_keren", name: "Keren", level: "regional", countryId: "er", colors: "🔵⚪" },
  { id: "er_massawa", name: "Massawa", level: "regional", countryId: "er", colors: "🟢⚪" },
  { id: "er_assab", name: "Assab", level: "regional", countryId: "er", colors: "🟡🔴" },
  { id: "ss_juba", name: "Juba", level: "regional", countryId: "ss", colors: "🔵🔴" },
  { id: "ss_malakal", name: "Malakal", level: "regional", countryId: "ss", colors: "🟢⚪" },
  { id: "ss_wau", name: "Wau", level: "regional", countryId: "ss", colors: "🔴⚪" },
  { id: "ss_yei", name: "Yei", level: "regional", countryId: "ss", colors: "🟡🔵" },
  { id: "st_sao_tome", name: "São Tomé", level: "regional", countryId: "st", colors: "🟢🟡" },
  { id: "st_trindade", name: "Trindade", level: "regional", countryId: "st", colors: "🔴⚪" },
  { id: "st_neves", name: "Neves", level: "regional", countryId: "st", colors: "🔵⚪" },
  { id: "st_santana", name: "Santana", level: "regional", countryId: "st", colors: "🟡🔴" },
  { id: "ne_niamey", name: "Niamey", level: "d3", countryId: "ne", colors: "🟠⚪" },
  { id: "ne_zinder", name: "Zinder", level: "d3", countryId: "ne", colors: "🟢⚪" },
  { id: "ne_maradi", name: "Maradi", level: "d3", countryId: "ne", colors: "🔴⚪" },
  { id: "ne_agadez", name: "Agadez", level: "regional", countryId: "ne", colors: "🟡🟠" },
  { id: "ne_tahoua", name: "Tahoua", level: "regional", countryId: "ne", colors: "🔵⚪" },
  { id: "et_addis_abeba", name: "Addis-Abeba", level: "d3", countryId: "et", colors: "🟢🟡" },
  { id: "et_dire_dawa", name: "Dire Dawa", level: "d3", countryId: "et", colors: "🔴⚪" },
  { id: "et_bahir_dar", name: "Bahir Dar", level: "d3", countryId: "et", colors: "🔵⚪" },
  { id: "et_hawassa", name: "Hawassa", level: "regional", countryId: "et", colors: "🟡🔴" },
  { id: "et_adama", name: "Adama", level: "regional", countryId: "et", colors: "🟠⚪" },
  { id: "rw_kigali", name: "Kigali", level: "d3", countryId: "rw", colors: "🔵🟢" },
  { id: "rw_butare", name: "Butare", level: "d3", countryId: "rw", colors: "🔴⚪" },
  { id: "rw_gisenyi", name: "Gisenyi", level: "d3", countryId: "rw", colors: "🟢⚪" },
  { id: "rw_ruhengeri", name: "Ruhengeri", level: "regional", countryId: "rw", colors: "🟡🔵" },
  { id: "rw_cyangugu", name: "Cyangugu", level: "regional", countryId: "rw", colors: "🟠⚪" },
  { id: "mw_lilongwe", name: "Lilongwe", level: "d3", countryId: "mw", colors: "🔴⚫" },
  { id: "mw_blantyre", name: "Blantyre", level: "d3", countryId: "mw", colors: "🔵⚪" },
  { id: "mw_mzuzu", name: "Mzuzu", level: "d3", countryId: "mw", colors: "🟢⚪" },
  { id: "mw_zomba", name: "Zomba", level: "regional", countryId: "mw", colors: "🟡🔴" },
  { id: "mw_kasungu", name: "Kasungu", level: "regional", countryId: "mw", colors: "🟠⚪" },
  { id: "bw_gaborone", name: "Gaborone", level: "d3", countryId: "bw", colors: "🔵⚫" },
  { id: "bw_francistown", name: "Francistown", level: "d3", countryId: "bw", colors: "🔴⚪" },
  { id: "bw_molepolole", name: "Molepolole", level: "d3", countryId: "bw", colors: "🟢⚪" },
  { id: "bw_maun", name: "Maun", level: "regional", countryId: "bw", colors: "🟡🔵" },
  { id: "bw_serowe", name: "Serowe", level: "regional", countryId: "bw", colors: "🟠⚪" },
  { id: "lr_monrovia", name: "Monrovia", level: "d3", countryId: "lr", colors: "🔴⚪" },
  { id: "lr_gbarnga", name: "Gbarnga", level: "d3", countryId: "lr", colors: "🔵⚪" },
  { id: "lr_buchanan", name: "Buchanan", level: "d3", countryId: "lr", colors: "🟢⚪" },
  { id: "lr_kakata", name: "Kakata", level: "regional", countryId: "lr", colors: "🟡🔴" },
  { id: "lr_harper", name: "Harper", level: "regional", countryId: "lr", colors: "🟠⚪" },
  { id: "cf_bangui", name: "Bangui", level: "d3", countryId: "cf", colors: "🔵⚪" },
  { id: "cf_bimbo", name: "Bimbo", level: "d3", countryId: "cf", colors: "🟢⚪" },
  { id: "cf_berberati", name: "Berbérati", level: "d3", countryId: "cf", colors: "🔴⚪" },
  { id: "cf_bambari", name: "Bambari", level: "regional", countryId: "cf", colors: "🟡🔵" },
  { id: "cf_bouar", name: "Bouar", level: "regional", countryId: "cf", colors: "🟠⚪" },
  { id: "asa_pago_pago", name: "Pago Pago", level: "regional", countryId: "asa", colors: "🔴🔵" },
  { id: "asa_tafuna", name: "Tafuna", level: "regional", countryId: "asa", colors: "🟢⚪" },
  { id: "asa_nuuuli", name: "Nuuuli", level: "regional", countryId: "asa", colors: "🔵⚪" },
  { id: "asa_leone", name: "Leone", level: "regional", countryId: "asa", colors: "🟡🔴" },
  { id: "tv_funafuti", name: "Funafuti", level: "regional", countryId: "tv", colors: "🔵🟡" },
  { id: "tv_vaiaku", name: "Vaiaku", level: "regional", countryId: "tv", colors: "🔴⚪" },
  { id: "tv_alapi", name: "Alapi", level: "regional", countryId: "tv", colors: "🟢⚪" },
  { id: "tv_fakaifou", name: "Fakaifou", level: "regional", countryId: "tv", colors: "🟡🔵" },
  { id: "ki_tarawa", name: "Tarawa", level: "regional", countryId: "ki", colors: "🔴🟡" },
  { id: "ki_betio", name: "Betio", level: "regional", countryId: "ki", colors: "🔵⚪" },
  { id: "ki_bikenibeu", name: "Bikenibeu", level: "regional", countryId: "ki", colors: "🟢⚪" },
  { id: "ki_bairiki", name: "Bairiki", level: "regional", countryId: "ki", colors: "🟡🔴" },
  { id: "vu_port_vila", name: "Port-Vila", level: "d3", countryId: "vu", colors: "🔴🟢" },
  { id: "vu_luganville", name: "Luganville", level: "d3", countryId: "vu", colors: "🔵⚪" },
  { id: "vu_norsup", name: "Norsup", level: "d3", countryId: "vu", colors: "🟢⚪" },
  { id: "vu_isangel", name: "Isangel", level: "regional", countryId: "vu", colors: "🟡🔴" },
  { id: "vu_sola", name: "Sola", level: "regional", countryId: "vu", colors: "🟠⚪" },
  { id: "ws_apia", name: "Apia", level: "d3", countryId: "ws", colors: "🔴⚪" },
  { id: "ws_vaitele", name: "Vaitele", level: "d3", countryId: "ws", colors: "🔵⚪" },
  { id: "ws_faleula", name: "Faleula", level: "d3", countryId: "ws", colors: "🟢⚪" },
  { id: "ws_siusega", name: "Siusega", level: "regional", countryId: "ws", colors: "🟡🔴" },
  { id: "ws_vailima", name: "Vailima", level: "regional", countryId: "ws", colors: "🟠⚪" },
  { id: "to_nukualofa", name: "Nukualofa", level: "d3", countryId: "to", colors: "🔴⚪" },
  { id: "to_neiafu", name: "Neiafu", level: "d3", countryId: "to", colors: "🔵⚪" },
  { id: "to_haveluloto", name: "Haveluloto", level: "d3", countryId: "to", colors: "🟢⚪" },
  { id: "to_vaini", name: "Vaini", level: "regional", countryId: "to", colors: "🟡🔴" },
  { id: "to_pangai", name: "Pangai", level: "regional", countryId: "to", colors: "🟠⚪" },
  { id: "ck_avarua", name: "Avarua", level: "d3", countryId: "ck", colors: "🔵🟢" },
  { id: "ck_arorangi", name: "Arorangi", level: "d3", countryId: "ck", colors: "🔴⚪" },
  { id: "ck_nikao", name: "Nikao", level: "d3", countryId: "ck", colors: "🟢⚪" },
  { id: "ck_titikaveka", name: "Titikaveka", level: "regional", countryId: "ck", colors: "🟡🔵" },
  { id: "ck_matavera", name: "Matavera", level: "regional", countryId: "ck", colors: "🟠⚪" },
  { id: "nc_noumea", name: "Nouméa", level: "d2", countryId: "nc", colors: "🔵🔴" },
  { id: "nc_mont_dore", name: "Mont-Dore", level: "d2", countryId: "nc", colors: "🟢⚪" },
  { id: "nc_dumbea", name: "Dumbéa", level: "d2", countryId: "nc", colors: "🔵⚪" },
  { id: "nc_paita", name: "Païta", level: "d3", countryId: "nc", colors: "🟡🔴" },
  { id: "nc_kone", name: "Koné", level: "d3", countryId: "nc", colors: "🟠⚪" },
  { id: "fj_suva", name: "Suva", level: "d2", countryId: "fj", colors: "🔵⚪" },
  { id: "fj_lautoka", name: "Lautoka", level: "d2", countryId: "fj", colors: "🔴⚪" },
  { id: "fj_nadi", name: "Nadi", level: "d2", countryId: "fj", colors: "🟢⚪" },
  { id: "fj_ba", name: "Ba", level: "d3", countryId: "fj", colors: "🟡🔵" },
  { id: "fj_labasa", name: "Labasa", level: "d3", countryId: "fj", colors: "🟠⚪" },
  { id: "pf_papeete", name: "Papeete", level: "d2", countryId: "pf", colors: "🔴⚪" },
  { id: "pf_faaa", name: "Faaa", level: "d2", countryId: "pf", colors: "🟢⚪" },
  { id: "pf_punaauia", name: "Punaauia", level: "d2", countryId: "pf", colors: "🔵⚪" },
  { id: "pf_pirae", name: "Pirae", level: "d3", countryId: "pf", colors: "🟡🔴" },
  { id: "pf_mahina", name: "Mahina", level: "d3", countryId: "pf", colors: "🟠⚪" },
  { id: "sb_honiara", name: "Honiara", level: "d2", countryId: "sb", colors: "🔵🟢" },
  { id: "sb_auki", name: "Auki", level: "d2", countryId: "sb", colors: "🔴⚪" },
  { id: "sb_gizo", name: "Gizo", level: "d2", countryId: "sb", colors: "🟢⚪" },
  { id: "sb_munda", name: "Munda", level: "d3", countryId: "sb", colors: "🟡🔵" },
  { id: "sb_tulagi", name: "Tulagi", level: "d3", countryId: "sb", colors: "🟠⚪" },
  { id: "sg_singapour", name: "Singapour", level: "regional", countryId: "sg", colors: "🔴⚪" },
  { id: "sg_jurong", name: "Jurong", level: "regional", countryId: "sg", colors: "🔵⚪" },
  { id: "sg_tampines", name: "Tampines", level: "regional", countryId: "sg", colors: "🟡🔴" },
  { id: "sg_woodlands", name: "Woodlands", level: "regional", countryId: "sg", colors: "🟢⚪" },
  { id: "np_katmandou", name: "Katmandou", level: "regional", countryId: "np", colors: "🔴🔵" },
  { id: "np_pokhara", name: "Pokhara", level: "regional", countryId: "np", colors: "🟢⚪" },
  { id: "np_lalitpur", name: "Lalitpur", level: "regional", countryId: "np", colors: "🔵⚪" },
  { id: "np_biratnagar", name: "Biratnagar", level: "regional", countryId: "np", colors: "🟡🔴" },
  { id: "kh_phnom_penh", name: "Phnom Penh", level: "regional", countryId: "kh", colors: "🔵🔴" },
  { id: "kh_siem_reap", name: "Siem Reap", level: "regional", countryId: "kh", colors: "🟡⚪" },
  { id: "kh_battambang", name: "Battambang", level: "regional", countryId: "kh", colors: "🟢⚪" },
  { id: "kh_sihanoukville", name: "Sihanoukville", level: "regional", countryId: "kh", colors: "🔵⚪" },
  { id: "mv_male", name: "Malé", level: "regional", countryId: "mv", colors: "🔴🟢" },
  { id: "mv_hulhumale", name: "Hulhumalé", level: "regional", countryId: "mv", colors: "🔵⚪" },
  { id: "mv_addu", name: "Addu", level: "regional", countryId: "mv", colors: "🟡🔴" },
  { id: "mv_fuvahmulah", name: "Fuvahmulah", level: "regional", countryId: "mv", colors: "🟢⚪" },
  { id: "bd_dacca", name: "Dacca", level: "regional", countryId: "bd", colors: "🟢🔴" },
  { id: "bd_chittagong", name: "Chittagong", level: "regional", countryId: "bd", colors: "🔵⚪" },
  { id: "bd_khulna", name: "Khulna", level: "regional", countryId: "bd", colors: "🟡🟢" },
  { id: "bd_rajshahi", name: "Rajshahi", level: "regional", countryId: "bd", colors: "🔴⚪" },
  { id: "mn_oulan_bator", name: "Oulan-Bator", level: "regional", countryId: "mn", colors: "🔴🔵" },
  { id: "mn_erdenet", name: "Erdenet", level: "regional", countryId: "mn", colors: "🟢⚪" },
  { id: "mn_darkhan", name: "Darkhan", level: "regional", countryId: "mn", colors: "🔵⚪" },
  { id: "mn_choibalsan", name: "Choibalsan", level: "regional", countryId: "mn", colors: "🟡🔴" },
  { id: "lb_beyrouth", name: "Beyrouth", level: "d3", countryId: "lb", colors: "🔴⚪" },
  { id: "lb_baalbek", name: "Baalbek", level: "d3", countryId: "lb", colors: "🟢⚪" },
  { id: "lb_saida", name: "Saïda", level: "d3", countryId: "lb", colors: "🔵⚪" },
  { id: "lb_tyr", name: "Tyr", level: "regional", countryId: "lb", colors: "🟡🔴" },
  { id: "lb_zahle", name: "Zahlé", level: "regional", countryId: "lb", colors: "🟠⚪" },
  { id: "ps_gaza", name: "Gaza", level: "d3", countryId: "ps", colors: "🔴⚫" },
  { id: "ps_ramallah", name: "Ramallah", level: "d3", countryId: "ps", colors: "🟢⚪" },
  { id: "ps_hebron", name: "Hébron", level: "d3", countryId: "ps", colors: "🔵⚪" },
  { id: "ps_naplouse", name: "Naplouse", level: "regional", countryId: "ps", colors: "🟡🔴" },
  { id: "ps_bethleem", name: "Bethléem", level: "regional", countryId: "ps", colors: "🟠⚪" },
  { id: "id_jakarta", name: "Jakarta", level: "d3", countryId: "id", colors: "🟠⚫" },
  { id: "id_surabaya", name: "Surabaya", level: "d3", countryId: "id", colors: "🟢⚪" },
  { id: "id_bandung", name: "Bandung", level: "d3", countryId: "id", colors: "🔵⚪" },
  { id: "id_medan", name: "Medan", level: "regional", countryId: "id", colors: "🔴⚪" },
  { id: "id_makassar", name: "Makassar", level: "regional", countryId: "id", colors: "🟡🔴" },
  { id: "my_kuala_lumpur", name: "Kuala Lumpur", level: "d3", countryId: "my", colors: "🔵🟡" },
  { id: "my_george_town", name: "George Town", level: "d3", countryId: "my", colors: "🔴⚪" },
  { id: "my_johor_bahru", name: "Johor Bahru", level: "d3", countryId: "my", colors: "🔴🔵" },
  { id: "my_ipoh", name: "Ipoh", level: "regional", countryId: "my", colors: "🟢⚪" },
  { id: "my_kuching", name: "Kuching", level: "regional", countryId: "my", colors: "🟡🔵" },
  { id: "ph_manille", name: "Manille", level: "d3", countryId: "ph", colors: "🔵🔴" },
  { id: "ph_cebu", name: "Cebu", level: "d3", countryId: "ph", colors: "🟡⚪" },
  { id: "ph_davao", name: "Davao", level: "d3", countryId: "ph", colors: "🟢⚪" },
  { id: "ph_bacolod", name: "Bacolod", level: "regional", countryId: "ph", colors: "🔴⚪" },
  { id: "ph_iloilo", name: "Iloilo", level: "regional", countryId: "ph", colors: "🟠🔵" },
  { id: "tj_douchanbe", name: "Douchanbé", level: "d3", countryId: "tj", colors: "🔴⚪" },
  { id: "tj_khoujand", name: "Khoujand", level: "d3", countryId: "tj", colors: "🔵⚪" },
  { id: "tj_bokhtar", name: "Bokhtar", level: "d3", countryId: "tj", colors: "🟢⚪" },
  { id: "tj_kulob", name: "Kulob", level: "regional", countryId: "tj", colors: "🟡🔴" },
  { id: "tj_istaravchan", name: "Istaravchan", level: "regional", countryId: "tj", colors: "🟠⚪" },
  { id: "tm_achgabat", name: "Achgabat", level: "d3", countryId: "tm", colors: "🟢⚪" },
  { id: "tm_turkmenabat", name: "Turkmenabat", level: "d3", countryId: "tm", colors: "🔵⚪" },
  { id: "tm_dachogouz", name: "Dachogouz", level: "d3", countryId: "tm", colors: "🔴⚪" },
  { id: "tm_mary", name: "Mary", level: "regional", countryId: "tm", colors: "🟡🟢" },
  { id: "tm_balkanabat", name: "Balkanabat", level: "regional", countryId: "tm", colors: "🟠⚪" },
  { id: "kp_pyongyang", name: "Pyongyang", level: "d3", countryId: "kp", colors: "🔴⚪" },
  { id: "kp_hamhung", name: "Hamhung", level: "d3", countryId: "kp", colors: "🔵⚪" },
  { id: "kp_nampo", name: "Nampo", level: "d3", countryId: "kp", colors: "🟢⚪" },
  { id: "kp_wonsan", name: "Wonsan", level: "regional", countryId: "kp", colors: "🟡🔴" },
  { id: "kp_kaesong", name: "Kaesong", level: "regional", countryId: "kp", colors: "🟠⚪" },
  { id: "ye_sanaa", name: "Sanaa", level: "d3", countryId: "ye", colors: "🔴⚪" },
  { id: "ye_aden", name: "Aden", level: "d3", countryId: "ye", colors: "🔵⚪" },
  { id: "ye_taiz", name: "Taïz", level: "d3", countryId: "ye", colors: "🟢⚪" },
  { id: "ye_hodeida", name: "Hodeïda", level: "regional", countryId: "ye", colors: "🟡🔴" },
  { id: "ye_ibb", name: "Ibb", level: "regional", countryId: "ye", colors: "🟠⚪" },
  { id: "mm_rangoun", name: "Rangoun", level: "d3", countryId: "mm", colors: "🟡🟢" },
  { id: "mm_mandalay", name: "Mandalay", level: "d3", countryId: "mm", colors: "🔴⚪" },
  { id: "mm_naypyidaw", name: "Naypyidaw", level: "d3", countryId: "mm", colors: "🔵⚪" },
  { id: "mm_bago", name: "Bago", level: "regional", countryId: "mm", colors: "🟢⚪" },
  { id: "mm_mawlamyine", name: "Mawlamyine", level: "regional", countryId: "mm", colors: "🟠⚪" },
  { id: "bh_manama", name: "Manama", level: "d2", countryId: "bh", colors: "🔴⚪" },
  { id: "bh_riffa", name: "Riffa", level: "d2", countryId: "bh", colors: "🔵⚪" },
  { id: "bh_muharraq", name: "Muharraq", level: "d2", countryId: "bh", colors: "🔴🔵" },
  { id: "bh_hamad", name: "Hamad", level: "d3", countryId: "bh", colors: "🟢⚪" },
  { id: "bh_isa", name: "Isa", level: "d3", countryId: "bh", colors: "🟡🔴" },
  { id: "om_mascate", name: "Mascate", level: "d2", countryId: "om", colors: "🔴⚪" },
  { id: "om_salalah", name: "Salalah", level: "d2", countryId: "om", colors: "🟢⚪" },
  { id: "om_sohar", name: "Sohar", level: "d2", countryId: "om", colors: "🔵⚪" },
  { id: "om_nizwa", name: "Nizwa", level: "d3", countryId: "om", colors: "🟡🔴" },
  { id: "om_sur", name: "Sur", level: "d3", countryId: "om", colors: "🟠⚪" },
  { id: "jo_amman", name: "Amman", level: "d2", countryId: "jo", colors: "🔴⚪" },
  { id: "jo_zarqa", name: "Zarqa", level: "d2", countryId: "jo", colors: "🔵⚪" },
  { id: "jo_irbid", name: "Irbid", level: "d2", countryId: "jo", colors: "🟢⚪" },
  { id: "jo_aqaba", name: "Aqaba", level: "d3", countryId: "jo", colors: "🟡🔵" },
  { id: "jo_salt", name: "Salt", level: "d3", countryId: "jo", colors: "🟠⚪" },
  { id: "kw_koweit", name: "Koweït", level: "d2", countryId: "kw", colors: "🔵⚪" },
  { id: "kw_hawalli", name: "Hawalli", level: "d2", countryId: "kw", colors: "🔴⚪" },
  { id: "kw_salmiya", name: "Salmiya", level: "d2", countryId: "kw", colors: "🟢⚪" },
  { id: "kw_jahra", name: "Jahra", level: "d3", countryId: "kw", colors: "🟡🔴" },
  { id: "kw_farwaniya", name: "Farwaniya", level: "d3", countryId: "kw", colors: "🟠⚪" },
  { id: "th_bangkok", name: "Bangkok", level: "d2", countryId: "th", colors: "🔵⚪" },
  { id: "th_chiang_mai", name: "Chiang Mai", level: "d2", countryId: "th", colors: "🔴⚪" },
  { id: "th_nonthaburi", name: "Nonthaburi", level: "d2", countryId: "th", colors: "🟢⚪" },
  { id: "th_pattaya", name: "Pattaya", level: "d3", countryId: "th", colors: "🟡🔵" },
  { id: "th_khon_kaen", name: "Khon Kaen", level: "d3", countryId: "th", colors: "🟠⚪" },
  { id: "vn_hanoi", name: "Hanoï", level: "d2", countryId: "vn", colors: "🔴🟡" },
  { id: "vn_ho_chi_minh_ville", name: "Hô-Chi-Minh-Ville", level: "d2", countryId: "vn", colors: "🔵⚪" },
  { id: "vn_da_nang", name: "Da Nang", level: "d2", countryId: "vn", colors: "🟢⚪" },
  { id: "vn_haiphong", name: "Haiphong", level: "d3", countryId: "vn", colors: "🔴⚪" },
  { id: "vn_can_tho", name: "Can Tho", level: "d3", countryId: "vn", colors: "🟡🔵" },
  { id: "in_calcutta", name: "Calcutta", level: "d2", countryId: "in", colors: "🔴🟡" },
  { id: "in_bombay", name: "Bombay", level: "d2", countryId: "in", colors: "🔵⚪" },
  { id: "in_goa", name: "Goa", level: "d2", countryId: "in", colors: "🟠🔵" },
  { id: "in_bangalore", name: "Bangalore", level: "d3", countryId: "in", colors: "🔵🔴" },
  { id: "in_kochi", name: "Kochi", level: "d3", countryId: "in", colors: "🟡🟣" },
  { id: "sy_damas", name: "Damas", level: "d2", countryId: "sy", colors: "🔴⚪" },
  { id: "sy_alep", name: "Alep", level: "d2", countryId: "sy", colors: "🟢⚪" },
  { id: "sy_homs", name: "Homs", level: "d2", countryId: "sy", colors: "🔵⚪" },
  { id: "sy_lattaquie", name: "Lattaquié", level: "d3", countryId: "sy", colors: "🟡🔵" },
  { id: "sy_hama", name: "Hama", level: "d3", countryId: "sy", colors: "🟠⚪" },
  { id: "iq_bagdad", name: "Bagdad", level: "d1", countryId: "iq", colors: "🟢⚪" },
  { id: "iq_bassorah", name: "Bassorah", level: "d1", countryId: "iq", colors: "🔵⚪" },
  { id: "iq_mossoul", name: "Mossoul", level: "d1", countryId: "iq", colors: "🔴⚪" },
  { id: "iq_erbil", name: "Erbil", level: "d2", countryId: "iq", colors: "🟡🟢" },
  { id: "iq_nadjaf", name: "Nadjaf", level: "d2", countryId: "iq", colors: "⚪🔵" },
  { id: "ae_dubai", name: "Dubaï", level: "d1", countryId: "ae", colors: "🔴⚪" },
  { id: "ae_abou_dabi", name: "Abou Dabi", level: "d1", countryId: "ae", colors: "🔵⚪" },
  { id: "ae_charjah", name: "Charjah", level: "d1", countryId: "ae", colors: "🟢⚪" },
  { id: "ae_al_ain", name: "Al-Aïn", level: "d2", countryId: "ae", colors: "🟣⚪" },
  { id: "ae_ajman", name: "Ajman", level: "d2", countryId: "ae", colors: "🟠⚪" },
  { id: "uz_tachkent", name: "Tachkent", level: "d1", countryId: "uz", colors: "🔵⚪" },
  { id: "uz_samarcande", name: "Samarcande", level: "d1", countryId: "uz", colors: "🟢⚪" },
  { id: "uz_boukhara", name: "Boukhara", level: "d1", countryId: "uz", colors: "🔴⚪" },
  { id: "uz_namangan", name: "Namangan", level: "d2", countryId: "uz", colors: "🟡🔵" },
  { id: "uz_andijan", name: "Andijan", level: "d2", countryId: "uz", colors: "🟠⚪" },
  { id: "km_moroni", name: "Moroni", level: "regional", countryId: "km", colors: "🟢🔴" },
  { id: "km_mutsamudu", name: "Mutsamudu", level: "regional", countryId: "km", colors: "🔵⚪" },
  { id: "km_fomboni", name: "Fomboni", level: "regional", countryId: "km", colors: "🟡🟢" },
  { id: "km_domoni", name: "Domoni", level: "regional", countryId: "km", colors: "🔴⚪" },
  { id: "mu_port_louis", name: "Port-Louis", level: "regional", countryId: "mu", colors: "🔴🔵" },
  { id: "mu_curepipe", name: "Curepipe", level: "regional", countryId: "mu", colors: "🟢⚪" },
  { id: "mu_quatre_bornes", name: "Quatre Bornes", level: "regional", countryId: "mu", colors: "🔵⚪" },
  { id: "mu_vacoas", name: "Vacoas", level: "regional", countryId: "mu", colors: "🟡🔵" },
  { id: "dj_djibouti", name: "Djibouti", level: "regional", countryId: "dj", colors: "🔵🟢" },
  { id: "dj_ali_sabieh", name: "Ali Sabieh", level: "regional", countryId: "dj", colors: "🔴⚪" },
  { id: "dj_tadjoura", name: "Tadjoura", level: "regional", countryId: "dj", colors: "🟢⚪" },
  { id: "dj_obock", name: "Obock", level: "regional", countryId: "dj", colors: "🟡🔵" },
  { id: "sc_victoria", name: "Victoria", level: "regional", countryId: "sc", colors: "🔵🟡" },
  { id: "sc_beau_vallon", name: "Beau Vallon", level: "regional", countryId: "sc", colors: "🔴⚪" },
  { id: "sc_anse_boileau", name: "Anse Boileau", level: "regional", countryId: "sc", colors: "🟢⚪" },
  { id: "sc_takamaka", name: "Takamaka", level: "regional", countryId: "sc", colors: "🟡🟢" },
  { id: "sz_mbabane", name: "Mbabane", level: "regional", countryId: "sz", colors: "🔵🟡" },
  { id: "sz_manzini", name: "Manzini", level: "regional", countryId: "sz", colors: "🔴⚪" },
  { id: "sz_big_bend", name: "Big Bend", level: "regional", countryId: "sz", colors: "🟢⚪" },
  { id: "sz_nhlangano", name: "Nhlangano", level: "regional", countryId: "sz", colors: "🟡🔵" },
  { id: "ls_maseru", name: "Maseru", level: "regional", countryId: "ls", colors: "🔵⚪" },
  { id: "ls_teyateyaneng", name: "Teyateyaneng", level: "regional", countryId: "ls", colors: "🟢⚪" },
  { id: "ls_mafeteng", name: "Mafeteng", level: "regional", countryId: "ls", colors: "🔴⚪" },
  { id: "ls_hlotse", name: "Hlotse", level: "regional", countryId: "ls", colors: "🟡🔵" },
  { id: "zw_harare", name: "Harare", level: "d3", countryId: "zw", colors: "🟡🟢" },
  { id: "zw_bulawayo", name: "Bulawayo", level: "d3", countryId: "zw", colors: "🔵⚪" },
  { id: "zw_mutare", name: "Mutare", level: "d3", countryId: "zw", colors: "🔴⚪" },
  { id: "zw_gweru", name: "Gweru", level: "regional", countryId: "zw", colors: "🟢⚪" },
  { id: "zw_kwekwe", name: "Kwekwe", level: "regional", countryId: "zw", colors: "🟡🔵" },
  { id: "ke_nairobi", name: "Nairobi", level: "d3", countryId: "ke", colors: "🔴⚫" },
  { id: "ke_mombasa", name: "Mombasa", level: "d3", countryId: "ke", colors: "🔵⚪" },
  { id: "ke_nakuru", name: "Nakuru", level: "d3", countryId: "ke", colors: "🟢⚪" },
  { id: "ke_kisumu", name: "Kisumu", level: "regional", countryId: "ke", colors: "🟡🔵" },
  { id: "ke_eldoret", name: "Eldoret", level: "regional", countryId: "ke", colors: "🟠⚪" },
  { id: "tg_lome", name: "Lomé", level: "d3", countryId: "tg", colors: "🟢🟡" },
  { id: "tg_sokode", name: "Sokodé", level: "d3", countryId: "tg", colors: "🔴⚪" },
  { id: "tg_kara", name: "Kara", level: "d3", countryId: "tg", colors: "🔵⚪" },
  { id: "tg_kpalime", name: "Kpalimé", level: "regional", countryId: "tg", colors: "🟡🟢" },
  { id: "tg_atakpame", name: "Atakpamé", level: "regional", countryId: "tg", colors: "🟠⚪" },
  { id: "mr_nouakchott", name: "Nouakchott", level: "d3", countryId: "mr", colors: "🟢🟡" },
  { id: "mr_nouadhibou", name: "Nouadhibou", level: "d3", countryId: "mr", colors: "🔵⚪" },
  { id: "mr_kiffa", name: "Kiffa", level: "d3", countryId: "mr", colors: "🔴⚪" },
  { id: "mr_rosso", name: "Rosso", level: "regional", countryId: "mr", colors: "🟢⚪" },
  { id: "mr_kaedi", name: "Kaédi", level: "regional", countryId: "mr", colors: "🟡🔵" },
  { id: "gw_bissau", name: "Bissau", level: "d3", countryId: "gw", colors: "🔴🟡" },
  { id: "gw_bafata", name: "Bafatá", level: "d3", countryId: "gw", colors: "🟢⚪" },
  { id: "gw_gabu", name: "Gabú", level: "d3", countryId: "gw", colors: "🔵⚪" },
  { id: "gw_bissora", name: "Bissorã", level: "regional", countryId: "gw", colors: "🟡🟢" },
  { id: "gw_bolama", name: "Bolama", level: "regional", countryId: "gw", colors: "🟠⚪" },
  { id: "sl_freetown", name: "Freetown", level: "d3", countryId: "sl", colors: "🟢⚪" },
  { id: "sl_bo", name: "Bo", level: "d3", countryId: "sl", colors: "🔵⚪" },
  { id: "sl_kenema", name: "Kenema", level: "d3", countryId: "sl", colors: "🔴⚪" },
  { id: "sl_makeni", name: "Makeni", level: "regional", countryId: "sl", colors: "🟡🟢" },
  { id: "sl_koidu", name: "Koidu", level: "regional", countryId: "sl", colors: "🟠⚪" },
  { id: "ly_tripoli", name: "Tripoli", level: "d3", countryId: "ly", colors: "🔴⚫" },
  { id: "ly_benghazi", name: "Benghazi", level: "d3", countryId: "ly", colors: "🟢⚪" },
  { id: "ly_misrata", name: "Misrata", level: "d3", countryId: "ly", colors: "🔵⚪" },
  { id: "ly_zawiya", name: "Zawiya", level: "regional", countryId: "ly", colors: "🟡🟢" },
  { id: "ly_sabha", name: "Sabha", level: "regional", countryId: "ly", colors: "🟠⚪" },
  { id: "sd_khartoum", name: "Khartoum", level: "d3", countryId: "sd", colors: "🔴⚪" },
  { id: "sd_omdurman", name: "Omdurman", level: "d3", countryId: "sd", colors: "🔵⚪" },
  { id: "sd_port_soudan", name: "Port-Soudan", level: "d3", countryId: "sd", colors: "🟢⚪" },
  { id: "sd_kassala", name: "Kassala", level: "regional", countryId: "sd", colors: "🟡🔵" },
  { id: "sd_el_obeid", name: "El Obeid", level: "regional", countryId: "sd", colors: "🟠⚪" },
  { id: "na_windhoek", name: "Windhoek", level: "d3", countryId: "na", colors: "🔵🔴" },
  { id: "na_walvis_bay", name: "Walvis Bay", level: "d3", countryId: "na", colors: "🟢⚪" },
  { id: "na_swakopmund", name: "Swakopmund", level: "d3", countryId: "na", colors: "🔵⚪" },
  { id: "na_rundu", name: "Rundu", level: "regional", countryId: "na", colors: "🟡🟢" },
  { id: "na_oshakati", name: "Oshakati", level: "regional", countryId: "na", colors: "🟠⚪" },
  { id: "tz_dar_es_salaam", name: "Dar es Salaam", level: "d3", countryId: "tz", colors: "🟢🟡" },
  { id: "tz_mwanza", name: "Mwanza", level: "d3", countryId: "tz", colors: "🔵⚪" },
  { id: "tz_dodoma", name: "Dodoma", level: "d3", countryId: "tz", colors: "🔴⚪" },
  { id: "tz_arusha", name: "Arusha", level: "regional", countryId: "tz", colors: "🟡🟢" },
  { id: "tz_mbeya", name: "Mbeya", level: "regional", countryId: "tz", colors: "🟠⚪" },
  { id: "cv_praia", name: "Praia", level: "d2", countryId: "cv", colors: "🔵⚪" },
  { id: "cv_mindelo", name: "Mindelo", level: "d2", countryId: "cv", colors: "🔴⚪" },
  { id: "cv_santa_maria", name: "Santa Maria", level: "d2", countryId: "cv", colors: "🟡🔵" },
  { id: "cv_assomada", name: "Assomada", level: "d3", countryId: "cv", colors: "🟢⚪" },
  { id: "cv_espargos", name: "Espargos", level: "d3", countryId: "cv", colors: "🔵🟡" },
  { id: "ga_libreville", name: "Libreville", level: "d2", countryId: "ga", colors: "🟢🟡" },
  { id: "ga_port_gentil", name: "Port-Gentil", level: "d2", countryId: "ga", colors: "🔵⚪" },
  { id: "ga_franceville", name: "Franceville", level: "d2", countryId: "ga", colors: "🟡🔵" },
  { id: "ga_oyem", name: "Oyem", level: "d3", countryId: "ga", colors: "🟢⚪" },
  { id: "ga_moanda", name: "Moanda", level: "d3", countryId: "ga", colors: "🔴⚪" },
  { id: "zm_lusaka", name: "Lusaka", level: "d2", countryId: "zm", colors: "🟢🟠" },
  { id: "zm_kitwe", name: "Kitwe", level: "d2", countryId: "zm", colors: "🔴⚪" },
  { id: "zm_ndola", name: "Ndola", level: "d2", countryId: "zm", colors: "🔵⚪" },
  { id: "zm_kabwe", name: "Kabwe", level: "d3", countryId: "zm", colors: "🟡🟢" },
  { id: "zm_livingstone", name: "Livingstone", level: "d3", countryId: "zm", colors: "🟠⚪" },
  { id: "ug_kampala", name: "Kampala", level: "d2", countryId: "ug", colors: "⚫🟡" },
  { id: "ug_gulu", name: "Gulu", level: "d2", countryId: "ug", colors: "🔴⚪" },
  { id: "ug_mbarara", name: "Mbarara", level: "d2", countryId: "ug", colors: "🔵⚪" },
  { id: "ug_jinja", name: "Jinja", level: "d3", countryId: "ug", colors: "🟢⚪" },
  { id: "ug_mbale", name: "Mbale", level: "d3", countryId: "ug", colors: "🟡🔵" },
  { id: "cg_brazzaville", name: "Brazzaville", level: "d2", countryId: "cg", colors: "🟢🟡" },
  { id: "cg_pointe_noire", name: "Pointe-Noire", level: "d2", countryId: "cg", colors: "🔴⚪" },
  { id: "cg_dolisie", name: "Dolisie", level: "d2", countryId: "cg", colors: "🔵⚪" },
  { id: "cg_nkayi", name: "Nkayi", level: "d3", countryId: "cg", colors: "🟡🟢" },
  { id: "cg_owando", name: "Owando", level: "d3", countryId: "cg", colors: "🟠⚪" },
  { id: "gq_malabo", name: "Malabo", level: "d2", countryId: "gq", colors: "🔵🟢" },
  { id: "gq_bata", name: "Bata", level: "d2", countryId: "gq", colors: "🔴⚪" },
  { id: "gq_ebebiyin", name: "Ebebiyín", level: "d2", countryId: "gq", colors: "🟡🔵" },
  { id: "gq_mongomo", name: "Mongomo", level: "d3", countryId: "gq", colors: "🟢⚪" },
  { id: "gq_luba", name: "Luba", level: "d3", countryId: "gq", colors: "🔵⚪" },
  { id: "mz_maputo", name: "Maputo", level: "d2", countryId: "mz", colors: "🟢⚫" },
  { id: "mz_beira", name: "Beira", level: "d2", countryId: "mz", colors: "🔴⚪" },
  { id: "mz_nampula", name: "Nampula", level: "d2", countryId: "mz", colors: "🔵⚪" },
  { id: "mz_matola", name: "Matola", level: "d3", countryId: "mz", colors: "🟡🟢" },
  { id: "mz_quelimane", name: "Quelimane", level: "d3", countryId: "mz", colors: "🟠⚪" },
  { id: "gm_banjul", name: "Banjul", level: "d2", countryId: "gm", colors: "🔴🔵" },
  { id: "gm_serekunda", name: "Serekunda", level: "d2", countryId: "gm", colors: "🟢⚪" },
  { id: "gm_brikama", name: "Brikama", level: "d2", countryId: "gm", colors: "🔵⚪" },
  { id: "gm_bakau", name: "Bakau", level: "d3", countryId: "gm", colors: "🟡🔵" },
  { id: "gm_farafenni", name: "Farafenni", level: "d3", countryId: "gm", colors: "🟠⚪" },
  { id: "gh_accra", name: "Accra", level: "d1", countryId: "gh", colors: "🔴🟡" },
  { id: "gh_kumasi", name: "Kumasi", level: "d1", countryId: "gh", colors: "🔴⚪" },
  { id: "gh_tamale", name: "Tamale", level: "d1", countryId: "gh", colors: "🟡🔵" },
  { id: "gh_sekondi", name: "Sekondi", level: "d2", countryId: "gh", colors: "🔵⚪" },
  { id: "gh_cape_coast", name: "Cape Coast", level: "d2", countryId: "gh", colors: "🟢⚪" },
  { id: "ml_bamako", name: "Bamako", level: "d1", countryId: "ml", colors: "🟢🟡" },
  { id: "ml_sikasso", name: "Sikasso", level: "d1", countryId: "ml", colors: "🔴⚪" },
  { id: "ml_segou", name: "Ségou", level: "d1", countryId: "ml", colors: "🔵⚪" },
  { id: "ml_mopti", name: "Mopti", level: "d2", countryId: "ml", colors: "🟡🟢" },
  { id: "ml_kayes", name: "Kayes", level: "d2", countryId: "ml", colors: "🔴🟢" },
  { id: "bf_ouagadougou", name: "Ouagadougou", level: "d1", countryId: "bf", colors: "🔴🟢" },
  { id: "bf_bobo_dioulasso", name: "Bobo-Dioulasso", level: "d1", countryId: "bf", colors: "🟡🔴" },
  { id: "bf_koudougou", name: "Koudougou", level: "d1", countryId: "bf", colors: "🔵⚪" },
  { id: "bf_banfora", name: "Banfora", level: "d2", countryId: "bf", colors: "🟢⚪" },
  { id: "bf_ouahigouya", name: "Ouahigouya", level: "d2", countryId: "bf", colors: "🟡🔵" },
  { id: "gy_georgetown", name: "Georgetown", level: "regional", countryId: "gy", colors: "🟢🔴" },
  { id: "gy_linden", name: "Linden", level: "regional", countryId: "gy", colors: "🔵⚪" },
  { id: "gy_new_amsterdam", name: "New Amsterdam", level: "regional", countryId: "gy", colors: "🟡🟢" },
  { id: "gy_bartica", name: "Bartica", level: "regional", countryId: "gy", colors: "🔴⚪" },
  { id: "bm_hamilton", name: "Hamilton", level: "regional", countryId: "bm", colors: "🔵🔴" },
  { id: "bm_saint_george", name: "Saint George", level: "regional", countryId: "bm", colors: "⚪🔵" },
  { id: "bm_somerset", name: "Somerset", level: "regional", countryId: "bm", colors: "🔴⚪" },
  { id: "bm_flatts", name: "Flatts", level: "regional", countryId: "bm", colors: "🟢⚪" },
  { id: "bb_bridgetown", name: "Bridgetown", level: "regional", countryId: "bb", colors: "🔵🟡" },
  { id: "bb_speightstown", name: "Speightstown", level: "regional", countryId: "bb", colors: "🔴⚪" },
  { id: "bb_oistins", name: "Oistins", level: "regional", countryId: "bb", colors: "🟢⚪" },
  { id: "bb_holetown", name: "Holetown", level: "regional", countryId: "bb", colors: "🟡🔵" },
  { id: "bs_nassau", name: "Nassau", level: "regional", countryId: "bs", colors: "🔵🟡" },
  { id: "bs_freeport", name: "Freeport", level: "regional", countryId: "bs", colors: "🟢⚫" },
  { id: "bs_west_end", name: "West End", level: "regional", countryId: "bs", colors: "🔴⚪" },
  { id: "bs_marsh_harbour", name: "Marsh Harbour", level: "regional", countryId: "bs", colors: "🔵⚪" },
  { id: "gd_saint_georges", name: "Saint-Georges", level: "regional", countryId: "gd", colors: "🔴🟡" },
  { id: "gd_gouyave", name: "Gouyave", level: "regional", countryId: "gd", colors: "🟢⚪" },
  { id: "gd_grenville", name: "Grenville", level: "regional", countryId: "gd", colors: "🔵⚪" },
  { id: "gd_sauteurs", name: "Sauteurs", level: "regional", countryId: "gd", colors: "🟡🔴" },
  { id: "ag_saint_john_s", name: "Saint John's", level: "regional", countryId: "ag", colors: "🔴⚫" },
  { id: "ag_all_saints", name: "All Saints", level: "regional", countryId: "ag", colors: "🔵⚪" },
  { id: "ag_liberta", name: "Liberta", level: "regional", countryId: "ag", colors: "🟢⚪" },
  { id: "ag_bolans", name: "Bolans", level: "regional", countryId: "ag", colors: "🟡🔵" },
  { id: "gt_guatemala", name: "Guatemala", level: "d3", countryId: "gt", colors: "🔴⚪" },
  { id: "gt_quetzaltenango", name: "Quetzaltenango", level: "d3", countryId: "gt", colors: "🔴⚫" },
  { id: "gt_escuintla", name: "Escuintla", level: "d3", countryId: "gt", colors: "🔵⚪" },
  { id: "gt_mixco", name: "Mixco", level: "regional", countryId: "gt", colors: "🟢⚪" },
  { id: "gt_villa_nueva", name: "Villa Nueva", level: "regional", countryId: "gt", colors: "🟡🔵" },
  { id: "tt_port_of_spain", name: "Port-of-Spain", level: "d3", countryId: "tt", colors: "🔴⚫" },
  { id: "tt_san_fernando", name: "San Fernando", level: "d3", countryId: "tt", colors: "🔵⚪" },
  { id: "tt_chaguanas", name: "Chaguanas", level: "d3", countryId: "tt", colors: "🟢⚪" },
  { id: "tt_arima", name: "Arima", level: "regional", countryId: "tt", colors: "🟡🔴" },
  { id: "tt_point_fortin", name: "Point Fortin", level: "regional", countryId: "tt", colors: "🔵🟡" },
  { id: "ht_port_au_prince", name: "Port-au-Prince", level: "d3", countryId: "ht", colors: "🔵🔴" },
  { id: "ht_cap_haitien", name: "Cap-Haïtien", level: "d3", countryId: "ht", colors: "🟡⚫" },
  { id: "ht_gonaives", name: "Gonaïves", level: "d3", countryId: "ht", colors: "🔵⚪" },
  { id: "ht_les_cayes", name: "Les Cayes", level: "regional", countryId: "ht", colors: "🟢⚪" },
  { id: "ht_jacmel", name: "Jacmel", level: "regional", countryId: "ht", colors: "🔴⚪" },
  { id: "cu_la_havane", name: "La Havane", level: "d3", countryId: "cu", colors: "🔴⚪" },
  { id: "cu_santiago_de_cuba", name: "Santiago de Cuba", level: "d3", countryId: "cu", colors: "🔵⚪" },
  { id: "cu_camaguey", name: "Camagüey", level: "d3", countryId: "cu", colors: "🟡🔴" },
  { id: "cu_holguin", name: "Holguín", level: "regional", countryId: "cu", colors: "🟢⚪" },
  { id: "cu_cienfuegos", name: "Cienfuegos", level: "regional", countryId: "cu", colors: "🔴⚫" },
  { id: "cw_willemstad", name: "Willemstad", level: "d3", countryId: "cw", colors: "🔵🟡" },
  { id: "cw_barber", name: "Barber", level: "d3", countryId: "cw", colors: "🔴⚪" },
  { id: "cw_soto", name: "Soto", level: "d3", countryId: "cw", colors: "🟢⚪" },
  { id: "cw_sint_willibrordus", name: "Sint Willibrordus", level: "regional", countryId: "cw", colors: "🟡🔵" },
  { id: "cw_westpunt", name: "Westpunt", level: "regional", countryId: "cw", colors: "🔵⚪" },
  { id: "sr_paramaribo", name: "Paramaribo", level: "d3", countryId: "sr", colors: "🟢⚪" },
  { id: "sr_lelydorp", name: "Lelydorp", level: "d3", countryId: "sr", colors: "🔴⚪" },
  { id: "sr_nieuw_nickerie", name: "Nieuw Nickerie", level: "d3", countryId: "sr", colors: "🔵⚪" },
  { id: "sr_moengo", name: "Moengo", level: "regional", countryId: "sr", colors: "🟡🟢" },
  { id: "sr_albina", name: "Albina", level: "regional", countryId: "sr", colors: "🔵🟡" },
  { id: "do_saint_domingue", name: "Saint-Domingue", level: "d3", countryId: "do", colors: "🔵🔴" },
  { id: "do_la_vega", name: "La Vega", level: "d3", countryId: "do", colors: "🔴⚪" },
  { id: "do_la_romana", name: "La Romana", level: "d3", countryId: "do", colors: "🟢⚪" },
  { id: "do_san_cristobal", name: "San Cristóbal", level: "regional", countryId: "do", colors: "🟡🔵" },
  { id: "do_puerto_plata", name: "Puerto Plata", level: "regional", countryId: "do", colors: "🔵⚪" },
  { id: "ni_managua", name: "Managua", level: "d3", countryId: "ni", colors: "🔵⚪" },
  { id: "ni_leon", name: "León", level: "d3", countryId: "ni", colors: "🔴⚫" },
  { id: "ni_masaya", name: "Masaya", level: "d3", countryId: "ni", colors: "🟢⚪" },
  { id: "ni_granada", name: "Granada", level: "regional", countryId: "ni", colors: "🟡🔴" },
  { id: "ni_chinandega", name: "Chinandega", level: "regional", countryId: "ni", colors: "🔵🟡" },
  { id: "bo_la_paz", name: "La Paz", level: "d2", countryId: "bo", colors: "🔵⚪" },
  { id: "bo_santa_cruz", name: "Santa Cruz", level: "d2", countryId: "bo", colors: "🟢⚪" },
  { id: "bo_cochabamba", name: "Cochabamba", level: "d2", countryId: "bo", colors: "🔴⚪" },
  { id: "bo_oruro", name: "Oruro", level: "d3", countryId: "bo", colors: "🔵🟡" },
  { id: "bo_sucre", name: "Sucre", level: "d3", countryId: "bo", colors: "🟣⚪" },
  { id: "pa_panama", name: "Panama", level: "d2", countryId: "pa", colors: "🔴🔵" },
  { id: "pa_colon", name: "Colón", level: "d2", countryId: "pa", colors: "🔴⚪" },
  { id: "pa_david", name: "David", level: "d2", countryId: "pa", colors: "🔵⚪" },
  { id: "pa_chitre", name: "Chitré", level: "d3", countryId: "pa", colors: "🟡🔵" },
  { id: "pa_penonome", name: "Penonomé", level: "d3", countryId: "pa", colors: "🟢⚪" },
  { id: "hn_tegucigalpa", name: "Tegucigalpa", level: "d2", countryId: "hn", colors: "🔵⚪" },
  { id: "hn_san_pedro_sula", name: "San Pedro Sula", level: "d2", countryId: "hn", colors: "🟢⚪" },
  { id: "hn_la_ceiba", name: "La Ceiba", level: "d2", countryId: "hn", colors: "🔵🟡" },
  { id: "hn_choluteca", name: "Choluteca", level: "d3", countryId: "hn", colors: "🔴⚪" },
  { id: "hn_comayagua", name: "Comayagua", level: "d3", countryId: "hn", colors: "🟡🔵" },
  { id: "jm_kingston", name: "Kingston", level: "d2", countryId: "jm", colors: "🟢🟡" },
  { id: "jm_montego_bay", name: "Montego Bay", level: "d2", countryId: "jm", colors: "🔵⚪" },
  { id: "jm_spanish_town", name: "Spanish Town", level: "d2", countryId: "jm", colors: "🔴⚪" },
  { id: "jm_portmore", name: "Portmore", level: "d3", countryId: "jm", colors: "🟡🟢" },
  { id: "jm_may_pen", name: "May Pen", level: "d3", countryId: "jm", colors: "🔵🟡" },
  { id: "pe_lima", name: "Lima", level: "d1", countryId: "pe", colors: "⚪🔴" },
  { id: "pe_cusco", name: "Cusco", level: "d1", countryId: "pe", colors: "🔴⚪" },
  { id: "pe_arequipa", name: "Arequipa", level: "d1", countryId: "pe", colors: "🔵⚪" },
  { id: "pe_trujillo", name: "Trujillo", level: "d2", countryId: "pe", colors: "🟡🔵" },
  { id: "pe_chiclayo", name: "Chiclayo", level: "d2", countryId: "pe", colors: "🔵⚪" },
  { id: "cr_san_jose", name: "San José", level: "d1", countryId: "cr", colors: "🔴⚫" },
  { id: "cr_alajuela", name: "Alajuela", level: "d1", countryId: "cr", colors: "🔴⚫" },
  { id: "cr_cartago", name: "Cartago", level: "d1", countryId: "cr", colors: "🔵⚪" },
  { id: "cr_heredia", name: "Heredia", level: "d2", countryId: "cr", colors: "🟡🔴" },
  { id: "cr_liberia", name: "Liberia", level: "d2", countryId: "cr", colors: "🔵⚪" },
  { id: "mt_la_valette", name: "La Valette", level: "regional", countryId: "mt", colors: "🔴⚪" },
  { id: "mt_birkirkara", name: "Birkirkara", level: "regional", countryId: "mt", colors: "🟡🔴" },
  { id: "mt_sliema", name: "Sliema", level: "regional", countryId: "mt", colors: "🔵⚪" },
  { id: "mt_amrun", name: "Ħamrun", level: "regional", countryId: "mt", colors: "🔴⚫" },
  { id: "fo_torshavn", name: "Tórshavn", level: "regional", countryId: "fo", colors: "🔵⚪" },
  { id: "fo_klaksvik", name: "Klaksvík", level: "regional", countryId: "fo", colors: "🔴🟡" },
  { id: "fo_runavik", name: "Runavík", level: "regional", countryId: "fo", colors: "🔵🟡" },
  { id: "fo_toftir", name: "Toftir", level: "regional", countryId: "fo", colors: "⚪⚫" },
  { id: "ad_andorre_la_vieille", name: "Andorre-la-Vieille", level: "regional", countryId: "ad", colors: "🔵🟡" },
  { id: "ad_escaldes", name: "Escaldes", level: "regional", countryId: "ad", colors: "🔴⚪" },
  { id: "ad_encamp", name: "Encamp", level: "regional", countryId: "ad", colors: "🟢⚪" },
  { id: "ad_la_massana", name: "La Massana", level: "regional", countryId: "ad", colors: "🔵⚪" },
  { id: "sm_saint_marin", name: "Saint-Marin", level: "regional", countryId: "sm", colors: "🔵⚪" },
  { id: "sm_serravalle", name: "Serravalle", level: "regional", countryId: "sm", colors: "🟡🟢" },
  { id: "sm_borgo_maggiore", name: "Borgo Maggiore", level: "regional", countryId: "sm", colors: "🔴⚪" },
  { id: "sm_domagnano", name: "Domagnano", level: "regional", countryId: "sm", colors: "🟡🔵" },
  { id: "li_vaduz", name: "Vaduz", level: "regional", countryId: "li", colors: "🔴🔵" },
  { id: "li_schaan", name: "Schaan", level: "regional", countryId: "li", colors: "🔵⚪" },
  { id: "li_balzers", name: "Balzers", level: "regional", countryId: "li", colors: "🔴⚪" },
  { id: "li_triesen", name: "Triesen", level: "regional", countryId: "li", colors: "🟡⚫" },
  { id: "gi_gibraltar", name: "Gibraltar", level: "regional", countryId: "gi", colors: "🔴⚪" },
  { id: "gi_europa_point", name: "Europa Point", level: "regional", countryId: "gi", colors: "🔵🟡" },
  { id: "gi_catalan_bay", name: "Catalan Bay", level: "regional", countryId: "gi", colors: "🟢⚪" },
  { id: "gi_westside", name: "Westside", level: "regional", countryId: "gi", colors: "🔵⚪" },
  { id: "me_podgorica", name: "Podgorica", level: "d3", countryId: "me", colors: "🔴🟡" },
  { id: "me_niksic", name: "Nikšić", level: "d3", countryId: "me", colors: "🔵⚪" },
  { id: "me_budva", name: "Budva", level: "d3", countryId: "me", colors: "🔵🟡" },
  { id: "me_bar", name: "Bar", level: "regional", countryId: "me", colors: "🟢⚪" },
  { id: "me_cetinje", name: "Cetinje", level: "regional", countryId: "me", colors: "🔴⚪" },
  { id: "xk_pristina", name: "Pristina", level: "d3", countryId: "xk", colors: "🔵🟡" },
  { id: "xk_prizren", name: "Prizren", level: "d3", countryId: "xk", colors: "🔴⚪" },
  { id: "xk_peja", name: "Peja", level: "d3", countryId: "xk", colors: "🔴⚫" },
  { id: "xk_gjakova", name: "Gjakova", level: "regional", countryId: "xk", colors: "🔵⚪" },
  { id: "xk_mitrovica", name: "Mitrovica", level: "regional", countryId: "xk", colors: "🟢⚪" },
  { id: "am_erevan", name: "Erevan", level: "d3", countryId: "am", colors: "🔴🔵" },
  { id: "am_gyumri", name: "Gyumri", level: "d3", countryId: "am", colors: "🟠⚪" },
  { id: "am_vanadzor", name: "Vanadzor", level: "d3", countryId: "am", colors: "🔵⚪" },
  { id: "am_abovyan", name: "Abovyan", level: "regional", countryId: "am", colors: "🔴⚪" },
  { id: "am_kapan", name: "Kapan", level: "regional", countryId: "am", colors: "🟢⚪" },
  { id: "az_bakou", name: "Bakou", level: "d3", countryId: "az", colors: "🔵🔴" },
  { id: "az_ganja", name: "Ganja", level: "d3", countryId: "az", colors: "🟢⚪" },
  { id: "az_sumqayit", name: "Sumqayit", level: "d3", countryId: "az", colors: "🔵⚪" },
  { id: "az_lankaran", name: "Lankaran", level: "regional", countryId: "az", colors: "🔴⚪" },
  { id: "az_mingachevir", name: "Mingachevir", level: "regional", countryId: "az", colors: "🟠⚫" },
  { id: "cy_nicosie", name: "Nicosie", level: "d3", countryId: "cy", colors: "🔵⚪" },
  { id: "cy_limassol", name: "Limassol", level: "d3", countryId: "cy", colors: "🔴⚫" },
  { id: "cy_larnaca", name: "Larnaca", level: "d3", countryId: "cy", colors: "🟢⚪" },
  { id: "cy_paphos", name: "Paphos", level: "regional", countryId: "cy", colors: "🔵🟠" },
  { id: "cy_famagouste", name: "Famagouste", level: "regional", countryId: "cy", colors: "🔴⚪" },
  { id: "md_chisinau", name: "Chișinău", level: "d3", countryId: "md", colors: "🔵🟡" },
  { id: "md_tiraspol", name: "Tiraspol", level: "d3", countryId: "md", colors: "🔴🟢" },
  { id: "md_balti", name: "Bălți", level: "d3", countryId: "md", colors: "🔵⚪" },
  { id: "md_bender", name: "Bender", level: "regional", countryId: "md", colors: "🔴⚪" },
  { id: "md_orhei", name: "Orhei", level: "regional", countryId: "md", colors: "🟢⚪" },
  { id: "lu_luxembourg", name: "Luxembourg", level: "d3", countryId: "lu", colors: "🔴🔵" },
  { id: "lu_esch", name: "Esch", level: "d3", countryId: "lu", colors: "🔴⚪" },
  { id: "lu_differdange", name: "Differdange", level: "d3", countryId: "lu", colors: "🟢⚪" },
  { id: "lu_dudelange", name: "Dudelange", level: "regional", countryId: "lu", colors: "🟡⚫" },
  { id: "lu_ettelbruck", name: "Ettelbruck", level: "regional", countryId: "lu", colors: "🔵⚪" },
  { id: "lv_riga", name: "Riga", level: "d3", countryId: "lv", colors: "🔴⚪" },
  { id: "lv_daugavpils", name: "Daugavpils", level: "d3", countryId: "lv", colors: "🔵⚪" },
  { id: "lv_liepaja", name: "Liepāja", level: "d3", countryId: "lv", colors: "🟢⚪" },
  { id: "lv_jelgava", name: "Jelgava", level: "regional", countryId: "lv", colors: "🟡🔵" },
  { id: "lv_ventspils", name: "Ventspils", level: "regional", countryId: "lv", colors: "🔵🟡" },
  { id: "lt_vilnius", name: "Vilnius", level: "d3", countryId: "lt", colors: "🟡🟢" },
  { id: "lt_kaunas", name: "Kaunas", level: "d3", countryId: "lt", colors: "🔵⚪" },
  { id: "lt_klaipeda", name: "Klaipėda", level: "d3", countryId: "lt", colors: "🔵🔴" },
  { id: "lt_siauliai", name: "Šiauliai", level: "regional", countryId: "lt", colors: "🟢⚪" },
  { id: "lt_panevezys", name: "Panevėžys", level: "regional", countryId: "lt", colors: "🔴⚪" },
  { id: "ee_tallinn", name: "Tallinn", level: "d3", countryId: "ee", colors: "🔵⚫" },
  { id: "ee_tartu", name: "Tartu", level: "d3", countryId: "ee", colors: "🔴⚪" },
  { id: "ee_narva", name: "Narva", level: "d3", countryId: "ee", colors: "🔵⚪" },
  { id: "ee_parnu", name: "Pärnu", level: "regional", countryId: "ee", colors: "🟢⚪" },
  { id: "ee_kohtla_jarve", name: "Kohtla-Järve", level: "regional", countryId: "ee", colors: "🟠⚫" },
  { id: "kz_astana", name: "Astana", level: "d3", countryId: "kz", colors: "🔵🟡" },
  { id: "kz_almaty", name: "Almaty", level: "d3", countryId: "kz", colors: "🔴⚪" },
  { id: "kz_chymkent", name: "Chymkent", level: "d3", countryId: "kz", colors: "🟢⚪" },
  { id: "kz_karaganda", name: "Karaganda", level: "regional", countryId: "kz", colors: "🔴⚫" },
  { id: "kz_aktobe", name: "Aktobe", level: "regional", countryId: "kz", colors: "🔴🟡" },
  { id: "by_minsk", name: "Minsk", level: "d3", countryId: "by", colors: "🔴🟢" },
  { id: "by_gomel", name: "Gomel", level: "d3", countryId: "by", colors: "🔵⚪" },
  { id: "by_grodno", name: "Grodno", level: "d3", countryId: "by", colors: "🔵🟡" },
  { id: "by_vitebsk", name: "Vitebsk", level: "regional", countryId: "by", colors: "🟡🔵" },
  { id: "by_moguilev", name: "Moguilev", level: "regional", countryId: "by", colors: "🔴⚪" },
  { id: "si_ljubljana", name: "Ljubljana", level: "d2", countryId: "si", colors: "🟢⚪" },
  { id: "si_maribor", name: "Maribor", level: "d2", countryId: "si", colors: "🟣🟡" },
  { id: "si_celje", name: "Celje", level: "d2", countryId: "si", colors: "🔵🟡" },
  { id: "si_koper", name: "Koper", level: "d3", countryId: "si", colors: "🟢⚪" },
  { id: "si_kranj", name: "Kranj", level: "d3", countryId: "si", colors: "🔵⚪" },
  { id: "is_reykjavik", name: "Reykjavik", level: "d2", countryId: "is", colors: "🔴⚪" },
  { id: "is_kopavogur", name: "Kópavogur", level: "d2", countryId: "is", colors: "🔵🟡" },
  { id: "is_hafnarfjor_ur", name: "Hafnarfjörður", level: "d2", countryId: "is", colors: "🔴⚫" },
  { id: "is_akureyri", name: "Akureyri", level: "d3", countryId: "is", colors: "🟡🔵" },
  { id: "is_keflavik", name: "Keflavík", level: "d3", countryId: "is", colors: "🔵⚪" },
  { id: "ge_tbilissi", name: "Tbilissi", level: "d2", countryId: "ge", colors: "🔴⚪" },
  { id: "ge_koutaissi", name: "Koutaïssi", level: "d2", countryId: "ge", colors: "🟡🟢" },
  { id: "ge_batoumi", name: "Batoumi", level: "d2", countryId: "ge", colors: "🔵⚪" },
  { id: "ge_roustavi", name: "Roustavi", level: "d3", countryId: "ge", colors: "🟠⚫" },
  { id: "ge_gori", name: "Gori", level: "d3", countryId: "ge", colors: "🔴⚫" },
  { id: "al_tirana", name: "Tirana", level: "d2", countryId: "al", colors: "🔵⚪" },
  { id: "al_durres", name: "Durrës", level: "d2", countryId: "al", colors: "🔴⚪" },
  { id: "al_vlora", name: "Vlora", level: "d2", countryId: "al", colors: "🔴⚫" },
  { id: "al_shkoder", name: "Shkodër", level: "d3", countryId: "al", colors: "🔴🔵" },
  { id: "al_elbasan", name: "Elbasan", level: "d3", countryId: "al", colors: "🟢⚪" },
  { id: "mk_skopje", name: "Skopje", level: "d2", countryId: "mk", colors: "🔴🟡" },
  { id: "mk_bitola", name: "Bitola", level: "d2", countryId: "mk", colors: "🔴⚪" },
  { id: "mk_koumanovo", name: "Koumanovo", level: "d2", countryId: "mk", colors: "🔵⚪" },
  { id: "mk_tetovo", name: "Tetovo", level: "d3", countryId: "mk", colors: "⚪⚫" },
  { id: "mk_ohrid", name: "Ohrid", level: "d3", countryId: "mk", colors: "🔵🟡" },
  { id: "gr_athenes", name: "Athènes", level: "d1", countryId: "gr", colors: "🔵⚪" },
  { id: "gr_thessalonique", name: "Thessalonique", level: "d1", countryId: "gr", colors: "⚫⚪" },
  { id: "gr_le_piree", name: "Le Pirée", level: "d1", countryId: "gr", colors: "🔴⚪" },
  { id: "gr_patras", name: "Patras", level: "d2", countryId: "gr", colors: "🔵⚪" },
  { id: "gr_heraklion", name: "Héraklion", level: "d2", countryId: "gr", colors: "🟢⚪" },
  { id: "dk_copenhague", name: "Copenhague", level: "d1", countryId: "dk", colors: "🔴⚪" },
  { id: "dk_aarhus", name: "Aarhus", level: "d1", countryId: "dk", colors: "⚪🔵" },
  { id: "dk_odense", name: "Odense", level: "d1", countryId: "dk", colors: "🔵⚪" },
  { id: "dk_aalborg", name: "Aalborg", level: "d2", countryId: "dk", colors: "🔴⚪" },
  { id: "dk_esbjerg", name: "Esbjerg", level: "d2", countryId: "dk", colors: "🔵⚫" },
  { id: "ro_bucarest", name: "Bucarest", level: "d1", countryId: "ro", colors: "🔴🔵" },
  { id: "ro_cluj", name: "Cluj", level: "d1", countryId: "ro", colors: "⚪🔴" },
  { id: "ro_craiova", name: "Craiova", level: "d1", countryId: "ro", colors: "⚪🔵" },
  { id: "ro_timisoara", name: "Timișoara", level: "d2", countryId: "ro", colors: "🟣⚪" },
  { id: "ro_iasi", name: "Iași", level: "d2", countryId: "ro", colors: "🔵⚪" },
  { id: "sk_bratislava", name: "Bratislava", level: "d1", countryId: "sk", colors: "🔵⚪" },
  { id: "sk_kosice", name: "Košice", level: "d1", countryId: "sk", colors: "⚪🔴" },
  { id: "sk_trnava", name: "Trnava", level: "d1", countryId: "sk", colors: "⚫⚪" },
  { id: "sk_zilina", name: "Žilina", level: "d2", countryId: "sk", colors: "🟢🟡" },
  { id: "sk_nitra", name: "Nitra", level: "d2", countryId: "sk", colors: "🔵⚪" },
  { id: "uy_montevideo", name: "Montevideo", level: "d1", countryId: "uy", colors: "🟢⚪" },
  { id: "uy_penarol", name: "Peñarol", level: "d1", countryId: "uy", colors: "🟡⚫" },
  { id: "uy_nacional", name: "Nacional", level: "d2", countryId: "uy", colors: "⚪🔵" },
  { id: "uy_maldonado", name: "Maldonado", level: "d2", countryId: "uy", colors: "🔴🟢" },
  { id: "cd_toutpuissant", name: "Tout Puissant", level: "d2", countryId: "cd", colors: "⚫⚪" },
  { id: "cd_aigles", name: "Aigles", level: "d2", countryId: "cd", colors: "⚪🔵" },
  { id: "cd_sainteloi", name: "Saint-Éloi", level: "d2", countryId: "cd", colors: "🔵⚪" },
  { id: "cd_kindu", name: "Kindu", level: "d2", countryId: "cd", colors: "🟡⚫" },
  { id: "cd_angeskinshasa", name: "Anges Kinshasa", level: "d3", countryId: "cd", colors: "🟢⚪" },
  { id: "cd_simba", name: "Simba", level: "d3", countryId: "cd", colors: "⚪🔴" },
  { id: "cd_dauphin", name: "Dauphin", level: "d3", countryId: "cd", colors: "🔵⚫" },
  { id: "tr_galata", name: "Galata", level: "d1", countryId: "tr", colors: "🔴🟡" },
  { id: "tr_fener", name: "Fener", level: "d1", countryId: "tr", colors: "🟡🔵" },
  { id: "tr_besiktas", name: "Beşiktaş", level: "d1", countryId: "tr", colors: "⚫⚪" },
  { id: "tr_trabzon", name: "Trabzon", level: "d1", countryId: "tr", colors: "🔵🔴" },
  { id: "tr_basaksehir", name: "Başakşehir", level: "d1", countryId: "tr", colors: "🔵🟠" },
  { id: "tr_konya", name: "Konya", level: "d2", countryId: "tr", colors: "🟢⚪" },
  { id: "tr_sivas", name: "Sivas", level: "d2", countryId: "tr", colors: "🔴⚪" },
  { id: "tr_antalya", name: "Antalya", level: "d2", countryId: "tr", colors: "🔴⚪" },
  { id: "tr_kayseri", name: "Kayseri", level: "d3", countryId: "tr", colors: "🔴🟡" },
  { id: "tr_gaziantep", name: "Gaziantep", level: "d3", countryId: "tr", colors: "🔴⚫" },
  { id: "tr_rizespor", name: "Rizespor", level: "d3", countryId: "tr", colors: "🟢🔵" },
  { id: "sa_riyad", name: "Riyad", level: "d1", countryId: "sa", colors: "🔵" },
  { id: "sa_jeddah", name: "Djeddah", level: "d1", countryId: "sa", colors: "⚫🟡" },
  { id: "sa_dammam", name: "Dammam", level: "d1", countryId: "sa", colors: "🟢⚪" },
  { id: "sa_mecque", name: "La Mecque", level: "d2", countryId: "sa", colors: "🔴⚪" },
  { id: "sa_medine", name: "Médine", level: "d2", countryId: "sa", colors: "🟡🟢" },
  { id: "qa_doha", name: "Doha", level: "d1", countryId: "qa", colors: "🟤⚪" },
  { id: "qa_rayyan", name: "Al-Rayyan", level: "d1", countryId: "qa", colors: "🔴⚫" },
  { id: "qa_wakrah", name: "Al-Wakrah", level: "d1", countryId: "qa", colors: "🔵⚪" },
  { id: "qa_lusail", name: "Lusail", level: "d2", countryId: "qa", colors: "🟡⚫" },
  { id: "qa_khor", name: "Al-Khor", level: "d2", countryId: "qa", colors: "🟢⚪" },
  { id: "ir_teheran", name: "Téhéran", level: "d1", countryId: "ir", colors: "🔴⚪" },
  { id: "ir_ispahan", name: "Ispahan", level: "d1", countryId: "ir", colors: "🔵⚪" },
  { id: "ir_tabriz", name: "Tabriz", level: "d1", countryId: "ir", colors: "🔴🔵" },
  { id: "ir_chiraz", name: "Chiraz", level: "d2", countryId: "ir", colors: "🟢⚪" },
  { id: "ir_machhad", name: "Machhad", level: "d2", countryId: "ir", colors: "🟡⚫" },
  { id: "at_vienne", name: "Vienne", level: "d1", countryId: "at", colors: "🟣⚪" },
  { id: "at_salzbourg", name: "Salzbourg", level: "d1", countryId: "at", colors: "🔴⚪" },
  { id: "at_graz", name: "Graz", level: "d1", countryId: "at", colors: "🔵⚪" },
  { id: "at_linz", name: "Linz", level: "d2", countryId: "at", colors: "⚫⚪" },
  { id: "at_innsbruck", name: "Innsbruck", level: "d2", countryId: "at", colors: "🟢⚪" },
  { id: "ec_quito", name: "Quito", level: "d2", countryId: "ec", colors: "🔵⚪" },
  { id: "ec_guayaquil", name: "Guayaquil", level: "d2", countryId: "ec", colors: "🟡⚫" },
  { id: "ec_cuenca", name: "Cuenca", level: "d2", countryId: "ec", colors: "🔴⚪" },
  { id: "ec_ambato", name: "Ambato", level: "d3", countryId: "ec", colors: "🔴🔵" },
  { id: "ec_manta", name: "Manta", level: "d3", countryId: "ec", colors: "🟢⚪" },
  { id: "ua_kyiv", name: "Kyiv", level: "d1", countryId: "ua", colors: "🔵⚪" },
  { id: "ua_kharkiv", name: "Kharkiv", level: "d1", countryId: "ua", colors: "🔵🟡" },
  { id: "ua_lviv", name: "Lviv", level: "d1", countryId: "ua", colors: "🟡⚫" },
  { id: "ua_dnipro", name: "Dnipro", level: "d2", countryId: "ua", colors: "🔵⚪" },
  { id: "ua_odessa", name: "Odessa", level: "d2", countryId: "ua", colors: "⚫🟡" },
  { id: "ru_moscou", name: "Moscou", level: "d1", countryId: "ru", colors: "🔴⚪" },
  { id: "ru_saintpetersbourg", name: "Saint-Pétersbourg", level: "d1", countryId: "ru", colors: "🔵⚪" },
  { id: "ru_kazan", name: "Kazan", level: "d1", countryId: "ru", colors: "🟢⚪" },
  { id: "ru_sotchi", name: "Sotchi", level: "d2", countryId: "ru", colors: "⚫🔵" },
  { id: "ru_rostov", name: "Rostov", level: "d2", countryId: "ru", colors: "🟡🔵" },
  { id: "wal_cardiff", name: "Cardiff", level: "d2", countryId: "wal", colors: "🔵⚪" },
  { id: "wal_swansea", name: "Swansea", level: "d2", countryId: "wal", colors: "⚪⚫" },
  { id: "wal_newport", name: "Newport", level: "d2", countryId: "wal", colors: "🟡⚫" },
  { id: "wal_merthyr", name: "Merthyr", level: "d3", countryId: "wal", colors: "🔴⚪" },
  { id: "wal_bangor", name: "Bangor", level: "d3", countryId: "wal", colors: "🔵⚫" },
  { id: "rs_belgrade", name: "Belgrade", level: "d1", countryId: "rs", colors: "🔴⚪" },
  { id: "rs_novisad", name: "Novi Sad", level: "d1", countryId: "rs", colors: "🔵⚪" },
  { id: "rs_nis", name: "Niš", level: "d1", countryId: "rs", colors: "🟣⚪" },
  { id: "rs_kragujevac", name: "Kragujevac", level: "d2", countryId: "rs", colors: "🔴⚫" },
  { id: "rs_subotica", name: "Subotica", level: "d2", countryId: "rs", colors: "🟡🔵" },
  { id: "hu_budapest", name: "Budapest", level: "d1", countryId: "hu", colors: "🟢⚪" },
  { id: "hu_debrecen", name: "Debrecen", level: "d1", countryId: "hu", colors: "🔴⚪" },
  { id: "hu_szeged", name: "Szeged", level: "d1", countryId: "hu", colors: "🔵⚫" },
  { id: "hu_gyor", name: "Győr", level: "d2", countryId: "hu", colors: "🟢⚫" },
  { id: "hu_pecs", name: "Pécs", level: "d2", countryId: "hu", colors: "🔴🔵" },
  { id: "sco_glasgow", name: "Glasgow", level: "d1", countryId: "sco", colors: "🟢⚪" },
  { id: "sco_edimbourg", name: "Édimbourg", level: "d1", countryId: "sco", colors: "🔴⚪" },
  { id: "sco_aberdeen", name: "Aberdeen", level: "d1", countryId: "sco", colors: "🔴⚪" },
  { id: "sco_dundee", name: "Dundee", level: "d2", countryId: "sco", colors: "🔵⚪" },
  { id: "sco_inverness", name: "Inverness", level: "d2", countryId: "sco", colors: "🔵🔴" },
  { id: "ie_dublin", name: "Dublin", level: "d2", countryId: "ie", colors: "🔵⚪" },
  { id: "ie_cork", name: "Cork", level: "d2", countryId: "ie", colors: "🔴⚪" },
  { id: "ie_limerick", name: "Limerick", level: "d2", countryId: "ie", colors: "🟢⚪" },
  { id: "ie_galway", name: "Galway", level: "d3", countryId: "ie", colors: "🟤⚪" },
  { id: "ie_waterford", name: "Waterford", level: "d3", countryId: "ie", colors: "🔵⚫" },
  { id: "nir_belfast", name: "Belfast", level: "d2", countryId: "nir", colors: "🔴⚪" },
  { id: "nir_derry", name: "Derry", level: "d2", countryId: "nir", colors: "🔴⚪" },
  { id: "nir_lisburn", name: "Lisburn", level: "d2", countryId: "nir", colors: "🔵⚪" },
  { id: "nir_newry", name: "Newry", level: "d3", countryId: "nir", colors: "🟡⚫" },
  { id: "nir_armagh", name: "Armagh", level: "d3", countryId: "nir", colors: "🟠⚫" },
  { id: "ve_caracas", name: "Caracas", level: "d2", countryId: "ve", colors: "🔴⚪" },
  { id: "ve_maracaibo", name: "Maracaibo", level: "d2", countryId: "ve", colors: "🔵⚫" },
  { id: "ve_barquisimeto", name: "Barquisimeto", level: "d2", countryId: "ve", colors: "🔴⚫" },
  { id: "ve_maracay", name: "Maracay", level: "d3", countryId: "ve", colors: "🟡🔵" },
  { id: "ve_barinas", name: "Barinas", level: "d3", countryId: "ve", colors: "🟢⚪" },
  { id: "cz_prague", name: "Prague", level: "d1", countryId: "cz", colors: "🔴⚪" },
  { id: "cz_brno", name: "Brno", level: "d1", countryId: "cz", colors: "🔵⚪" },
  { id: "cz_ostrava", name: "Ostrava", level: "d1", countryId: "cz", colors: "🔵⚫" },
  { id: "cz_plzen", name: "Plzeň", level: "d2", countryId: "cz", colors: "🔴🔵" },
  { id: "cz_liberec", name: "Liberec", level: "d2", countryId: "cz", colors: "🔵⚪" },
  { id: "us_losangeles", name: "Los Angeles", level: "d1", countryId: "us", colors: "🔵🟡" },
  { id: "us_seattle", name: "Seattle", level: "d1", countryId: "us", colors: "🔵🟢" },
  { id: "us_miami", name: "Miami", level: "d1", countryId: "us", colors: "🩷⚫" },
  { id: "us_atlanta", name: "Atlanta", level: "d1", countryId: "us", colors: "🔴⚫" },
  { id: "us_newyork", name: "New York", level: "d1", countryId: "us", colors: "🔵🟠" },
  { id: "us_portland", name: "Portland", level: "d1", countryId: "us", colors: "🟢⚫" },
  { id: "us_cincinnati", name: "Cincinnati", level: "d1", countryId: "us", colors: "🔵🟠" },
  { id: "us_austin", name: "Austin", level: "d1", countryId: "us", colors: "🟢⚫" },
  { id: "us_nashville", name: "Nashville", level: "d2", countryId: "us", colors: "🟡🔵" },
  { id: "us_sacramento", name: "Sacramento", level: "d2", countryId: "us", colors: "🟣⚪" },
  { id: "us_sanantonio", name: "San Antonio", level: "d2", countryId: "us", colors: "🔵⚪" },
  { id: "us_louisville", name: "Louisville", level: "d2", countryId: "us", colors: "🟣⚪" },
  { id: "us_tampa", name: "Tampa Bay", level: "d2", countryId: "us", colors: "🔴🟡" },
  { id: "us_detroit", name: "Detroit", level: "d3", countryId: "us", colors: "🔴⚪" },
  { id: "us_oakland", name: "Oakland", level: "d3", countryId: "us", colors: "🟢⚫" },
  { id: "us_phoenix", name: "Phoenix", level: "d3", countryId: "us", colors: "🔴⚫" },
  { id: "us_chattanooga", name: "Chattanooga", level: "d3", countryId: "us", colors: "🔵⚪" },
  { id: "eg_caire", name: "Le Caire", level: "d1", countryId: "eg", colors: "🔴⚪" },
  { id: "eg_alexandrie", name: "Alexandrie", level: "d1", countryId: "eg", colors: "⚪🔴" },
  { id: "eg_gizeh", name: "Gizeh", level: "d1", countryId: "eg", colors: "🔵⚪" },
  { id: "eg_ismailia", name: "Ismaïlia", level: "d2", countryId: "eg", colors: "🟢⚪" },
  { id: "eg_portsaid", name: "Port-Saïd", level: "d2", countryId: "eg", colors: "🟢🔴" },
  { id: "za_joburg", name: "Johannesburg", level: "d1", countryId: "za", colors: "🟡🔵" },
  { id: "za_lecap", name: "Le Cap", level: "d1", countryId: "za", colors: "⚫⚪" },
  { id: "za_pretoria", name: "Pretoria", level: "d1", countryId: "za", colors: "🟡⚫" },
  { id: "za_durban", name: "Durban", level: "d2", countryId: "za", colors: "🔵⚪" },
  { id: "za_soweto", name: "Soweto", level: "d2", countryId: "za", colors: "🔴⚪" },
  { id: "ba_sarajevo", name: "Sarajevo", level: "d1", countryId: "ba", colors: "🔴🟡" },
  { id: "ba_mostar", name: "Mostar", level: "d1", countryId: "ba", colors: "🔵⚪" },
  { id: "ba_banjaluka", name: "Banja Luka", level: "d1", countryId: "ba", colors: "🔴⚪" },
  { id: "ba_tuzla", name: "Tuzla", level: "d2", countryId: "ba", colors: "🔵🟡" },
  { id: "ba_zenica", name: "Zenica", level: "d2", countryId: "ba", colors: "🟣⚪" },
  { id: "py_asuncin", name: "Asunción", level: "d2", countryId: "py", colors: "🔴🔵" },
  { id: "py_ciudaddeleste", name: "Ciudad del Este", level: "d2", countryId: "py", colors: "🟢⚪" },
  { id: "py_luque", name: "Luque", level: "d2", countryId: "py", colors: "🔵🟡" },
  { id: "py_lambare", name: "Lambaré", level: "d3", countryId: "py", colors: "🔵⚪" },
  { id: "py_encarnacin", name: "Encarnación", level: "d3", countryId: "py", colors: "🔴⚪" },
  { id: "cl_santiago", name: "Santiago", level: "d1", countryId: "cl", colors: "🔴⚪" },
  { id: "cl_valparaso", name: "Valparaíso", level: "d1", countryId: "cl", colors: "🟡⚫" },
  { id: "cl_concepcin", name: "Concepción", level: "d1", countryId: "cl", colors: "🟣⚪" },
  { id: "cl_antofagasta", name: "Antofagasta", level: "d2", countryId: "cl", colors: "🔵🟡" },
  { id: "cl_laserena", name: "La Serena", level: "d2", countryId: "cl", colors: "🔴🟡" },
  { id: "ca_toronto", name: "Toronto", level: "d2", countryId: "ca", colors: "🔴⚪" },
  { id: "ca_montral", name: "Montréal", level: "d2", countryId: "ca", colors: "🔵⚫" },
  { id: "ca_vancouver", name: "Vancouver", level: "d2", countryId: "ca", colors: "🔵🟢" },
  { id: "ca_ottawa", name: "Ottawa", level: "d3", countryId: "ca", colors: "🔴⚫" },
  { id: "ca_calgary", name: "Calgary", level: "d3", countryId: "ca", colors: "🔴🟡" },
  { id: "sv_sansalvador", name: "San Salvador", level: "d3", countryId: "sv", colors: "🔵⚪" },
  { id: "sv_santaana", name: "Santa Ana", level: "d3", countryId: "sv", colors: "🔴⚪" },
  { id: "sv_sanmiguel", name: "San Miguel", level: "d3", countryId: "sv", colors: "🟢⚪" },
  { id: "sv_sonsonate", name: "Sonsonate", level: "regional", countryId: "sv", colors: "🟡🔵" },
  { id: "sv_lalibertad", name: "La Libertad", level: "regional", countryId: "sv", colors: "🔵🟡" },
  { id: "ao_luanda", name: "Luanda", level: "d2", countryId: "ao", colors: "🔴⚫" },
  { id: "ao_huambo", name: "Huambo", level: "d2", countryId: "ao", colors: "🔵⚪" },
  { id: "ao_lobito", name: "Lobito", level: "d2", countryId: "ao", colors: "🟢⚪" },
  { id: "ao_benguela", name: "Benguela", level: "d3", countryId: "ao", colors: "🟡🔴" },
  { id: "ao_namibe", name: "Namibe", level: "d3", countryId: "ao", colors: "🔵🟡" },
  { id: "mg_antananarivo", name: "Antananarivo", level: "d3", countryId: "mg", colors: "🔴⚪" },
  { id: "mg_toamasina", name: "Toamasina", level: "d3", countryId: "mg", colors: "🔵🟡" },
  { id: "mg_antsirabe", name: "Antsirabe", level: "d3", countryId: "mg", colors: "🟢⚪" },
  { id: "mg_mahajanga", name: "Mahajanga", level: "regional", countryId: "mg", colors: "🟠⚫" },
  { id: "mg_fianarantsoa", name: "Fianarantsoa", level: "regional", countryId: "mg", colors: "🔴🟢" },
  { id: "ng_lagos", name: "Lagos", level: "d1", countryId: "ng", colors: "🟢⚪" },
  { id: "ng_abuja", name: "Abuja", level: "d1", countryId: "ng", colors: "🔵⚪" },
  { id: "ng_kano", name: "Kano", level: "d1", countryId: "ng", colors: "🔴🟢" },
  { id: "ng_ibadan", name: "Ibadan", level: "d2", countryId: "ng", colors: "🟡⚫" },
  { id: "ng_enugu", name: "Enugu", level: "d2", countryId: "ng", colors: "🔴⚫" },
  { id: "jp_tokyo", name: "Tokyo", level: "d1", countryId: "jp", colors: "🔵" },
  { id: "jp_fukushima", name: "Fukushima", level: "d1", countryId: "jp" },
  { id: "jp_sendai", name: "Sendai", level: "d1", countryId: "jp", colors: "🟡🔵" },
  { id: "jp_kyoto", name: "Kyoto", level: "d2", countryId: "jp", colors: "🟣" },
  { id: "jp_osaka", name: "Osaka", level: "d2", countryId: "jp" },
];

const CLUBS_BY_LEVEL = LEVEL_ORDER.reduce((acc, lvl) => {
  acc[lvl] = CLUBS.filter((c) => c.level === lvl);
  return acc;
}, {}); // construit dynamiquement pour tous les niveaux (regional, d3, d2, d1, elite)

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

/* ============================================================
   MOMENTS DÉCISIFS — séquences interactives des très grands
   matchs. Variante "field" (joueur de champ, tireur) et "gk"
   (gardien, séance de tirs au but). base = proba de réussite,
   modulée par technique/mental/sang froid dans engine.js.
   repWin/repFail : réputation en jeu au-delà du résultat.
   ============================================================ */
const KEY_MOMENTS = {
  // Chemin du retour après une grosse blessure. Le choix module la dette de
  // récupération (chronicWeeks) : prudence = moins de rechute, retour forcé =
  // pari risqué. recover = semaines de dette effacées si succès ; setback =
  // semaines ajoutées si échec.
  injury: {
    any: [{
      title: "LE CHEMIN DU RETOUR",
      text: "Le diagnostic est tombé, la saison est brisée. Sur la table de rééducation, tout se rejoue : votre corps, votre carrière, votre mental. Comment revenez-vous ?",
      options: [
        { id: "cautious", label: "Rééducation prudente, respecter chaque étape", hint: "Sûr", base: 0.86, recover: 14, setback: 4 },
        { id: "protocol", label: "Protocole médical de pointe", hint: "Coûteux", base: 0.72, recover: 10, setback: 8, repWin: 2 },
        { id: "rush", label: "Revenir au plus vite, coûte que coûte", hint: "Risqué", base: 0.5, recover: 6, setback: 16, repWin: 4, repFail: -4 },
      ],
      winText: "Le retour est réussi : les jambes répondent, la tête aussi. Vous revoilà sur les terrains, plus déterminé que jamais.",
      failText: "Rechute cruelle : le corps lâche encore. Le chemin du retour s'allonge, et le doute s'installe.",
    }],
  },
  wc_final: {
    field: [{
      title: "FINALE DE LA COUPE DU MONDE",
      text: "120e minute, 3-3 au terme d'une finale irrespirable. Penalty décisif pour {nat}. Un milliard et demi de téléspectateurs. Le ballon est posé — c'est vous qui le tirez.",
      options: [
        { id: "placed", label: "Tir placé, assurer l'essentiel", hint: "Sûr", base: 0.74 },
        { id: "power", label: "Frappe de mule sous la barre", hint: "Puissant", base: 0.62, repWin: 3 },
        { id: "corner", label: "Croisé pied ouvert, petit filet", base: 0.66, repWin: 2 },
        { id: "panenka", label: "Panenka", hint: "Légendaire", base: 0.44, repWin: 10, repFail: -8, traitWin: "showman" },
      ],
      winText: "AU FOND !!! Le stade explose, votre nation est CHAMPIONNE DU MONDE — et c'est vous qui l'avez envoyée au paradis !",
      failText: "Arrêté… Le gardien adverse s'envole vers la gloire, et votre nation s'incline au bout de la nuit. Cette image vous hantera.",
    }, {
      title: "FINALE DE LA COUPE DU MONDE",
      text: "118e minute, 2-2. Vous récupérez le ballon à quarante mètres du but adverse, trois défenseurs en face, le monde entier debout.",
      options: [
        { id: "solo", label: "Partir en solo, dribbler le monde", hint: "Légendaire", base: 0.4, repWin: 10, repFail: -5 },
        { id: "longshot", label: "Armer la frappe de quarante mètres", hint: "Folie", base: 0.34, repWin: 12, repFail: -6, traitWin: "showman" },
        { id: "combo", label: "Jouer le une-deux et surgir dans la surface", base: 0.58, repWin: 4 },
        { id: "draw", label: "Provoquer la faute aux abords de la surface", hint: "Malin", base: 0.52, repWin: 3 },
      ],
      winText: "L'ACTION D'UNE VIE !!! Le but qui offre la Coupe du Monde à votre nation — les images repasseront pendant un siècle !",
      failText: "L'action s'éteint dans la défense adverse… puis le contre fatal tombe côté opposé. Champions du monde : les autres.",
    }],
    mil: {
      title: "FINALE DE LA COUPE DU MONDE",
      text: "116e minute, 2-2. La dernière vraie possession du match arrive dans vos pieds, au milieu du terrain. Tout le monde est cuit — sauf vous, peut-être.",
      options: [
        { id: "vertical", label: "Tenter la passe verticale qui tue", hint: "Risqué", base: 0.48, repWin: 6, repFail: -3 },
        { id: "longshot", label: "Frapper de trente-cinq mètres", hint: "Folie", base: 0.35, repWin: 11, repFail: -5, traitWin: "showman" },
        { id: "control", label: "Contrôler le tempo et viser les tirs au but", hint: "Froid", base: 0.6, repWin: 2 },
        { id: "overlap", label: "Lancer le surnombre côté faible", base: 0.55, repWin: 4 },
      ],
      winText: "VOTRE geste décide de la finale ! Champion du monde en dictant le tempo jusqu'à la dernière seconde !",
      failText: "La perte de balle de trop… le contre adverse est fatal. Le milieu de terrain porte la défaite sur ses épaules.",
    },
    def: {
      title: "FINALE DE LA COUPE DU MONDE",
      text: "119e minute, 2-2. Leur attaquant star part seul au but — vous êtes le dernier rempart de toute une nation.",
      options: [
        { id: "tackle", label: "Le tacle parfait, à pleine vitesse", hint: "Quitte ou double", base: 0.46, repWin: 8, repFail: -5 },
        { id: "delay", label: "Temporiser et l'emmener loin du but", hint: "Malin", base: 0.58, repWin: 3 },
        { id: "foul", label: "La faute tactique — rouge assumé", hint: "Sacrifice", base: 0.64, repWin: 2, repFail: -4 },
        { id: "trust", label: "Faire confiance à votre gardien", base: 0.42, repWin: 5 },
      ],
      winText: "L'INTERVENTION D'UNE VIE ! Vous sauvez la nation, puis le titre arrive aux tirs au but : CHAMPIONS DU MONDE !",
      failText: "Battu sur l'action décisive… Le but tombe, et la finale s'écroule dans votre dos. Cruel, injuste, inoubliable.",
    },
    gk: {
      title: "FINALE DE LA COUPE DU MONDE",
      text: "Séance de tirs au but de la finale. 4-4 : le dernier tireur adverse s'avance. S'il rate, vous êtes champions du monde. Tout repose sur vos gants.",
      options: [
        { id: "read", label: "Lire ses appuis jusqu'au bout", hint: "Patient", base: 0.5 },
        { id: "early", label: "Partir tôt sur son côté fort", base: 0.44, repWin: 2 },
        { id: "center", label: "Rester planté au centre", hint: "Culotté", base: 0.4, repWin: 6, repFail: -4 },
        { id: "mind", label: "Le déstabiliser : retarder, fixer, sourire", hint: "Guerre des nerfs", base: 0.46, repWin: 4, traitWin: "clutch" },
      ],
      winText: "QUEL ARRÊT !!! Vous détournez le tir et disparaissez sous une marée de coéquipiers : CHAMPIONS DU MONDE grâce à VOUS !",
      failText: "Le ballon file à l'opposé de votre plongeon. La plus cruelle des loteries vient de choisir son camp.",
    },
  },
  cup_final: {
    field: [{
      title: "FINALE DE LA COUPE NATIONALE",
      text: "90e minute de la finale, 1-1. Penalty pour {club} — le trophée au bout du pied, un stade entier qui n'ose plus respirer.",
      options: [
        { id: "placed", label: "Tir placé, assurer l'essentiel", hint: "Sûr", base: 0.72 },
        { id: "power", label: "Frappe sous la barre", hint: "Puissant", base: 0.6, repWin: 2 },
        { id: "corner", label: "Croisé pied ouvert", base: 0.65, repWin: 2 },
        { id: "panenka", label: "Panenka", hint: "Légendaire", base: 0.42, repWin: 8, repFail: -6, traitWin: "showman" },
      ],
      winText: "AU FOND ! La coupe est à vous, et cette image de vous ballon posé, seul face au destin, fera les couvertures !",
      failText: "Le gardien s'envole et détourne… La coupe s'échappe dans les dernières secondes, et le silence est assourdissant.",
    }, {
      title: "FINALE DE LA COUPE NATIONALE",
      text: "Contre à deux contre un à la 88e de la finale, 1-1. Vous portez le ballon, un coéquipier hurle à votre gauche, le défenseur recule.",
      options: [
        { id: "selfish", label: "Y aller seul et frapper", hint: "Ego", base: 0.5, repWin: 5, repFail: -4 },
        { id: "give", label: "Servir le coéquipier au bon moment", hint: "Collectif", base: 0.68, repWin: 2 },
        { id: "feint", label: "Feinter la passe et repiquer", base: 0.52, repWin: 4, repFail: -2 },
        { id: "wait", label: "Casser le rythme et attendre le surnombre", base: 0.6, repWin: 1 },
      ],
      winText: "Le contre parfait ! La coupe se soulève ce soir, et la dernière action porte votre signature !",
      failText: "Le contre se meurt, la finale glisse aux tirs au but… perdus. Les détails, toujours les détails.",
    }],
    mil: [{
      title: "FINALE DE LA COUPE NATIONALE",
      text: "88e minute de la finale, 1-1. Le jeu passe par vous : accélérer et prendre le risque, ou verrouiller et attendre ?",
      options: [
        { id: "killer", label: "La passe entre les lignes qui tue", hint: "Risqué", base: 0.5, repWin: 5, repFail: -2 },
        { id: "longshot", label: "Frapper de loin, au culot", base: 0.42, repWin: 6, repFail: -3 },
        { id: "tempo", label: "Geler le jeu et viser la prolongation", hint: "Froid", base: 0.62, repWin: 1 },
        { id: "corner_run", label: "Provoquer et obtenir le coup de pied arrêté", base: 0.56, repWin: 3 },
      ],
      winText: "Votre lecture du money-time offre la coupe à {club} ! Le chef d'orchestre a joué sa plus belle partition.",
      failText: "Le choix ne paie pas… et la coupe s'échappe dans les dernières minutes. Les regrets dureront tout l'été.",
    }, {
      title: "FINALE DE LA COUPE NATIONALE",
      text: "Finale, 1-0 pour {club}, dix dernières minutes interminables. Le coach vous hurle de tuer le match — à vous d'inventer comment.",
      options: [
        { id: "corner_poteau", label: "Emmener le ballon mourir au poteau de corner", hint: "Vicieux", base: 0.64, repWin: 2 },
        { id: "keepball", label: "Confisquer le ballon, passe après passe", hint: "Toro", base: 0.56, repWin: 3 },
        { id: "kill", label: "Chercher le 2-0 pour plier l'affaire", base: 0.46, repWin: 5, repFail: -3 },
        { id: "foul_smart", label: "Hacher le rythme par des fautes malignes", base: 0.6, repWin: 1, repFail: -2 },
      ],
      winText: "Le match meurt exactement là où vous l'avez décidé : LA COUPE ! Le sale boulot aussi fait les légendes.",
      failText: "Le ballon vous échappe une fois de trop… égalisation, prolongation, effondrement. La coupe s'envole.",
    }],
    def: [{
      title: "FINALE DE LA COUPE NATIONALE",
      text: "90e+3 de la finale, {club} mène d'un but. Dernier corner adverse, leur gardien monte, la surface est une jungle.",
      options: [
        { id: "mark", label: "Prendre leur meilleure tête au marquage", base: 0.58, repWin: 3 },
        { id: "clear", label: "Attaquer le ballon au premier poteau", hint: "Tranchant", base: 0.5, repWin: 5, repFail: -3 },
        { id: "zone", label: "Organiser la zone et hurler les consignes", base: 0.62, repWin: 2, traitWin: "leader" },
        { id: "counter", label: "Rester haut pour jouer le contre", hint: "Joueur", base: 0.44, repWin: 6, repFail: -3 },
      ],
      winText: "Le ballon est dégagé, l'arbitre siffle : LA COUPE ! Une victoire défendue jusqu'au dernier centimètre.",
      failText: "L'égalisation tombe sur ce dernier corner… puis tout s'écroule. La coupe s'envole au pire moment.",
    }, {
      title: "FINALE DE LA COUPE NATIONALE",
      text: "Toute la finale se résume à un duel : leur attaquant vedette contre vous. Chaque ballon dans votre zone est une finale dans la finale.",
      options: [
        { id: "stick", label: "Le marquer à la culotte, 90 minutes durant", hint: "Duel d'hommes", base: 0.55, repWin: 5, repFail: -3 },
        { id: "intimidate", label: "L'intimider dès le premier contact", hint: "Rugueux", base: 0.48, repWin: 4, repFail: -4 },
        { id: "anticipate", label: "Jouer l'anticipation et couper les passes", hint: "Cérébral", base: 0.58, repWin: 4 },
        { id: "team", label: "Organiser un double rideau avec le milieu", hint: "Collectif", base: 0.62, repWin: 2 },
      ],
      winText: "Leur star n'a pas existé : la coupe est à vous, et votre masterclass défensive fait le tour des analyses vidéo !",
      failText: "Un éclair de génie adverse suffit… La star a gagné le duel, et la coupe est partie avec elle.",
    }],
    gk: [{
      title: "FINALE DE LA COUPE NATIONALE",
      text: "Séance de tirs au but de la finale. Un arrêt et {club} soulève la coupe. Le tireur s'élance…",
      options: [
        { id: "read", label: "Lire ses appuis jusqu'au bout", hint: "Patient", base: 0.5 },
        { id: "early", label: "Partir tôt sur son côté fort", base: 0.44 },
        { id: "center", label: "Rester au centre", hint: "Culotté", base: 0.4, repWin: 5, repFail: -3 },
        { id: "mind", label: "Gagner la guerre des nerfs", base: 0.46, repWin: 3, traitWin: "clutch" },
      ],
      winText: "L'ARRÊT ! Vous repoussez le tir et la coupe est à vous — les photographes n'ont d'yeux que pour vos gants !",
      failText: "Pris à contre-pied. La coupe file dans d'autres mains, à un gant près.",
    }, {
      title: "FINALE DE LA COUPE NATIONALE",
      text: "90e minute de la finale, 1-0 pour {club}… et leur attaquant surgit seul face à vous. Un arrêt, et la coupe est dans vos gants.",
      options: [
        { id: "rush", label: "Sortir vite et étouffer l'angle", base: 0.52, repWin: 4, repFail: -2 },
        { id: "stand", label: "Rester grand le plus longtemps possible", hint: "Patient", base: 0.56, repWin: 3 },
        { id: "feint", label: "Feinter la sortie pour forcer sa décision", hint: "Joueur d'échecs", base: 0.46, repWin: 6, repFail: -3 },
        { id: "close", label: "Fermer le petit filet et parier sur le croisé", base: 0.5, repWin: 4 },
      ],
      winText: "FACE-À-FACE GAGNÉ ! Le dernier rempart offre la coupe à {club} — les gants en or de la soirée !",
      failText: "L'attaquant ne tremble pas… Égalisation, puis naufrage. Si près des gants, si loin de la coupe.",
    }],
  },
  derby: {
    att: [{
      title: "LE DERBY",
      text: "90e minute du derby, égalité. Vous voilà seul face au gardien, tout un virage en apnée derrière le but.",
      options: [
        { id: "shoot", label: "Fusiller le gardien", base: 0.55, repWin: 4, repFail: -3 },
        { id: "lob", label: "Tenter le lob", hint: "Panache", base: 0.4, repWin: 7, repFail: -4, traitWin: "showman" },
        { id: "round", label: "Dribbler le gardien", base: 0.46, repWin: 5, repFail: -3 },
        { id: "pass", label: "Servir un coéquipier démarqué", hint: "Collectif", base: 0.66, repWin: 2 },
      ],
      winText: "LE BUT DU DERBY ! La moitié de la ville chantera votre nom toute la semaine.",
      failText: "L'occasion du derby s'envole… et le match avec. L'autre moitié de la ville ne vous laissera pas l'oublier.",
    }, {
      title: "LE DERBY",
      text: "Penalty pour vous à la 88e du derby, 1-1. Le tireur attitré s'avance déjà… mais c'est VOTRE derby, et le virage scande votre nom.",
      options: [
        { id: "take", label: "Prendre le ballon : ce penalty est à vous", hint: "Autorité", base: 0.55, repWin: 5, repFail: -4 },
        { id: "leave", label: "Laisser le tireur attitré", hint: "Collectif", base: 0.7, repWin: 1 },
        { id: "panenka", label: "Le prendre… et tenter la panenka", hint: "Légendaire", base: 0.4, repWin: 8, repFail: -6, traitWin: "showman" },
        { id: "power", label: "Le prendre et frapper en force", base: 0.5, repWin: 4, repFail: -3 },
      ],
      winText: "Le penalty du derby est au fond ! La ville entière connaît le nom du patron.",
      failText: "Raté… Le derby s'échappe, et votre prise de pouvoir se transforme en procès public.",
    }],
    mil: [{
      title: "LE DERBY",
      text: "Dernière minute du derby, le ballon vous arrive à trente mètres. Le bloc adverse est massif, le stade hurle : il faut décider, maintenant.",
      options: [
        { id: "longshot", label: "Tenter la frappe de trente mètres", hint: "Panache", base: 0.42, repWin: 7, repFail: -3 },
        { id: "killer", label: "Chercher la passe qui tue entre les lignes", base: 0.52, repWin: 4, repFail: -2 },
        { id: "tempo", label: "Garder le ballon et faire monter le bloc", hint: "Maîtrise", base: 0.64, repWin: 2 },
        { id: "voice", label: "Haranguer le public et l'équipe", base: 0.55, repWin: 2, traitWin: "leader" },
      ],
      winText: "Votre geste décide du derby dans les dernières secondes ! Toute la ville en parlera pendant des mois.",
      failText: "Le choix ne paie pas, le derby file. Les réseaux sociaux, eux, n'oublient jamais.",
    }, {
      title: "LE DERBY",
      text: "Récupération très haute à la 90e du derby : contre à trois contre deux, et c'est vous qui portez le ballon.",
      options: [
        { id: "through", label: "Lancer l'ailier dans la profondeur", base: 0.6, repWin: 3 },
        { id: "carry", label: "Porter jusqu'à la surface et décider au dernier moment", base: 0.5, repWin: 5, repFail: -2 },
        { id: "shoot", label: "Frapper dès l'entrée de surface", base: 0.46, repWin: 5, repFail: -3 },
        { id: "slow", label: "Casser le contre et sécuriser le nul", hint: "Froid", base: 0.66, repWin: 1 },
      ],
      winText: "Le contre parfait, mené de bout en bout : le derby bascule sur VOTRE inspiration !",
      failText: "Le contre avorte… et sur l'action suivante, le derby vous poignarde. Impardonnable, disent les ultras.",
    }],
    def: [{
      title: "LE DERBY",
      text: "Contre éclair adverse à la 89e du derby : leur star file seule vers votre but, vous êtes le dernier rempart.",
      options: [
        { id: "tackle", label: "Tacler à pleine vitesse", hint: "Quitte ou double", base: 0.48, repWin: 5, repFail: -4 },
        { id: "delay", label: "Temporiser et l'emmener vers l'angle", hint: "Malin", base: 0.62, repWin: 2 },
        { id: "tactical", label: "Prendre le carton tactique", hint: "Cynique", base: 0.7, repWin: 1, repFail: -2 },
        { id: "duel", label: "Provoquer le duel physique", base: 0.5, repWin: 4, repFail: -3 },
      ],
      winText: "Votre intervention sauve le derby ! Un tacle qui entre directement dans la légende du club.",
      failText: "Battu sur l'action décisive… Le derby se perd dans votre dos, et la ville a tout vu.",
    }, {
      title: "LE DERBY",
      text: "93e minute : votre gardien est battu, le ballon file doucement vers la ligne… et vous arrivez lancé de nulle part.",
      options: [
        { id: "bicycle", label: "Le retourné acrobatique sur la ligne", hint: "Spectaculaire", base: 0.45, repWin: 7, repFail: -3 },
        { id: "slide", label: "Le tacle glissé désespéré", base: 0.58, repWin: 4, repFail: -2 },
        { id: "clear", label: "Dégager n'importe où, pourvu que ça sorte", hint: "Sûr", base: 0.66, repWin: 2 },
        { id: "hand", label: "La main volontaire — rouge et penalty", hint: "Cynique", base: 0.5, repWin: 1, repFail: -4 },
      ],
      winText: "SAUVETAGE SUR LA LIGNE ! La photo fera la une : le derby est sauvé par votre instinct.",
      failText: "Trop tard d'un souffle… Le ballon franchit la ligne et le derby s'écroule.",
    }],
    gk: [{
      title: "LE DERBY",
      text: "Corner adverse à la 93e du derby, tout le monde monte, le ballon flotte vers votre surface saturée.",
      options: [
        { id: "punch", label: "Sortir au poing dans la mêlée", base: 0.55, repWin: 3, repFail: -3 },
        { id: "catch", label: "Capter le ballon au-dessus de tous", hint: "Autorité", base: 0.44, repWin: 6, repFail: -4 },
        { id: "line", label: "Rester sur votre ligne", hint: "Prudent", base: 0.6, repWin: 1 },
        { id: "counter", label: "Capter et relancer le contre éclair", base: 0.48, repWin: 5, repFail: -2 },
      ],
      winText: "Votre sortie assomme le derby ! Les gants les plus sûrs de la ville, c'est désormais officiel.",
      failText: "Le ballon vous échappe dans la mêlée… et finit au fond. Le pire scénario, dans le pire match.",
    }, {
      title: "LE DERBY",
      text: "Penalty adverse à la 89e du derby, 1-1. Leur tireur ne vous a jamais raté… jusqu'à ce soir, peut-être.",
      options: [
        { id: "read", label: "Lire ses appuis jusqu'au bout", hint: "Patient", base: 0.5, repWin: 4 },
        { id: "early", label: "Plonger tôt sur son côté préféré", base: 0.46, repWin: 4, repFail: -2 },
        { id: "center", label: "Rester au centre", hint: "Culotté", base: 0.4, repWin: 6, repFail: -3 },
        { id: "mind", label: "Le fixer, sourire, gagner les nerfs", hint: "Guerre psychologique", base: 0.48, repWin: 5, traitWin: "clutch" },
      ],
      winText: "PENALTY ARRÊTÉ ! Le virage porte déjà votre nom en banderole : le derby est à vous.",
      failText: "Il ne vous a pas raté, encore. Le derby glisse entre vos gants, et la semaine sera longue.",
    }],
  },
  old_club: {
    any: {
      title: "RETROUVAILLES",
      text: "Premier match contre votre ancien club depuis votre départ. Tribunes partagées entre applaudissements et sifflets — chaque ballon que vous touchez fait monter le volume.",
      options: [
        { id: "big", label: "Jouer le match de votre vie", hint: "Revanche", base: 0.5, repWin: 4 },
        { id: "sober", label: "Rester sobre et appliqué", hint: "Classe", base: 0.68, repWin: 1 },
        { id: "celebrate", label: "Marquer ET célébrer face au virage", hint: "Provocateur", base: 0.42, repWin: 6, repFail: -6 },
      ],
      winText: "Match plein face à votre passé : même vos anciens supporters finissent par applaudir. Le plus beau des points finaux.",
      failText: "Trop d'émotion, pas assez de jeu : votre ancien public savoure, le nouveau s'interroge.",
    },
    gk: {
      title: "RETROUVAILLES",
      text: "Premier match contre votre ancien club depuis votre départ. Les attaquants d'en face connaissent chacune de vos habitudes — et l'ancien public guette la moindre erreur de gant.",
      options: [
        { id: "big", label: "Sortir le match de votre vie", hint: "Revanche", base: 0.5, repWin: 4 },
        { id: "sober", label: "Rester sobre et appliqué", hint: "Classe", base: 0.68, repWin: 1 },
        { id: "celebrate", label: "Verrouiller la cage ET chambrer le virage", hint: "Provocateur", base: 0.42, repWin: 6, repFail: -6 },
      ],
      winText: "Cage inviolée face à votre passé : même vos anciens supporters finissent par applaudir. Le plus beau des points finaux.",
      failText: "Trop d'émotion, pas assez de gants : votre ancien public savoure, le nouveau s'interroge.",
    },
  },
  continental_final: {
    field: [{
      title: "FINALE CONTINENTALE",
      text: "Finale continentale, 1-1 à la 89e devant tout un continent. Coup franc idéal pour {club}, à l'entrée de la surface. Le sacre au bout du pied.",
      options: [
        { id: "curl", label: "Enrouler dans la lucarne", hint: "Signature", base: 0.55, repWin: 5, repFail: -2 },
        { id: "power", label: "Frappe pure sous la barre", hint: "Puissant", base: 0.5, repWin: 4 },
        { id: "pass", label: "Jouer la combinaison travaillée", hint: "Collectif", base: 0.66, repWin: 2 },
        { id: "panenka", label: "Le geste fou pour l'histoire", hint: "Légendaire", base: 0.4, repWin: 9, repFail: -6, traitWin: "showman" },
      ],
      winText: "LUCARNE ! Le trophée continental est à {club}, et tout un continent scande votre nom jusqu'au bout de la nuit !",
      failText: "Le mur dévie d'un souffle… Le sacre continental s'envole dans les dernières secondes. Le vide, immense.",
    }, {
      title: "FINALE CONTINENTALE",
      text: "Prolongation de la finale continentale, 2-2. Une dernière contre-attaque se dessine, vous êtes lancé plein axe, le gardien sort à votre rencontre.",
      options: [
        { id: "dribble", label: "Éliminer le gardien au culot", hint: "Ego", base: 0.48, repWin: 6, repFail: -4 },
        { id: "chip", label: "Le piquer au-dessus du gardien", base: 0.52, repWin: 5, repFail: -2 },
        { id: "square", label: "Décaler le coéquipier sur la cage vide", hint: "Lucide", base: 0.7, repWin: 2 },
        { id: "cool", label: "Temporiser et fixer avant de conclure", base: 0.6, repWin: 1 },
      ],
      winText: "Le geste parfait au bout de la nuit : le trophée continental se soulève, et la dernière image porte votre signature !",
      failText: "Le dernier geste se dérobe, et la séance de tirs au but tourne au cauchemar. Si près du toit du continent.",
    }],
    gk: [{
      title: "FINALE CONTINENTALE",
      text: "Tirs au but en finale continentale. 4-4. Le tireur adverse s'avance, un continent retient son souffle : c'est vous, le dernier rempart.",
      options: [
        { id: "read", label: "Lire l'appui et plonger tôt", hint: "Anticipation", base: 0.5, repWin: 5 },
        { id: "wait", label: "Attendre le dernier instant", hint: "Sang-froid", base: 0.58, repWin: 3 },
        { id: "mind", label: "Jouer avec ses nerfs sur la ligne", hint: "Provoc", base: 0.46, repWin: 7, repFail: -3 },
      ],
      winText: "REPOUSSÉ ! Vous offrez le sacre continental à {club} d'une claire-voie légendaire : le héros du continent, c'est vous !",
      failText: "Le ballon file au ras du poteau… Le trophée échappe à {club} d'un souffle. La nuit sera longue.",
    }],
  },
  promo_playoff: {
    field: [{
      title: "BARRAGE DE MONTÉE",
      text: "Dernière minute du barrage décisif, 1-1. Coup franc aux 20 mètres pour {club} : tout un club, toute une ville, tout un rêve de montée suspendus à votre pied.",
      options: [
        { id: "curl", label: "Enrouler au-dessus du mur", base: 0.52, repWin: 3 },
        { id: "power", label: "Fusiller le gardien en force", base: 0.46, repWin: 3 },
        { id: "combo", label: "Jouer la combinaison répétée à l'entraînement", hint: "Collectif", base: 0.58 },
        { id: "chip", label: "Chiper par-dessus le mur, à la Juninho", hint: "Audacieux", base: 0.4, repWin: 7, repFail: -4 },
      ],
      winText: "LA DÉLIVRANCE ! Le stade chavire, les tribunes se vident sur la pelouse : {club} MONTE, et c'est signé de votre pied !",
      failText: "Le ballon frôle la lucarne… et s'envole avec le rêve de toute une ville. La montée attendra encore.",
    }, {
      title: "BARRAGE DE MONTÉE",
      text: "90e minute du barrage, 0-0. Longue ouverture, vous voilà lancé seul face au gardien adverse — la montée au bout de la course.",
      options: [
        { id: "early", label: "Frapper tôt, avant qu'il ne sorte", base: 0.52, repWin: 3 },
        { id: "lob", label: "Le lob de la folie", hint: "Panache", base: 0.4, repWin: 7, repFail: -4, traitWin: "showman" },
        { id: "round", label: "L'éliminer et pousser au fond", base: 0.48, repWin: 5, repFail: -2 },
        { id: "square", label: "Remettre en retrait au coéquipier", hint: "Collectif", base: 0.62, repWin: 2 },
      ],
      winText: "LE BUT DE LA MONTÉE ! Des larmes partout, des abonnés à vie : {club} change de division grâce à vous !",
      failText: "Le gardien gagne son duel… et le barrage se perd dans la foulée. Toute une ville rentre en silence.",
    }],
    mil: {
      title: "BARRAGE DE MONTÉE",
      text: "Barrage décisif, 87e, 1-1. Le match est haché, le stade au bord de l'implosion — et le ballon revient toujours vers vous.",
      options: [
        { id: "vertical", label: "Oser la passe verticale décisive", hint: "Risqué", base: 0.5, repWin: 5, repFail: -2 },
        { id: "drive", label: "Porter le ballon et casser les lignes vous-même", base: 0.48, repWin: 5, repFail: -2 },
        { id: "calm", label: "Calmer le jeu et faire respirer l'équipe", hint: "Maîtrise", base: 0.6, repWin: 2 },
        { id: "longshot", label: "Frapper de vingt-cinq mètres", base: 0.4, repWin: 7, repFail: -3 },
      ],
      winText: "C'est vous qui débloquez le barrage ! {club} MONTE, guidé par son métronome !",
      failText: "Le verrou ne saute jamais… et le barrage se perd aux tirs au but. Si près, si loin.",
    },
    def: {
      title: "BARRAGE DE MONTÉE",
      text: "Barrage décisif, {club} mène 1-0 à la 89e. Leur avant-centre déborde votre côté, dernier duel avant la délivrance.",
      options: [
        { id: "tackle", label: "Le tacle qui doit tout finir", hint: "Quitte ou double", base: 0.48, repWin: 6, repFail: -4 },
        { id: "jockey", label: "Reculer, temporiser, laisser le bloc revenir", hint: "Malin", base: 0.6, repWin: 2 },
        { id: "clear", label: "Dégager en catastrophe en tribune", base: 0.56, repWin: 1 },
        { id: "foul", label: "La faute tactique loin du but", hint: "Cynique", base: 0.62, repWin: 1, repFail: -2 },
      ],
      winText: "TENU ! Le duel est gagné, le coup de sifflet libère tout un peuple : {club} MONTE sur votre intervention !",
      failText: "Le duel est perdu, l'égalisation tombe… et la montée s'évapore dans la nuit. Le vestiaire est un cimetière.",
    },
    gk: {
      title: "BARRAGE DE MONTÉE",
      text: "Tirs au but du barrage décisif. Un arrêt et {club} monte. Le tireur adverse pose son ballon, le stade retient son souffle derrière vos gants.",
      options: [
        { id: "read", label: "Lire ses appuis jusqu'au bout", hint: "Patient", base: 0.52 },
        { id: "early", label: "Partir tôt sur son côté fort", base: 0.46 },
        { id: "center", label: "Rester au centre", hint: "Culotté", base: 0.42, repWin: 5, repFail: -3 },
        { id: "mind", label: "Gagner la guerre des nerfs", base: 0.48, repWin: 3, traitWin: "clutch" },
      ],
      winText: "L'ARRÊT DE LA MONTÉE ! Vous voilà héros éternel de {club} : la ville entière connaîtra vos gants par cœur !",
      failText: "Le tir vous transperce. Le silence du stade dit tout : la montée s'échappe au pire moment.",
    },
  },
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
   ÉVÉNEMENTS PRINCIPAUX — un par saison, choisi selon l'état
   du joueur (âge, club, stats, poste, drapeaux d'histoire).
   Par défaut : once = true (jamais revu dans une même carrière).
   ============================================================ */
const EVENTS = [

  // ══════════════ JEUNESSE (16-19) ══════════════
  {
    id: "ev_academy_poach", cat: "Mercato", icon: "🏫", w: 14,
    cond: { aMin: 16, aMax: 17 },
    text: "Un centre de formation voisin, bien plus structuré, veut vous arracher à {club}.",
    options: [
      { label: "Rester fidèle à votre club formateur", outcomes: [
        { weight: 45, text: "Vous progressez tranquillement, dans un environnement que vous connaissez par cœur.", fx: { t: 3, m: 2, mor: 4 } },
        { weight: 25, text: "Un éducateur croit dur comme fer en vous : surclassé, vous brûlez les étapes.", fx: { t: 5, rep: 6, mor: 5, trait: "loyal" } },
        { weight: 22, text: "Noyé dans une génération dorée, vous stagnez sur le banc des U19.", fx: { m: -3, form: -8, mor: -6 } },
        { weight: 8, text: "Une blessure de croissance gâche votre saison.", fx: { p: -4, inj: 14, mor: -4 } },
      ] },
      { label: "Rejoindre la structure rivale", hint: "Ambitieux", outcomes: [
        { weight: 40, text: "Vous faites vos valises. L'adaptation est studieuse et sans éclat : de bonnes bases pour la suite.", fx: { t: 3, p: 2, transfer: { d: 1, direct: true } } },
        { weight: 28, text: "Vous faites vos valises, et les nouvelles méthodes de travail vous transcendent. Un cap est franchi.", fx: { t: 6, m: 3, rep: 4, transfer: { d: 1, direct: true } } },
        { weight: 24, text: "Vous partez… et le mal du pays vous ronge, loin des vôtres.", fx: { m: -3, mor: -10, transfer: { d: 1, direct: true } } },
        { weight: 8, text: "Vous partez, mais un cadre du nouveau vestiaire vous prend en grippe : saison cauchemardesque.", fx: { m: -4, form: -10, mor: -8, team: -6, transfer: { d: 1, direct: true } } },
      ] },
    ],
  },
  {
    id: "ev_all_in", cat: "Vie perso", icon: "🎲", w: 12,
    cond: { aMin: 16, aMax: 17 },
    text: "Un agent véreux jure que vous perdez votre temps à l'école : « Tout miser sur le foot, maintenant, ou rester un amateur. »",
    options: [
      { label: "Tout miser sur le football", hint: "Risqué", outcomes: [
        { weight: 40, text: "Vous vous entraînez matin, midi et soir. Le pari tient, pour l'instant.", fx: { t: 5, p: 2, flag: "no_diploma" } },
        { weight: 25, text: "Libéré de tout le reste, votre progression est fulgurante.", fx: { t: 8, rep: 5, trait: "genius", flag: "no_diploma" } },
        { weight: 35, text: "À 16 ans, cette pression vous dévore. Vous ne dormez plus.", fx: { m: -5, mor: -12, flag: "no_diploma" } },
      ] },
      { label: "Garder les études en parallèle", hint: "Prudent", outcomes: [
        { weight: 45, text: "L'équilibre études-foot vous structure, sans nuire à votre progression.", fx: { m: 4, mor: 4, flag: "diploma" } },
        { weight: 30, text: "Votre maturité impressionne le staff : on vous confie déjà des responsabilités.", fx: { m: 7, c: 4, rep: 3, flag: "diploma" } },
        { weight: 25, text: "Les copains du centre progressent plus vite : le doute s'installe.", fx: { t: -2, mor: -5, flag: "diploma" } },
      ] },
    ],
  },
  {
    id: "ev_viral_video", cat: "Réseaux", icon: "📱", w: 10,
    cond: { aMin: 16, aMax: 19 },
    text: "Un ami filme vos gestes techniques à l'entraînement. Il veut poster la compilation : « Frérot, tu vas exploser les compteurs. »",
    options: [
      { label: "Poster la vidéo", outcomes: [
        { weight: 40, text: "2 millions de vues en une semaine. Les recruteurs demandent votre nom.", fx: { rep: 8, c: 4, mor: 5 } },
        { weight: 30, text: "Le buzz est correct, mais le coach déteste « les influenceurs » : ambiance.", fx: { rep: 4, mor: -5 } },
        { weight: 30, text: "Un montage moqueur de vos ratés circule encore plus vite. Humiliation.", fx: { rep: -3, m: -3, mor: -8 } },
      ] },
      { label: "Refuser, le terrain d'abord", outcomes: [
        { weight: 55, text: "Vous restez dans l'ombre et travaillez. Le staff apprécie la discrétion.", fx: { t: 3, m: 3 } },
        { weight: 45, text: "Un autre jeune du centre fait le buzz à votre place et vous passe devant dans la hiérarchie.", fx: { mor: -6, rep: -1 } },
      ] },
    ],
  },
  {
    id: "ev_street_cage", cat: "Vie perso", icon: "🏙️", w: 12,
    cond: { aMin: 16, aMax: 18, origin: "quartier" },
    text: "Le tournoi du quartier, celui où tout a commencé, tombe la veille d'un match officiel. Tout le monde vous attend au city-stade.",
    options: [
      { label: "Jouer le tournoi du quartier", hint: "Cœur", outcomes: [
        { weight: 45, text: "Vous régalez le public au petit pont. La légende locale grandit, le coach ferme les yeux.", fx: { t: 4, c: 5, mor: 8, trait: "showman" } },
        { weight: 30, text: "Une cheville tordue sur le bitume. Le club est furieux.", fx: { inj: 6, rep: -3, mor: -4 } },
        { weight: 25, text: "Un recruteur incognito dans la foule note votre nom. Le bouche-à-oreille démarre.", fx: { rep: 6, mor: 5 } },
      ] },
      { label: "Faire l'impasse, place au match officiel", outcomes: [
        { weight: 60, text: "Choix de pro. Titularisé, vous rendez une copie sérieuse.", fx: { m: 4, t: 2, form: 4 } },
        { weight: 40, text: "Le quartier vous traite de vendu. Ça pique plus que prévu.", fx: { mor: -7, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_famous_dad", cat: "Vie perso", icon: "👔", w: 12,
    cond: { aMin: 16, aMax: 19, origin: "sportif" },
    text: "La presse ne parle que de votre père : « Le fils de… saura-t-il porter le nom ? » Chaque match devient un procès.",
    options: [
      { label: "Assumer l'héritage publiquement", outcomes: [
        { weight: 40, text: "Votre franchise désarme les critiques. Le nom devient une force.", fx: { c: 6, m: 4, rep: 5 } },
        { weight: 35, text: "Chaque contre-performance est un scandale national. C'est étouffant.", fx: { m: -5, mor: -8 } },
        { weight: 25, text: "Votre père monte au créneau dans les médias. Le feuilleton vous dépasse.", fx: { rep: 3, mor: -5 } },
      ] },
      { label: "Exiger qu'on vous juge sur le terrain", outcomes: [
        { weight: 50, text: "Vous coupez tout : plus d'interviews famille. Le calme revient peu à peu.", fx: { m: 6, mor: 5, trait: "zen" } },
        { weight: 50, text: "Votre silence est pris pour de l'arrogance. La pression ne baisse pas.", fx: { rep: -2, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_futsal_transition", cat: "Terrain", icon: "🎯", w: 12,
    cond: { aMin: 16, aMax: 18, origin: "futsal" },
    text: "Sur grand terrain, vos enchaînements de futsal font le show… mais le coach veut vous « normaliser » : moins de gestes, plus de courses.",
    options: [
      { label: "Garder votre patte futsal", outcomes: [
        { weight: 45, text: "Vos gestes inarrêtables deviennent votre signature. Les tribunes se lèvent.", fx: { t: 6, c: 4, rep: 5, trait: "showman" } },
        { weight: 55, text: "Trop de déchet dans le dur. Le coach vous cloue au banc pour l'exemple.", fx: { form: -8, mor: -6, m: 2 } },
      ] },
      { label: "Vous plier au moule athlétique", outcomes: [
        { weight: 55, text: "Vous gagnez en volume physique sans perdre votre toucher. Le meilleur des deux mondes.", fx: { p: 6, t: 2, m: 3 } },
        { weight: 45, text: "À force de brider votre instinct, vous devenez un joueur banal.", fx: { t: -3, p: 3, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_growth_spurt", cat: "Physique", icon: "📏", w: 8,
    cond: { aMin: 16, aMax: 17 },
    text: "Dix centimètres en un an : votre corps change trop vite. Le staff médical propose un programme spécial, long et frustrant.",
    options: [
      { label: "Suivre le protocole à la lettre", outcomes: [
        { weight: 65, text: "Six mois plus tard, vous voilà avec un châssis de pro.", fx: { p: 7, m: 2 } },
        { weight: 35, text: "Le programme traîne en longueur, la saison est presque blanche.", fx: { p: 3, inj: 10, mor: -5 } },
      ] },
      { label: "Continuer à jouer coûte que coûte", outcomes: [
        { weight: 45, text: "Vous serrez les dents et ne perdez pas votre place. Le corps suit, miracle.", fx: { m: 4, p: 2, trait: "ironman" } },
        { weight: 55, text: "Fracture de fatigue. L'addition du forcing arrive vite.", fx: { inj: 16, p: -4, mor: -6, trait: "glass" } },
      ] },
    ],
  },
  {
    id: "ev_youth_tournament", cat: "Sélection", icon: "🌍", w: 10,
    cond: { aMin: 17, aMax: 19, minRep: 20 },
    text: "Convocation au grand tournoi international des moins de 19 ans : une vitrine mondiale, mais une saison rallongée de deux mois.",
    options: [
      { label: "Y aller et briller", outcomes: [
        { weight: 35, text: "Élu meilleur jeune du tournoi ! L'Europe entière connaît désormais votre nom.", fx: { rep: 12, t: 3, c: 4, mor: 8 } },
        { weight: 40, text: "Un tournoi honnête, une expérience précieuse au contact des meilleurs.", fx: { rep: 4, m: 3, t: 2 } },
        { weight: 25, text: "Cramé par l'enchaînement, vous revenez sur les rotules.", fx: { form: -12, p: -2, mor: -4 } },
      ] },
      { label: "Décliner pour préserver votre corps", outcomes: [
        { weight: 55, text: "Reposé, vous attaquez la saison suivante plein de jus.", fx: { form: 8, p: 3 } },
        { weight: 45, text: "Votre remplaçant y devient une star. On vous oublie un peu.", fx: { rep: -4, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_first_contract", cat: "Mercato", icon: "🖋️", w: 14,
    cond: { aMin: 17, aMax: 19, levels: ["regional", "d2", "d1"] },
    text: "{club} pose un premier contrat pro sur la table. Mais un club voisin promet du temps de jeu immédiat en prêt.",
    options: [
      { label: "Signer pro et gravir les échelons ici", outcomes: [
        { weight: 40, text: "Contrat signé. L'ascension est lente mais réelle.", fx: { money: 0.2, rep: 3, t: 2 } },
        { weight: 30, text: "Lancé dans le grand bain plus tôt que prévu, vous saisissez votre chance !", fx: { money: 0.2, t: 5, rep: 7, form: 6 } },
        { weight: 30, text: "Le statut de pro vous écrase : vous jouez avec le frein à main.", fx: { money: 0.2, m: -4, form: -8 } },
      ] },
      { label: "Partir en prêt pour jouer", hint: "Formateur", outcomes: [
        { weight: 40, text: "Quarante matchs dans les jambes : rien ne remplace la compétition.", fx: { t: 5, p: 3, m: 2 } },
        { weight: 30, text: "Vous êtes LA révélation du championnat. Votre club vous rappelle en urgence.", fx: { t: 6, rep: 9, mor: 6 } },
        { weight: 30, text: "Le club prêteur joue le maintien dans la douleur : dur apprentissage.", fx: { m: 4, form: -6, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_agent_choice", cat: "Entourage", icon: "🕴️", w: 12,
    cond: { aMin: 18, aMax: 21 },
    text: "Un agent superstar aux dents longues veut vous représenter. Votre agent historique, lui, connaît le prénom de votre mère.",
    options: [
      { label: "Signer avec le requin international", outcomes: [
        { weight: 35, text: "Son carnet d'adresses ouvre des portes que vous ne soupçonniez pas.", fx: { rep: 8, money: 0.5, flag: "big_agent" } },
        { weight: 35, text: "Vous n'êtes qu'un nom parmi cinquante dans son portefeuille.", fx: { rep: 2, mor: -5, flag: "big_agent" } },
        { weight: 30, text: "Il vous pousse vers chaque contrat lucratif, peu importe le projet sportif.", fx: { money: 0.8, m: -3, flag: "big_agent", trait: "mercenary" } },
      ] },
      { label: "Rester en famille", outcomes: [
        { weight: 55, text: "Une confiance totale, zéro coup de poignard : ça n'a pas de prix.", fx: { m: 6, mor: 6, flag: "local_agent" } },
        { weight: 45, text: "Il négocie avec deux trains de retard : vous laissez de l'argent sur la table.", fx: { m: 3, money: -0.2, flag: "local_agent" } },
      ] },
    ],
  },
  {
    id: "ev_bench_battle", cat: "Terrain", icon: "🪑", w: 12,
    cond: { aMin: 17, aMax: 21 },
    text: "Un international expérimenté verrouille votre poste. Le coach vous glisse : « Ton heure viendra. » Mais quand ?",
    options: [
      { label: "Taper du poing sur la table", hint: "Culotté", outcomes: [
        { weight: 35, text: "Votre culot plaît. Titularisé au match suivant, vous marquez les esprits.", fx: { t: 4, rep: 7, m: 4, form: 6 } },
        { weight: 35, text: "Le coach déteste les ultimatums. Direction la tribune quelques semaines.", fx: { mor: -8, rep: -2, form: -6 } },
        { weight: 30, text: "Le vestiaire respecte l'audace, le staff moins. Statu quo tendu.", fx: { c: 3, mor: -3 } },
      ] },
      { label: "Apprendre dans l'ombre du titulaire", outcomes: [
        { weight: 45, text: "Le vieux briscard vous prend sous son aile et vous lègue ses secrets.", fx: { m: 6, t: 3 } },
        { weight: 30, text: "Votre patience paie : blessure du titulaire, vous ne rendrez jamais la place.", fx: { t: 4, rep: 5, form: 8 } },
        { weight: 25, text: "Une saison entière à cirer le banc. La frustration ronge.", fx: { mor: -9, form: -6 } },
      ] },
    ],
  },
  {
    id: "ev_hometown_derby", cat: "Terrain", icon: "🔥", w: 10,
    cond: { aMin: 17, aMax: 22 },
    text: "Premier derby de votre carrière. Le stade est une marmite, le coach hésite à lancer un si jeune joueur dans cette fournaise.",
    options: [
      { label: "Supplier de jouer ce match", outcomes: [
        { weight: 35, text: "But décisif dans le derby ! Les ultras chantent déjà votre nom.", fx: { rep: 9, c: 5, mor: 10, trait: "clutch" } },
        { weight: 35, text: "Le match vous dévore : dépassé par l'intensité, remplacé à la mi-temps.", fx: { m: -4, form: -6, mor: -6 } },
        { weight: 30, text: "Une copie sobre et sérieuse dans un match piège. Le staff note.", fx: { m: 4, rep: 2 } },
      ] },
      { label: "Reconnaître que c'est trop tôt", outcomes: [
        { weight: 60, text: "Vous observez, apprenez, engrangez. Votre heure viendra.", fx: { m: 4 } },
        { weight: 40, text: "Le coach retient surtout que vous avez reculé devant l'obstacle.", fx: { rep: -3, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_junk_food", cat: "Hygiène de vie", icon: "🍔", w: 8,
    cond: { aMin: 17, aMax: 20 },
    text: "Le nutritionniste du club tire la sonnette d'alarme : trop de fast-food, trop de sodas. Il propose un régime drastique.",
    options: [
      { label: "Adopter une hygiène de pro", outcomes: [
        { weight: 70, text: "Trois kilos de muscle en plus, un cardio retrouvé : le corps vous dit merci.", fx: { p: 6, form: 6 } },
        { weight: 30, text: "Le régime est un enfer social, mais le physique progresse.", fx: { p: 4, mor: -4 } },
      ] },
      { label: "On ne change pas une équipe qui gagne", outcomes: [
        { weight: 45, text: "Votre métabolisme encaisse… pour l'instant.", fx: { mor: 3 } },
        { weight: 55, text: "Pubalgie à répétition. Le staff médical vous l'avait dit.", fx: { p: -5, inj: 8, trait: "party" } },
      ] },
    ],
  },

  // ══════════════ SPÉCIALISATION (18-21, un par poste) ══════════════
  {
    id: "ev_spec_att", cat: "Identité de jeu", icon: "🧬", w: 22,
    cond: { aMin: 18, aMax: 21, pos: ["att"] },
    text: "Votre coach est cash : « Il est temps de choisir qui tu es sur un terrain. » Le style que vous ancrez maintenant façonnera toutes vos statistiques de carrière.",
    options: [
      { label: "🦊 Renard des surfaces — vivre pour le but", outcomes: [
        { weight: 100, text: "Chaque séance devient un culte de la finition. Les défenseurs apprendront à vous détester dans les six mètres.", fx: { archetype: "fox", t: 2 } },
      ] },
      { label: "🎯 Attaquant complet — peser partout", outcomes: [
        { weight: 100, text: "Pivot, remise, appel, frappe : vous travaillez tout, pour devenir le cauchemar total des défenses.", fx: { archetype: "complete", t: 1, m: 1 } },
      ] },
      { label: "🌀 Ailier dribbleur — l'art du déséquilibre", outcomes: [
        { weight: 100, text: "Le un-contre-un devient votre langue maternelle. Les latéraux adverses dorment déjà mal.", fx: { archetype: "winger", t: 2, c: 1 } },
      ] },
      { label: "🎭 Faux neuf — l'attaquant chef d'orchestre", outcomes: [
        { weight: 100, text: "Décrocher, attirer, libérer : vous apprenez à faire briller les autres pour mieux régner.", fx: { archetype: "false9", m: 2, t: 1 } },
      ] },
    ],
  },
  {
    id: "ev_spec_mil", cat: "Identité de jeu", icon: "🧬", w: 22,
    cond: { aMin: 18, aMax: 21, pos: ["mil"] },
    text: "Votre coach est cash : « Il est temps de choisir qui tu es sur un terrain. » Le style que vous ancrez maintenant façonnera toutes vos statistiques de carrière.",
    options: [
      { label: "⚓ Sentinelle — l'équilibre avant tout", outcomes: [
        { weight: 100, text: "Lire, couper, orienter : vous devenez l'assurance-vie de votre équipe.", fx: { archetype: "anchor", m: 2 } },
      ] },
      { label: "🚂 Box-to-box — présent des deux côtés", outcomes: [
        { weight: 100, text: "Votre moteur devient légendaire à l'entraînement. Surface à surface, sans s'arrêter.", fx: { archetype: "b2b", p: 2 } },
      ] },
      { label: "🎼 Maestro — dicter le tempo", outcomes: [
        { weight: 100, text: "La dernière passe, l'angle impossible, le rythme du match : tout passera par votre pied.", fx: { archetype: "maestro", t: 2 } },
      ] },
      { label: "✨ Meneur offensif — jouer entre les lignes", outcomes: [
        { weight: 100, text: "Là où l'espace n'existe pas, vous en inventez. Les matchs se décideront dans votre zone.", fx: { archetype: "cam", t: 2, c: 1 } },
      ] },
    ],
  },
  {
    id: "ev_spec_def", cat: "Identité de jeu", icon: "🧬", w: 22,
    cond: { aMin: 18, aMax: 21, pos: ["def"] },
    text: "Votre coach est cash : « Il est temps de choisir qui tu es sur un terrain. » Le style que vous ancrez maintenant façonnera toutes vos statistiques de carrière.",
    options: [
      { label: "🧱 Stoppeur — gagner chaque duel", outcomes: [
        { weight: 100, text: "L'impact, le timing, l'intimidation : votre zone devient une frontière.", fx: { archetype: "stopper", p: 2 } },
      ] },
      { label: "🧭 Relanceur — construire depuis derrière", outcomes: [
        { weight: 100, text: "Votre première passe casse des lignes entières. La construction commence par vous.", fx: { archetype: "libero", t: 2 } },
      ] },
      { label: "🛩️ Latéral offensif — dévorer le couloir", outcomes: [
        { weight: 100, text: "Cent allers-retours par match : votre couloir devient une autoroute personnelle.", fx: { archetype: "wingback", p: 2, t: 1 } },
      ] },
      { label: "🛡️ Patron de défense — commander la ligne", outcomes: [
        { weight: 100, text: "Votre voix porte, replace, rassure. Une défense entière apprendra à vivre à votre rythme.", fx: { archetype: "boss", m: 2, c: 1 } },
      ] },
    ],
  },
  {
    id: "ev_spec_gk", cat: "Identité de jeu", icon: "🧬", w: 22,
    cond: { aMin: 18, aMax: 21, pos: ["gk"] },
    text: "Votre entraîneur des gardiens est cash : « Il est temps de choisir quel gardien tu veux être. » Le style que vous ancrez maintenant façonnera toute votre carrière.",
    options: [
      { label: "🥅 Gardien de ligne — infranchissable", outcomes: [
        { weight: 100, text: "Placement, appuis, angles fermés : votre ligne devient un mur.", fx: { archetype: "line", m: 2 } },
      ] },
      { label: "🧹 Gardien moderne — jouer au pied", outcomes: [
        { weight: 100, text: "Onzième joueur de champ : vos relances lancent désormais les attaques.", fx: { archetype: "sweeper", t: 2 } },
      ] },
      { label: "🪂 Maître des airs — régner sur les centres", outcomes: [
        { weight: 100, text: "Chaque ballon aérien devient votre propriété privée.", fx: { archetype: "aerial", p: 2 } },
      ] },
      { label: "⚡ Gardien réflexes — l'arrêt impossible", outcomes: [
        { weight: 100, text: "Vos réflexes défient la physique. Les attaquants frapperont parfaitement… et rageront quand même.", fx: { archetype: "reflex", p: 1, m: 1 } },
      ] },
    ],
  },

  // ══════════════ ASCENSION (20-25) ══════════════
  {
    id: "ev_first_natcall", cat: "Sélection", icon: "📞", w: 16,
    cond: { aMin: 17, aMax: 27, nat: false, minRep: 35, minOvr: 66 },
    text: "Le téléphone sonne : c'est le sélectionneur national. « Petit, prépare ton sac. » La sélection vous tend les bras.",
    options: [
      { label: "Répondre présent, évidemment", outcomes: [
        { weight: 40, text: "Débuts internationaux réussis : l'hymne, le frisson, tout y est.", fx: { rep: 8, m: 4, mor: 8, natCall: true } },
        { weight: 30, text: "Entrée en jeu discrète, mais vous voilà dans le groupe pour de bon.", fx: { rep: 4, natCall: true } },
        { weight: 30, text: "Le rythme international vous gifle : hors du coup, remplacé à la pause.", fx: { rep: 2, m: -3, mor: -4, natCall: true } },
      ] },
      { label: "Décliner : « Je ne me sens pas prêt »", outcomes: [
        { weight: 50, text: "Le sélectionneur apprécie l'honnêteté. « Je reviendrai te chercher. »", fx: { m: 4 } },
        { weight: 50, text: "La presse vous découpe : « Il a refusé le maillot national ! »", fx: { rep: -6, mor: -6 } },
      ] },
    ],
  },
  {
    id: "ev_captain_or_leave", cat: "Vestiaire", icon: "©️", w: 12,
    cond: { aMin: 21, aMax: 24, levels: ["d2", "d1"], minRep: 35 },
    text: "Le club rebâtit tout autour de vous et propose le brassard. Au même moment, un cador vous veut comme pari d'avenir.",
    options: [
      { label: "Prendre le brassard et rester", outcomes: [
        { weight: 40, text: "Le brassard révèle une dimension de patron que personne ne soupçonnait.", fx: { m: 7, c: 5, rep: 5, trait: "leader", flag: "captain" } },
        { weight: 30, text: "Capitaine correct, sans plus. La question du départ reviendra.", fx: { m: 3, c: 2, flag: "captain" } },
        { weight: 30, text: "Le poids du brassard vous éteint. Vous n'osez plus jouer libéré.", fx: { m: -5, form: -8, flag: "captain" } },
      ] },
      { label: "Forcer le départ vers le sommet", hint: "Ambitieux", outcomes: [
        { weight: 40, text: "Le grand saut réussi : vous vous imposez chez les cadors.", fx: { t: 4, rep: 8, transfer: { d: 1 } } },
        { weight: 35, text: "Le transfert se fait, mais le niveau est brutal : il va falloir s'accrocher.", fx: { rep: 3, form: -6, transfer: { d: 1 } } },
        { weight: 25, text: "Votre bras de fer pour partir laisse des traces : les supporters vous conspuent.", fx: { rep: -5, mor: -6, transfer: { d: 1 } } },
      ] },
    ],
  },
  {
    // « Un club a formulé une offre, et VOTRE club l'a acceptée. » La décision est
    // à vous : écouter les propositions (chaque club affiche le STATUT proposé) ou
    // rester. Le cœur de la mécanique de rôle.
    id: "ev_bid_accepted", cat: "Mercato", icon: "📩", w: 15,
    cond: { aMin: 19, aMax: 33, minRep: 22 },
    text: "Votre agent vous appelle : un club a déposé une offre, et votre club l'a ACCEPTÉE. La balle est dans votre camp — vous écoutez les propositions, ou vous restez.",
    options: [
      { label: "Écouter les offres", hint: "Voir les clubs & statuts", outcomes: [
        { weight: 55, text: "Les propositions s'étalent sur la table : à vous de choisir votre prochain chapitre.", fx: { transfer: { d: 1 } } },
        { weight: 30, text: "Les prétendants se bousculent — plusieurs clubs passent à l'action.", fx: { rep: 2, transfer: { d: 1 } } },
        { weight: 15, text: "L'intérêt est réel, mais d'un cran plus modeste que vos rêves. Reste à trancher.", fx: { transfer: { d: 0 } } },
      ] },
      { label: "Décliner, je reste fidèle", outcomes: [
        { weight: 60, text: "Vous snobez les avances. Le vestiaire et le coach saluent la loyauté.", fx: { coach: 5, team: 4, mor: 3 } },
        { weight: 40, text: "Vous restez, mais la direction, frustrée de la vente ratée, garde une dent contre vous.", fx: { coach: -3, mor: -2 } },
      ] },
    ],
  },
  {
    // Variante « ton club VEUT te vendre » : si tu t'accroches, ton STATUT baisse
    // (le coach te pousse dehors). Vraie pression : partir ou subir.
    id: "ev_forced_sale", cat: "Mercato", icon: "🚪", w: 9,
    cond: { aMin: 23, aMax: 34, levels: ["d1", "elite"], minRep: 30 },
    text: "Le coach est clair : il ne compte plus sur vous et le club a bouclé un accord pour votre départ. Vous pouvez partir la tête haute… ou vous accrocher, au risque de finir sur le banc.",
    options: [
      { label: "Accepter de partir", hint: "Rebondir ailleurs", outcomes: [
        { weight: 55, text: "Nouveau départ : ailleurs, on vous veut vraiment.", fx: { mor: 3, transfer: { d: 0 } } },
        { weight: 45, text: "Vous rebondissez un cran plus bas, mais avec les clés du camion.", fx: { rep: -2, transfer: { d: -1 } } },
      ] },
      { label: "M'accrocher coûte que coûte", hint: "Risqué", outcomes: [
        { weight: 50, text: "Bras de fer perdu : mis au placard, vous perdez votre statut.", fx: { coach: -8, mor: -6, role: -1 } },
        { weight: 30, text: "Vous vous accrochez, relégué à la rotation, en attendant votre heure.", fx: { coach: -3, role: -1 } },
        { weight: 20, text: "Contre toute attente, vous retournez le coach par le travail. Respect regagné.", fx: { coach: 6, mor: 4, rep: 2 } },
      ] },
    ],
  },
  {
    id: "ev_comeback_protocol", cat: "Blessure", icon: "🏥", w: 10,
    cond: { aMin: 20, aMax: 26 },
    text: "Rechute ou renaissance : après des semaines d'infirmerie, le staff médical hésite à vous relancer pour le sprint final.",
    options: [
      { label: "Forcer le retour pour les matchs décisifs", hint: "Risqué", outcomes: [
        { weight: 30, text: "Retour messianique : vous portez l'équipe dans le money-time !", fx: { rep: 9, m: 5, mor: 8, trait: "clutch" } },
        { weight: 30, text: "Vous tenez votre rang sans exploser. Le pari passe, ric-rac.", fx: { rep: 3, p: -1 } },
        { weight: 40, text: "Rechute sévère. Des mois de rééducation envolés en un sprint.", fx: { inj: 18, p: -6, mor: -8, trait: "glass" } },
      ] },
      { label: "Respecter le protocole jusqu'au bout", outcomes: [
        { weight: 60, text: "Vous revenez plus affûté qu'avant la blessure. La patience paie toujours.", fx: { p: 5, m: 3, form: 6 } },
        { weight: 40, text: "L'équipe a appris à gagner sans vous. Il faudra reconquérir votre place.", fx: { form: -5, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_style_reinvention", cat: "Terrain", icon: "🧪", w: 10,
    cond: { aMin: 22, aMax: 27 },
    text: "Un entraîneur visionnaire veut réinventer votre poste : nouveau rôle, nouvelles courses, nouveau logiciel. Tout casser pour tout reconstruire.",
    options: [
      { label: "Accepter la mue tactique", outcomes: [
        { weight: 40, text: "La transformation fait de vous un joueur unique en son genre. Les analystes s'emballent.", fx: { t: 7, m: 4, rep: 6 } },
        { weight: 35, text: "Des mois d'ajustement laborieux pour un gain réel mais modeste.", fx: { t: 3, form: -4 } },
        { weight: 25, text: "Vous vous perdez complètement entre l'ancien et le nouveau rôle.", fx: { t: -3, m: -4, form: -8 } },
      ] },
      { label: "Défendre ce qui fait votre force", outcomes: [
        { weight: 50, text: "Vos certitudes tiennent bon : la saison est solide, dans votre registre.", fx: { t: 2, m: 3, form: 4 } },
        { weight: 50, text: "Le coach vous étiquette « ingérable » et le fait savoir en interne.", fx: { rep: -3, mor: -6 } },
      ] },
    ],
  },
  {
    id: "ev_big_final", cat: "Terrain", icon: "🏟️", w: 14,
    cond: { aMin: 21, aMax: 33, levels: ["elite"], chance: 0.7 },
    text: "Finale de la Coupe des Champions. 80 000 personnes, le monde entier devant sa télé. La veille, l'insomnie vous guette.",
    options: [
      { label: "Prendre le match à votre compte", hint: "Quitte ou double", outcomes: [
        { weight: 30, text: "MONUMENTAL. Votre nom entre dans l'histoire de la compétition !", fx: { rep: 14, c: 5, mor: 10, trophy: "continental", trait: "clutch" } },
        { weight: 35, text: "Une grande finale de votre part… mais la défaite au bout. Cruel.", fx: { rep: 5, mor: -8 } },
        { weight: 35, text: "Vous forcez chaque geste et traversez la finale comme un fantôme. Défaite.", fx: { rep: -5, m: -4, mor: -10 } },
      ] },
      { label: "Jouer simple, pour l'équipe", outcomes: [
        { weight: 40, text: "Sobre, juste, précieux : le collectif l'emporte et vous avec.", fx: { rep: 7, m: 5, trophy: "continental" } },
        { weight: 60, text: "Trop sage pour faire basculer le destin. Le trophée s'envole.", fx: { m: 2, mor: -6 } },
      ] },
    ],
  },
  {
    id: "ev_red_card_derby", cat: "Terrain", icon: "🟥", w: 9,
    cond: { aMin: 20, aMax: 32 },
    text: "Le derby s'envenime : leur capitaine vous insulte, vous provoque, marche sur votre cheville en douce. L'arbitre ne voit rien.",
    options: [
      { label: "Répondre sur le terrain, œil pour œil", outcomes: [
        { weight: 40, text: "Rouge direct. Quatre matchs de suspension et une réputation de sanguin.", fx: { rep: -4, inj: 4, mor: -5, dis: -5 } },
        { weight: 35, text: "Vous lui rendez coup pour coup sans franchir la ligne. Le public adore.", fx: { c: 4, rep: 3, mor: 5 } },
        { weight: 25, text: "Votre riposte réveille l'équipe : le derby bascule pour vous !", fx: { rep: 5, m: 4, mor: 6 } },
      ] },
      { label: "L'ignorer royalement", outcomes: [
        { weight: 60, text: "Votre flegme le rend fou : c'est LUI qui prend rouge. Victoire.", fx: { m: 5, rep: 4, trait: "zen" } },
        { weight: 40, text: "On salue votre calme, mais certains supporters réclament plus de grinta.", fx: { m: 3, rep: -1 } },
      ] },
    ],
  },
  {
    id: "ev_dressing_crisis", cat: "Vestiaire", icon: "💢", w: 10,
    cond: { aMin: 21, aMax: 30 },
    text: "Le vestiaire est coupé en deux : clans, fuites dans la presse, coach fragilisé. Quelqu'un doit recoller les morceaux.",
    options: [
      { label: "Prendre la parole devant tout le groupe", outcomes: [
        { weight: 45, text: "Votre discours retourne le vestiaire. L'équipe repart unie derrière vous.", fx: { c: 6, m: 5, rep: 5, trait: "leader" } },
        { weight: 30, text: "Les mots sont justes, l'effet modeste. Au moins, vous avez essayé.", fx: { c: 2, m: 2 } },
        { weight: 25, text: "Un cadre vous humilie : « Tu es qui, toi, pour parler ? » Glacial.", fx: { mor: -8, c: -2 } },
      ] },
      { label: "Rester loin des embrouilles", outcomes: [
        { weight: 55, text: "Vous traversez la crise sans une éclaboussure, concentré sur le jeu.", fx: { form: 4, m: 2 } },
        { weight: 45, text: "La crise emporte la saison de l'équipe, et un peu la vôtre.", fx: { form: -6, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_coach_clash", cat: "Vestiaire", icon: "🧨", w: 10,
    cond: { aMin: 20, aMax: 31 },
    text: "Le nouveau coach, {coach}, vous sort du onze sans explication. En conférence de presse, il lâche : « Personne n'est intouchable. »",
    options: [
      { label: "Déballer votre vérité dans les médias", hint: "Brûlant", outcomes: [
        { weight: 30, text: "L'opinion prend votre parti, la direction recadre le coach. Vous rejouez.", fx: { rep: 4, form: 5, mor: 5, coach: -8 } },
        { weight: 40, text: "Guerre ouverte. Le club veut vous vendre au prochain mercato.", fx: { rep: -3, mor: -6, coach: -12, transfer: { d: 0 } } },
        { weight: 30, text: "Le vestiaire vous lâche : on ne lave pas le linge sale en public.", fx: { rep: -5, c: -3, mor: -7, team: -8, coach: -8 } },
      ] },
      { label: "Le faire plier à l'entraînement", outcomes: [
        { weight: 55, text: "Injouable pendant deux mois de séances : il craque et vous relance. Respect mutuel.", fx: { t: 4, m: 6, form: 6, coach: 10, dis: 4 } },
        { weight: 45, text: "Il ne pliera jamais : c'était personnel. Une demi-saison gâchée en tribune.", fx: { form: -10, mor: -8, coach: -5 } },
      ] },
    ],
  },
  {
    id: "ev_goldenboot_race", cat: "Terrain", icon: "👟", w: 10,
    cond: { aMin: 21, aMax: 32, pos: ["att"], minOvr: 74 },
    text: "À trois journées de la fin, vous êtes à deux buts du titre de meilleur buteur. Vos coéquipiers proposent de tout jouer pour vous.",
    options: [
      { label: "Accepter d'être servi en priorité", outcomes: [
        { weight: 45, text: "Titre de meilleur buteur décroché dans un dernier match d'anthologie !", fx: { rep: 8, mor: 8, award: "top_scorer" } },
        { weight: 30, text: "Le titre de buteur file pour un but. La frustration est immense.", fx: { mor: -6, form: -3 } },
        { weight: 25, text: "À jouer perso, l'équipe perd des points précieux. On vous le reproche.", fx: { rep: -4, c: -3, mor: -4 } },
      ] },
      { label: "Refuser : l'équipe avant tout", outcomes: [
        { weight: 60, text: "Votre altruisme force le respect du vestiaire, du staff, du public.", fx: { c: 5, m: 4, rep: 4 } },
        { weight: 40, text: "Élégant… mais les récompenses individuelles ne s'offrent pas deux fois.", fx: { m: 2, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_gk_penalty_wall", cat: "Terrain", icon: "🧤", w: 12,
    cond: { aMin: 20, aMax: 34, pos: ["gk"] },
    text: "Finale de coupe, séance de tirs au but. Votre analyste vidéo vous glisse une antisèche sur les tireurs… interdite par le règlement.",
    options: [
      { label: "Consulter l'antisèche discrètement", outcomes: [
        { weight: 45, text: "Trois arrêts ! Héros de la finale — et personne n'a rien vu.", fx: { rep: 10, mor: 8, trophy: "cup", trait: "clutch" } },
        { weight: 30, text: "Même avec l'antisèche, ils tirent tous parfaitement. Défaite.", fx: { mor: -6 } },
        { weight: 25, text: "La caméra vous surprend. Scandale, amende, et une réputation entachée.", fx: { rep: -7, money: -0.5, mor: -6 } },
      ] },
      { label: "Jouer à l'instinct, dans les règles", outcomes: [
        { weight: 40, text: "Deux parades divines à l'instinct pur : le trophée est pour vous !", fx: { rep: 8, m: 5, trophy: "cup", trait: "clutch" } },
        { weight: 60, text: "Vous plongez du mauvais côté à chaque fois. Le foot est cruel.", fx: { mor: -6, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_def_masterclass", cat: "Terrain", icon: "🛡️", w: 12,
    cond: { aMin: 20, aMax: 33, pos: ["def"] },
    text: "Le meilleur attaquant du monde débarque avec son équipe. Toute la semaine, la presse annonce votre « exécution publique ».",
    options: [
      { label: "Le marquer à la culotte, duel d'hommes", outcomes: [
        { weight: 40, text: "Il ne touche pas un ballon. Masterclass défensive relayée dans le monde entier.", fx: { rep: 9, m: 5, t: 3, mor: 8 } },
        { weight: 35, text: "Un duel âpre et équilibré : il marque, vous aussi votre territoire.", fx: { m: 3, rep: 2 } },
        { weight: 25, text: "Triplé dans votre zone. Les compilations de vos misères font le tour du web.", fx: { rep: -5, m: -4, mor: -8 } },
      ] },
      { label: "Miser sur le bloc collectif", outcomes: [
        { weight: 55, text: "Le piège collectif fonctionne : clean sheet et démonstration tactique.", fx: { m: 5, rep: 4 } },
        { weight: 45, text: "Le plan vole en éclats dès la 10e minute. Soirée interminable.", fx: { form: -5, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_mil_maestro", cat: "Terrain", icon: "🎼", w: 12,
    cond: { aMin: 20, aMax: 33, pos: ["mil"] },
    text: "Le coach vous confie les clés du jeu : « Tout passera par toi. » Liberté totale — et responsabilité totale en cas d'échec.",
    options: [
      { label: "Endosser le costume de maestro", outcomes: [
        { weight: 40, text: "Vous dictez chaque tempo. La presse vous surnomme « le Métronome ».", fx: { t: 6, m: 4, rep: 7 } },
        { weight: 35, text: "De belles partitions, quelques fausses notes : un rôle en construction.", fx: { t: 3, m: 2 } },
        { weight: 25, text: "Trop de ballons, trop de pertes : le système s'écroule sur vous.", fx: { m: -4, rep: -3, form: -6 } },
      ] },
      { label: "Demander un rôle plus cadré", outcomes: [
        { weight: 55, text: "Dans un rôle précis, vous devenez d'une régularité chirurgicale.", fx: { m: 4, t: 2, form: 5 } },
        { weight: 45, text: "Le coach, déçu, confie les clés à un autre. Vous voilà simple rouage.", fx: { mor: -5, rep: -2 } },
      ] },
    ],
  },
  {
    id: "ev_video_game_cover", cat: "Médias", icon: "🎮", w: 8,
    cond: { aMin: 21, aMax: 30, minRep: 60 },
    text: "Le plus grand jeu vidéo de football veut votre visage en couverture mondiale. Gloire planétaire… et la fameuse « malédiction de la jaquette ».",
    options: [
      { label: "Accepter la couverture", outcomes: [
        { weight: 50, text: "Votre visage dans tous les salons du monde. Iconique.", fx: { rep: 9, c: 5, money: 2.5 } },
        { weight: 50, text: "La malédiction frappe : blessure trois semaines après la sortie du jeu.", fx: { rep: 6, money: 2.5, inj: 10, mor: -4 } },
      ] },
      { label: "Décliner par superstition", outcomes: [
        { weight: 60, text: "Les fans rient de votre superstition… avec tendresse. Saison sereine.", fx: { m: 3, form: 3 } },
        { weight: 40, text: "Votre rival de toujours prend la couverture à votre place. Rageant.", fx: { mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_paparazzi_romance", cat: "Vie perso", icon: "💘", w: 9,
    cond: { aMin: 21, aMax: 29, minRep: 45 },
    text: "Votre idylle avec une pop star fuite en une des tabloïds. Les paparazzis campent devant le centre d'entraînement.",
    options: [
      { label: "Officialiser en grande pompe", outcomes: [
        { weight: 45, text: "Couple star planétaire : votre notoriété explose bien au-delà du foot.", fx: { rep: 8, c: 6, money: 1.5, flag: "romance" } },
        { weight: 55, text: "Chaque baisse de forme devient « la faute du couple ». Le feuilleton use.", fx: { rep: 4, form: -6, mor: -4, flag: "romance" } },
      ] },
      { label: "Protéger votre vie privée", outcomes: [
        { weight: 60, text: "Vous imposez le silence. La relation s'épanouit loin des flashs.", fx: { m: 4, mor: 7, flag: "romance" } },
        { weight: 40, text: "La traque des paparazzis devient invivable et la relation n'y survit pas.", fx: { mor: -9, m: -2 } },
      ] },
    ],
  },
  {
    id: "ev_wedding", cat: "Vie perso", icon: "💍", w: 10,
    cond: { aMin: 24, aMax: 32, flag: "romance" },
    text: "Demande en mariage acceptée ! Reste à choisir : mariage mondial retransmis en direct, ou cérémonie secrète en petit comité.",
    options: [
      { label: "Le mariage du siècle", outcomes: [
        { weight: 50, text: "Un événement planétaire. Les sponsors se battent pour être au carton d'invitation.", fx: { rep: 6, c: 4, money: 1.2, mor: 6 } },
        { weight: 50, text: "L'organisation pharaonique vous épuise en pleine saison.", fx: { rep: 4, money: -2, form: -8, mor: 4 } },
      ] },
      { label: "Une cérémonie secrète", outcomes: [
        { weight: 70, text: "Un moment parfait, rien qu'à vous. L'équilibre de vie idéal.", fx: { mor: 10, m: 4 } },
        { weight: 30, text: "Un drone de paparazzi gâche la surprise. Fureur, mais beau souvenir quand même.", fx: { mor: 6, rep: 2 } },
      ] },
    ],
  },
  {
    id: "ev_first_child", cat: "Vie perso", icon: "👶", w: 8,
    cond: { aMin: 25, aMax: 33, flag: "romance" },
    text: "Vous allez être papa ! Le terme est prévu… la semaine du plus gros match de la saison.",
    options: [
      { label: "Être à la maternité, quoi qu'il arrive", outcomes: [
        { weight: 60, text: "Vous ratez le match, mais rien n'égalera ce moment. Le vestiaire applaudit.", fx: { mor: 12, m: 5, c: 3, flag: "parent" } },
        { weight: 40, text: "L'équipe perd sans vous, certains supporters grognent. Vous ne regrettez rien.", fx: { mor: 10, rep: -2, flag: "parent" } },
      ] },
      { label: "Jouer le match, l'avion juste après", outcomes: [
        { weight: 50, text: "Décisif, célébration pouce dans la bouche, et arrivée à temps pour la naissance. Parfait.", fx: { rep: 5, mor: 10, flag: "parent" } },
        { weight: 50, text: "Vous ratez la naissance pour une défaite insipide. Ce choix vous hantera.", fx: { mor: -8, m: -3, flag: "parent" } },
      ] },
    ],
  },
  {
    id: "ev_crypto_teammate", cat: "Finance", icon: "📉", w: 9,
    cond: { aMin: 21, aMax: 32, minMoney: 2 },
    text: "Un coéquipier surexcité vous montre son portefeuille crypto : « +400% en trois mois, frérot. Mets une brique, tu me remercieras. »",
    options: [
      { label: "Investir gros", hint: "YOLO", outcomes: [
        { weight: 30, text: "Le jeton explose à la hausse. Vous passez pour un génie de la finance.", fx: { money: 4, c: 2, mor: 5 } },
        { weight: 55, text: "Rug pull. Le fondateur disparaît avec la caisse, votre brique avec.", fx: { money: -1.5, mor: -6 } },
        { weight: 15, text: "Le fisc s'intéresse de très près à ce montage. Frayeur et redressement.", fx: { money: -2.5, rep: -3, mor: -5 } },
      ] },
      { label: "Refuser poliment", outcomes: [
        { weight: 65, text: "Six mois plus tard, le coéquipier vend sa Lamborghini. Vous aviez vu juste.", fx: { m: 3 } },
        { weight: 35, text: "Le jeton fait fois dix. Vous calculez mentalement le manque à gagner à chaque entraînement.", fx: { mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_casino_night", cat: "Hygiène de vie", icon: "🎰", w: 8,
    cond: { aMin: 20, aMax: 30, minMoney: 1 },
    text: "Après une victoire, les cadres vous embarquent : jet privé, casino, champagne. « C'est comme ça qu'on soude un vestiaire, gamin. »",
    options: [
      { label: "Foncer, c'est la vie de star", outcomes: [
        { weight: 35, text: "Une soirée d'anthologie qui soude le groupe. Et vous repartez gagnant !", fx: { c: 4, mor: 6, money: 0.5, trait: "party" } },
        { weight: 40, text: "Photos qui fuitent à 5h du matin. Le club vous inflige une amende salée.", fx: { money: -0.8, rep: -4, form: -5, dis: -6, trait: "party" } },
        { weight: 25, text: "Vous perdez une somme indécente à la roulette. Silence radio.", fx: { money: -1.5, mor: -5 } },
      ] },
      { label: "Rentrer dormir comme un moine", outcomes: [
        { weight: 60, text: "« Le robot », se moquent-ils gentiment. Vos stats parlent pour vous.", fx: { form: 6, p: 2 } },
        { weight: 40, text: "Vous restez un peu à l'écart du noyau dur du vestiaire.", fx: { form: 4, c: -2 } },
      ] },
    ],
  },
  {
    id: "ev_charity_foundation", cat: "Vie perso", icon: "🤝", w: 8,
    cond: { aMin: 24, aMax: 34, minMoney: 5 },
    text: "Votre conseiller propose de créer une fondation à votre nom : écoles de foot, bourses d'études, retour aux sources.",
    options: [
      { label: "Créer la fondation, en grand", outcomes: [
        { weight: 60, text: "Des centaines de gamins équipés et scolarisés. Votre image dépasse le sport.", fx: { money: -3, rep: 8, mor: 8, c: 4, trait: "zen" } },
        { weight: 40, text: "Un partenaire indélicat détourne des fonds : scandale malgré vous, vite éteint.", fx: { money: -3, rep: -2, mor: -5 } },
      ] },
      { label: "Donner discrètement, sans structure", outcomes: [
        { weight: 70, text: "Personne ne le sait, et c'est très bien comme ça. Votre karma vous remercie.", fx: { money: -1, mor: 6 } },
        { weight: 30, text: "Un journaliste révèle vos dons cachés : l'effet est encore plus fort.", fx: { money: -1, rep: 6, mor: 5 } },
      ] },
    ],
  },
  {
    id: "ev_docuseries", cat: "Médias", icon: "🎬", w: 8,
    cond: { aMin: 23, aMax: 33, minRep: 55 },
    text: "Une plateforme mondiale veut tourner une série documentaire sur votre saison : caméras au vestiaire, à la maison, partout.",
    options: [
      { label: "Ouvrir toutes les portes", outcomes: [
        { weight: 45, text: "La série cartonne : le public découvre l'humain derrière le joueur.", fx: { rep: 8, c: 6, money: 2 } },
        { weight: 30, text: "Une dispute de vestiaire filmée fuite au montage. Le groupe est furieux.", fx: { rep: 4, money: 2, mor: -7, c: -2 } },
        { weight: 25, text: "Les caméras pèsent sur votre spontanéité : une saison sous surveillance.", fx: { rep: 5, money: 2, form: -7 } },
      ] },
      { label: "Refuser : le vestiaire est sacré", outcomes: [
        { weight: 70, text: "Le groupe apprécie. Ce qui se passe au vestiaire reste au vestiaire.", fx: { c: 3, m: 3, mor: 4 } },
        { weight: 30, text: "La plateforme filme votre rival à la place. Sa cote médiatique explose.", fx: { mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_sponsor_war", cat: "Finance", icon: "👕", w: 8,
    cond: { aMin: 22, aMax: 31, minRep: 50 },
    text: "Votre équipementier personnel et celui du club entrent en guerre : chaussures floutées, menaces de procès. Il faut choisir un camp.",
    options: [
      { label: "Rester fidèle à votre marque, quitte à payer l'amende", outcomes: [
        { weight: 55, text: "Votre marque récompense la loyauté : contrat à vie signé.", fx: { money: 3, rep: 3 } },
        { weight: 45, text: "Le club retient l'affront : vos relations avec la direction se glacent.", fx: { money: 1.5, mor: -5, rep: -2 } },
      ] },
      { label: "Plier face au club", outcomes: [
        { weight: 60, text: "La paix vaut mieux qu'un procès. Le club vous revalorise en douce.", fx: { money: 0.8, m: 2 } },
        { weight: 40, text: "Votre équipementier vous lâche pour un jeune plus docile.", fx: { money: -1, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_worldrecord_bid", cat: "Mercato", icon: "💎", w: 10,
    cond: { aMin: 23, aMax: 28, minRep: 82, minOvr: 86 },
    text: "Une offre de transfert RECORD DU MONDE tombe. Le président convoque la presse en urgence. La planète foot ne parle que de vous.",
    options: [
      { label: "Accepter le transfert du siècle", outcomes: [
        { weight: 40, text: "Le prix devient un détail : vous êtes à la hauteur de l'événement dès le premier match.", fx: { rep: 10, money: 4, transfer: { d: 1, cross: true } } },
        { weight: 35, text: "Chaque contrôle raté est mis en rapport avec le montant. Une pression inhumaine.", fx: { rep: 4, money: 4, m: -5, form: -8, transfer: { d: 1, cross: true } } },
        { weight: 25, text: "Le transfert capote au dernier jour du mercato : dossier médical contesté. Malaise général.", fx: { mor: -8, rep: -3 } },
      ] },
      { label: "Refuser et prolonger ici", outcomes: [
        { weight: 60, text: "Le stade entier chante votre nom. Statue en préparation.", fx: { rep: 7, mor: 8, money: 2, trait: "loyal" } },
        { weight: 40, text: "Le club vend un cadre pour compenser… et l'équipe régresse.", fx: { mor: -5, form: -4, money: 2 } },
      ] },
    ],
  },
  {
    id: "ev_toxic_socials", cat: "Réseaux", icon: "🌪️", w: 9,
    cond: { aMin: 20, aMax: 32, maxForm: 55 },
    text: "Après trois matchs ratés, les réseaux deviennent un déversoir : menaces, montages humiliants, votre famille est visée.",
    options: [
      { label: "Tout couper : détox numérique totale", outcomes: [
        { weight: 65, text: "Le silence numérique vous ressource. Vous redécouvrez le plaisir de jouer.", fx: { m: 6, mor: 8, form: 6, trait: "zen" } },
        { weight: 35, text: "L'absence alimente les rumeurs de départ, mais votre tête va mieux.", fx: { m: 4, mor: 5, rep: -2 } },
      ] },
      { label: "Répondre par une lettre ouverte", outcomes: [
        { weight: 45, text: "Votre lettre digne et poignante retourne l'opinion. Le stade vous ovationne.", fx: { rep: 6, c: 5, mor: 7 } },
        { weight: 55, text: "Chaque phrase est disséquée, moquée, détournée. Vous avez nourri le monstre.", fx: { rep: -4, mor: -7 } },
      ] },
    ],
  },
  {
    id: "ev_burnout", cat: "Vie perso", icon: "🕳️", w: 10,
    cond: { aMin: 22, aMax: 33, maxMor: 32 },
    text: "Plus d'envie, plus de sommeil, plus de plaisir. Vous connaissez le mot mais n'osez pas le prononcer : dépression.",
    options: [
      { label: "En parler publiquement", hint: "Courageux", outcomes: [
        { weight: 60, text: "Votre témoignage libère la parole dans tout le sport. Un courage salué unanimement.", fx: { m: 8, mor: 12, rep: 6, c: 4 } },
        { weight: 40, text: "Certains y voient une faiblesse. Mais vous vous êtes choisi, et c'est l'essentiel.", fx: { m: 6, mor: 10, rep: -2 } },
      ] },
      { label: "Consulter en secret et serrer les dents", outcomes: [
        { weight: 55, text: "Le suivi psychologique porte ses fruits, loin des regards.", fx: { m: 5, mor: 8 } },
        { weight: 45, text: "Le masque tient en public, mais le poids reste là, tapi.", fx: { mor: 4, form: -4 } },
      ] },
    ],
  },
  {
    id: "ev_tax_scheme", cat: "Finance", icon: "🏝️", w: 8,
    cond: { aMin: 24, aMax: 33, minMoney: 12 },
    text: "Un conseiller en gestion « très demandé » propose un montage offshore : « Tout le monde le fait. Optimisation, pas fraude. »",
    options: [
      { label: "Signer le montage", hint: "Glissant", outcomes: [
        { weight: 100, text: "Des millions économisés, un sourire en coin. Le montage tient… tant que personne ne fouille.", fx: { money: 3, sched: { id: "ev_offshore_raid", inYears: 3 } } },
      ] },
      { label: "Payer vos impôts, dormir tranquille", outcomes: [
        { weight: 100, text: "Votre comptable soupire, votre sommeil vous remercie.", fx: { m: 3, mor: 4 } },
      ] },
    ],
  },

  // ══════════════ STORYLINE : Le Clan (agence familiale) ══════════════
  {
    id: "ev_clan_1", cat: "Entourage", icon: "🤵", w: 9,
    cond: { aMin: 19, aMax: 23 },
    text: "Votre grand frère lâche son travail : « Je deviens ton agent. La famille d'abord, on se fera jamais trahir. »",
    options: [
      { label: "Confier votre carrière au clan", outcomes: [
        { weight: 55, text: "Le clan se structure autour de vous. Un cocon en béton armé.", fx: { mor: 7, m: 3, flag: "clan" } },
        { weight: 45, text: "Il apprend le métier sur le tas… et rate quelques belles fenêtres de tir.", fx: { mor: 4, money: -0.5, flag: "clan" } },
      ] },
      { label: "Refuser avec tact", outcomes: [
        { weight: 55, text: "Il comprend, à contrecœur. Les repas de famille restent un peu froids.", fx: { mor: -4 } },
        { weight: 45, text: "Il le vit comme une trahison. La fracture familiale vous poursuit.", fx: { mor: -8, m: -2 } },
      ] },
    ],
  },
  {
    id: "ev_clan_2", cat: "Entourage", icon: "💼", w: 12,
    cond: { aMin: 24, aMax: 31, flag: "clan" },
    text: "Le clan a grandi : votre frère gère désormais cinq joueurs. Un audit révèle des commissions douteuses prélevées… sur VOS contrats.",
    options: [
      { label: "Couvrir la famille, régler ça en interne", outcomes: [
        { weight: 50, text: "Explication virile, remboursement, pacte refondé. Le clan en sort plus fort.", fx: { mor: 5, m: 4, money: 1 } },
        { weight: 50, text: "Il recommence deux ans plus tard. L'argent aura eu raison du sang.", fx: { money: -3, mor: -10 } },
      ] },
      { label: "Rompre professionnellement, publiquement", outcomes: [
        { weight: 55, text: "Douloureux mais net. Un agent pro reprend vos intérêts, vos revenus décollent.", fx: { money: 2.5, mor: -6, rep: 2 } },
        { weight: 45, text: "La presse people se régale du déballage familial. Tout le monde y perd.", fx: { rep: -4, mor: -9 } },
      ] },
    ],
  },

  // ══════════════ STORYLINE : Rivalité directe ══════════════
  {
    id: "ev_rival_duel", cat: "Rivalité", icon: "⚔️", w: 11,
    cond: { aMin: 23, aMax: 31, minRep: 55 },
    text: "Les médias ont trouvé leur feuilleton : {rival} contre vous. Ce soir, confrontation directe au sommet, le monde entier compare.",
    options: [
      { label: "Attiser le duel en interview d'avant-match", outcomes: [
        { weight: 40, text: "Vous gagnez le match ET le duel de punchlines. {rival} rumine.", fx: { rep: 7, c: 5, mor: 7 } },
        { weight: 35, text: "{rival} marche sur vous pendant 90 minutes. Vos mots se retournent en mèmes.", fx: { rep: -4, mor: -7 } },
        { weight: 25, text: "Match nul épique, duel dans le duel : le foot est gagnant, vous aussi.", fx: { rep: 4, c: 3 } },
      ] },
      { label: "Laisser parler le terrain", outcomes: [
        { weight: 55, text: "Performance majuscule sans un mot de trop. La classe à l'état pur.", fx: { rep: 5, m: 4, form: 4 } },
        { weight: 45, text: "{rival} fait le show, vous restez dans l'ombre. Round perdu.", fx: { mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_rival_respect", cat: "Rivalité", icon: "🤝", w: 10,
    cond: { aMin: 28, aMax: 34, minRep: 60 },
    text: "Blessé, {rival} traverse la pire période de sa carrière. Un journaliste vous tend le micro : « Un mot pour votre rival de toujours ? »",
    options: [
      { label: "Un hommage sincère et public", outcomes: [
        { weight: 70, text: "Votre message émeut le monde du foot. {rival} répond : « Le plus grand, c'est lui. »", fx: { rep: 6, c: 5, mor: 6 } },
        { weight: 30, text: "Certains fans y voient de la condescendance déguisée. On ne peut pas plaire à tous.", fx: { rep: 2, c: 2 } },
      ] },
      { label: "Une pique bien sentie", hint: "Sans pitié", outcomes: [
        { weight: 40, text: "La punchline devient culte. Cruelle, mais culte.", fx: { c: 4, rep: 3, mor: 3 } },
        { weight: 60, text: "Frapper un homme à terre : l'opinion ne vous le pardonne pas.", fx: { rep: -6, mor: -4 } },
      ] },
    ],
  },

  // ══════════════ ANNÉES CDM ══════════════
  {
    id: "ev_wc_prep", cat: "Sélection", icon: "🏆", w: 18,
    cond: { aMin: 19, aMax: 36, nat: true, wc: true }, once: false,
    text: "Année de Coupe du Monde. Le sélectionneur vous laisse choisir votre préparation : gestion fine ou charge maximale en club.",
    options: [
      { label: "Se préserver pour le Mondial", outcomes: [
        { weight: 60, text: "Vous arrivez au tournoi frais comme un gardon, affamé de gloire.", fx: { form: 10, p: 2, flag: "wc_fresh" } },
        { weight: 40, text: "Le club tousse : votre gestion « personnelle » agace en interne.", fx: { form: 8, rep: -2, mor: -3, flag: "wc_fresh" } },
      ] },
      { label: "Tout donner sur les deux tableaux", outcomes: [
        { weight: 45, text: "Une saison XXL de bout en bout : vous arrivez lancé comme une fusée.", fx: { t: 2, rep: 4, form: 4 } },
        { weight: 55, text: "L'organisme sature juste avant le tournoi. Mauvais timing.", fx: { form: -10, p: -2 } },
      ] },
    ],
  },
  {
    id: "ev_nat_bench", cat: "Sélection", icon: "😤", w: 9,
    cond: { aMin: 26, aMax: 33, nat: true },
    text: "En sélection, un petit nouveau a pris votre place. Le sélectionneur ne vous appelle plus que pour « l'expérience ».",
    options: [
      { label: "Prendre votre retraite internationale", outcomes: [
        { weight: 55, text: "Départ digne, hommage national. Votre corps vous dit merci chaque week-end.", fx: { form: 6, mor: 4, natRetire: true } },
        { weight: 45, text: "Six mois plus tard, la sélection s'écroule sans vous. Trop tard pour revenir.", fx: { form: 5, mor: -4, natRetire: true } },
      ] },
      { label: "Vous battre pour reconquérir le maillot", outcomes: [
        { weight: 45, text: "Votre abnégation force la main du sélectionneur : de nouveau titulaire !", fx: { m: 5, rep: 4, mor: 6 } },
        { weight: 55, text: "Des bancs de touche en tribunes d'honneur : une lente humiliation.", fx: { mor: -7, form: -4 } },
      ] },
    ],
  },

  // ══════════════ CAP DES 27+ : L'OFFRE DORÉE ══════════════
  {
    id: "ev_desert_gold", cat: "Mercato", icon: "🏜️", w: 12,
    cond: { aMin: 27, aMax: 34, minRep: 55, exoticClub: false },
    text: "Un émissaire du Golfe pose une offre irréelle sur la table : le triple de votre salaire, un palace, un rôle d'icône. Le sportif, lui…",
    options: [
      { label: "Prendre l'or du désert", hint: "Jackpot", outcomes: [
        { weight: 50, text: "Accueil pharaonique. Votre compte en banque ne connaîtra plus jamais l'inquiétude.", fx: { money: 8, rep: -4, transfer: { d: -1, gulf: true }, trait: "mercenary" } },
        { weight: 50, text: "L'argent coule, mais le niveau vous manque. L'Europe continue sans vous.", fx: { money: 8, rep: -6, mor: -5, transfer: { d: -1, gulf: true } } },
      ] },
      { label: "Refuser : la compétition avant tout", outcomes: [
        { weight: 60, text: "Le peuple du foot salue le choix du cœur. Votre légende sportive s'épaissit.", fx: { rep: 5, mor: 5 } },
        { weight: 40, text: "Un an plus tard, l'offre a été retirée pour toujours. Votre banquier ne s'en remet pas.", fx: { m: 2, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_release_clause", cat: "Mercato", icon: "📜", w: 9,
    cond: { aMin: 23, aMax: 29, minRep: 60, levels: ["d2", "d1"] },
    text: "Un géant active votre clause libératoire. Votre président, en larmes, supplie publiquement : « Reste un an de plus, on jouera le titre. »",
    options: [
      { label: "Partir : la clause est la clause", outcomes: [
        { weight: 55, text: "Un départ propre, dans les règles. Le grand saut tant attendu.", fx: { rep: 3, transfer: { d: 1 } } },
        { weight: 45, text: "Les adieux sont glacés : votre nom est sifflé à chaque retour au stade.", fx: { rep: -3, mor: -4, transfer: { d: 1 } } },
      ] },
      { label: "Rester l'année de la gagne", outcomes: [
        { weight: 40, text: "Pari gagné : une saison héroïque et un titre historique avec votre club de cœur !", fx: { rep: 8, mor: 10, trophy: "league", trait: "loyal" } },
        { weight: 60, text: "Le titre échappe de peu, et le géant a recruté ailleurs. La fenêtre s'est refermée.", fx: { mor: -6, trait: "loyal" } },
      ] },
    ],
  },
  {
    id: "ev_abroad_adventure", cat: "Mercato", icon: "✈️", w: 10,
    cond: { aMin: 24, aMax: 30, abroad: false },
    text: "Un championnat étranger réputé pour son intensité tactique vous fait une cour assidue depuis des mois.",
    options: [
      { label: "Tenter l'aventure à l'étranger", outcomes: [
        { weight: 40, text: "Le dépaysement vous révèle : nouveau pays, nouveau statut de star.", fx: { t: 3, rep: 7, transfer: { d: 0, cross: true } } },
        { weight: 35, text: "L'adaptation est correcte, l'expérience humaine inoubliable.", fx: { m: 4, c: 3, transfer: { d: 0, cross: true } } },
        { weight: 25, text: "La langue, la tactique, la solitude : tout est plus dur que prévu.", fx: { m: -4, mor: -8, transfer: { d: 0, cross: true } } },
      ] },
      { label: "Rester dans votre zone de confort", outcomes: [
        { weight: 55, text: "Vos repères font votre force : une saison de patron.", fx: { form: 5, m: 2 } },
        { weight: 45, text: "Le confort endort : votre progression stagne doucement.", fx: { t: -1, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_mentor_returns", cat: "Vestiaire", icon: "🧓", w: 8,
    cond: { aMin: 26, aMax: 33 },
    text: "Votre tout premier éducateur, celui qui vous a mis un ballon dans les pieds, devient adjoint au club. Il n'a pas changé : exigeant et cash.",
    options: [
      { label: "Retravailler les bases avec lui", outcomes: [
        { weight: 65, text: "Retour aux fondamentaux, redécouverte du plaisir brut. Une cure de jouvence.", fx: { t: 4, mor: 8, form: 6 } },
        { weight: 35, text: "Ses méthodes à l'ancienne passent mal auprès du reste du groupe, mais vous, vous savez.", fx: { t: 3, mor: 4, c: -1 } },
      ] },
      { label: "Garder une distance polie", outcomes: [
        { weight: 50, text: "Chacun son rôle, le respect demeure.", fx: { m: 2 } },
        { weight: 50, text: "Son regard déçu à chaque croisement dans le couloir pèse plus que prévu.", fx: { mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_intl_disillusion", cat: "Sélection", icon: "🇺🇳", w: 8,
    cond: { aMin: 24, aMax: 30, nat: true, maxForm: 60 },
    text: "En sélection, l'ambiance est délétère : primes contestées, clans, fédération dépassée. Des cadres préparent un boycott.",
    options: [
      { label: "Rejoindre la fronde des cadres", outcomes: [
        { weight: 45, text: "Le rapport de force paie : la fédération cède, le groupe ressoudé vous respecte.", fx: { c: 5, m: 3, rep: 3 } },
        { weight: 55, text: "L'opinion publique massacre les « millionnaires ingrats ». Votre image trinque.", fx: { rep: -6, mor: -5 } },
      ] },
      { label: "Rester neutre et jouer au foot", outcomes: [
        { weight: 60, text: "Au-dessus de la mêlée, vous êtes épargné par le scandale.", fx: { m: 3 } },
        { weight: 40, text: "« Ni chaud ni froid » : les deux camps vous le reprochent.", fx: { c: -2, mor: -4 } },
      ] },
    ],
  },

  // ══════════════ FIN DE CARRIÈRE (30+) ══════════════
  {
    id: "ev_mentor_role", cat: "Vestiaire", icon: "🧭", w: 11,
    cond: { aMin: 30, aMax: 34 },
    text: "Le club vous propose un nouveau rôle : moins de matchs, plus de transmission. Derrière vous, une pépite de 18 ans piaffe.",
    options: [
      { label: "Devenir le mentor de la pépite", outcomes: [
        { weight: 55, text: "Votre héritage prend forme : la pépite explose et vous cite à chaque interview.", fx: { m: 6, c: 5, rep: 5, trait: "leader" } },
        { weight: 45, text: "Élégant crépuscule : moins de gloire, plus de sens.", fx: { m: 4, mor: 5 } },
      ] },
      { label: "Défendre votre place, point final", outcomes: [
        { weight: 40, text: "Été indien : vous réalisez une de vos meilleures saisons !", fx: { t: 4, rep: 7, form: 8 } },
        { weight: 60, text: "Le corps proteste : les blessures s'enchaînent, la pépite en profite.", fx: { p: -6, inj: 10, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_tv_offer", cat: "Médias", icon: "📺", w: 8,
    cond: { aMin: 30, aMax: 35, minRep: 45 },
    text: "Une grande chaîne vous veut comme consultant vedette, en parallèle de votre fin de carrière. Double casquette, double exposition.",
    options: [
      { label: "Accepter le rôle TV", outcomes: [
        { weight: 50, text: "Le naturel crève l'écran : une reconversion en or se dessine.", fx: { c: 6, rep: 5, money: 1.5, flag: "media_career" } },
        { weight: 50, text: "Analyser ses futurs adversaires crée des frictions : « De quel côté es-tu ? »", fx: { money: 1.5, mor: -5, form: -4 } },
      ] },
      { label: "Pas tant que vous êtes joueur", outcomes: [
        { weight: 100, text: "À 100% joueur jusqu'au bout. La télé attendra bien un peu.", fx: { form: 4, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_boardroom_path", cat: "Reconversion", icon: "🏛️", w: 8,
    cond: { aMin: 31, aMax: 35 },
    text: "Le président vous imagine dans son fauteuil un jour : il propose de vous former aux coulisses — budgets, mercato, politique interne.",
    options: [
      { label: "Découvrir les coulisses du pouvoir", outcomes: [
        { weight: 55, text: "Le costume vous va étonnamment bien : un avenir de dirigeant se dessine.", fx: { m: 5, c: 4, flag: "boardroom" } },
        { weight: 45, text: "Les vestiaires vous voient désormais comme « l'œil de la direction ». Ambigu.", fx: { c: -2, mor: -4, flag: "boardroom" } },
      ] },
      { label: "Joueur un jour, joueur toujours", outcomes: [
        { weight: 60, text: "Concentré sur le terrain, vous savourez chaque minute restante.", fx: { form: 5, mor: 4 } },
        { weight: 40, text: "L'occasion ne se représentera pas de sitôt.", fx: { m: 1 } },
      ] },
    ],
  },
  {
    id: "ev_family_pull", cat: "Vie perso", icon: "🏡", w: 9,
    cond: { aMin: 31, aMax: 35, abroad: true },
    text: "Les valises n'ont jamais pesé aussi lourd. Un club proche de votre ville natale offre un dernier contrat, à vingt minutes de la maison familiale.",
    options: [
      { label: "Rentrer au pays", outcomes: [
        { weight: 55, text: "Jouer devant les vôtres, dormir chez vous : le foot redevient un jeu.", fx: { mor: 10, m: 4, transfer: { d: -1, home: true } } },
        { weight: 45, text: "Le niveau local vous fait mesurer le chemin parcouru… et celui qui reste.", fx: { mor: 5, rep: -3, transfer: { d: -1, home: true } } },
      ] },
      { label: "Finir au sommet, loin des vôtres", outcomes: [
        { weight: 50, text: "Le haut niveau jusqu'à la dernière goutte. La famille comprend.", fx: { rep: 3, form: 4 } },
        { weight: 50, text: "Les visios ne remplacent rien. Le vague à l'âme s'installe.", fx: { mor: -7 } },
      ] },
    ],
  },
  {
    id: "ev_testimonial", cat: "Hommage", icon: "🎗️", w: 8,
    cond: { aMin: 33, aMax: 41, minRep: 65, minClubSeasons: 5 },
    text: "Votre club organise un match d'hommage : anciennes gloires, stade complet, recettes au choix — pour vous ou pour une cause.",
    options: [
      { label: "Reverser la recette à une cause", outcomes: [
        { weight: 100, text: "Une soirée magique et deux millions reversés. La classe, jusqu'au bout.", fx: { rep: 7, mor: 10, c: 4 } },
      ] },
      { label: "Une retraite, ça se prépare", outcomes: [
        { weight: 60, text: "Personne ne vous en tient rigueur : vous avez tant donné.", fx: { money: 2, mor: 5 } },
        { weight: 40, text: "Quelques éditorialistes tiquent sur « l'hommage payant ».", fx: { money: 2, rep: -3 } },
      ] },
    ],
  },
  {
    id: "ev_coach_diploma", cat: "Reconversion", icon: "📋", w: 8,
    cond: { aMin: 32, aMax: 36 },
    text: "Les diplômes d'entraîneur se préparent maintenant ou jamais : cours du soir, mémoires, stages — en parallèle des matchs.",
    options: [
      { label: "Passer les diplômes en jouant", outcomes: [
        { weight: 60, text: "Diplômé avec les félicitations. Le banc de touche n'attend plus que vous.", fx: { m: 6, flag: "coach_diploma" } },
        { weight: 40, text: "Le cumul est épuisant, mais le papier est en poche.", fx: { m: 4, form: -5, flag: "coach_diploma" } },
      ] },
      { label: "Chaque chose en son temps", outcomes: [
        { weight: 100, text: "Le terrain d'abord. La reconversion attendra la retraite.", fx: { form: 3 } },
      ] },
    ],
  },
  {
    id: "ev_statue", cat: "Hommage", icon: "🗿", w: 9,
    cond: { aMin: 32, aMax: 36, minRep: 85, minClubSeasons: 7 },
    text: "Le club annonce l'inauguration de VOTRE statue devant le stade. Le sculpteur vous montre la maquette… et le nez est raté.",
    options: [
      { label: "Sourire et inaugurer quand même", outcomes: [
        { weight: 60, text: "Le nez raté devient culte : les selfies affluent du monde entier.", fx: { rep: 5, c: 4, mor: 6 } },
        { weight: 40, text: "L'émotion balaie tout : votre légende est coulée dans le bronze.", fx: { rep: 6, mor: 8 } },
      ] },
      { label: "Demander discrètement une retouche", outcomes: [
        { weight: 50, text: "Retouche faite, inauguration grandiose six mois plus tard.", fx: { rep: 5, mor: 6 } },
        { weight: 50, text: "« Le joueur qui a fait refaire sa statue » : la presse s'amuse, vous un peu moins.", fx: { rep: 2, mor: -2 } },
      ] },
    ],
  },
  {
    id: "ev_club_buyout", cat: "Reconversion", icon: "🏦", w: 8,
    cond: { aMin: 33, aMax: 36, minMoney: 30, originLevel: ["regional", "d2"] },
    text: "Votre club formateur est au bord de la faillite. Votre fortune pourrait le sauver : rachat, présidence, projet de renaissance.",
    options: [
      { label: "Racheter le club de vos débuts", outcomes: [
        { weight: 55, text: "L'enfant du club devient son sauveur. Une deuxième histoire d'amour commence.", fx: { money: -15, rep: 9, mor: 10, flag: "club_owner" } },
        { weight: 45, text: "Le sauvetage est un gouffre financier, mais le club vit. Aucun regret.", fx: { money: -20, rep: 6, mor: 6, flag: "club_owner" } },
      ] },
      { label: "Aider sans reprendre les rênes", outcomes: [
        { weight: 70, text: "Votre prêt relais sauve les meubles. Le club vous doit sa survie, en toute discrétion.", fx: { money: -5, mor: 5, rep: 3 } },
        { weight: 30, text: "Sans pilote, le club replonge deux ans plus tard. Vous aurez essayé.", fx: { money: -5, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_last_dance", cat: "Retraite", icon: "🕺", w: 14,
    cond: { aMin: 34, aMax: 40 },
    text: "Le corps envoie des factures, la tête hésite. Tout le monde pose LA question : encore une saison, ou tirer sa révérence ?",
    options: [
      { label: "Une dernière danse", outcomes: [
        { weight: 40, text: "Une tournée d'adieux dans chaque stade : le foot vous dit merci.", fx: { mor: 8, rep: 4 } },
        { weight: 35, text: "Une saison honorable, sans plus. Il fallait la vivre pour le savoir.", fx: { mor: 3 } },
        { weight: 25, text: "Le physique lâche pour de bon : une saison de trop, disent-ils.", fx: { p: -8, inj: 12, mor: -6 } },
      ] },
      { label: "Annoncer la retraite en fin de saison", outcomes: [
        { weight: 60, text: "Libéré de tout calcul, vous savourez chaque match comme un cadeau.", fx: { mor: 8, form: 6, retire: true } },
        { weight: 40, text: "L'annonce émeut la planète foot. Chaque stade se lève à votre sortie.", fx: { rep: 5, mor: 8, retire: true } },
      ] },
    ],
  },
  {
    id: "ev_player_coach", cat: "Retraite", icon: "🎓", w: 10,
    cond: { aMin: 35, aMax: 41 },
    text: "Un club modeste vous offre un rôle de joueur-entraîneur pour votre toute dernière saison : transmettre en jouant encore un peu.",
    options: [
      { label: "Accepter cette passation", outcomes: [
        { weight: 60, text: "Vous descendez de plusieurs étages pour marquer ce petit club à jamais : chaque jeune retient vos leçons.", fx: { m: 5, rep: 4, mor: 8, retire: true, flag: "coach_diploma", transfer: { toLevel: "regional", direct: true } } },
        { weight: 40, text: "Le double rôle dans ce club modeste est bancal, mais l'expérience est unique.", fx: { m: 3, mor: 4, retire: true, transfer: { toLevel: "regional", direct: true } } },
      ] },
      { label: "Rester simple joueur jusqu'au bout", outcomes: [
        { weight: 60, text: "Une dernière saison tout en fraîcheur, comme un gamin.", fx: { mor: 7, form: 4 } },
        { weight: 40, text: "Une fin discrète, presque anonyme. Le rideau tombe doucement.", fx: { mor: 2 } },
      ] },
    ],
  },

  // ══════════════ GÉNÉRIQUES (rejouables, faible poids) ══════════════
  {
    id: "gen_training_camp", cat: "Préparation", icon: "⛰️", w: 4, once: false,
    cond: { aMin: 17, aMax: 34 },
    text: "Le club propose un stage commando en altitude pendant la trêve : une semaine de souffrance pour préparer la suite.",
    options: [
      { label: "S'infliger le stage", outcomes: [
        { weight: 65, text: "Revenu affûté comme une lame.", fx: { p: 4, form: 6 } },
        { weight: 35, text: "Trop de charge : l'organisme proteste.", fx: { form: -4, p: 1 } },
      ] },
      { label: "Préférer une vraie coupure", outcomes: [
        { weight: 60, text: "Des batteries pleines et la tête légère.", fx: { mor: 6, form: 3 } },
        { weight: 40, text: "La reprise pique un peu plus que pour les autres.", fx: { form: -3, mor: 3 } },
      ] },
    ],
  },
  {
    id: "gen_new_signing", cat: "Vestiaire", icon: "🆕", w: 4, once: false,
    cond: { aMin: 19, aMax: 34 },
    text: "Le club recrute une doublure ambitieuse à votre poste, présentée en grande pompe. Le message est limpide.",
    options: [
      { label: "En faire un moteur de motivation", outcomes: [
        { weight: 60, text: "La concurrence vous tire vers le haut : votre niveau grimpe.", fx: { t: 3, form: 5, m: 2 } },
        { weight: 40, text: "Le duel est usant, mais votre place tient.", fx: { m: 3, form: 2, mor: -2 } },
      ] },
      { label: "Ignorer le signal", outcomes: [
        { weight: 50, text: "Votre statut parle de lui-même : la recrue s'installe sur le banc.", fx: { form: 2 } },
        { weight: 50, text: "La recrue grignote vos minutes, match après match.", fx: { form: -6, mor: -5 } },
      ] },
    ],
  },
  {
    id: "gen_asia_tour", cat: "Médias", icon: "🛫", w: 3, once: false,
    cond: { aMin: 20, aMax: 33, minRep: 40 },
    text: "Tournée promotionnelle en Asie : quatre pays en huit jours, bains de foule, matchs d'exhibition à minuit heure locale.",
    options: [
      { label: "Jouer le jeu à fond", outcomes: [
        { weight: 60, text: "Des millions de nouveaux fans scandant votre nom. Le marketing jubile.", fx: { rep: 5, c: 3, money: 0.8, form: -4 } },
        { weight: 40, text: "Le décalage horaire vous poursuit toute la reprise.", fx: { rep: 3, money: 0.8, form: -7 } },
      ] },
      { label: "Négocier une dispense partielle", outcomes: [
        { weight: 60, text: "Deux jours sur place, l'essentiel préservé.", fx: { rep: 1, form: 3 } },
        { weight: 40, text: "Le service marketing vous inscrit sur sa liste noire.", fx: { mor: -3, form: 3 } },
      ] },
    ],
  },
  {
    id: "gen_tactics_shift", cat: "Terrain", icon: "♟️", w: 4, once: false,
    cond: { aMin: 18, aMax: 35 },
    text: "Nouveau système de jeu au club : votre rôle change sensiblement. Le staff attend votre adhésion.",
    options: [
      { label: "Adhérer sans réserve", outcomes: [
        { weight: 60, text: "Vous êtes le premier relais du coach sur le terrain.", fx: { m: 3, t: 2 } },
        { weight: 40, text: "Le système bride un peu vos qualités, mais le collectif gagne.", fx: { m: 2, form: -3 } },
      ] },
      { label: "Émettre des réserves en privé", outcomes: [
        { weight: 50, text: "Le coach amende son plan avec vos idées : un duo qui fonctionne.", fx: { m: 4, c: 2 } },
        { weight: 50, text: "Vos réserves fuitent. Ambiance méfiante pendant des semaines.", fx: { mor: -4, c: -1 } },
      ] },
    ],
  },
  {
    id: "gen_keep_fit", cat: "Préparation", icon: "🧬", w: 3, once: false,
    cond: { aMin: 28, aMax: 36 },
    text: "Un préparateur de renom propose un protocole personnalisé « longévité » : cryothérapie, sommeil monitored, données à la seconde.",
    options: [
      { label: "Investir dans votre corps", outcomes: [
        { weight: 70, text: "Des jambes de 25 ans dans un corps qui n'en a plus. Bluffant.", fx: { p: 5, form: 5, money: -0.6 } },
        { weight: 30, text: "Le protocole est contraignant pour des gains marginaux.", fx: { p: 2, money: -0.6, mor: -2 } },
      ] },
      { label: "Rester sur vos routines", outcomes: [
        { weight: 55, text: "Vos vieilles recettes tiennent encore la route.", fx: { form: 2 } },
        { weight: 45, text: "Les données ne mentent pas : vous déclinez plus vite que les autres.", fx: { p: -3, mor: -3 } },
      ] },
    ],
  },

  // ══════════════ JEUNESSE & FAMILLE (v3) ══════════════
  {
    id: "ev_parents_divorce", cat: "Vie perso", icon: "💔", w: 9,
    cond: { aMin: 16, aMax: 18 },
    text: "Vos parents se séparent en pleine saison. Les valises, les silences, les week-ends coupés en deux. Le centre de formation devient votre seul repère.",
    options: [
      { label: "Vous réfugier dans le travail", outcomes: [
        { weight: 55, text: "Le terrain devient votre exutoire : vous n'avez jamais autant progressé.", fx: { t: 4, dis: 6, mor: -4 } },
        { weight: 45, text: "Vous encaissez en silence, mais quelque chose s'est fissuré.", fx: { m: -3, mor: -8, dis: 4 } },
      ] },
      { label: "Prendre du temps pour votre famille", outcomes: [
        { weight: 60, text: "Vous aidez chacun à retomber sur ses pieds. Une maturité qui changera l'homme, donc le joueur.", fx: { m: 6, mor: 4, form: -4 } },
        { weight: 40, text: "Les allers-retours vous épuisent, la saison passe au second plan.", fx: { form: -8, m: 3, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_school_finals", cat: "Vie perso", icon: "📚", w: 9,
    cond: { aMin: 17, aMax: 18, flag: "diploma" },
    text: "Les examens finaux tombent la semaine d'un tournoi décisif avec les U19. Le lycée refuse de déplacer les épreuves.",
    options: [
      { label: "Passer les examens, rater le tournoi", outcomes: [
        { weight: 65, text: "Diplôme en poche. Une sécurité pour toute la vie, quoi qu'il arrive sur le terrain.", fx: { m: 5, dis: 4, mor: 3, flag: "graduated" } },
        { weight: 35, text: "Diplômé… pendant que votre remplaçant brillait au tournoi devant les recruteurs.", fx: { m: 4, rep: -3, flag: "graduated" } },
      ] },
      { label: "Jouer le tournoi, tant pis pour les épreuves", outcomes: [
        { weight: 45, text: "Un tournoi majuscule qui fait parler les recruteurs. L'école attendra… pour toujours.", fx: { rep: 6, t: 2, clearFlag: "diploma", flag: "no_diploma" } },
        { weight: 55, text: "Un tournoi quelconque, un diplôme envolé. Le pire des deux mondes.", fx: { mor: -6, clearFlag: "diploma", flag: "no_diploma" } },
      ] },
    ],
  },
  {
    id: "ev_academy_hazing", cat: "Vestiaire", icon: "🐣", w: 8,
    cond: { aMin: 16, aMax: 17 },
    text: "Le rituel du centre : les nouveaux chantent debout sur une chaise devant tout le réfectoire. Votre tour arrive, et le vestiaire vous observe.",
    options: [
      { label: "Faire le show à fond", outcomes: [
        { weight: 65, text: "Votre interprétation catastrophique devient culte : le groupe vous adopte instantanément.", fx: { team: 8, c: 4, mor: 5 } },
        { weight: 35, text: "Le trou de mémoire total. On vous surnommera « Playback » pendant deux ans.", fx: { team: 4, c: 2, mor: -2 } },
      ] },
      { label: "Refuser ce cirque", outcomes: [
        { weight: 40, text: "Votre aplomb impose le respect : certains anciens détestent, les éducateurs approuvent.", fx: { m: 4, team: -4, dis: 3 } },
        { weight: 60, text: "Le vestiaire vous catalogue « pas des nôtres ». L'intégration sera longue.", fx: { team: -8, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_first_love", cat: "Vie perso", icon: "🌹", w: 8,
    cond: { aMin: 17, aMax: 19 },
    text: "Premier grand amour. Elle habite à deux heures de route du centre de formation, et chaque permission de sortie devient une négociation.",
    options: [
      { label: "Vivre cette histoire à fond", outcomes: [
        { weight: 50, text: "Cet équilibre affectif vous apaise : vous jouez libéré.", fx: { mor: 9, m: 3, flag: "romance" } },
        { weight: 50, text: "Les trajets nocturnes et les têtes ailleurs : le staff s'arrache les cheveux.", fx: { mor: 5, form: -7, dis: -5, flag: "romance" } },
      ] },
      { label: "Le foot d'abord, le reste attendra", outcomes: [
        { weight: 55, text: "Une rupture douloureuse mais une saison pleine. Le prix à payer, dites-vous.", fx: { form: 5, dis: 4, mor: -6 } },
        { weight: 45, text: "Elle n'a pas attendu. Vous non plus, à en croire votre saison correcte.", fx: { form: 3, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_position_retrain", cat: "Terrain", icon: "🔀", w: 8,
    cond: { aMin: 16, aMax: 18 },
    text: "Le directeur du centre est formel : votre morphologie et votre profil correspondent à un autre registre. Il propose une reconversion partielle de votre jeu.",
    options: [
      { label: "Élargir votre palette", outcomes: [
        { weight: 55, text: "Vous devenez un joueur hybride, capable de tout faire. Les coachs adorent ce profil.", fx: { t: 3, m: 4, p: 2 } },
        { weight: 45, text: "À force de tout travailler, vous ne brillez nulle part.", fx: { t: -2, m: 2, mor: -4 } },
      ] },
      { label: "Rester un pur produit de votre poste", outcomes: [
        { weight: 60, text: "Votre spécialisation extrême fait de vous une référence à votre poste.", fx: { t: 5, form: 3 } },
        { weight: 40, text: "Dès qu'un système ne vous convient pas, vous disparaissez des radars.", fx: { t: 2, form: -4 } },
      ] },
    ],
  },
  {
    id: "ev_trial_elite", cat: "Mercato", icon: "🎫", w: 10,
    cond: { aMin: 16, aMax: 18, levels: ["regional", "d2"], chance: 0.6 },
    text: "Un recruteur d'un centre de formation d'élite vous a repéré en tournoi. Il offre un essai d'une semaine — une chance sur cent, mais une vraie.",
    options: [
      { label: "Tenter l'essai de votre vie", outcomes: [
        { weight: 30, text: "ESSAI TRANSFORMÉ ! Le grand centre vous ouvre ses portes. Votre vie bascule.", fx: { rep: 6, mor: 8, transfer: { d: 2 } } },
        { weight: 40, text: "Correct, sans plus. « On te rappellera. » Ils ne rappelleront pas, mais vous savez désormais où placer la barre.", fx: { m: 4, t: 2, mor: -3 } },
        { weight: 30, text: "Une semaine cauchemardesque, dévoré par le stress. Retour à la case départ, l'ego en miettes.", fx: { m: -4, mor: -7 } },
      ] },
      { label: "Refuser : trop tôt, trop loin", outcomes: [
        { weight: 55, text: "Vous continuez de mûrir près des vôtres. Le train repassera peut-être.", fx: { m: 3, mor: 3 } },
        { weight: 45, text: "Le doute vous rongera longtemps : et si c'était LE train ?", fx: { mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_gaming_addiction", cat: "Hygiène de vie", icon: "🎮", w: 8,
    cond: { aMin: 16, aMax: 19 },
    text: "Les sessions de jeu vidéo s'éternisent jusqu'à 3h du matin. Le staff a remarqué vos cernes — et vos réflexes émoussés au réveil.",
    options: [
      { label: "Instaurer un couvre-feu strict", outcomes: [
        { weight: 70, text: "Le sommeil retrouvé se voit immédiatement dans les données physiques.", fx: { dis: 6, form: 5, p: 2 } },
        { weight: 30, text: "Vous craquez régulièrement, mais l'effort est réel.", fx: { dis: 3, form: 2 } },
      ] },
      { label: "Assumer : ça vous détend", outcomes: [
        { weight: 45, text: "Votre chaîne de streaming décolle : les fans adorent ce côté accessible.", fx: { rep: 4, c: 3, dis: -4, form: -3 } },
        { weight: 55, text: "Endormi sur la table de massage. Amende, moqueries, et une réputation de dilettante.", fx: { dis: -6, form: -5, rep: -2 } },
      ] },
    ],
  },
  {
    id: "ev_fake_agent", cat: "Entourage", icon: "🎭", w: 8,
    cond: { aMin: 16, aMax: 18 },
    text: "Un « agent FIFA certifié » tourne autour de votre famille : contrats mirobolants, clubs prestigieux… il demande juste 2 000 € de « frais de dossier ».",
    options: [
      { label: "Payer : on ne rate pas une telle chance", outcomes: [
        { weight: 70, text: "L'homme disparaît avec l'argent de vos parents. La leçon coûte cher — et n'est peut-être pas finie.", fx: { money: -0.02, mor: -7, m: 2, sched: { id: "ev_scam_return", inYears: 3 } } },
        { weight: 30, text: "Contre toute attente, il décroche un vrai contact. Un escroc avec un carnet d'adresses, ça existe.", fx: { rep: 3, mor: 3 } },
      ] },
      { label: "Vérifier sa licence auprès de la fédération", outcomes: [
        { weight: 100, text: "Licence inexistante, pedigree de faussaire. Votre vigilance sauve les économies familiales.", fx: { m: 5, dis: 3 } },
      ] },
    ],
  },
  {
    id: "ev_scam_return", cat: "Entourage", icon: "🕵️", scheduledOnly: true, w: 1,
    text: "Le faux agent qui avait escroqué votre famille refait surface — cette fois, il monnaie de « vieilles photos compromettantes » de vos années centre de formation.",
    options: [
      { label: "Porter plainte immédiatement", outcomes: [
        { weight: 70, text: "Il est arrêté : il faisait chanter six autres joueurs. Votre courage inspire les autres victimes.", fx: { rep: 4, m: 5, mor: 5 } },
        { weight: 30, text: "Le procès s'éternise et les photos fuitent quand même. Beaucoup de bruit pour des clichés banals.", fx: { rep: -3, mor: -5 } },
      ] },
      { label: "Payer pour enterrer l'affaire", outcomes: [
        { weight: 100, text: "Vous payez. Il reviendra, évidemment. Les maîtres-chanteurs reviennent toujours.", fx: { money: -1.5, mor: -6, m: -2 } },
      ] },
    ],
  },
  {
    id: "ev_crew_pressure", cat: "Entourage", icon: "🚨", w: 10,
    cond: { aMin: 18, aMax: 24, flag: "crew_entourage" },
    text: "Votre bande d'enfance vit à vos crochets : voyages, boîtes, voitures de location. Le club s'inquiète des « fréquentations » qui traînent au parking du centre.",
    options: [
      { label: "Poser des limites claires", outcomes: [
        { weight: 55, text: "Les vrais restent, les parasites s'évaporent. Vous y voyez enfin clair.", fx: { dis: 6, m: 5, mor: -3, clearFlag: "crew_entourage" } },
        { weight: 45, text: "Le quartier vous traite d'ingrat. La rupture est brutale, mais nécessaire.", fx: { dis: 5, mor: -7, clearFlag: "crew_entourage" } },
      ] },
      { label: "On ne lâche pas ses frères", outcomes: [
        { weight: 40, text: "Votre loyauté est belle — et votre entourage vous le rend dans les coups durs.", fx: { mor: 6, c: 3, money: -0.8 } },
        { weight: 60, text: "Une bagarre en boîte impliquant votre bande finit dans la presse. Le club est furieux.", fx: { rep: -6, dis: -4, coach: -6, money: -0.5 } },
      ] },
    ],
  },
  {
    id: "ev_shark_betrayal", cat: "Entourage", icon: "🦈", w: 10,
    cond: { aMin: 20, aMax: 26, flag: "shark_agent" },
    text: "Vous découvrez que votre agent touche des commissions occultes sur VOS transferts depuis le début. Son carnet d'adresses reste le meilleur du marché.",
    options: [
      { label: "Rompre le contrat, quoi qu'il en coûte", outcomes: [
        { weight: 55, text: "Le divorce est violent — il vous traîne en justice — mais vous récupérez votre carrière.", fx: { money: -1, m: 5, dis: 4, clearFlag: "shark_agent" } },
        { weight: 45, text: "Libéré, mais son réseau se ferme : certains clubs ne répondent plus.", fx: { rep: -4, mor: -4, clearFlag: "shark_agent" } },
      ] },
      { label: "Fermer les yeux : il vous rend riche", outcomes: [
        { weight: 50, text: "Le pacte du diable fonctionne : les contrats pleuvent, les scrupules s'entassent.", fx: { money: 2, mor: -4, trait: "mercenary" } },
        { weight: 50, text: "Un scandale de corruption l'emporte — et éclabousse tous ses joueurs, vous compris.", fx: { rep: -7, money: 1, mor: -6 } },
      ] },
    ],
  },

  // ══════════════ ENTRAÎNEMENT & PROGRESSION (v3) ══════════════
  {
    id: "ev_personal_trainer", cat: "Préparation", icon: "🏋️", w: 8,
    cond: { aMin: 20, aMax: 30, minMoney: 0.5 },
    text: "Un préparateur physique privé, référence des stars, propose un programme individuel — hors du cadre du club, qui voit ça d'un mauvais œil.",
    options: [
      { label: "Le payer de votre poche", outcomes: [
        { weight: 60, text: "Des progrès physiques spectaculaires. Le club râle mais copie discrètement ses méthodes.", fx: { p: 6, form: 5, money: -0.5, dis: 3 } },
        { weight: 40, text: "Les séances doublées fatiguent plus qu'elles ne renforcent, et le staff est vexé.", fx: { p: 2, money: -0.5, coach: -5, form: -3 } },
      ] },
      { label: "Faire confiance au staff du club", outcomes: [
        { weight: 60, text: "Le staff apprécie la loyauté et personnalise votre programme.", fx: { coach: 5, p: 3 } },
        { weight: 40, text: "Le programme collectif reste générique : progression standard.", fx: { p: 1 } },
      ] },
    ],
  },
  {
    id: "ev_extra_training", cat: "Préparation", icon: "🌙", w: 9,
    cond: { aMin: 17, aMax: 24 },
    text: "Chaque soir après l'entraînement, le terrain annexe reste allumé. Certains rentrent, d'autres restent travailler leur gamme. Une habitude se choisit maintenant.",
    options: [
      { label: "Rester après chaque séance", outcomes: [
        { weight: 60, text: "Mille frappes, mille contrôles : la répétition forge un toucher au-dessus du lot.", fx: { t: 5, dis: 6 } },
        { weight: 40, text: "Le corps finit par dire stop : à trop en faire, on se blesse bêtement.", fx: { t: 2, dis: 4, inj: 5 } },
      ] },
      { label: "Privilégier la récupération", outcomes: [
        { weight: 55, text: "Frais et lucide chaque week-end, vous durez toute la saison.", fx: { form: 5, p: 2 } },
        { weight: 45, text: "Pendant ce temps, un concurrent au poste travaille ses gammes. Ça se voit.", fx: { form: 3, t: -1 } },
      ] },
    ],
  },
  {
    id: "ev_data_revolution", cat: "Préparation", icon: "📈", w: 8,
    cond: { aMin: 22, aMax: 30 },
    text: "La cellule data du club a disséqué votre jeu : 40 pages d'analyses, des heatmaps, et trois défauts « statistiquement évidents » à corriger.",
    options: [
      { label: "Plonger dans les données", outcomes: [
        { weight: 60, text: "Les corrections chirurgicales gomment vos défauts un à un. Le progrès est mesurable — littéralement.", fx: { t: 4, m: 4 } },
        { weight: 40, text: "À trop penser aux chiffres, vous perdez l'instinct. Le juste milieu prendra du temps.", fx: { m: 2, form: -4 } },
      ] },
      { label: "« Le foot ne se joue pas sur Excel »", outcomes: [
        { weight: 50, text: "Votre instinct assume, et il tient la baraque.", fx: { form: 3 } },
        { weight: 50, text: "Les adversaires, eux, ont lu votre heatmap. Vos points faibles deviennent des cibles.", fx: { form: -5, rep: -2 } },
      ] },
    ],
  },
  {
    id: "ev_mental_coach", cat: "Préparation", icon: "🧠", w: 9,
    cond: { aMin: 22, aMax: 33, maxMor: 55 },
    text: "Un préparateur mental réputé propose un accompagnement : visualisation, gestion de la pression, routines d'avant-match. Dans le vestiaire, certains ricanent.",
    options: [
      { label: "Commencer le travail mental", outcomes: [
        { weight: 65, text: "Les outils changent tout : la pression devient un carburant.", fx: { m: 7, mor: 8, form: 4 } },
        { weight: 35, text: "Les séances aident, doucement. Rome ne s'est pas faite en un jour.", fx: { m: 3, mor: 4 } },
      ] },
      { label: "Gérer ça à l'ancienne", outcomes: [
        { weight: 45, text: "Votre carapace tient. Pour l'instant.", fx: { m: 1 } },
        { weight: 55, text: "Les doutes s'accumulent sans soupape. La cocotte siffle.", fx: { mor: -6, form: -4 } },
      ] },
    ],
  },

  // ══════════════ RELATIONS COACH / VESTIAIRE / SUPPORTERS (v3) ══════════════
  {
    id: "ev_teammate_leak", cat: "Vestiaire", icon: "🗞️", w: 9,
    cond: { aMin: 20, aMax: 30 },
    text: "Vos confidences privées sur le coach se retrouvent mot pour mot dans la presse. Le traître est forcément dans le vestiaire — et vous avez un nom en tête.",
    options: [
      { label: "Le confronter devant le groupe", outcomes: [
        { weight: 45, text: "Il craque et avoue devant tout le monde. Le vestiaire respecte l'audace — méfiance générale.", fx: { team: 5, c: 4, coach: -3 } },
        { weight: 55, text: "Vous vous êtes trompé de coupable. La honte absolue, et une amitié brisée.", fx: { team: -8, mor: -7 } },
      ] },
      { label: "Ne plus rien dire à personne", outcomes: [
        { weight: 60, text: "Le silence devient votre armure. Solitaire, mais insoupçonnable.", fx: { m: 4, team: -3 } },
        { weight: 40, text: "Votre retrait passe pour du mépris : le groupe se referme sans vous.", fx: { team: -6, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_coach_son", cat: "Vestiaire", icon: "👨‍👦", w: 8,
    cond: { aMin: 18, aMax: 24 },
    text: "Le fils du coach vient d'être promu dans le groupe pro… à votre poste exactement. Chaque titularisation devient un débat national dans la presse locale.",
    options: [
      { label: "L'écraser par le niveau, sans un mot", outcomes: [
        { weight: 55, text: "L'écart est tel que même papa doit s'incliner : vous êtes intouchable.", fx: { t: 3, form: 5, coach: 3 } },
        { weight: 45, text: "Le fiston joue quand même. Le mérite a parfois un nom de famille.", fx: { coach: -6, mor: -6, form: -3 } },
      ] },
      { label: "En faire un allié plutôt qu'un rival", outcomes: [
        { weight: 60, text: "Votre binôme fonctionne à merveille — et le coach vous adore pour ça.", fx: { coach: 8, team: 5, m: 3 } },
        { weight: 40, text: "Votre gentillesse est prise pour de la faiblesse : il prend votre place en douceur.", fx: { team: 3, form: -5, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_ultras_invitation", cat: "Supporters", icon: "🔥", w: 8,
    cond: { aMin: 20, aMax: 31, minRep: 30 },
    text: "Le groupe ultra historique du club vous invite dans son local : fumigènes, tifos en préparation, et un code d'honneur non négociable — « ici, on ne trahit pas ».",
    options: [
      { label: "Accepter l'invitation", outcomes: [
        { weight: 60, text: "Une soirée dans le ventre du club. Le virage entier chantera votre nom, dans les bons ET les mauvais jours.", fx: { rep: 5, mor: 6, c: 4, flag: "ultras_bond" } },
        { weight: 40, text: "La photo fuite : la direction déteste voir un joueur « politiser » sa relation aux tribunes.", fx: { rep: 3, coach: -4, mor: 3, flag: "ultras_bond" } },
      ] },
      { label: "Garder une distance professionnelle", outcomes: [
        { weight: 55, text: "Respectueux mais distant : personne ne vous le reprochera vraiment.", fx: { m: 2 } },
        { weight: 45, text: "Le virage retient les noms de ceux qui snobent. Vos mauvais matchs seront sifflés plus fort.", fx: { rep: -2, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_training_fight", cat: "Vestiaire", icon: "🥊", w: 8,
    cond: { aMin: 21, aMax: 32 },
    text: "Un taquet en plein entraînement dégénère : deux cadres se battent devant les caméras des réseaux du club. Tout le monde regarde… vous, le plus proche.",
    options: [
      { label: "Les séparer physiquement", outcomes: [
        { weight: 60, text: "Vous encaissez un coup perdu mais éteignez l'incendie. Le vestiaire retient qui a fait l'homme.", fx: { team: 7, c: 4, m: 3 } },
        { weight: 40, text: "En les séparant, vous vous faites mal bêtement. Le foot est parfois ingrat.", fx: { team: 5, inj: 3 } },
      ] },
      { label: "Laisser le staff gérer", outcomes: [
        { weight: 55, text: "Chacun son rôle. La sanction interne tombe, l'ordre revient.", fx: { dis: 2 } },
        { weight: 45, text: "« Tu étais là et tu n'as rien fait » : les deux clans vous le reprochent.", fx: { team: -5, mor: -3 } },
      ] },
    ],
  },

  // ══════════════ PRÊT & TEMPS DE JEU (v3) ══════════════
  {
    id: "ev_loan_decision", cat: "Mercato", icon: "🔄", w: 12,
    cond: { aMin: 18, aMax: 22, levels: ["d1", "elite"] },
    text: "Le directeur sportif est cash : « Tu es notre avenir, mais devant toi il y a deux internationaux. Un prêt d'une saison te ferait exploser. Ou tu restes et tu t'accroches. »",
    options: [
      { label: "Partir en prêt pour jouer", hint: "Temps de jeu", outcomes: [
        { weight: 100, text: "Direction un club plus modeste, avec une mission claire : jouer, briller, revenir plus fort.", fx: { loan: true } },
      ] },
      { label: "Rester et bousculer la hiérarchie", outcomes: [
        { weight: 35, text: "Une blessure devant vous, une opportunité saisie : vous voilà lancé dans le grand bain.", fx: { t: 3, rep: 5, form: 6, coach: 5 } },
        { weight: 40, text: "Des miettes de temps de jeu, mais un quotidien au contact des meilleurs. Le directeur sportif regrette votre refus.", fx: { t: 2, form: -5, mor: -4, coach: -4 } },
        { weight: 25, text: "Une saison en tribune. Le staff vous le dit sans détour : « On te l'avait proposé, ce prêt. »", fx: { form: -9, mor: -7, t: -1, coach: -6 } },
      ] },
    ],
  },

  // ══════════════ SANTÉ & LONG TERME (v3) ══════════════
  {
    id: "ev_knee_specialist", cat: "Blessure", icon: "🩻", w: 10,
    cond: { aMin: 22, aMax: 32, flag: "big_injury" },
    text: "Depuis votre grave blessure, le genou grince. Un chirurgien de renom propose une opération préventive : quatre mois d'arrêt maintenant, ou une bombe à retardement dans la jambe.",
    options: [
      { label: "Opérer maintenant", outcomes: [
        { weight: 70, text: "L'opération est un succès total. Le genou redevient un genou, pas une loterie.", fx: { inj: 16, p: 4, clearFlag: "big_injury", mor: 4 } },
        { weight: 30, text: "L'opération se passe bien, la rééducation traîne. Mais le spectre s'éloigne.", fx: { inj: 22, p: 2, clearFlag: "big_injury" } },
      ] },
      { label: "Jouer avec, advienne que pourra", outcomes: [
        { weight: 55, text: "Le genou tient, match après match. Vous vivez avec l'épée de Damoclès.", fx: { form: 2, sched: { id: "ev_knee_timebomb", inYears: 2 } } },
        { weight: 45, text: "Le staff adapte vos entraînements : moins de séances, plus de soins. Un équilibre précaire.", fx: { p: -2, form: 3, sched: { id: "ev_knee_timebomb", inYears: 3 } } },
      ] },
    ],
  },
  {
    id: "ev_knee_timebomb", cat: "Blessure", icon: "💥", scheduledOnly: true, w: 1,
    text: "Sur un appui anodin, le genou que vous n'avez jamais fait opérer lâche. Le verdict du scanner tombe comme un couperet.",
    options: [
      { label: "Se battre, encore une fois", outcomes: [
        { weight: 55, text: "Une rééducation de forcené. Vous reviendrez — diminué, mais debout.", fx: { inj: 24, p: -7, m: 4, trait: "ironman" } },
        { weight: 35, text: "Le retour est long et le niveau d'avant ne reviendra jamais complètement.", fx: { inj: 28, p: -10, mor: -8 } },
        { weight: 10, text: "Les chirurgiens sont formels : le football professionnel, c'est terminé.", fx: { end: "injury" } },
      ] },
    ],
  },
  {
    id: "ev_painkillers", cat: "Blessure", icon: "💊", w: 8,
    cond: { aMin: 25, aMax: 33 },
    text: "Pour tenir le rythme, le staff médical propose des infiltrations avant chaque gros match. « Tout le monde le fait », dit-on dans le couloir des vestiaires.",
    options: [
      { label: "Accepter les infiltrations", outcomes: [
        { weight: 100, text: "La douleur disparaît, les performances tiennent. Le corps, lui, prend note de chaque piqûre.", fx: { form: 6, p: 1, sched: { id: "ev_painkiller_toll", inYears: 2 } } },
      ] },
      { label: "Refuser de masquer la douleur", outcomes: [
        { weight: 60, text: "Vous manquez quelques matchs, mais votre corps vous dira merci dans dix ans.", fx: { inj: 4, dis: 4, m: 3 } },
        { weight: 40, text: "Le coach peste contre vos absences. Principe coûteux à court terme.", fx: { inj: 4, coach: -5 } },
      ] },
    ],
  },
  {
    id: "ev_painkiller_toll", cat: "Blessure", icon: "🧾", scheduledOnly: true, w: 1,
    text: "L'addition des infiltrations arrive : douleurs chroniques, examens alarmants. Le médecin est grave : « On a hypothéqué votre cartilage pour gagner des matchs. »",
    options: [
      { label: "Lever le pied et se soigner enfin", outcomes: [
        { weight: 60, text: "Six mois de soins intensifs stabilisent les dégâts. Il était moins une.", fx: { inj: 14, p: -4, dis: 3 } },
        { weight: 40, text: "Les soins limitent la casse, mais le physique a pris dix ans d'un coup.", fx: { p: -8, form: -5, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_offshore_raid", cat: "Finance", icon: "🚔", scheduledOnly: true, w: 1,
    text: "6h du matin : perquisition. Votre montage offshore d'il y a trois ans est au cœur d'une enquête internationale. Votre nom s'affiche en une des « Football Leaks ».",
    options: [
      { label: "Coopérer et tout régulariser", outcomes: [
        { weight: 65, text: "Redressement massif, amende record, mais l'affaire se referme. Plus jamais ça.", fx: { money: -6, rep: -5, mor: -6, dis: 3 } },
        { weight: 35, text: "Votre coopération est saluée : la justice se montre clémente, l'opinion aussi.", fx: { money: -4, rep: -2, m: 3 } },
      ] },
      { label: "Nier et prendre les meilleurs avocats", outcomes: [
        { weight: 40, text: "Vice de procédure : vous échappez au pire. L'image, elle, reste durablement tachée.", fx: { money: -2, rep: -7 } },
        { weight: 60, text: "Le procès s'éternise, les gros titres aussi. Condamnation avec sursis et opprobre général.", fx: { money: -8, rep: -10, mor: -8 } },
      ] },
    ],
  },

  // ══════════════ MOMENTS CLÉS DE SAISON (v3) ══════════════
  {
    id: "ev_relegation_battle", cat: "Terrain", icon: "🪂", w: 9,
    cond: { aMin: 19, aMax: 34, levels: ["regional", "d2"] },
    text: "Votre club joue sa survie : dernière journée, victoire impérative. Toute la ville retient son souffle — les salaires de trente familles aussi.",
    options: [
      { label: "Porter l'équipe sur vos épaules", outcomes: [
        { weight: 45, text: "LE match de votre vie au meilleur moment : le club est sauvé, la ville vous appartient.", fx: { rep: 7, mor: 10, team: 6, trait: "clutch" } },
        { weight: 30, text: "Vous donnez tout, mais la relégation tombe quand même. Personne ne vous en veut : vous étiez au-dessus du lot.", fx: { rep: 3, mor: -6, m: 4 } },
        { weight: 25, text: "La pression vous broie : passé au travers le jour où il ne fallait pas.", fx: { rep: -4, mor: -9, m: -3 } },
      ] },
      { label: "Jouer votre partition, sobrement", outcomes: [
        { weight: 55, text: "Un match sérieux dans une victoire collective arrachée. Le maintien a le goût d'un titre.", fx: { mor: 6, team: 4 } },
        { weight: 45, text: "Trop timide dans un match d'hommes. La relégation laissera des traces.", fx: { mor: -7, rep: -2 } },
      ] },
    ],
  },
  {
    id: "ev_promotion_push", cat: "Terrain", icon: "🚀", w: 9,
    cond: { aMin: 18, aMax: 33, levels: ["d2"] },
    text: "À trois journées de la fin, votre club touche du doigt la montée en première division. Le stade affiche complet trois semaines à l'avance.",
    options: [
      { label: "Prendre le sprint final à votre compte", outcomes: [
        { weight: 45, text: "MONTÉE ! Vos performances dans le money-time entrent dans la légende du club — et l'élite vous a repéré.", fx: { rep: 8, mor: 10, t: 2, trait: "clutch" } },
        { weight: 30, text: "La montée se joue au goal-average, du mauvais côté. Cruel, mais votre saison parle pour vous.", fx: { rep: 4, mor: -6 } },
        { weight: 25, text: "Vous forcez, vous vous crispez, l'équipe cale. L'occasion s'envole.", fx: { mor: -8, rep: -2, form: -4 } },
      ] },
      { label: "Rester dans le collectif", outcomes: [
        { weight: 50, text: "Le groupe monte ensemble, soudé comme jamais. Une aventure humaine inoubliable.", fx: { mor: 8, team: 6, rep: 3 } },
        { weight: 50, text: "Le rêve s'écroule dans les dernières minutes de la saison. Le vestiaire pleure en silence.", fx: { mor: -7, team: 3 } },
      ] },
    ],
  },
  {
    id: "ev_giant_killing", cat: "Terrain", icon: "🗡️", w: 10,
    cond: { aMin: 17, aMax: 34, levels: ["regional", "d2"] },
    text: "Miracle du tirage : un géant de l'élite débarque dans votre petit stade pour la coupe nationale. Les caméras du pays entier découvrent votre vestiaire préfabriqué.",
    options: [
      { label: "Jouer crânement votre chance", outcomes: [
        { weight: 30, text: "EXPLOIT HISTORIQUE ! Le géant tombe chez vous, et votre nom fait la une nationale.", fx: { rep: 9, mor: 10, c: 4, team: 5 } },
        { weight: 40, text: "Défaite honorable après avoir fait douter le géant. Votre performance individuelle est remarquée en haut lieu.", fx: { rep: 5, m: 3, mor: 4 } },
        { weight: 30, text: "La leçon de réalisme : 5-0 et un grand écart de niveau exposé en mondovision.", fx: { mor: -5, m: 2 } },
      ] },
      { label: "Fermer le jeu et espérer les tirs au but", outcomes: [
        { weight: 35, text: "0-0 héroïque, séance de tirs au but remportée ! Le plan parfait exécuté à la perfection.", fx: { rep: 7, mor: 9, m: 4 } },
        { weight: 65, text: "Le verrou saute à la 85e. Frustrant, mais le combat force le respect.", fx: { mor: -3, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_winter_slump", cat: "Terrain", icon: "❄️", w: 9,
    cond: { aMin: 20, aMax: 33, maxForm: 45 },
    text: "Décembre gris : plus une passe ne trouve preneur, plus un appel n'est vu. La spirale de la méforme s'installe, et les regards changent au centre d'entraînement.",
    options: [
      { label: "Travailler deux fois plus", outcomes: [
        { weight: 55, text: "La sortie de crise par le travail : un but libérateur, et la machine repart.", fx: { form: 10, m: 4, dis: 4 } },
        { weight: 45, text: "Vous ajoutez de la fatigue à la méforme. Il fallait peut-être… souffler ?", fx: { form: -3, p: -2, mor: -4 } },
      ] },
      { label: "Demander une semaine de coupure au coach", outcomes: [
        { weight: 50, text: "Le coach accepte. Vous revenez transformé : parfois, le repos est le meilleur entraînement.", fx: { form: 9, mor: 6, coach: 3 } },
        { weight: 50, text: "« Une coupure ? En pleine saison ? » Le coach n'en revient pas. Le banc vous attend.", fx: { coach: -7, form: 2, mor: -4 } },
      ] },
    ],
  },

  // ══════════════ SÉLECTION NATIONALE (v3) ══════════════
  {
    id: "ev_nat_qualifiers", cat: "Sélection", icon: "🎗️", w: 9,
    cond: { aMin: 22, aMax: 32, nat: true, chance: 0.6 },
    text: "Barrage retour décisif pour la qualification au Mondial. Le sélectionneur hésite à vous titulariser : vous sortez d'un mois moyen en club.",
    options: [
      { label: "Réclamer votre place de titulaire", outcomes: [
        { weight: 40, text: "Vous répondez présent dans LE match qui compte : la nation entière vous embrasse.", fx: { rep: 8, mor: 8, m: 4, trait: "clutch" } },
        { weight: 35, text: "Un match correct dans une qualification arrachée. L'essentiel est là.", fx: { rep: 3, mor: 4 } },
        { weight: 25, text: "Transparent le soir où tout un pays regardait. L'ascenseur émotionnel est brutal.", fx: { rep: -5, mor: -8 } },
      ] },
      { label: "Accepter un rôle de joker", outcomes: [
        { weight: 50, text: "Votre entrée change le match : parfois, 25 minutes valent une carrière.", fx: { rep: 6, mor: 6 } },
        { weight: 50, text: "Depuis le banc, vous vivez la qualification en spectateur. Mi-figue, mi-raisin.", fx: { mor: 2 } },
      ] },
    ],
  },
  {
    id: "ev_nat_captaincy", cat: "Sélection", icon: "🎖️", w: 9,
    cond: { aMin: 28, aMax: 33, nat: true, minRep: 60 },
    text: "Le capitaine historique de la sélection prend sa retraite internationale. Le sélectionneur vous propose le brassard — avec tout ce qu'il pèse dans un pays entier.",
    options: [
      { label: "Accepter l'honneur suprême", outcomes: [
        { weight: 55, text: "Le brassard national transcende votre jeu et votre statut : vous voilà patron d'une nation.", fx: { rep: 7, m: 6, c: 5, trait: "leader" } },
        { weight: 45, text: "Chaque défaite nationale devient VOTRE défaite. Le plus lourd des privilèges.", fx: { rep: 4, m: -3, mor: -4 } },
      ] },
      { label: "Suggérer un joueur plus jeune", outcomes: [
        { weight: 60, text: "Votre humilité renforce paradoxalement votre aura de sage du groupe.", fx: { m: 4, team: 4, rep: 2 } },
        { weight: 40, text: "Le sélectionneur y voit un manque d'ambition. Votre statut s'effrite doucement.", fx: { rep: -3, mor: -2 } },
      ] },
    ],
  },

  // ══════════════ VIE PERSONNELLE & ARGENT (v3) ══════════════
  {
    id: "ev_house_parents", cat: "Vie perso", icon: "🏠", w: 9,
    cond: { aMin: 20, aMax: 28, minMoney: 2 },
    text: "Le rêve de tout gamin devenu pro : offrir une maison à ses parents. Vous avez repéré la villa parfaite — le prix aussi est parfait… ement indécent.",
    options: [
      { label: "Acheter la villa, sans compter", outcomes: [
        { weight: 100, text: "Les larmes de votre mère en découvrant la maison. Aucun trophée ne procurera jamais ça.", fx: { money: -1.8, mor: 12, m: 4 } },
      ] },
      { label: "Choisir une maison raisonnable", outcomes: [
        { weight: 60, text: "Une belle maison, un budget tenu, des parents comblés. La sagesse même.", fx: { money: -0.7, mor: 8, dis: 3 } },
        { weight: 40, text: "Vos parents sont ravis. Un coéquipier poste sa villa à lui sur Instagram. Petit pincement.", fx: { money: -0.7, mor: 5 } },
      ] },
    ],
  },
  {
    id: "ev_friend_loan", cat: "Vie perso", icon: "🤲", w: 8,
    cond: { aMin: 22, aMax: 32, minMoney: 5 },
    text: "Votre meilleur ami d'enfance veut ouvrir un restaurant : « Frérot, il me manque 300 000. Tu me connais, je te rembourse en deux ans. »",
    options: [
      { label: "Prêter sans hésiter", outcomes: [
        { weight: 40, text: "Le restaurant cartonne : remboursé avec les intérêts, et une table à vie au fond de la salle.", fx: { money: 0.3, mor: 7 } },
        { weight: 60, text: "Le restaurant coule en dix-huit mois. L'argent est perdu — l'amitié, presque.", fx: { money: -0.3, mor: -7 } },
      ] },
      { label: "Refuser mais offrir votre réseau", outcomes: [
        { weight: 55, text: "Vous lui présentez de vrais investisseurs : le projet se monte mieux, sans mélanger argent et amitié.", fx: { m: 4, mor: 4 } },
        { weight: 45, text: "« T'as changé. » La phrase qui tue. Les appels s'espacent.", fx: { mor: -6 } },
      ] },
    ],
  },
  {
    id: "ev_car_madness", cat: "Hygiène de vie", icon: "🏎️", w: 7,
    cond: { aMin: 22, aMax: 30, minMoney: 15 },
    text: "Le parking du centre d'entraînement est un concours permanent. Un concessionnaire vous propose LA pièce rare : édition limitée à sept exemplaires au monde.",
    options: [
      { label: "Craquer pour le bolide", outcomes: [
        { weight: 50, text: "La photo fait dix millions de vues. Le coach, lui, compte les chevaux et fronce les sourcils.", fx: { money: -2.5, rep: 3, c: 3, dis: -3 } },
        { weight: 50, text: "Flashé à 190 km/h trois semaines plus tard. Permis, amende, unes moqueuses : le combo.", fx: { money: -3, rep: -5, dis: -6, coach: -4 } },
      ] },
      { label: "Investir dans la pierre à la place", outcomes: [
        { weight: 100, text: "Trois appartements mis en location. Votre banquier encadre votre photo dans son bureau.", fx: { money: 1.5, dis: 4, m: 2 } },
      ] },
    ],
  },
  // ══════════════ VIE DU CLUB (v4.1) ══════════════
  {
    id: "ev_investor", cat: "Club", icon: "🏗️", w: 8,
    cond: { aMin: 17, aMax: 32, levels: ["regional", "d2"] },
    text: "Coup de tonnerre : un investisseur milliardaire rachète {club}. Conférence de presse surréaliste : « Dans cinq ans, nous jouerons la {contCup}. » Le vestiaire oscille entre rêve et méfiance.",
    options: [
      { label: "S'engager corps et âme dans le projet", outcomes: [
        { weight: 45, text: "Les promesses se concrétisent : recrues, nouveau centre d'entraînement, ambitions… Le club change de dimension, et vous êtes son visage.", fx: { clubBoost: 1, money: 0.5, rep: 4, mor: 6 } },
        { weight: 30, text: "Le projet avance par à-coups, mais le club grandit réellement, saison après saison.", fx: { clubBoost: 1, mor: 3 } },
        { weight: 25, text: "Fonds fantômes : six mois plus tard, l'investisseur disparaît des radars. Le club frôle le dépôt de bilan, le vestiaire se serre les coudes.", fx: { mor: -8, rep: -2, team: 4 } },
      ] },
      { label: "Rester lucide et exiger des garanties", outcomes: [
        { weight: 55, text: "Votre prudence est récompensée : contrat revalorisé et clauses en béton, quoi qu'il arrive au club.", fx: { money: 0.8, dis: 3, m: 3 } },
        { weight: 45, text: "La direction prend très mal votre méfiance : « Personne ne freinera ce projet. »", fx: { coach: -5, mor: -3 } },
      ] },
    ],
  },

  // ══════════════ VARIÉTÉ & VIE DU FOOTBALLEUR (v4.3) ══════════════
  {
    id: "ev_captain_stripped", cat: "Vestiaire", icon: "🎗️", w: 7,
    cond: { aMin: 24, aMax: 32, minRep: 40 },
    text: "Sans prévenir, le coach confie « votre » brassard à une recrue arrivée il y a six mois. Devant les caméras, il parle de « choix de management ».",
    options: [
      { label: "Avaler la couleuvre et jouer pour l'équipe", outcomes: [
        { weight: 60, text: "Votre attitude irréprochable retourne le vestiaire : brassard ou pas, le patron, c'est vous.", fx: { team: 7, m: 4, rep: 3 } },
        { weight: 40, text: "Vous encaissez en silence, mais quelque chose s'est éteint.", fx: { mor: -5, m: 2 } },
      ] },
      { label: "Exiger des explications devant le groupe", hint: "Frontal", outcomes: [
        { weight: 45, text: "L'explication tourne à votre avantage : le coach reconnaît sa maladresse.", fx: { coach: 4, c: 3, mor: 3 } },
        { weight: 55, text: "Le bras de fer public vous isole : ni brassard, ni soutien.", fx: { coach: -7, team: -4, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_referee_feud", cat: "Terrain", icon: "🟨", w: 6,
    cond: { aMin: 22, aMax: 32 },
    text: "Le même arbitre vous sanctionne match après match, au moindre contact. La presse parle d'un « contentieux personnel ». Ce soir, c'est encore lui au sifflet.",
    options: [
      { label: "Le tester dès le premier duel", hint: "Provocation", outcomes: [
        { weight: 40, text: "Il ne bronche pas, vous non plus : le duel psychologique tourne à votre avantage.", fx: { m: 4, c: 3 } },
        { weight: 60, text: "Jaune à la 12e, rouge à la 60e. Il a gagné, vous êtes suspendu.", fx: { inj: 3, dis: -5, rep: -3, mor: -4 } },
      ] },
      { label: "Jouer les 90 minutes en moine", outcomes: [
        { weight: 65, text: "Zéro faute, zéro mot : votre discipline désarme même la presse.", fx: { dis: 5, m: 3 } },
        { weight: 35, text: "À force de retenue, vous traversez le match sans exister.", fx: { form: -4, dis: 3 } },
      ] },
    ],
  },
  {
    id: "ev_viral_celebration", cat: "Réseaux", icon: "🕺", w: 6,
    cond: { aMin: 20, aMax: 30, minRep: 45 },
    text: "Votre célébration improvisée du week-end est devenue un mème planétaire : des gamins la reproduisent de Tokyo à São Paulo. Votre sponsor veut la déposer comme marque.",
    options: [
      { label: "En faire votre signature officielle", outcomes: [
        { weight: 55, text: "La célébration devient une marque mondiale. Chaque grand match devient un événement marketing.", fx: { rep: 6, c: 4, money: 1.2, trait: "showman" } },
        { weight: 45, text: "À force de la vendre partout, la magie s'évente et les puristes grincent.", fx: { rep: 3, money: 0.8, mor: -2 } },
      ] },
      { label: "Laisser le mème vivre sa vie", outcomes: [
        { weight: 70, text: "Le geste appartient aux fans : ce refus de tout monétiser force la sympathie.", fx: { rep: 4, mor: 4 } },
        { weight: 30, text: "Un rappeur célèbre la dépose à votre place. L'occasion s'envole en musique.", fx: { mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_sick_fan", cat: "Supporters", icon: "🏥", w: 6,
    cond: { aMin: 21, aMax: 36, pos: ["att", "mil", "def"] },
    text: "La lettre d'une famille arrive au centre d'entraînement : leur fils de 9 ans, gravement malade, ne rate aucun de vos matchs depuis sa chambre d'hôpital.",
    options: [
      { label: "Aller le voir sans caméras, avec un maillot dédicacé", outcomes: [
        { weight: 100, text: "Deux heures hors du temps. Le gamin promet de guérir « pour venir au stade ». Certains moments valent tous les trophées.", fx: { mor: 8, m: 4 } },
      ] },
      { label: "Lui dédier publiquement votre prochain but", outcomes: [
        { weight: 60, text: "Le but arrive, la dédicace émeut le pays entier — et la chambre 214 explose de joie.", fx: { rep: 5, mor: 7 } },
        { weight: 40, text: "Le but ne vient pas ce week-end… mais votre visite surprise du lundi répare tout.", fx: { mor: 5, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_sick_fan_gk", cat: "Supporters", icon: "🏥", w: 6,
    cond: { aMin: 21, aMax: 36, pos: ["gk"] },
    text: "La lettre d'une famille arrive au centre d'entraînement : leur fils de 9 ans, gravement malade, ne rate aucun de vos matchs depuis sa chambre d'hôpital. Il dort avec une réplique de vos gants.",
    options: [
      { label: "Aller le voir sans caméras, avec vos gants du dernier match", outcomes: [
        { weight: 100, text: "Deux heures hors du temps. Le gamin promet de guérir « pour venir garder le but avec vous ». Certains moments valent tous les trophées.", fx: { mor: 8, m: 4 } },
      ] },
      { label: "Lui promettre publiquement une cage inviolée", outcomes: [
        { weight: 60, text: "Clean sheet, et les gants levés vers la caméra au coup de sifflet — la chambre 214 explose de joie.", fx: { rep: 5, mor: 7 } },
        { weight: 40, text: "Un penalty injuste vous prive de la promesse… mais votre visite surprise du lundi répare tout.", fx: { mor: 5, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_tactics_rift", cat: "Vestiaire", icon: "🪓", w: 7,
    cond: { aMin: 23, aMax: 33 },
    text: "Le vestiaire se fracture en deux clans : les fidèles du coach et les partisans du jeu d'avant. Chaque mot devient politique, et votre voix compte.",
    options: [
      { label: "Défendre le coach publiquement", outcomes: [
        { weight: 55, text: "Votre soutien stabilise le navire : le coach s'en souviendra toute sa vie.", fx: { coach: 9, team: -3, m: 3 } },
        { weight: 45, text: "Le clan adverse vous étiquette « vendu ». L'ambiance reste toxique.", fx: { coach: 6, team: -7, mor: -4 } },
      ] },
      { label: "Porter la parole des joueurs", hint: "Risqué", outcomes: [
        { weight: 45, text: "Votre médiation impose des compromis : le groupe repart, soudé autour de vous.", fx: { team: 8, c: 5, coach: -3, trait: "leader" } },
        { weight: 55, text: "Le coach y voit une mutinerie — et les mutins finissent rarement titulaires.", fx: { coach: -9, form: -5, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_stadium_name", cat: "Hommage", icon: "🏟️", w: 5,
    cond: { aMin: 28, aMax: 36, minRep: 70 },
    text: "Votre ville natale l'annonce en conseil municipal : le stade où tout a commencé portera désormais votre nom. La cérémonie est prévue cet été.",
    options: [
      { label: "Y aller en famille, loin du show", outcomes: [
        { weight: 100, text: "Devant le city-stade de votre enfance rebaptisé, les souvenirs remontent. La boucle est bouclée.", fx: { mor: 9, m: 3, rep: 2 } },
      ] },
      { label: "Offrir une rénovation complète du stade", cond: { minMoney: 3 }, outcomes: [
        { weight: 100, text: "Pelouse neuve, vestiaires refaits, éclairage : les gamins du quartier joueront mieux lotis que vous ne l'étiez.", fx: { money: -1.5, rep: 6, mor: 8 } },
      ] },
    ],
  },

  // ══════════════ ENDGAME VARIÉ (v4.3) ══════════════
  {
    id: "ev_homecoming_finale", cat: "Retraite", icon: "🏠", w: 10,
    cond: { aMin: 33, aMax: 36, notAtOriginClub: true },
    text: "Votre club formateur appelle : « Reviens finir où tout a commencé. » Le vestiaire de vos 16 ans, le stade de vos débuts, la boucle parfaite.",
    options: [
      { label: "Rentrer boucler la boucle", hint: "Cœur", outcomes: [
        { weight: 60, text: "Le retour de l'enfant prodige : le stade est plein comme jamais pour votre premier match retour.", fx: { mor: 10, rep: 4, transfer: { origin: true, direct: true } } },
        { weight: 40, text: "Le retour est plus discret que dans les rêves, mais chaque entraînement a un goût de madeleine.", fx: { mor: 6, transfer: { origin: true, direct: true } } },
      ] },
      { label: "Refuser : on ne revient jamais en arrière", outcomes: [
        { weight: 55, text: "Vous préférez garder le souvenir intact. Le club comprend, la porte reste ouverte… pour le staff.", fx: { m: 3, flag: "coach_diploma" } },
        { weight: 45, text: "La lettre ouverte des supporters de votre enfance vous hantera un peu.", fx: { mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_last_selection", cat: "Sélection", icon: "📯", w: 12,
    cond: { aMin: 33, aMax: 36, wc: true, minRep: 60 },
    text: "Le sélectionneur en personne fait le déplacement : « Le groupe est jeune, il me faut ton vécu pour le Mondial. Une dernière danse en bleu de travail ? »",
    options: [
      { label: "Répondre à l'appel de la nation", outcomes: [
        { weight: 60, text: "Le doyen du groupe : chaque jeune boit vos paroles, le pays savoure ce dernier tour de piste.", fx: { natCall: true, mor: 7, rep: 4, m: 3 } },
        { weight: 40, text: "Le corps proteste contre le rythme international, mais certains rendez-vous ne se refusent pas.", fx: { natCall: true, form: -5, mor: 5 } },
      ] },
      { label: "Laisser la place aux jeunes", outcomes: [
        { weight: 100, text: "Un refus plein de classe, salué par le sélectionneur lui-même. La relève est prête, grâce à vous aussi.", fx: { rep: 3, m: 4, mor: 3 } },
      ] },
    ],
  },
  {
    id: "ev_body_countdown", cat: "Retraite", icon: "⏳", w: 9,
    cond: { aMin: 34, aMax: 41, maxForm: 55 },
    text: "Le staff médical pose les radios sur la table : « Chaque match est un risque maintenant. Tu peux t'arrêter en héros, ou repousser encore. »",
    options: [
      { label: "Annoncer la retraite, la tête haute", outcomes: [
        { weight: 100, text: "Vous choisissez de partir debout. L'annonce, digne et sereine, force le respect du monde entier.", fx: { retire: true, mor: 6, rep: 3 } },
      ] },
      { label: "Repousser : le corps suivra bien encore un an", hint: "Têtu", outcomes: [
        { weight: 40, text: "Le mental fait tenir le physique : une saison d'équilibriste, mais une saison quand même.", fx: { m: 4, form: 4 } },
        { weight: 60, text: "Le corps encaisse de moins en moins : l'infirmerie devient votre résidence secondaire.", fx: { inj: 10, p: -5, mor: -5 } },
      ] },
    ],
  },

  // ══════════════ STATUT & VIE DE JOUEUR (v5) ══════════════
  {
    id: "ev_idol_meeting", cat: "Vie perso", icon: "🤩", w: 7,
    cond: { aMin: 17, aMax: 20 },
    text: "Votre idole d'enfance — celle du poster au-dessus de votre lit — vous croise en zone mixte et vous glisse : « Je t'ai vu jouer, gamin. Appelle-moi si tu veux bosser. »",
    options: [
      { label: "Accepter des séances avec la légende", outcomes: [
        { weight: 60, text: "Des heures de secrets de champion transmis en direct. Vous grandissez à vue d'œil.", fx: { t: 4, m: 3, mor: 6 } },
        { weight: 40, text: "L'ombre de l'idole est écrasante : vous copiez au lieu de créer.", fx: { t: 2, m: -2, mor: 3 } },
      ] },
      { label: "Rester concentré sur votre propre chemin", outcomes: [
        { weight: 65, text: "Poli mais indépendant : votre identité de jeu vous appartient.", fx: { m: 4, dis: 2 } },
        { weight: 35, text: "L'occasion ne se représentera pas. Le poster vous nargue chaque soir.", fx: { mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_first_car", cat: "Hygiène de vie", icon: "🚗", w: 6,
    cond: { aMin: 18, aMax: 21, minMoney: 0.3 },
    text: "Premier vrai salaire, premier grand choix de jeune pro : le bolide qui claque sur le parking, ou la citadine discrète que conseille votre entourage ?",
    options: [
      { label: "Le bolide, évidemment", outcomes: [
        { weight: 45, text: "Le parking du centre vous adore, les réseaux aussi. Le coach lève un sourcil.", fx: { money: -0.25, c: 3, rep: 2, dis: -3 } },
        { weight: 55, text: "Une rayure au premier créneau et des assurances hors de prix : la leçon est chère.", fx: { money: -0.35, dis: -2, mor: -2 } },
      ] },
      { label: "La citadine et un livret d'épargne", outcomes: [
        { weight: 100, text: "Votre banquier applaudit, les anciens du vestiaire hochent la tête : ce petit a compris.", fx: { money: 0.1, dis: 4 } },
      ] },
    ],
  },
  {
    id: "ev_school_return", cat: "Vie perso", icon: "🏫", w: 6,
    cond: { aMin: 19, aMax: 24, minRep: 30 },
    text: "Votre ancien collège vous invite pour parler aux élèves. La classe où vous rêviez en dessinant des terrains au fond du cahier.",
    options: [
      { label: "Y passer la journée entière", outcomes: [
        { weight: 100, text: "Cent gamins suspendus à vos lèvres, votre ancien prof ému aux larmes. On se souvient d'où l'on vient.", fx: { mor: 7, m: 3, rep: 2 } },
      ] },
      { label: "Envoyer un message vidéo, faute de temps", outcomes: [
        { weight: 60, text: "La vidéo fait le job, mais quelque chose vous dit que vous avez raté un moment.", fx: { mor: -2, rep: 1 } },
        { weight: 40, text: "La vidéo devient virale dans toute l'académie : effet inattendu.", fx: { rep: 3, mor: 2 } },
      ] },
    ],
  },
  {
    id: "ev_coach_protege", cat: "Vestiaire", icon: "🤝", w: 7,
    cond: { aMin: 21, aMax: 27, minCoach: 65 },
    text: "Le coach vous a choisi : vous êtes son relais tactique, son « joueur-miroir ». Certains cadres commencent à parler de favoritisme.",
    options: [
      { label: "Assumer ce rôle de bras droit", outcomes: [
        { weight: 55, text: "Vous devenez l'extension du coach sur le terrain : votre lecture du jeu explose.", fx: { m: 5, coach: 6, team: -3 } },
        { weight: 45, text: "« Le chouchou » : le surnom colle, et le vestiaire se méfie.", fx: { coach: 5, team: -6, mor: -3 } },
      ] },
      { label: "Garder une distance saine", outcomes: [
        { weight: 60, text: "Ni chouchou, ni frondeur : l'équilibre parfait entre staff et vestiaire.", fx: { m: 3, team: 3 } },
        { weight: 40, text: "Le coach prend vos distances pour de l'ingratitude.", fx: { coach: -5 } },
      ] },
    ],
  },
  {
    id: "ev_bench_rebellion", cat: "Vestiaire", icon: "🪑", w: 7,
    cond: { aMin: 22, aMax: 30, maxCoach: 45 },
    text: "Le clan des remplaçants prépare une fronde : entretien collectif avec la direction pour dénoncer la gestion du coach. Ils veulent votre signature en premier.",
    options: [
      { label: "Signer et mener la fronde", hint: "Risqué", outcomes: [
        { weight: 40, text: "La direction tranche… en votre faveur : le coach doit rééquilibrer les temps de jeu.", fx: { form: 6, team: 5, coach: -6 } },
        { weight: 60, text: "La fronde fuite, le coach reste, et les signataires découvrent la tribune de haut.", fx: { ban: 5, coach: -8, mor: -6 } },
      ] },
      { label: "Refuser : on règle ça sur le terrain", outcomes: [
        { weight: 55, text: "Votre refus discret arrive aux oreilles du coach. Le message passe mieux qu'une pétition.", fx: { coach: 6, dis: 3 } },
        { weight: 45, text: "Les frondeurs vous traitent de carriériste. Ambiance de mercato en février.", fx: { team: -5, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_captain_vote", cat: "Vestiaire", icon: "🗳️", w: 8,
    cond: { aMin: 24, aMax: 31, minTeam: 62, minClubSeasons: 3 },
    text: "Le vestiaire vote pour son nouveau capitaine, et votre nom circule avec insistance. Le doyen du groupe, lui, estime que c'est « son tour ».",
    options: [
      { label: "Faire campagne, assumer l'ambition", outcomes: [
        { weight: 55, text: "Élu ! Le brassard récompense des années d'exemplarité — et le doyen vous serre la main.", fx: { c: 5, m: 4, team: 5, rep: 3, trait: "leader", flag: "captain" } },
        { weight: 45, text: "Le doyen l'emporte d'une voix. Votre campagne laisse quelques traces.", fx: { team: -4, mor: -4 } },
      ] },
      { label: "Soutenir publiquement le doyen", outcomes: [
        { weight: 60, text: "Votre geste force le respect : le doyen prend le brassard et fait de vous son héritier officiel.", fx: { team: 7, m: 3, mor: 4 } },
        { weight: 40, text: "Élu quand même, contre votre gré ! Le vestiaire a tranché : c'est vous, le patron.", fx: { c: 4, team: 5, trait: "leader", flag: "captain" } },
      ] },
    ],
  },
  {
    id: "ev_record_chase", cat: "Records", icon: "📈", w: 7,
    cond: { aMin: 26, aMax: 34, pos: ["att"], minClubSeasons: 5, minRep: 55 },
    text: "Plus que quelques buts pour effacer le record historique du club, détenu depuis quarante ans par une légende locale — qui suit chacun de vos matchs en tribune.",
    options: [
      { label: "Chasser le record match après match", outcomes: [
        { weight: 55, text: "Record battu ! La légende descend vous enlacer sur la pelouse. Deux histoires liées à jamais.", fx: { rep: 7, mor: 8, form: 4 } },
        { weight: 45, text: "L'obsession du record grippe votre jeu : il tombera, mais plus tard.", fx: { form: -5, mor: -3 } },
      ] },
      { label: "Laisser le record venir naturellement", outcomes: [
        { weight: 65, text: "Sans y penser, les buts s'enchaînent : le record tombe dans un match anodin, et c'est encore plus beau.", fx: { rep: 5, mor: 5 } },
        { weight: 35, text: "Un transfert, une blessure, une méforme… le record attendra une autre vie.", fx: { mor: -2 } },
      ] },
    ],
  },
  {
    id: "ev_pundit_feud", cat: "Médias", icon: "📺", w: 6,
    cond: { aMin: 23, aMax: 31, minRep: 45 },
    text: "Le consultant vedette de la télé vous démonte chaque semaine : « surcoté », « fantôme des grands matchs ». Ce soir, vous êtes invité sur son plateau.",
    options: [
      { label: "Y aller et régler ça en face", hint: "Frontal", outcomes: [
        { weight: 45, text: "Votre calme et vos statistiques le désarment en direct. L'extrait tourne en boucle.", fx: { rep: 5, c: 5, m: 3 } },
        { weight: 55, text: "Il vous pousse à la faute en direct : le clash vous poursuit des semaines.", fx: { rep: -3, mor: -5 } },
      ] },
      { label: "Décliner et répondre sur le terrain", outcomes: [
        { weight: 60, text: "Un match XXL le week-end suivant, célébré main sur l'oreille. Le consultant change de sujet.", fx: { form: 5, rep: 3, mor: 4 } },
        { weight: 40, text: "Le silence est pris pour un aveu. Les critiques continuent de pleuvoir.", fx: { mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_ultras_tifo", cat: "Supporters", icon: "🎨", w: 6,
    cond: { aMin: 24, aMax: 34, minRep: 55, minClubSeasons: 4 },
    text: "Au coup d'envoi, tout le virage se lève : un tifo géant à VOTRE effigie recouvre la tribune. Des mois de travail secret des ultras.",
    options: [
      { label: "Aller saluer le virage après le match", outcomes: [
        { weight: 100, text: "Écharpe au poing devant le virage : une communion que même les trophées n'offrent pas.", fx: { mor: 8, rep: 3, team: 3 } },
      ] },
      { label: "Financer discrètement leur prochain tifo", cond: { minMoney: 1 }, outcomes: [
        { weight: 60, text: "Le secret tient six mois, puis fuite : « Il paie les tifos des autres. » La classe absolue.", fx: { money: -0.4, rep: 5, mor: 6 } },
        { weight: 40, text: "Le geste reste secret à jamais, comme il se doit. Le virage vous appartient.", fx: { money: -0.4, mor: 7 } },
      ] },
    ],
  },
  {
    id: "ev_burglary", cat: "Vie perso", icon: "🚨", w: 5,
    cond: { aMin: 22, aMax: 33, minMoney: 5 },
    text: "Pendant que vous jouiez, des cambrioleurs ont vidé votre villa — le match était diffusé, ils savaient que vous n'y étiez pas. Votre famille est choquée.",
    options: [
      { label: "Déménager dans une résidence sécurisée", outcomes: [
        { weight: 100, text: "Nouvelle adresse, gardes, caméras. La sérénité a un prix, la famille dort à nouveau.", fx: { money: -1.2, mor: -3, m: 2 } },
      ] },
      { label: "Renforcer la maison et rester", outcomes: [
        { weight: 55, text: "La maison devient un coffre-fort, et le quartier s'organise. On ne vous délogera pas.", fx: { money: -0.5, m: 3 } },
        { weight: 45, text: "Chaque déplacement devient une angoisse pour vos proches. Le foot s'en ressent.", fx: { money: -0.5, mor: -6, form: -4 } },
      ] },
    ],
  },
  {
    id: "ev_lookalike", cat: "Insolite", icon: "👥", w: 4,
    cond: { aMin: 22, aMax: 33, minRep: 50 },
    text: "Un sosie presque parfait écume les boîtes du pays en signant des autographes et en promettant des maillots. La presse s'en amuse, vos sponsors moins.",
    options: [
      { label: "En rire publiquement et l'inviter au stade", outcomes: [
        { weight: 70, text: "La photo avec votre sosie fait le tour du monde. Coup de com' involontaire et génial.", fx: { rep: 4, c: 3, mor: 4 } },
        { weight: 30, text: "Encouragé, le sosie redouble d'escroqueries. Vos avocats s'arrachent les cheveux.", fx: { money: -0.3, mor: -3 } },
      ] },
      { label: "Envoyer les avocats", outcomes: [
        { weight: 60, text: "L'affaire se règle vite et discrètement. Chacun retrouve son visage.", fx: { money: -0.2, dis: 2 } },
        { weight: 40, text: "« La star attaque son sosie au chômage » : la presse people se régale, pas vous.", fx: { rep: -3, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_decline_bench", cat: "Crise", icon: "🕰️", w: 8,
    cond: { aMin: 31, aMax: 35, maxForm: 55 },
    text: "Les jeunes vont plus vite, le coach « fait tourner », et votre nom glisse doucement vers le bas de la feuille de match. Le déclin a commencé — reste à choisir comment le vivre.",
    options: [
      { label: "Accepter le rôle de doublure de luxe", outcomes: [
        { weight: 60, text: "Entrées décisives, conseils aux jeunes, zéro vague : le vestiaire vous surnomme « le Sage ».", fx: { m: 5, team: 6, mor: 4 } },
        { weight: 40, text: "Le banc pèse plus lourd que prévu. Chaque échauffement sans entrer est une petite mort.", fx: { mor: -5, form: -3 } },
      ] },
      { label: "Refuser le déclin : régime, data, préparation", hint: "Guerrier", outcomes: [
        { weight: 45, text: "Le corps répond une dernière fois : vous arrachez encore une saison de titulaire.", fx: { p: 4, form: 7, m: 4 } },
        { weight: 55, text: "La machine casse : le forcing se paie à l'infirmerie.", fx: { inj: 8, p: -3, mor: -4 } },
      ] },
    ],
  },

  // ══════════════ RIVALITÉ INCARNÉE (v5) ══════════════
  {
    id: "ev_rival_same_club", cat: "Rivalité", icon: "🤯", w: 8,
    cond: { aMin: 24, aMax: 30, minRep: 55, chance: 0.5 },
    text: "Coup de tonnerre au mercato : {rival} signe dans VOTRE club. Le duel de toute une génération va se jouer… à l'entraînement, tous les matins.",
    options: [
      { label: "En faire votre moteur quotidien", outcomes: [
        { weight: 55, text: "Chaque séance devient une finale : vous progressez comme jamais, et le duo fascine l'Europe.", fx: { t: 4, form: 6, rep: 4 } },
        { weight: 45, text: "La cohabitation est électrique : le vestiaire choisit ses camps, le coach jongle.", fx: { form: 3, team: -4, mor: -3 } },
      ] },
      { label: "Exiger des garanties sur votre statut", outcomes: [
        { weight: 50, text: "La direction vous confirme numéro un. {rival} devra faire avec.", fx: { coach: 4, mor: 4 } },
        { weight: 50, text: "« Personne n'est au-dessus du club. » La réponse claque, le doute s'installe.", fx: { coach: -4, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_rival_trash", cat: "Rivalité", icon: "🎙️", w: 8,
    cond: { aMin: 20, aMax: 26 },
    text: "Après vous avoir battu, {rival} lâche en interview : « Lui ? Il joue bien… pour un joueur moyen. » Le clip fait dix millions de vues en 24 heures.",
    options: [
      { label: "Répondre par une punchline", hint: "Clash", outcomes: [
        { weight: 45, text: "Votre réplique enterre la sienne : le round médiatique est pour vous.", fx: { c: 4, rep: 4, mor: 4 } },
        { weight: 55, text: "L'escalade vous dessert : « occupez-vous du terrain », soupire votre coach.", fx: { rep: -2, coach: -3, mor: -3 } },
      ] },
      { label: "Encadrer la phrase dans votre vestiaire", hint: "Carburant", outcomes: [
        { weight: 60, text: "La phrase devient votre carburant : votre saison décolle, et le monde le remarque.", fx: { form: 6, m: 4, mor: 4 } },
        { weight: 40, text: "L'obsession du rival vous sort de votre jeu par séquences.", fx: { form: -3, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_rival_ballon_race", cat: "Rivalité", icon: "⭐", w: 9,
    cond: { aMin: 26, aMax: 32, minRep: 72, minOvr: 82 },
    text: "La presse mondiale n'a qu'un sujet : {rival} ou vous pour le prochain Ballon d'Or. Chaque match devient un référendum, chaque interview un plaidoyer.",
    options: [
      { label: "Jouer le jeu médiatique à fond", outcomes: [
        { weight: 50, text: "Votre storytelling est parfait : le récit de la saison penche de votre côté.", fx: { rep: 6, c: 4, form: -2 } },
        { weight: 50, text: "Trop de plateaux, pas assez de terrain : {rival} brille pendant que vous parlez.", fx: { rep: 2, form: -5, mor: -3 } },
      ] },
      { label: "Disparaître des médias, tout mettre dans le jeu", outcomes: [
        { weight: 55, text: "Votre silence devient un statement : les performances parlent, assourdissantes.", fx: { form: 6, m: 4, rep: 3 } },
        { weight: 45, text: "{rival} occupe tout l'espace médiatique. Dans les votes, ça compte aussi.", fx: { form: 4, rep: -2 } },
      ] },
    ],
  },
  {
    id: "ev_rival_jubilee", cat: "Rivalité", icon: "🎊", w: 9,
    cond: { aMin: 34, aMax: 36, minRep: 55 },
    text: "{rival} organise son jubilé d'adieux et vous invite comme capitaine de l'équipe adverse : « Sans toi, ma carrière n'aurait pas eu le même goût. »",
    options: [
      { label: "Accepter et jouer le jubilé à fond", outcomes: [
        { weight: 100, text: "Une soirée d'anthologie : petits ponts, accolades, larmes au coup de sifflet final. Deux carrières, une seule histoire.", fx: { mor: 9, rep: 4, m: 3 } },
      ] },
      { label: "Décliner : la rivalité ne se met pas en scène", outcomes: [
        { weight: 55, text: "Votre absence fait jaser, mais {rival} comprend : « C'est exactement pour ça que je le respecte. »", fx: { m: 3, mor: -2 } },
        { weight: 45, text: "Le public y voit de la rancune. Le beau récit de votre rivalité se ternit un peu.", fx: { rep: -3, mor: -3 } },
      ] },
    ],
  },

  // ══════════════ COUPS DURS & SORTIES FORCÉES (v4.2) ══════════════
  // Ces événements peuvent réellement casser une saison — et parfois,
  // rester au club n'est plus une option.
  {
    id: "ev_loft", cat: "Crise", icon: "🚪", w: 9,
    cond: { aMin: 21, aMax: 32, maxCoach: 38 },
    text: "Le verdict tombe : mis au loft. Plus de vestiaire principal, entraînements à part avec les indésirables. Le club est clair : « Trouve-toi une porte de sortie. » Rester n'est plus une option.",
    options: [
      { label: "Faire jouer votre statut pour un bon transfert", hint: "Réputation", cond: { minRep: 60 }, outcomes: [
        { weight: 60, text: "Votre nom pèse encore : un club sérieux vous sort du placard la tête haute.", fx: { ban: 4, mor: -3, transfer: { d: 0 } } },
        { weight: 40, text: "Les négociations traînent, l'hiver au loft est long, mais la sortie arrive.", fx: { ban: 8, mor: -6, form: -5, transfer: { d: 0 } } },
      ] },
      { label: "Accepter un club moins huppé pour rejouer vite", outcomes: [
        { weight: 65, text: "Vous redescendez d'un étage sans faire la fine bouche : le terrain d'abord.", fx: { ban: 3, mor: -2, dis: 3, transfer: { d: -1 } } },
        { weight: 35, text: "La descente pique l'ego, mais au moins, vous rejouez au ballon.", fx: { ban: 3, mor: -5, transfer: { d: -1 } } },
      ] },
      { label: "Un prêt de la dernière chance", outcomes: [
        { weight: 100, text: "Six mois pour tout prouver ailleurs. Le football vous offre rarement deux lofts de suite.", fx: { ban: 3, loan: true } },
      ] },
      { label: "Repartir de zéro à l'étranger", hint: "Risqué", outcomes: [
        { weight: 55, text: "L'exil comme électrochoc : nouveau pays, nouvelle faim.", fx: { ban: 4, m: 3, transfer: { d: -1, cross: true } } },
        { weight: 45, text: "Partir si loin pour se relancer… le pari est osé, la solitude réelle.", fx: { ban: 4, mor: -5, transfer: { d: -1, cross: true } } },
      ] },
    ],
  },
  {
    id: "ev_star_signing", cat: "Crise", icon: "🌠", w: 8,
    cond: { aMin: 22, aMax: 31, levels: ["d1", "elite"], minOvr: 72 },
    text: "Coup de tonnerre au mercato : le club signe une superstar mondiale… à VOTRE poste exact. En conférence de presse, le président parle de « concurrence saine ». Personne n'y croit.",
    options: [
      { label: "Relever le défi, quitte à souffrir", outcomes: [
        { weight: 35, text: "Vous surjouez la superstar à l'entraînement puis en match : le banc, c'est pour l'autre.", fx: { t: 3, form: 6, rep: 5, coach: 6 } },
        { weight: 40, text: "La rotation s'installe : deux coqs pour une place, et des miettes pour chacun.", fx: { form: -6, mor: -5 } },
        { weight: 25, text: "Le combat est perdu d'avance : votre temps de jeu fond comme neige au soleil.", fx: { ban: 6, form: -9, mor: -8, coach: -4 } },
      ] },
      { label: "Exiger un départ immédiat", hint: "Cash", outcomes: [
        { weight: 60, text: "Le club comprend et facilite une sortie propre vers un projet où vous serez central.", fx: { transfer: { d: 0 } } },
        { weight: 40, text: "Le départ se négocie mal : vous partez, mais en claquant la porte.", fx: { rep: -3, mor: -4, transfer: { d: -1 } } },
      ] },
    ],
  },
  {
    id: "ev_press_blunder", cat: "Crise", icon: "🎤", w: 7,
    cond: { aMin: 20, aMax: 31, minRep: 35 },
    text: "Fin de match tendue, micro tendu, fatigue : votre phrase assassine sur le club et le staff tourne en boucle. « Ce club n'a aucune ambition, on joue comme des morts. » Le président exige des comptes.",
    options: [
      { label: "Assumer chaque mot", hint: "Brûlant", outcomes: [
        { weight: 30, text: "Votre franchise électrocute le club : la direction recrute, l'équipe se réveille. Coup de poker gagnant.", fx: { rep: 4, c: 4, coach: -4, mor: 4 } },
        { weight: 40, text: "Amende record, brassard confisqué, vestiaire glacial. Vos mots vous suivent partout.", fx: { money: -0.8, rep: -4, team: -6, coach: -8, dis: -3 } },
        { weight: 30, text: "Le point de non-retour : le club vous met en vente dès l'ouverture du mercato.", fx: { rep: -3, mor: -5, coach: -10, transfer: { d: -1 } } },
      ] },
      { label: "S'excuser publiquement", outcomes: [
        { weight: 60, text: "Des excuses dignes, en personne, devant le groupe. L'incident se referme.", fx: { dis: 3, m: 2, mor: -2 } },
        { weight: 40, text: "Les excuses passent pour du rétropédalage. Ni les fans ni le vestiaire ne sont dupes.", fx: { rep: -2, team: -3, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_confidence_spiral", cat: "Crise", icon: "🌪️", w: 8,
    cond: { aMin: 19, aMax: 30, maxForm: 48 },
    text: "Trois matchs sans exister, un penalty manqué, des jambes en coton : la spirale de la confiance perdue vous aspire. Chaque contrôle devient une épreuve.",
    options: [
      { label: "S'appuyer sur un ancien mentor", outcomes: [
        { weight: 60, text: "De longues heures de vidéo et de vérités bien senties : la confiance revient par le travail.", fx: { form: 9, m: 5, mor: 6 } },
        { weight: 40, text: "Les conseils aident, mais la sortie du tunnel est encore loin.", fx: { form: 4, m: 2 } },
      ] },
      { label: "Forcer, encore et encore", hint: "Tête baissée", outcomes: [
        { weight: 40, text: "À force d'insister, un but chanceux fait tout basculer. Le football est parfois simple.", fx: { form: 8, mor: 6 } },
        { weight: 60, text: "Plus vous forcez, plus tout se dérobe : la saison s'enfonce, la technique se grippe.", fx: { t: -3, form: -7, mor: -7 } },
      ] },
    ],
  },

  // ══════════════ AGENT & CONTRAT (v4.2) ══════════════
  {
    id: "ev_agent_demands", cat: "Entourage", icon: "💼", w: 5, once: false,
    cond: { aMin: 20, aMax: 33, minRep: 40 },
    text: "Rendez-vous au sommet avec votre agent : « Ton contrat ne reflète plus ce que tu es. On attaque le club, mais choisis bien l'angle. »",
    options: [
      { label: "Exiger une revalorisation salariale", outcomes: [
        { weight: 45, text: "Le club plie : contrat revalorisé, statut assumé. Votre agent savoure.", fx: { salaryMult: 1.35, mor: 5, rep: 2 } },
        { weight: 30, text: "Refus poli mais ferme. La relation se tend, les négociations reprendront.", fx: { coach: -5, mor: -3 } },
        { weight: 25, text: "Le club prend très mal l'ultimatum : vous voilà officiellement sur la liste des transferts.", fx: { coach: -8, mor: -4, flag: "listed" } },
      ] },
      { label: "Négocier une clause libératoire", outcomes: [
        { weight: 55, text: "Clause obtenue : votre avenir vous appartient désormais, noir sur blanc.", fx: { flag: "release_clause", mor: 3 } },
        { weight: 45, text: "« Hors de question. » Le club verrouille, votre agent enrage.", fx: { coach: -3 } },
      ] },
      { label: "Réclamer un statut de patron", hint: "Ambitieux", cond: { minRep: 55 }, outcomes: [
        { weight: 50, text: "Le coach officialise : vous êtes désormais un cadre du projet, dans le onze et dans le vestiaire.", fx: { team: 6, c: 4, coach: 5, mor: 4 } },
        { weight: 50, text: "La démarche fuite et le vestiaire grince : « Il se prend pour qui ? »", fx: { team: -6, rep: -2, mor: -3 } },
      ] },
    ],
  },

  // ══════════════ COHÉRENCE NARRATIVE (v4) ══════════════
  {
    id: "ev_homesick_abroad", cat: "Vie perso", icon: "🏠", w: 10,
    cond: { aMin: 19, aMax: 31, abroad: true, foreignLang: true },
    text: "L'expatriation pèse plus que prévu : la langue, la cuisine, les appels vidéo qui remplacent les dimanches en famille. Votre agent le sent : « Si tu veux rentrer au pays, dis-le maintenant. »",
    options: [
      { label: "Organiser le retour au pays", outcomes: [
        { weight: 55, text: "Des clubs de chez vous se manifestent aussitôt : l'enfant du pays rentre à la maison.", fx: { mor: 6, transfer: { d: 0, home: true } } },
        { weight: 45, text: "Le retour s'organise, avec une petite concession sportive assumée.", fx: { mor: 8, rep: -2, transfer: { d: -1, home: true } } },
      ] },
      { label: "Serrer les dents et s'intégrer pour de bon", outcomes: [
        { weight: 55, text: "Cours de langue intensifs, sorties avec les coéquipiers : le déclic arrive enfin.", fx: { m: 5, mor: 6, c: 3, trait: "zen" } },
        { weight: 45, text: "Le vague à l'âme reste votre colocataire. Vous jouez, mais sans joie.", fx: { mor: -6, form: -4 } },
      ] },
    ],
  },
  {
    id: "ev_rival_club_bid", cat: "Mercato", icon: "😈", w: 9,
    cond: { aMin: 21, aMax: 30, minRep: 45 },
    text: "L'impensable : l'ennemi juré de vos supporters — LE club qu'on ne rejoint jamais — propose de doubler votre salaire. Votre vestiaire vous observe, les réseaux s'embrasent déjà.",
    options: [
      { label: "Signer chez l'ennemi", hint: "Trahison", outcomes: [
        { weight: 55, text: "Vous franchissez la ligne rouge. Vos anciens supporters brûlent votre maillot en place publique.", fx: { rep: -6, money: 2, mor: -4, flag: "traitor", sched: { id: "ev_traitor_return", inYears: 1 }, transfer: { d: 1, domestic: true, direct: true } } },
        { weight: 45, text: "Le transfert de la trahison s'écrit en une des journaux. Sportivement, difficile de dire non.", fx: { rep: -4, money: 2, flag: "traitor", sched: { id: "ev_traitor_return", inYears: 1 }, transfer: { d: 1, domestic: true, direct: true } } },
      ] },
      { label: "Refuser : certaines lignes ne se franchissent pas", outcomes: [
        { weight: 60, text: "Votre refus fuite. Le virage vous érige en symbole : « LUI, il a compris le club. »", fx: { rep: 5, mor: 6, team: 4, trait: "loyal" } },
        { weight: 40, text: "Vous refusez sans bruit. L'argent envolé pique un peu, la conscience est tranquille.", fx: { mor: 3, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_traitor_return", cat: "Terrain", icon: "🔥", scheduledOnly: true, w: 1,
    text: "Premier retour dans votre ancien stade depuis la trahison. Banderoles hostiles, sifflets assourdissants dès l'échauffement, votre nom conspué à chaque ballon touché.",
    options: [
      { label: "Répondre sur le terrain et célébrer face au virage", hint: "Provocateur", outcomes: [
        { weight: 40, text: "Match immense, célébré bras croisés devant le virage. Iconique pour les uns, impardonnable pour les autres.", fx: { rep: 5, c: 4, mor: 6, trait: "showman" } },
        { weight: 35, text: "Match quelconque, sifflets interminables : la soirée la plus longue de votre carrière.", fx: { mor: -6, form: -3 } },
        { weight: 25, text: "Votre provocation dégénère en incidents en tribune. Le match est terni, votre image aussi.", fx: { rep: -6, mor: -5, dis: -4 } },
      ] },
      { label: "Jouer sobrement, sans célébrer", outcomes: [
        { weight: 60, text: "Décisif, puis les mains levées en signe de respect vers votre ancien public. Même vos détracteurs saluent la classe.", fx: { rep: 4, m: 4, mor: 4 } },
        { weight: 40, text: "Un match neutre, digne, vite oublié. Le feu s'éteint doucement.", fx: { m: 3 } },
      ] },
    ],
  },
  {
    id: "ev_late_degree", cat: "Reconversion", icon: "🎓", w: 8,
    cond: { aMin: 30, aMax: 35, flag: "graduated" },
    text: "Votre vieux diplôme vous ouvre les portes d'un master en management du sport, à distance. L'après-carrière se prépare maintenant — entre deux entraînements.",
    options: [
      { label: "S'inscrire au master", outcomes: [
        { weight: 65, text: "Diplômé avec mention. Les clubs vous voient déjà directeur sportif — votre cerveau vaut votre pied droit.", fx: { m: 6, flag: "boardroom", mor: 4 } },
        { weight: 35, text: "Le cumul est rude, mais le papier tombe. L'avenir s'éclaircit.", fx: { m: 4, form: -4, flag: "boardroom" } },
      ] },
      { label: "Le terrain d'abord, toujours", outcomes: [
        { weight: 100, text: "Chaque chose en son temps. Mais le temps, justement, file.", fx: { form: 2 } },
      ] },
    ],
  },

  // ══════════════ GARDIENS & DÉFENSEURS (batch v8) ══════════════
  {
    id: "ev_gk_understudy", cat: "Terrain", icon: "🧤", w: 12,
    cond: { aMin: 18, aMax: 22, pos: ["gk"], maxOvr: 78 },
    text: "Le gardien titulaire, monument du club, se blesse à l'échauffement d'un choc au sommet. Le coach se tourne vers vous : « T'es prêt, gamin ? »",
    options: [
      { label: "Y aller, sans trembler", outcomes: [
        { weight: 45, text: "Trois arrêts décisifs, cage inviolée, standing ovation : un titulaire est né ce soir.", fx: { rep: 7, m: 5, form: 6, coach: 8 } },
        { weight: 30, text: "Une copie sérieuse, sans éclat. Le staff note le sang-froid.", fx: { m: 3, form: 3, coach: 4 } },
        { weight: 25, text: "Une sortie hasardeuse coûte le match. Retour au banc, tête basse.", fx: { mor: -8, rep: -3, coach: -4 } },
      ] },
      { label: "Avouer que vous ne vous sentez pas prêt", hint: "Honnête", outcomes: [
        { weight: 50, text: "Le coach salue la lucidité… mais la hiérarchie se fige pour longtemps.", fx: { m: 4, coach: 2, form: -4, mor: -4 } },
        { weight: 50, text: "Le vestiaire l'apprend. Dur de porter l'étiquette de celui qui a dit non.", fx: { mor: -8, team: -4, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_gk_blunder", cat: "Terrain", icon: "🫣", w: 10,
    cond: { aMin: 20, aMax: 31, pos: ["gk"] },
    text: "Un ballon anodin glisse entre vos gants et finit au fond : la boulette de l'année, en boucle sur tous les écrans du pays.",
    options: [
      { label: "Assumer face caméra le soir même", outcomes: [
        { weight: 55, text: "« C'est ma faute, jugez-moi sur la suite. » Le courage force le respect général.", fx: { c: 5, m: 4, rep: 3 } },
        { weight: 45, text: "Vos excuses deviennent un mème de plus. Il faudra répondre sur le terrain.", fx: { mor: -5, rep: -1 } },
      ] },
      { label: "Couper les réseaux et bosser en silence", outcomes: [
        { weight: 60, text: "Trois clean sheets plus tard, la boulette est oubliée. Le travail lave tout.", fx: { form: 6, m: 4, dis: 4 } },
        { weight: 40, text: "Le doute s'invite à chaque sortie aérienne. Une saison à frissons.", fx: { m: -4, form: -5, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_gk_captain", cat: "Vestiaire", icon: "©️", w: 9,
    cond: { aMin: 27, aMax: 34, pos: ["gk"], minRep: 45, minTeam: 55 },
    text: "Le coach veut un capitaine qui voit TOUT le jeu : vous. Un gardien avec le brassard — la presse adore le débat, le vestiaire attend votre réponse.",
    options: [
      { label: "Prendre le brassard", outcomes: [
        { weight: 55, text: "Depuis votre surface, vous dirigez tout. Le débat est clos en trois matchs.", fx: { c: 5, m: 4, team: 6, trait: "leader" } },
        { weight: 45, text: "Diriger à quarante mètres de l'action a ses limites : certains cadres tiquent.", fx: { c: 3, team: -4, mor: -2 } },
      ] },
      { label: "Suggérer un joueur de champ", hint: "Collectif", outcomes: [
        { weight: 60, text: "Votre humilité renforce votre autorité morale. Capitaine sans brassard.", fx: { m: 4, team: 5, mor: 3 } },
        { weight: 40, text: "Le coach voulait VOTRE voix. Il range l'idée, un peu déçu.", fx: { coach: -3, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_def_own_goal", cat: "Terrain", icon: "🥅", w: 10,
    cond: { aMin: 19, aMax: 32, pos: ["def"] },
    text: "90e minute d'un match capital : votre dégagement en catastrophe termine dans vos propres filets. Le silence du stade vous transperce.",
    options: [
      { label: "Prendre le micro en zone mixte", outcomes: [
        { weight: 50, text: "L'interview la plus dure de votre vie — et la plus respectée.", fx: { c: 4, m: 4, rep: 2 } },
        { weight: 50, text: "Les mots sonnent faux, les réseaux s'enflamment. Semaine interminable.", fx: { mor: -6, rep: -2 } },
      ] },
      { label: "Répondre par un match parfait", hint: "Revanche", outcomes: [
        { weight: 55, text: "Muraille infranchissable le week-end suivant : voilà la vraie réponse.", fx: { m: 5, form: 5, rep: 3 } },
        { weight: 45, text: "La peur de la faute paralyse votre jeu pendant des semaines.", fx: { form: -4, m: -3, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_def_butcher_tag", cat: "Médias", icon: "🥩", w: 9,
    cond: { aMin: 22, aMax: 32, pos: ["def"] },
    text: "Après un tacle appuyé qui envoie une star adverse à l'infirmerie, la presse vous colle une étiquette : « le Boucher ».",
    options: [
      { label: "Assumer le personnage", hint: "Rugueux", outcomes: [
        { weight: 45, text: "Les attaquants n'osent plus entrer dans votre zone. La peur a changé de camp.", fx: { rep: 4, c: 3, m: 3, team: 4 } },
        { weight: 30, text: "Les arbitres vous sifflent désormais au moindre contact. L'étiquette colle.", fx: { rep: -3, dis: -6, mor: -3 } },
        { weight: 25, text: "Un rouge sévère, conséquence directe de la réputation. Le personnage se paie.", fx: { ban: 2, rep: -4, dis: -4 } },
      ] },
      { label: "Travailler la finesse pour tuer l'étiquette", outcomes: [
        { weight: 60, text: "Anticipation, placement, propreté : votre jeu gagne dix ans de maturité.", fx: { t: 4, m: 3, dis: 4 } },
        { weight: 40, text: "À trop retenir vos duels, vous perdez ce qui faisait votre force.", fx: { form: -3, m: -2 } },
      ] },
    ],
  },

  // ══════════════ FIN DE CARRIÈRE & HÉRITAGE (batch v8) ══════════════
  {
    id: "ev_young_idol", cat: "Vestiaire", icon: "🧒", w: 9,
    cond: { aMin: 31, aMax: 36, minRep: 55 },
    text: "Un gamin du centre de formation débarque chez les pros… avec votre nom floqué sur son maillot d'entraînement. « C'est à cause de vous que je joue. »",
    options: [
      { label: "Le prendre sous votre aile", outcomes: [
        { weight: 45, text: "Vous restez après chaque séance pour lui. Le voir progresser vaut tous les honneurs.", fx: { m: 4, team: 6, mor: 6 } },
        { weight: 25, text: "Le vestiaire voit en vous un passeur de témoin. Un rôle taillé pour vous.", fx: { team: 5, mor: 5, trait: "leader" } },
        { weight: 30, text: "Le gamin progresse vite… et vise VOTRE place. L'élève ne s'excusera pas.", fx: { mor: -3, form: -2, m: 2 } },
      ] },
      { label: "Garder vos distances", outcomes: [
        { weight: 60, text: "Chacun sa route. Le respect n'a pas besoin de mots.", fx: { m: 2, form: 2 } },
        { weight: 40, text: "Le gamin encaisse en silence. La presse vous trouve « distant ».", fx: { mor: -3, team: -2 } },
      ] },
    ],
  },
  {
    id: "ev_last_derby", cat: "Supporters", icon: "🏟️", w: 9,
    cond: { aMin: 33, aMax: 36, minClubSeasons: 3 },
    text: "On murmure que c'est peut-être votre dernier derby. Le virage prépare quelque chose en secret ; le club vous demande un mot pour le programme du match.",
    options: [
      { label: "Écrire une lettre aux supporters", outcomes: [
        { weight: 65, text: "Votre lettre est lue à voix haute dans tout le stade avant le coup d'envoi. Frissons éternels.", fx: { rep: 4, mor: 7, team: 3 } },
        { weight: 35, text: "Les mots touchent juste, même si le résultat gâche un peu la fête.", fx: { mor: 4, rep: 2 } },
      ] },
      { label: "Laisser le terrain parler", outcomes: [
        { weight: 55, text: "Un derby plein, disputé comme à 20 ans. La plus belle des lettres.", fx: { form: 4, m: 3, mor: 4 } },
        { weight: 45, text: "Un derby anonyme. Le rendez-vous manqué laisse un goût amer.", fx: { mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_penalty_gift", cat: "Terrain", icon: "🎁", w: 8,
    cond: { aMin: 32, aMax: 36, pos: ["att", "mil"], minRep: 50 },
    text: "Penalty à la 88e d'un match plié. Vous êtes à UN but d'un record personnel… et le gamin de 18 ans que vous couvez n'a jamais marqué en pro. Il n'ose pas vous regarder.",
    options: [
      { label: "Lui poser le ballon sur le point", hint: "Héritage", outcomes: [
        { weight: 70, text: "Il marque, fond en larmes, et court vers VOUS. Cette image dira qui vous étiez mieux que tous les records.", fx: { c: 5, team: 8, mor: 8, rep: 3 } },
        { weight: 30, text: "Il le rate… et vous le consolez devant le monde entier. Le geste reste, le record attendra.", fx: { team: 5, mor: 2, c: 3 } },
      ] },
      { label: "Le record d'abord, la pédagogie ensuite", outcomes: [
        { weight: 60, text: "But, record égalé. Les chiffres ne demandent pas pardon.", fx: { rep: 3, mor: 4, form: 2 } },
        { weight: 40, text: "But… mais la célébration sonne creux. Le gamin applaudit poliment.", fx: { rep: 2, team: -3, mor: -2 } },
      ] },
    ],
  },
  {
    id: "ev_academy_invest", cat: "Finance", icon: "🏗️", w: 8,
    cond: { aMin: 31, aMax: 36, minMoney: 20 },
    text: "Le maire de votre ville d'origine vous reçoit : le terrain de votre enfance part en ruine. Une académie à votre nom pourrait tout changer — à vos frais.",
    options: [
      { label: "Financer l'académie", hint: "Héritage", outcomes: [
        { weight: 70, text: "Trois ans plus tard, quatre cents gamins y jouent. Votre nom sur le fronton vaut tous les trophées.", fx: { money: -4, rep: 6, mor: 8, c: 3, flag: "academy_founder" } },
        { weight: 30, text: "Le chantier déborde du budget… mais tient debout. Comme vous.", fx: { money: -5, rep: 3, mor: 4, flag: "academy_founder" } },
      ] },
      { label: "Un chèque discret, sans le nom", outcomes: [
        { weight: 60, text: "Le terrain renaît. Personne ne saura jamais, et c'est très bien ainsi.", fx: { money: -1.5, mor: 5, m: 2 } },
        { weight: 40, text: "La rumeur finit par sortir : la discrétion a bon dos, la classe est réelle.", fx: { money: -1.5, mor: 3, rep: 2 } },
      ] },
    ],
  },

  // ══════════════ FEUILLETON & SOMMET (batch v8) ══════════════
  {
    id: "ev_journalist_pact", cat: "Médias", icon: "🖋️", w: 9,
    cond: { aMin: 17, aMax: 19 },
    text: "Un jeune pigiste local vous suit depuis vos débuts. Après l'entraînement, il ose : « Le jour où tu soulèves un vrai trophée, c'est moi qui écris ta biographie. Promis ? »",
    options: [
      { label: "Promettre, poignée de main", outcomes: [
        { weight: 100, text: "« Alors rendez-vous là-haut. » Une promesse de gamins — de celles qu'on n'oublie pas.", fx: { mor: 3, c: 2, flag: "biography_pact", sched: { id: "ev_journalist_return", inYears: 12 } } },
      ] },
      { label: "Sourire sans promettre", outcomes: [
        { weight: 100, text: "On verra. Les journalistes promettent beaucoup ; les carrières décident.", fx: { m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_journalist_return", cat: "Médias", icon: "📖", w: 1, scheduledOnly: true,
    text: "Le pigiste d'autrefois dirige aujourd'hui la rédaction d'un grand quotidien sportif. Il pose son dictaphone sur la table : « Je n'ai pas oublié la promesse. C'est l'heure ? »",
    options: [
      { label: "Tout raconter, sans filtre", outcomes: [
        { weight: 55, text: "« De la boue au sommet » : la biographie émeut bien au-delà du football.", fx: { rep: 6, c: 4, money: 0.8, mor: 5 } },
        { weight: 45, text: "Certains chapitres froissent d'anciens coéquipiers. La vérité a un prix.", fx: { rep: 3, mor: -4, team: -3 } },
      ] },
      { label: "Pas encore : la fin s'écrit toujours", outcomes: [
        { weight: 100, text: "Il sourit : « Alors je garde la meilleure place en librairie. » Rendez-vous à la retraite.", fx: { m: 3, mor: 3 } },
      ] },
    ],
  },
  {
    id: "ev_after_ballon", cat: "Médias", icon: "👑", w: 12,
    cond: { aMin: 22, aMax: 33, minBallon: 1 },
    text: "La saison s'ouvre et le monde entier n'attend qu'une chose : voir le Ballon d'Or trébucher. Chaque contrôle raté fait désormais la une.",
    options: [
      { label: "Jouer libéré : la couronne n'est qu'un objet", outcomes: [
        { weight: 55, text: "Encore plus injouable qu'avant. Les grands ne redescendent pas : ils planent.", fx: { m: 5, form: 5, mor: 4 } },
        { weight: 45, text: "L'obsession de confirmer vous crispe. Une saison correcte — donc jugée décevante.", fx: { form: -3, mor: -4 } },
      ] },
      { label: "Tout sacrifier pour le doublé", hint: "Obsession", outcomes: [
        { weight: 40, text: "Une machine. Froide, méthodique, affamée. Le vestiaire n'ose plus vous parler les jours de match.", fx: { t: 3, form: 4, dis: 5, mor: -2 } },
        { weight: 60, text: "À force de courir après vous-même, le plaisir s'éteint doucement.", fx: { form: -5, mor: -7, m: -2 } },
      ] },
    ],
  },

  // ══════════════ DÉBUTS PROS 16-18 (batch v8.2 : le pool jeunesse était le plus mince) ══════════════
  {
    id: "ev_first_pro_contract", cat: "Mercato", icon: "🖊️", w: 13,
    cond: { aMin: 16, aMax: 17 },
    text: "Votre premier contrat professionnel est posé sur la table. Trois pages qui changent une vie. Votre entourage retient son souffle, le directeur sportif fait déjà les gros yeux.",
    options: [
      { label: "Signer avec le sourire, sans négocier", outcomes: [
        { weight: 60, text: "L'encre sèche, la photo est prise. Le club apprécie la simplicité et vous met dans les meilleures conditions.", fx: { dis: 4, coach: 6, mor: 5 } },
        { weight: 40, text: "Vous réaliserez plus tard que tout se négocie, même à 16 ans. Leçon retenue.", fx: { m: 3, mor: 3 } },
      ] },
      { label: "Faire relire chaque ligne", hint: "Prudent", outcomes: [
        { weight: 55, text: "Deux clauses retoquées, un salaire ajusté. Le club respecte ceux qui se respectent.", fx: { m: 4, dis: 2, salaryMult: 1.2 } },
        { weight: 45, text: "Trois semaines de bras de fer pour des miettes : le directeur sportif s'en souviendra.", fx: { coach: -5, m: 3 } },
      ] },
    ],
  },
  {
    id: "ev_growth_pains", cat: "Terrain", icon: "📏", w: 11,
    cond: { aMin: 16, aMax: 17 },
    text: "Huit centimètres en un an : votre corps change plus vite que votre jeu. Les appuis se cherchent, et le staff médical fronce les sourcils.",
    options: [
      { label: "Suivre le protocole de renforcement à la lettre", outcomes: [
        { weight: 65, text: "Six mois austères… et un corps tout neuf, plus solide que jamais.", fx: { p: 5, dis: 3 } },
        { weight: 35, text: "Le protocole s'éternise et la frustration grandit sur le banc.", fx: { p: 2, mor: -4, form: -3 } },
      ] },
      { label: "Continuer à jouer, le corps suivra", outcomes: [
        { weight: 50, text: "Le talent compense, le corps s'adapte en jouant. Vous grandissez dans tous les sens du terme.", fx: { t: 2, p: 2 } },
        { weight: 50, text: "Une pubalgie vous cueille au pire moment de la saison.", fx: { inj: 8, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_locker_hazing", cat: "Vestiaire", icon: "🎤", w: 11,
    cond: { aMin: 16, aMax: 17 },
    text: "Rite d'initiation : debout sur une chaise devant tout le vestiaire pro, vous devez chanter. Les cadres tapent déjà le rythme sur les tables.",
    options: [
      { label: "Chanter à pleins poumons, faux mais fier", outcomes: [
        { weight: 70, text: "Massacre musical, triomphe social : le vestiaire vous adopte sur-le-champ.", fx: { c: 4, team: 6, mor: 4 } },
        { weight: 30, text: "Tellement faux que c'en devient culte. Un surnom est né — pas le plus flatteur.", fx: { c: 3, team: 4, rep: 1 } },
      ] },
      { label: "Refuser, paralysé", outcomes: [
        { weight: 55, text: "Un cadre vous sauve la mise en chantant à votre place. Vous lui devez une fière chandelle.", fx: { team: 2, mor: -2 } },
        { weight: 45, text: "Le vestiaire n'insiste pas… et vous oublie un peu. L'intégration prendra des mois.", fx: { team: -5, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_first_salary", cat: "Finance", icon: "💶", w: 11,
    cond: { aMin: 17, aMax: 18 },
    text: "Premier vrai salaire. Une somme que personne n'a jamais gagnée dans la famille. Le téléphone chauffe : chacun a une idée pour vous.",
    options: [
      { label: "Envoyer l'essentiel à la famille", outcomes: [
        { weight: 70, text: "Le loyer réglé, une dette effacée. La fierté dans la voix de votre mère vaut tous les trophées.", fx: { mor: 8, m: 4, dis: 2 } },
        { weight: 30, text: "La famille en refuse la moitié : « Garde, construis-toi. » L'amour circule dans les deux sens.", fx: { mor: 6, m: 3 } },
      ] },
      { label: "S'offrir LE bolide vu en vitrine", hint: "Jeune", outcomes: [
        { weight: 45, text: "Photo, jantes, réseaux. Le quartier est fier, le coach beaucoup moins.", fx: { c: 4, rep: 2, dis: -4, money: -0.06, coach: -3 } },
        { weight: 55, text: "Le bolide dort au garage : vous n'avez même pas le permis. Tout le vestiaire est au courant.", fx: { c: 2, mor: -2, money: -0.06 } },
      ] },
    ],
  },

  // ══════════════ VÉTÉRANS 32-36 (batch v8.2 : le pool de fin de carrière était le plus mince) ══════════════
  {
    id: "ev_old_guard", cat: "Vestiaire", icon: "🧓", w: 11,
    cond: { aMin: 33, aMax: 36 },
    text: "À l'entraînement, les gamins vous appellent « l'Ancien ». Gentiment. Enfin, presque.",
    options: [
      { label: "Leur infliger une séance à l'ancienne", hint: "Fierté", outcomes: [
        { weight: 60, text: "Une séance de patron, à l'ancienne : le silence est total. Le respect aussi.", fx: { form: 4, c: 3, team: 3 } },
        { weight: 40, text: "Les jambes de 20 ans gagnent la séance. Vous riez jaune, ils rient fort.", fx: { mor: -3, team: 2 } },
      ] },
      { label: "En sourire : c'est leur tour d'exister", outcomes: [
        { weight: 70, text: "Votre sérénité les impressionne plus que n'importe quelle démonstration.", fx: { m: 4, team: 4, mor: 3 } },
        { weight: 30, text: "« L'Ancien » reste collé. Vous vieillissez officiellement dans les vannes du vestiaire.", fx: { mor: -2, c: 2 } },
      ] },
    ],
  },
  {
    id: "ev_farewell_rumor", cat: "Médias", icon: "📻", w: 10,
    cond: { aMin: 34, aMax: 36, minRep: 60 },
    text: "« IL VA ARRÊTER » : une radio l'affirme au matin, sans vous avoir appelé. Votre téléphone explose, le club panique, le vestiaire vous observe.",
    options: [
      { label: "Démentir dans l'heure, sèchement", outcomes: [
        { weight: 60, text: "Le démenti claque. Mais la question est posée — et elle ne repartira plus.", fx: { rep: 2, m: 3, mor: -2 } },
        { weight: 40, text: "Le démenti nourrit le feuilleton : chaque match devient un adieu potentiel.", fx: { mor: -4, form: -2 } },
      ] },
      { label: "Laisser planer le doute", hint: "Joueur", outcomes: [
        { weight: 55, text: "Le mystère fait de chaque déplacement un événement : les stades adverses se lèvent pour vous.", fx: { rep: 4, c: 3, mor: 3 } },
        { weight: 45, text: "Le flou fatigue tout le monde, à commencer par votre coach.", fx: { coach: -4, mor: -2 } },
      ] },
    ],
  },
  {
    id: "ev_body_ritual", cat: "Terrain", icon: "🧊", w: 11,
    cond: { aMin: 32, aMax: 36 },
    text: "Désormais, jouer se mérite : deux heures de soins AVANT chaque entraînement. Cryothérapie, aiguilles, routines interminables — le prix du très haut niveau après 30 ans.",
    options: [
      { label: "En faire une science exacte", outcomes: [
        { weight: 65, text: "Votre routine devient légendaire : les jeunes la copient sans en comprendre la moitié.", fx: { p: 3, form: 4, dis: 5 } },
        { weight: 35, text: "Plus de soins que de football dans vos journées : la lassitude guette.", fx: { form: 2, mor: -3 } },
      ] },
      { label: "Écouter le corps au feeling", outcomes: [
        { weight: 50, text: "L'instinct d'un vieux pro vaut tous les protocoles.", fx: { form: 2, mor: 2 } },
        { weight: 50, text: "Le feeling a ses limites : une alerte musculaire vous le rappelle durement.", fx: { inj: 4, mor: -2 } },
      ] },
    ],
  },
  {
    id: "ev_captain_pass", cat: "Vestiaire", icon: "🎗️", w: 10,
    cond: { aMin: 33, aMax: 36, trait: "leader" },
    text: "Vous sentez la fin approcher. Le brassard que vous portez devra vivre après vous — et deux jeunes cadres se dessinent déjà dans l'ombre.",
    options: [
      { label: "Préparer votre successeur en secret", outcomes: [
        { weight: 70, text: "Des mois de conseils discrets. Le jour venu, la passation sera naturelle : votre plus belle œuvre invisible.", fx: { m: 5, team: 6, mor: 4 } },
        { weight: 30, text: "Votre poulain est transféré à l'été. Tout est à refaire, mais la méthode reste.", fx: { mor: -3, m: 2 } },
      ] },
      { label: "Le brassard se mérite, il ne se donne pas", outcomes: [
        { weight: 55, text: "La concurrence tire les deux prétendants vers le haut. Le vestiaire y gagne.", fx: { m: 3, dis: 3, team: 2 } },
        { weight: 45, text: "La rivalité des deux jeunes fissure le groupe. Le patron devra siffler la fin.", fx: { team: -3, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_gk_late_peak", cat: "Terrain", icon: "🍷", w: 11,
    cond: { aMin: 32, aMax: 36, pos: ["gk"] },
    text: "On dit que les gardiens mûrissent comme le bon vin. À votre âge, les jambes discutent un peu — mais la lecture du jeu n'a jamais été aussi limpide.",
    options: [
      { label: "Réinventer votre poste : placement, anticipation, commandement", outcomes: [
        { weight: 65, text: "Vous arrêtez désormais les attaques AVANT la frappe. Une masterclass permanente.", fx: { m: 5, t: 3, form: 3 } },
        { weight: 35, text: "La science ne suffit pas toujours : un face-à-face perdu ravive les doutes.", fx: { m: 3, mor: -3 } },
      ] },
      { label: "S'appuyer sur les réflexes, encore et toujours", outcomes: [
        { weight: 45, text: "Les mains répondent toujours. Le chat n'a pas vieilli, il a juste appris la patience.", fx: { form: 4, rep: 2 } },
        { weight: 55, text: "Les réflexes d'hier ne reviennent pas sur commande. Il va falloir ruser.", fx: { form: -3, m: 2, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_next_gen_advice", cat: "Vie perso", icon: "📞", w: 9,
    cond: { aMin: 32, aMax: 36, minRep: 50 },
    text: "Un gamin de 15 ans de votre ancien quartier cartonne en détection. Sa mère vous appelle, dépassée : agents, promesses, grands clubs — tout ce que vous avez connu.",
    options: [
      { label: "Prendre le dossier en main personnellement", outcomes: [
        { weight: 60, text: "Un bon centre, un contrat propre, zéro requin. Vous venez peut-être de sauver une carrière.", fx: { m: 4, mor: 6, rep: 3 } },
        { weight: 40, text: "Le gamin signe ailleurs, mal conseillé malgré vous. Tout le monde ne peut pas être sauvé.", fx: { mor: -3, m: 3 } },
      ] },
      { label: "Donner trois conseils et une mise en garde", outcomes: [
        { weight: 65, text: "Trois phrases qui valent de l'or. La famille les encadrera au-dessus du canapé.", fx: { m: 3, mor: 4 } },
        { weight: 35, text: "Les conseils se perdent dans le tourbillon. Vous auriez peut-être dû faire plus.", fx: { mor: -2, m: 2 } },
      ] },
    ],
  },

  // ══════════════ MODE HISTOIRE — LE MAESTRO (scriptés, jamais aléatoires) ══════════════
  {
    id: "ev_story_maestro_host", cat: "Histoire", icon: "🎩", w: 1, scheduledOnly: true,
    text: "Un vieux recruteur vous a repéré sur un tournoi de jeunes et vous a amené ici, sur la Côte, à une heure et demie de Marseille. Le club vous place chez une famille d'accueil : chambre sous les toits, grandes tablées, terrain à dix minutes à vélo. Tout commence.",
    options: [
      { label: "Leur promettre une voiture le jour où vous signerez pro", hint: "Parole de gamin", outcomes: [
        { weight: 100, text: "Ils éclatent de rire et vous resservent des pâtes. Cette promesse-là, vous la tiendrez — et ils le savent déjà.", fx: { m: 3, mor: 6, flag: "maestro_host" } },
      ] },
      { label: "Travailler deux fois plus que les autres, en silence", outcomes: [
        { weight: 100, text: "Premier arrivé, dernier parti. Dans les couloirs du centre, on murmure qu'un drôle de gaucher est arrivé de Marseille.", fx: { t: 4, dis: 4 } },
      ] },
    ],
  },
  {
    id: "ev_story_maestro_clio", cat: "Histoire", icon: "🚗", w: 1, scheduledOnly: true,
    text: "Votre président l'a lâché devant la presse : « Le jour où ce petit marque son premier but chez les pros, je lui offre une voiture. » Ce soir, le stade est plein — et un ballon traîne dans la surface, à vos pieds.",
    options: [
      { label: "Frapper sans réfléchir", outcomes: [
        { weight: 65, text: "BUT ! Le premier. Le président tiendra parole : une petite voiture rouge vous attend le lendemain devant le centre. Le vestiaire est plié en deux.", fx: { rep: 4, mor: 8, c: 3, money: 0.02, flag: "maestro_clio" } },
        { weight: 35, text: "Le gardien s'interpose d'un réflexe de chat. La voiture attendra — mais elle viendra, tout le monde le sent.", fx: { mor: 2, m: 3 } },
      ] },
      { label: "Servir le coéquipier mieux placé", hint: "Collectif", outcomes: [
        { weight: 100, text: "Passe décisive, victoire. Le président sourit : « La voiture, c'était pour un but, hein. » Le geste juste n'attend pas de récompense.", fx: { m: 3, team: 4 } },
      ] },
    ],
  },
  {
    id: "ev_story_maestro_girondin", cat: "Histoire", icon: "🌊", w: 1, scheduledOnly: true,
    text: "Le grand club du Sud-Ouest vous veut pour bâtir son projet autour de deux autres gamins dorés de votre génération. L'étage du dessus : les soirées européennes, les Bleus en ligne de mire.",
    options: [
      { label: "Signer dans le Sud-Ouest", outcomes: [
        { weight: 100, text: "Vous grandissez au milieu d'une génération dorée, et le pays commence à apprendre votre nom.", fx: { rep: 4, m: 3, transfer: { clubId: "fr_bordeaux", direct: true } } },
      ] },
      { label: "Rester encore un peu sur la Côte", outcomes: [
        { weight: 60, text: "Une saison de plus à la maison, en patron. Les grands clubs ne vous lâcheront pas des yeux.", fx: { mor: 4, rep: 2, m: 2 } },
        { weight: 40, text: "Le doute s'invite certains soirs : et si le train ne repassait pas ?", fx: { mor: -4, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_story_maestro_bleus", cat: "Histoire", icon: "🐓", w: 1, scheduledOnly: true,
    text: "Première convocation chez les A. Le sélectionneur vous lance à la 63e minute d'un match mal embarqué (0-2), dans un stade qui siffle. Le ballon arrive — et avec lui, l'occasion d'une vie.",
    options: [
      { label: "Jouer comme sur la place du quartier", hint: "Instinct", outcomes: [
        { weight: 70, text: "DOUBLÉ ! Deux éclairs en un quart d'heure, 2-2 au coup de sifflet — et un pays entier qui répète votre nom. Une légende est née à la 63e minute.", fx: { natCall: true, rep: 8, c: 4, mor: 6, flag: "maestro_bleus" } },
        { weight: 30, text: "Des touches de balle pleines de promesses. Le grand soir attendra, mais la porte des Bleus est ouverte.", fx: { natCall: true, rep: 3, m: 3 } },
      ] },
      { label: "Assurer, jouer simple", outcomes: [
        { weight: 100, text: "Sobre et propre. Le sélectionneur note le calme du gamin. Les soirs de gala viendront.", fx: { natCall: true, m: 4, rep: 2 } },
      ] },
    ],
  },
  {
    id: "ev_story_maestro_roulette", cat: "Histoire", icon: "🌀", w: 1, scheduledOnly: true,
    text: "À l'entraînement, sous pression, votre corps invente un geste : un double contact pivoté qui efface deux adversaires d'un seul mouvement. Le groupe s'arrête. « C'était QUOI, ça ? »",
    options: [
      { label: "En faire votre signature", outcomes: [
        { weight: 60, text: "La roulette devient VOTRE geste. Les tribunes la réclament, les défenseurs la redoutent.", fx: { t: 4, c: 4, rep: 5, trait: "showman" } },
        { weight: 40, text: "À trop la tenter, elle se lit. Un geste de gala, pas encore une arme.", fx: { t: 3, c: 2, form: -2 } },
      ] },
      { label: "La garder pour les grands soirs", hint: "Patience", outcomes: [
        { weight: 100, text: "Un geste rare reste un geste craint. Vous la sortirez quand tout se jouera.", fx: { t: 3, m: 4 } },
      ] },
    ],
  },
  {
    id: "ev_story_maestro_italy", cat: "Histoire", icon: "🇮🇹", w: 1, scheduledOnly: true,
    text: "Le téléphone sonne un soir d'été : la Vieille Dame du Piémont vous veut, VOUS, pour redevenir la reine d'Europe. Le genre d'appel qui ne sonne qu'une fois.",
    options: [
      { label: "Répondre à l'appel de l'Italie", outcomes: [
        { weight: 100, text: "Valises bouclées. Là-bas, le football est une religion — et on vous attend en messie.", fx: { rep: 4, m: 3, transfer: { clubId: "it_juventurin", direct: true } } },
      ] },
      { label: "Rester : votre histoire s'écrit ici", outcomes: [
        { weight: 60, text: "Le pays entier salue la fidélité. La Vieille Dame, elle, ne rappellera pas.", fx: { mor: 5, rep: 3, m: 2 } },
        { weight: 40, text: "Le doute s'installe : a-t-on le droit de dire non à ça ?", fx: { mor: -5, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_story_maestro_wc_home", cat: "Histoire", icon: "🏟️", w: 1, scheduledOnly: true,
    text: "Le Mondial se joue À LA MAISON cet été. Le pays doute de sa génération dorée, les éditorialistes réclament des têtes — et chaque regard converge vers votre numéro 10.",
    options: [
      { label: "Prendre la parole au nom du groupe", outcomes: [
        { weight: 60, text: "« Jugez-nous en juillet. » La phrase fait la une — le pays retient son souffle, mais il y croit.", fx: { c: 5, rep: 4, mor: 4, flag: "wc_fresh" } },
        { weight: 40, text: "La phrase devient un ultimatum dans la presse. La pression monte encore d'un cran.", fx: { rep: 2, mor: -4, flag: "wc_fresh" } },
      ] },
      { label: "Se murer dans le travail", outcomes: [
        { weight: 100, text: "Pas un mot, des séances doublées. Les coéquipiers suivent votre silence comme un plan de bataille.", fx: { m: 5, form: 4, flag: "wc_fresh" } },
      ] },
    ],
  },
  {
    id: "ev_story_maestro_record", cat: "Histoire", icon: "💎", w: 1, scheduledOnly: true,
    text: "Dîner de gala. Le président du Royal club de la capitale espagnole fait glisser vers vous une serviette pliée : « Voulez-vous jouer pour nous ? » y est griffonné. Un stylo attend à côté de votre verre — et le transfert le plus cher de l'HISTOIRE avec lui.",
    options: [
      { label: "Écrire OUI sur la serviette", hint: "Historique", outcomes: [
        { weight: 100, text: "Le record du monde s'est signé sur une serviette de table. Les billets s'arrachent, votre maillot s'écoule par centaines de milliers : bienvenue chez les galactiques.", fx: { rep: 6, c: 3, mor: 4, flag: "maestro_napkin", transfer: { clubId: "es_madrid", direct: true } } },
      ] },
      { label: "Reposer le stylo", outcomes: [
        { weight: 60, text: "Rester, c'est aussi une déclaration. Le vestiaire vous en aime davantage.", fx: { mor: 4, team: 5, m: 3 } },
        { weight: 40, text: "Le record ira à un autre. Certains soirs, le doute revient frapper à la porte.", fx: { mor: -4, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_story_maestro_volley", cat: "Histoire", icon: "☄️", w: 1, scheduledOnly: true,
    text: "Finale de la Coupe des Champions. Le centre retombe de la lune, à la limite de la surface, sur votre pied FAIBLE. Une fraction de seconde pour choisir.",
    options: [
      { label: "La volée, pied gauche, sans réfléchir", hint: "Légendaire", outcomes: [
        { weight: 50, text: "LA VOLÉE DU SIÈCLE. Lucarne. Le geste passera en boucle pendant cent ans — et la coupe est à vous.", fx: { rep: 10, mor: 8, c: 4, trophy: "continental", trait: "showman", flag: "maestro_volley" } },
        { weight: 50, text: "Le ballon s'envole dans le virage… et la finale glisse entre vos doigts. Les plus grands gestes exigent leur part d'échec.", fx: { mor: -6, rep: -2 } },
      ] },
      { label: "Contrôler et remiser proprement", hint: "Raison", outcomes: [
        { weight: 55, text: "Le jeu repart, l'équipe arrache la victoire au bout de la nuit. Sans éclair, mais avec la coupe.", fx: { m: 4, mor: 5, trophy: "continental" } },
        { weight: 45, text: "L'occasion s'éteint doucement, la finale aussi. On repensera longtemps à ce ballon venu de la lune.", fx: { mor: -5, m: 2 } },
      ] },
    ],
  },

  // ══════════════ CRÉPUSCULE & LONGÉVITÉ (jusqu'à 42 ans) ══════════════
  // Décision imposée par la pression de retraite (engine.advanceYear pose le
  // drapeau retire_pending, engine.pickEvent force cet événement). scheduledOnly :
  // jamais tiré au hasard ; once:false : rejouable chaque saison de crépuscule.
  {
    id: "ev_retire_decision", cat: "Retraite", icon: "🎬", w: 1, once: false, scheduledOnly: true,
    text: "Le corps parle plus fort chaque matin. Le staff, les proches, les médias — tout le monde attend LA réponse : une saison de plus, ou tirer sa révérence maintenant ?",
    options: [
      { label: "Une saison de plus — tant qu'il reste du jus", hint: "Repousser l'échéance", outcomes: [
        { weight: 55, text: "Vous rempilez, porté par l'envie. Le corps grince, mais vous êtes encore là.", fx: { mor: 5, form: 3, clearFlag: "retire_pending" } },
        { weight: 45, text: "Encore un an arraché à l'usure. Désormais, chaque entraînement se mérite.", fx: { form: -3, mor: 3, clearFlag: "retire_pending" } },
      ] },
      { label: "Raccrocher les crampons, la tête haute", outcomes: [
        { weight: 60, text: "Vous choisissez de partir debout. L'annonce, sereine, force le respect de tout un sport.", fx: { retire: true, mor: 8, rep: 3, clearFlag: "retire_pending" } },
        { weight: 40, text: "Une dernière saison en guise d'adieux, puis le rideau. Chaque stade se lèvera à votre passage.", fx: { retire: true, rep: 5, mor: 6, clearFlag: "retire_pending" } },
      ] },
    ],
  },
  {
    id: "ev_ageless", cat: "Hommage", icon: "🕰️", w: 11,
    cond: { aMin: 39, minRep: 45 },
    text: "À votre âge, ils sont une poignée dans toute l'histoire à tenir ce niveau. On vous surnomme déjà « l'intemporel ».",
    options: [
      { label: "Cultiver le mythe de l'éternel", outcomes: [
        { weight: 55, text: "Chaque match devient un événement : le public vient voir le monument jouer encore.", fx: { rep: 6, mor: 6 } },
        { weight: 45, text: "La pression de l'exemplarité pèse : plus le droit à la moindre erreur.", fx: { rep: 3, form: -3 } },
      ] },
      { label: "Rester humble, un match après l'autre", outcomes: [
        { weight: 100, text: "Vous balayez les superlatifs : seul le prochain match compte. Le vestiaire vous en vénère davantage.", fx: { team: 5, mor: 4, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_young_pretender", cat: "Vestiaire", icon: "🐣", w: 12,
    cond: { aMin: 35 },
    text: "La pépite du centre, deux fois plus jeune, s'entraîne comme un damné pour VOTRE place. Tout le vestiaire observe votre réaction.",
    options: [
      { label: "Le prendre sous votre aile", hint: "Transmettre", outcomes: [
        { weight: 60, text: "Vous lui apprenez tout. Il vous pousse, vous le grandissez : le staff salue le mentor.", fx: { m: 4, team: 6, coach: 4, mor: 3 } },
        { weight: 40, text: "Il progresse vite — trop vite. Vous avez peut-être ouvert la porte de votre propre remplacement.", fx: { m: 3, team: 4, form: -2 } },
      ] },
      { label: "Lui rappeler qui est encore le patron", hint: "Orgueil", outcomes: [
        { weight: 45, text: "Vous haussez le ton sur le terrain : le vieux lion rugit encore, et tout le monde s'écrase.", fx: { form: 5, rep: 3, mor: 4 } },
        { weight: 55, text: "L'énergie dépensée à défendre votre statut vous épuise. La jeunesse, elle, ne fatigue jamais.", fx: { form: -6, mor: -4, team: -3 } },
      ] },
    ],
  },
  {
    id: "ev_body_final_warning", cat: "Terrain", icon: "🩻", w: 12,
    cond: { aMin: 37 },
    text: "Réveil difficile : le genou a doublé de volume. Le médecin est direct — « À votre âge, chaque forcing peut être celui de trop. »",
    options: [
      { label: "Lever le pied, gérer le corps", outcomes: [
        { weight: 100, text: "Entraînements allégés, matchs choisis : vous durez en vous ménageant.", fx: { form: 4, p: -1, mor: 2 } },
      ] },
      { label: "Serrer les dents, jouer quand même", hint: "Risqué", outcomes: [
        { weight: 45, text: "L'orgueil paie : vous tenez, vaille que vaille.", fx: { form: 3, mor: 3 } },
        { weight: 55, text: "Le corps rend l'addition : rechute, et une longue absence.", fx: { inj: 14, p: -4, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_twilight_grind",
    cat: "Terrain",
    icon: "🏋️",
    w: 13,
    once: false,
    cond: { aMin: 35 },
    text: "Le corps réclame deux fois plus de soins pour deux fois moins de matchs. La routine du vétéran : glace, kiné, salle, recommencer.",
    options: [
      {
        label: "Tout donner pour tenir le rythme",
        outcomes: [
          {
            weight: 55,
            text: "Discipline de moine : vous répondez encore présent le week-end.",
            fx: { form: 6, dis: 4, mor: -2 }
          },
          {
            weight: 45,
            text: "Le corps encaisse mal la surcharge. Une alerte musculaire de plus.",
            fx: { form: -3, inj: 3, p: -1 }
          }
        ]
      },
      {
        label: "Gérer sa charge intelligemment",
        outcomes: [
          {
            weight: 100,
            text: "Moins de matchs, mais chacun à fond. Le staff salue la lucidité.",
            fx: { form: 3, coach: 4, mor: 3 }
          }
        ]
      }
    ]
  },
  {
    id: "ev_twilight_mentor",
    cat: "Vestiaire",
    icon: "🧑‍🏫",
    w: 13,
    once: false,
    cond: { aMin: 34 },
    text: "Un jeune du centre de formation ne vous lâche plus d'une semelle : il veut tout apprendre de vous.",
    options: [
      {
        label: "Le prendre sous votre aile",
        outcomes: [
          {
            weight: 70,
            text: "Vous transmettez ce que le foot vous a appris. Le vestiaire vous vénère.",
            fx: { team: 8, rep: 3, m: 2 }
          },
          {
            weight: 30,
            text: "Le môme explose la saison suivante — et vous en tirez une fierté immense.",
            fx: { team: 6, mor: 6, flag: "mentor_gift" }
          }
        ]
      },
      {
        label: "Rester concentré sur soi",
        outcomes: [
          { weight: 100, text: "Chacun sa route. Vous avez encore des choses à prouver, vous.", fx: { form: 2 } }
        ]
      }
    ]
  },
  {
    id: "ev_twilight_bench",
    cat: "Vestiaire",
    icon: "🪑",
    w: 12,
    once: false,
    cond: { aMin: 35, minOvr: 60 },
    text: "Le coach vous convoque : la pépite du club pousse fort à votre poste. Il évoque une rotation… à votre désavantage.",
    options: [
      {
        label: "Accepter un rôle de guide",
        hint: "Sagesse",
        outcomes: [
          {
            weight: 100,
            text: "Titulaire ou remplaçant, vous restez l'âme du groupe. Le respect, intact.",
            fx: { team: 7, mor: -3, rep: 2 }
          }
        ]
      },
      {
        label: "Refuser : le terrain se mérite",
        hint: "Orgueil",
        outcomes: [
          {
            weight: 50,
            text: "Vous répondez par une prestation référence. Le jeune attendra son tour.",
            fx: { form: 5, rep: 4, mor: 5 }
          },
          {
            weight: 50,
            text: "Le bras de fer tourne court : le banc, et un ego écorné.",
            fx: { form: -4, mor: -6, coach: -5 }
          }
        ]
      }
    ]
  },
  {
    id: "ev_twilight_media",
    cat: "Médias",
    icon: "🎙️",
    w: 12,
    once: false,
    cond: { aMin: 35, minRep: 45 },
    text: "Sur les plateaux, on ne parle que de ça : « Il est fini, non ? » Le débat sur votre déclin fait de l'audience.",
    options: [
      {
        label: "Répondre sur le terrain",
        outcomes: [
          {
            weight: 55,
            text: "Une prestation qui cloue le bec à tout le monde. Les vétérans, ça pique encore.",
            fx: { form: 4, rep: 5, mor: 5 }
          },
          { weight: 45, text: "L'envie est là, les jambes moins. Le débat enfle.", fx: { rep: -3, mor: -4 } }
        ]
      },
      {
        label: "Laisser dire, serein",
        hint: "Zen",
        outcomes: [
          { weight: 100, text: "Vous avez trop vécu pour vous laisser atteindre par le bruit.", fx: { mor: 4, m: 2 } }
        ]
      }
    ]
  },
  {
    id: "ev_twilight_record",
    cat: "Hommage",
    icon: "📖",
    w: 11,
    once: false,
    cond: { aMin: 36, minRep: 50 },
    text: "La presse ressort les archives : vous approchez d'un record de longévité au plus haut niveau. Rares sont ceux qui ont tenu si longtemps.",
    options: [
      {
        label: "Savourer ce qu'on accomplit",
        outcomes: [
          {
            weight: 100,
            text: "Peu de joueurs auront duré comme vous. Une ligne de plus dans la légende.",
            fx: { rep: 4, mor: 6, c: 2 }
          }
        ]
      },
      {
        label: "N'y penser qu'à la retraite",
        outcomes: [
          { weight: 100, text: "Les records attendront. Il reste des matchs à jouer.", fx: { form: 3, m: 1 } }
        ]
      }
    ]
  },
  {
    id: "ev_twilight_lastfuel",
    cat: "Terrain",
    icon: "🔥",
    w: 12,
    once: false,
    cond: { aMin: 36, maxForm: 60 },
    text: "Un dernier grand rendez-vous approche et le réservoir est presque vide. Faut-il vider ce qu'il reste, quitte à le payer ?",
    options: [
      {
        label: "Tout laisser sur la pelouse",
        outcomes: [
          {
            weight: 50,
            text: "Un baroud d'honneur qui restera dans les mémoires. Épuisé, mais grandiose.",
            fx: { form: -6, rep: 6, mor: 8 }
          },
          {
            weight: 50,
            text: "Le corps dit stop en plein effort. La passion ne suffit plus.",
            fx: { inj: 6, p: -2, mor: -3 }
          }
        ]
      },
      {
        label: "Doser, encore et toujours",
        outcomes: [
          {
            weight: 100,
            text: "L'expérience parle : on ne grille pas ses dernières cartouches pour rien.",
            fx: { form: 4, m: 2 }
          }
        ]
      }
    ]
  },
  {
    id: "ev_afcon",
    cat: "Sélection",
    icon: "🌍",
    w: 13,
    cond: { homeContinent: "af", nat: true, aMin: 20 },
    text: "La Coupe d'Afrique des Nations enflamme tout un continent, et votre sélection y croit. En demi-finale, le match bascule sur vos épaules.",
    options: [
      {
        label: "Prendre le match à votre compte",
        hint: "Leader",
        outcomes: [
          {
            weight: 45,
            text: "Vous portez la nation en finale, puis au sacre. Héros de tout un peuple.",
            fx: { rep: 10, mor: 12, c: 5, flag: "afcon_win" }
          },
          {
            weight: 55,
            text: "Une CAN pleine, éliminés aux tirs au but. La fierté malgré les larmes.",
            fx: { rep: 5, mor: 3 }
          }
        ]
      },
      {
        label: "Faire jouer le collectif",
        outcomes: [
          {
            weight: 50,
            text: "L'équipe répond présent : titre continental arraché tous ensemble.",
            fx: { rep: 7, mor: 8, team: 6, flag: "afcon_win" }
          },
          {
            weight: 50,
            text: "Un parcours honorable, stoppé net en demie. Ce sera pour la prochaine.",
            fx: { rep: 3, mor: 2 }
          }
        ]
      }
    ]
  },
  {
    id: "ev_euro_giant",
    cat: "Mercato",
    icon: "✉️",
    w: 11,
    cond: { abroad: false, levels: ["d1", "d2"], minRep: 50, minOvr: 74, aMax: 30 },
    text: "Un cador européen glisse une offre sur la table de votre club. Le grand saut, les projecteurs, la Ligue des Champions — mais tout quitter.",
    options: [
      {
        label: "Foncer vers la lumière",
        hint: "Ambition",
        outcomes: [
          {
            weight: 100,
            text: "Le grand club ne se refuse pas. Cap sur l'Europe qui compte.",
            fx: { rep: 4, mor: 6, transfer: { d: 1, cross: true } }
          }
        ]
      },
      {
        label: "Encore une saison à la maison",
        outcomes: [
          {
            weight: 60,
            text: "Vous choisissez la fidélité et le temps de jeu. Les offres reviendront.",
            fx: { mor: 4, rep: -2, form: 3 }
          },
          {
            weight: 40,
            text: "Le train ne repasse pas toujours : l'intérêt retombe aussi vite qu'il est venu.",
            fx: { mor: -3, rep: -3 }
          }
        ]
      }
    ]
  },
  {
    id: "ev_nation_pride",
    cat: "Sélection",
    icon: "🎽",
    w: 9,
    cond: { homeContinent: "af", nat: true, aMin: 22, minRep: 45 },
    text: "Dans votre pays, on ne parle que de vous : premier à percer aussi haut, vous êtes devenu un symbole pour toute une jeunesse.",
    options: [
      {
        label: "Assumer le rôle de modèle",
        outcomes: [
          {
            weight: 100,
            text: "Écoles, académies, gamins qui rêvent : vous portez bien plus qu'un maillot.",
            fx: { rep: 5, mor: 8, c: 4 }
          }
        ]
      },
      {
        label: "Rester concentré sur le jeu",
        outcomes: [
          {
            weight: 100,
            text: "Les symboles, ce sont les autres qui les font. Vous, vous jouez.",
            fx: { form: 3, m: 2 }
          }
        ]
      }
    ]
  },
  {
    id: "ev_language_barrier",
    cat: "Vie perso",
    icon: "🗣️",
    w: 9,
    cond: { abroad: true, aMax: 32, foreignLang: true },
    text: "Nouveau pays, nouvelle langue, un vestiaire où vous ne comprenez pas un mot. L'intégration se joue maintenant.",
    options: [
      {
        label: "Apprendre la langue à fond",
        outcomes: [
          {
            weight: 100,
            text: "Trois mois plus tard, vous plaisantez avec tout le monde. Le groupe vous adopte pour de bon.",
            fx: { team: 7, mor: 5, m: 2 }
          }
        ]
      },
      {
        label: "Laisser le terrain parler",
        outcomes: [
          {
            weight: 55,
            text: "Les buts n'ont pas besoin de traduction : le respect vient quand même.",
            fx: { rep: 3, team: 2 }
          },
          {
            weight: 45,
            text: "L'isolement pèse lourd : difficile de se sentir chez soi, loin des siens.",
            fx: { mor: -5, form: -2 }
          }
        ]
      }
    ]
  },

  // ══════════════ FOURNÉE : nouveaux systèmes, catégories vides, classiques ══════════════
  {
    id: "ev_intl_fight", cat: "Sélection", icon: "🎽", w: 9,
    cond: { aMin: 32, nat: true, minRep: 60 },
    text: "Le sélectionneur vous convoque en tête-à-tête : un jeune pousse fort, votre place n'est plus garantie. « Montrez-moi que vous la méritez encore. »",
    options: [
      { label: "Tout donner physiquement pour rester", hint: "Va-tout", outcomes: [
        { weight: 55, text: "Vous écœurez tout le monde à l'entraînement : votre place est sauvée, et le respect avec.", fx: { rep: 5, mor: 6, form: 5 } },
        { weight: 45, text: "À vouloir trop prouver, un muscle lâche. Le message est brouillé.", fx: { inj: 8, rep: 2, mor: -4 } },
      ] },
      { label: "Miser sur l'expérience et le leadership", hint: "Sagesse", outcomes: [
        { weight: 60, text: "Le sélectionneur salue votre maturité : vous restez, en patron du groupe.", fx: { rep: 3, m: 3, mor: 4 } },
        { weight: 40, text: "Pas assez tranchant à ses yeux. La nouvelle génération passe devant, définitivement.", fx: { mor: -8, rep: -3, natRetire: true } },
      ] },
    ],
  },
  {
    id: "ev_injury_niggle", cat: "Blessure", icon: "🩹", w: 10,
    cond: { flag: "big_injury", aMin: 24 },
    text: "La cicatrice de votre grosse blessure vous lance à l'échauffement. Le staff conseille le repos, mais un match décisif approche.",
    options: [
      { label: "Serrer les dents et jouer", hint: "Risqué", outcomes: [
        { weight: 45, text: "Vous tenez le choc et sortez un match héroïque. Le corps a suivi, cette fois.", fx: { rep: 4, mor: 5, form: -3 } },
        { weight: 55, text: "La gêne vire à la rechute en plein match. La convalescence repart de plus loin.", fx: { inj: 10, chronic: 8, mor: -6 } },
      ] },
      { label: "Écouter le corps, faire l'impasse", hint: "Prudent", outcomes: [
        { weight: 100, text: "Repos préventif : vous manquez le match, mais vous coupez court à la rechute.", fx: { inj: 3, mor: -3, form: 2 } },
      ] },
    ],
  },
  {
    id: "ev_prodigy_pressure", cat: "Médias", icon: "📸", w: 10,
    cond: { origin: "prodige", aMax: 22 },
    text: "« Le nouveau phénomène », titrent-ils déjà. À votre âge, chaque geste est disséqué, chaque erreur amplifiée. La hype menace de vous écraser.",
    options: [
      { label: "Assumer, nourrir la lumière", hint: "Ambition", outcomes: [
        { weight: 55, text: "Vous surfez sur la vague : les projecteurs vous rendent plus fort.", fx: { rep: 6, c: 3, mor: 4 } },
        { weight: 45, text: "La pression vous paralyse par séquences. Le talent s'enraye.", fx: { form: -6, mor: -5 } },
      ] },
      { label: "Se couper du bruit, bosser dans l'ombre", hint: "Sagesse", outcomes: [
        { weight: 100, text: "Tête baissée, travail acharné : la maturité paiera sur la durée.", fx: { m: 4, form: 3, mor: 2, rep: -1 } },
      ] },
    ],
  },
  {
    id: "ev_club_record", cat: "Records", icon: "📈", w: 9,
    cond: { minOvr: 76, aMin: 25, minClubSeasons: 3, minForm: 55 },
    text: "Vous n'êtes plus qu'à quelques buts du record historique de votre club. Toute la ville retient son souffle à chaque ballon que vous touchez.",
    options: [
      { label: "Foncer, chasser le record", hint: "Perso", outcomes: [
        { weight: 55, text: "RECORD BATTU ! Votre nom est gravé pour toujours dans l'histoire du club.", fx: { rep: 7, mor: 8, c: 3 } },
        { weight: 45, text: "L'obsession du chiffre grippe votre jeu et agace le vestiaire.", fx: { rep: -2, team: -4, mor: -4 } },
      ] },
      { label: "Jouer collectif, le record viendra", hint: "Équipe", outcomes: [
        { weight: 100, text: "Vous faites passer l'équipe d'abord : le vestiaire vous vénère, le record attendra son heure.", fx: { team: 6, mor: 4, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_wonder_goal", cat: "Insolite", icon: "🎥", w: 8,
    cond: { minForm: 50, chance: 0.5 },
    text: "En plein match, une reprise acrobatique venue d'ailleurs se loge dans la lucarne. En quelques minutes, la vidéo enflamme la planète entière.",
    options: [
      { label: "Savourer le moment culte", hint: "Star", outcomes: [
        { weight: 100, text: "Des millions de vues, un maillot qui s'arrache : vous entrez dans la légende des plus beaux buts.", fx: { rep: 6, c: 5, mor: 6 } },
      ] },
      { label: "Rester humble, minimiser", hint: "Discret", outcomes: [
        { weight: 100, text: "« J'ai eu de la réussite. » Les puristes saluent la modestie autant que le geste.", fx: { rep: 3, m: 3, mor: 3 } },
      ] },
    ],
  },
  {
    id: "ev_club_takeover", cat: "Club", icon: "💰", w: 9,
    cond: { levels: ["d1", "d2", "regional"], aMin: 20 },
    text: "Un fonds d'investissement rachète le club. Réunion sous les lambris : « Dans trois ans, on joue les premiers rôles. » Le vestiaire oscille entre rêve et méfiance.",
    options: [
      { label: "Croire au projet, s'engager à fond", hint: "Ambition", outcomes: [
        { weight: 50, text: "Les moyens débarquent, les recrues suivent : le club franchit un cap, et vous avec.", fx: { clubBoost: 1, mor: 6, rep: 2 } },
        { weight: 50, text: "Beaucoup de promesses en conférence, peu de concret sur la pelouse pour l'instant.", fx: { mor: -3, coach: -3 } },
      ] },
      { label: "Rester prudent, attendre de voir", hint: "Méfiance", outcomes: [
        { weight: 100, text: "Vous gardez la tête froide au milieu de l'euphorie. Sage : le temps dira qui avait raison.", fx: { m: 3, mor: 1 } },
      ] },
    ],
  },
  {
    id: "ev_newborn", cat: "Vie perso", icon: "👶", w: 9,
    cond: { aMin: 23 },
    text: "Vous devenez parent. Le monde bascule : les nuits sont courtes, mais un moteur tout neuf s'allume au fond de vous.",
    options: [
      { label: "Puiser une force nouvelle", hint: "Motivé", outcomes: [
        { weight: 70, text: "Vous jouez pour deux désormais : une sérénité nouvelle se lit dans votre jeu.", fx: { mor: 8, m: 3, form: 2 } },
        { weight: 30, text: "Les nuits blanches finissent par peser sur les jambes.", fx: { form: -4, mor: 3 } },
      ] },
      { label: "Organiser l'équilibre vie-carrière", hint: "Sagesse", outcomes: [
        { weight: 100, text: "Vous réglez tout au millimètre : l'équilibre trouvé vous rend plus solide.", fx: { mor: 5, dis: 3 } },
      ] },
    ],
  },
  {
    id: "ev_matchfix", cat: "Crise", icon: "💵", w: 8,
    cond: { aMin: 24, maxOvr: 82 },
    text: "Un intermédiaire au regard fuyant vous glisse une enveloppe épaisse : « Un match sans forcer, personne ne saura jamais. » Il attend votre réponse.",
    options: [
      { label: "Prendre l'argent", hint: "Danger", outcomes: [
        { weight: 55, text: "Personne n'a rien vu… cette fois-ci. Mais l'argent sale brûle les doigts.", fx: { money: 2, rep: -4, dis: -6, flag: "traitor" } },
        { weight: 45, text: "La fédération enquête. Suspension retentissante et honte publique.", fx: { money: 1, rep: -15, ban: 16, mor: -12 } },
      ] },
      { label: "Refuser net et signaler", hint: "Intègre", outcomes: [
        { weight: 100, text: "Vous dénoncez la tentative : tout un sport salue votre probité.", fx: { rep: 6, mor: 5, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_captaincy", cat: "Vestiaire", icon: "🫡", w: 10,
    cond: { aMin: 27, minRep: 55, minTeam: 55, minClubSeasons: 2 },
    text: "Le coach vous tend le brassard de capitaine. Le vestiaire vous observe : saurez-vous porter tout un groupe sur vos épaules ?",
    options: [
      { label: "Accepter, devenir un leader", hint: "Patron", outcomes: [
        { weight: 65, text: "Vous fédérez le groupe et haussez le ton au bon moment : un vrai patron est né.", fx: { rep: 5, m: 4, team: 6, mor: 5 } },
        { weight: 35, text: "La responsabilité pèse plus lourd que prévu sur votre propre jeu.", fx: { form: -3, mor: -3, team: 2 } },
      ] },
      { label: "Refuser, rester concentré sur soi", hint: "Discret", outcomes: [
        { weight: 100, text: "Vous préférez montrer l'exemple sans le brassard. Un choix qu'on respecte.", fx: { m: 2, mor: 1 } },
      ] },
    ],
  },
  {
    id: "ev_investment", cat: "Finance", icon: "📊", w: 9,
    cond: { minMoney: 5, aMin: 25 },
    text: "Un proche vous propose un placement juteux : un projet capable de tripler la mise… ou de tout engloutir. Votre conseiller, lui, prêche la prudence.",
    options: [
      { label: "Tenter le gros coup", hint: "Risqué", outcomes: [
        { weight: 45, text: "Jackpot : le placement explose, votre fortune double d'un coup.", fx: { money: 8, mor: 5 } },
        { weight: 55, text: "Le projet coule corps et biens, une partie de vos économies s'envole.", fx: { money: -4, mor: -6 } },
      ] },
      { label: "Placer sereinement, sans risque", hint: "Prudent", outcomes: [
        { weight: 100, text: "Rendement modeste mais garanti : votre patrimoine grossit tranquillement.", fx: { money: 2, m: 1 } },
      ] },
    ],
  },

  // ══════════════ FOURNÉE 2 : Golfe/sélection, Physique, Réseaux, classiques, après-carrière ══════════════
  {
    id: "ev_gulf_young", cat: "Mercato", icon: "💸", w: 9,
    cond: { aMin: 22, aMax: 29, minRep: 58 },
    text: "En pleine ascension, une offre venue d'Arabie Saoudite tombe : un salaire indécent, tout de suite. Mais partir maintenant, c'est peut-être quitter la lumière trop tôt.",
    options: [
      { label: "Prendre l'or maintenant", hint: "Jackpot", outcomes: [
        { weight: 100, text: "Contrat signé, compte en banque stratosphérique. L'Europe, elle, continuera sans vous parler.", fx: { money: 9, rep: -6, mor: 3, transfer: { d: -1, gulf: true }, trait: "mercenary" } },
      ] },
      { label: "Refuser : la carrière avant l'argent", hint: "Ambition", outcomes: [
        { weight: 65, text: "Vous misez sur votre valeur sportive. Le monde du foot respecte le choix.", fx: { rep: 5, mor: 4, m: 2 } },
        { weight: 35, text: "Un an plus tard, l'offre s'est envolée et le niveau a baissé. Le doute s'installe.", fx: { mor: -5, rep: -2 } },
      ] },
    ],
  },
  {
    id: "ev_intl_farewell", cat: "Sélection", icon: "🎬", w: 9,
    cond: { aMin: 34, nat: true, minRep: 55 },
    text: "La fédération vous propose un dernier match en sélection, un hommage devant votre public. Le crépuscule international est là.",
    options: [
      { label: "Tirer sa révérence en beauté", hint: "Émotion", outcomes: [
        { weight: 100, text: "Standing ovation, brassard, larmes : vous quittez la sélection par la grande porte, à jamais gravé dans les mémoires.", fx: { rep: 6, mor: 8, natRetire: true } },
      ] },
      { label: "Refuser l'adieu : encore un tour", hint: "Fierté", outcomes: [
        { weight: 55, text: "Vous vous accrochez, et prouvez que les jambes suivent encore un peu.", fx: { rep: 2, mor: 3, form: 2 } },
        { weight: 45, text: "L'entêtement de trop : le sélectionneur tranche à votre place.", fx: { mor: -6, natRetire: true } },
      ] },
    ],
  },
  {
    id: "ev_new_trainer", cat: "Physique", icon: "🏋️", w: 9,
    cond: { aMin: 23 },
    text: "Un préparateur physique de renom débarque avec des méthodes radicales : « On va tout casser pour tout reconstruire. » Le programme fait peur.",
    options: [
      { label: "Se donner à fond dans le programme", hint: "Intense", outcomes: [
        { weight: 60, text: "Métamorphose athlétique : vous n'avez jamais été aussi affûté.", fx: { p: 3, form: 5, mor: 3 } },
        { weight: 40, text: "Le corps ne suit pas la surcharge : une alerte musculaire.", fx: { inj: 6, p: 1, mor: -3 } },
      ] },
      { label: "Doser, garder ses habitudes", hint: "Prudent", outcomes: [
        { weight: 100, text: "Vous adaptez le programme à votre corps : gains modestes mais sans casse.", fx: { p: 1, form: 2 } },
      ] },
    ],
  },
  {
    id: "ev_pace_wall", cat: "Physique", icon: "🧱", w: 9,
    cond: { aMin: 31 },
    text: "La vitesse n'est plus tout à fait là. Les jeunes vous prennent dans le dos, et le miroir ne ment pas : le physique décline.",
    options: [
      { label: "Réinventer son jeu, jouer plus malin", hint: "Intelligence", outcomes: [
        { weight: 100, text: "Vous compensez par le placement et la lecture : le cerveau remplace les jambes.", fx: { m: 5, form: 3, mor: 3 } },
      ] },
      { label: "Se battre pour garder l'explosivité", hint: "Orgueil", outcomes: [
        { weight: 45, text: "Travail acharné : vous grattez encore quelques mètres de vitesse.", fx: { p: 2, form: 2 } },
        { weight: 55, text: "Le corps refuse de revenir en arrière. Frustration et petites douleurs.", fx: { p: -1, inj: 4, mor: -4 } },
      ] },
    ],
  },
  {
    id: "ev_bad_tweet", cat: "Réseaux", icon: "📱", w: 9,
    cond: { aMin: 19 },
    text: "Un message posté tard dans la nuit, mal tourné, met le feu aux réseaux au réveil. Captures d'écran partout, polémique lancée.",
    options: [
      { label: "Assumer et en rajouter", hint: "Cash", outcomes: [
        { weight: 45, text: "Votre franc-parler séduit une partie du public : icône rebelle.", fx: { c: 4, rep: 2, mor: 2 } },
        { weight: 55, text: "L'incendie devient ingérable. Le club vous recadre publiquement.", fx: { rep: -6, mor: -5, coach: -4 } },
      ] },
      { label: "Supprimer et présenter des excuses", hint: "Sagesse", outcomes: [
        { weight: 100, text: "Excuses sobres, communication maîtrisée : la tempête retombe vite.", fx: { rep: 1, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_influencer_deal", cat: "Réseaux", icon: "🤳", w: 9,
    cond: { aMin: 21, minRep: 52 },
    text: "Une marque vous déroule le tapis rouge : contenu sponsorisé, millions d'abonnés, gros chèque. Mais votre image se monnaie, et le vestiaire jase.",
    options: [
      { label: "Signer et bâtir sa marque", hint: "Business", outcomes: [
        { weight: 60, text: "Votre popularité explose et les revenus tombent. Une star hors du terrain.", fx: { money: 3, c: 4, rep: 2 } },
        { weight: 40, text: "Trop de business, pas assez de foot : le coach s'agace, le vestiaire lève les yeux.", fx: { money: 3, coach: -4, team: -3 } },
      ] },
      { label: "Décliner, rester focus sur le terrain", hint: "Discret", outcomes: [
        { weight: 100, text: "Vous préférez laisser parler les crampons. Le respect du milieu est intact.", fx: { m: 2, rep: 2 } },
      ] },
    ],
  },
  {
    id: "ev_foundation", cat: "Hommage", icon: "🎗️", w: 8,
    cond: { aMin: 28, minRep: 55, minMoney: 8 },
    text: "Au sommet de votre notoriété, l'envie de rendre : et si vous montiez une fondation pour les gamins des quartiers d'où vous venez ?",
    options: [
      { label: "Lancer la fondation, s'y investir", hint: "Cœur", outcomes: [
        { weight: 100, text: "Des terrains, des bourses, des sourires : votre nom rime désormais avec bien commun. Une autre forme de légende.", fx: { rep: 6, mor: 6, money: -3 } },
      ] },
      { label: "Donner dans l'ombre, sans caméra", hint: "Pudeur", outcomes: [
        { weight: 100, text: "Vous aidez discrètement, loin des projecteurs. Ceux qui savent vous respectent d'autant plus.", fx: { mor: 4, money: -2, m: 1 } },
      ] },
    ],
  },
  {
    id: "ev_bereavement", cat: "Vie perso", icon: "🕯️", w: 8,
    cond: { aMin: 22 },
    text: "Un proche qui a toujours cru en vous s'en est allé. Le chagrin est immense. Sur le terrain, chaque ballon a soudain un autre poids.",
    options: [
      { label: "Jouer pour sa mémoire", hint: "Hommage", outcomes: [
        { weight: 70, text: "Chaque geste lui est dédié. La douleur se change en force : une saison portée par un ange.", fx: { mor: 6, rep: 3, m: 2 } },
        { weight: 30, text: "L'émotion vous submerge par vagues, le corps suit mal.", fx: { form: -4, mor: 2 } },
      ] },
      { label: "Prendre du recul, faire son deuil", hint: "Humain", outcomes: [
        { weight: 100, text: "Vous vous accordez le temps de guérir. Le foot attendra, et c'est très bien ainsi.", fx: { mor: 3, form: -1 } },
      ] },
    ],
  },
  {
    id: "ev_homecoming", cat: "Mercato", icon: "🏡", w: 8,
    cond: { notAtOriginClub: true, aMin: 29, minRep: 55 },
    text: "Le club qui vous a tout appris vous rappelle : « Reviens à la maison, écris la dernière page ici. » Le cœur parle fort.",
    options: [
      { label: "Rentrer au bercail", hint: "Cœur", outcomes: [
        { weight: 100, text: "Retour aux sources sous les acclamations : l'enfant du club revient au bercail.", fx: { mor: 8, rep: 3, transfer: { origin: true }, trait: "loyal" } },
      ] },
      { label: "Rester où l'ambition est plus grande", hint: "Raison", outcomes: [
        { weight: 65, text: "La tête l'emporte sur le cœur : vous visez encore plus haut, ailleurs.", fx: { rep: 2, m: 2 } },
        { weight: 35, text: "Le club formateur retire son offre, un brin déçu. Occasion manquée.", fx: { mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_failed_medical", cat: "Mercato", icon: "🩺", w: 8,
    cond: { aMin: 25, minRep: 58 },
    text: "Un transfert de rêve était bouclé… mais la visite médicale coince sur un détail. Le club acheteur se retire à la dernière seconde.",
    options: [
      { label: "Encaisser et se remobiliser", hint: "Mental", outcomes: [
        { weight: 60, text: "Vous transformez la déception en rage de prouver. Le doute rend plus fort.", fx: { m: 4, mor: -2, form: 3 } },
        { weight: 40, text: "Le coup est dur à digérer : la saison démarre la tête ailleurs.", fx: { mor: -6, form: -3 } },
      ] },
      { label: "Ruminer et réclamer des comptes", hint: "Rancune", outcomes: [
        { weight: 100, text: "Vous en voulez au monde entier. L'ambiance en pâtit, mais votre orgueil est sauf.", fx: { rep: -2, mor: -3, team: -3 } },
      ] },
    ],
  },
  {
    id: "ev_documentary", cat: "Médias", icon: "🎦", w: 8,
    cond: { aMin: 26, minRep: 68 },
    text: "Une plateforme de streaming veut un documentaire sur votre carrière : caméras dans le vestiaire, la famille, l'intimité. L'exposition serait totale.",
    options: [
      { label: "Ouvrir grand les portes", hint: "Star", outcomes: [
        { weight: 60, text: "Le doc cartonne : votre légende déborde du terrain, votre image explose.", fx: { rep: 6, c: 4, mor: 3 } },
        { weight: 40, text: "Trop d'intimité dévoilée : certaines séquences se retournent contre vous.", fx: { rep: -3, mor: -4 } },
      ] },
      { label: "Garder sa vie privée fermée", hint: "Discret", outcomes: [
        { weight: 100, text: "Vous préservez votre jardin secret. Le mystère nourrit la fascination.", fx: { m: 2, rep: 1 } },
      ] },
    ],
  },
  {
    id: "ev_shady_sponsor", cat: "Finance", icon: "🧾", w: 8,
    cond: { aMin: 22, minRep: 58 },
    text: "Un sponsor à l'éthique très discutable pose un pont d'or pour associer votre image à sa marque. L'argent est réel, la réputation en jeu.",
    options: [
      { label: "Prendre le chèque", hint: "Cynique", outcomes: [
        { weight: 100, text: "Le compte se remplit, mais quelques titres écornent votre image d'icône.", fx: { money: 5, rep: -5, mor: 1 } },
      ] },
      { label: "Refuser par principe", hint: "Intègre", outcomes: [
        { weight: 100, text: "Vous déclinez sans hésiter. L'opinion salue un footballeur qui a des valeurs.", fx: { rep: 5, mor: 3, m: 1 } },
      ] },
    ],
  },

  // ══════════════ FOURNÉE 3 : reconversion, hommages, rivalité, supporters, crise, retour ══════════════
  {
    id: "ev_punditry", cat: "Reconversion", icon: "🎙️", w: 8,
    cond: { aMin: 33, minRep: 60 },
    text: "Une grande chaîne vous courtise : consultant vedette dès votre retraite. Préparer l'après, ou refuser d'y penser tant que vous jouez ?",
    options: [
      { label: "Se former au métier de consultant", hint: "Anticiper", outcomes: [
        { weight: 100, text: "Vous apprenez le commentaire en coulisses : l'après-carrière prend forme, la tête plus légère.", fx: { m: 3, rep: 2, mor: 3 } },
      ] },
      { label: "Refuser d'y penser, rester joueur à 100%", hint: "Présent", outcomes: [
        { weight: 100, text: "Une seule chose compte : le terrain, ici et maintenant. L'après attendra son heure.", fx: { form: 2, mor: 2 } },
      ] },
    ],
  },
  {
    id: "ev_coach_badges", cat: "Reconversion", icon: "📋", w: 8,
    cond: { aMin: 32, minRep: 50 },
    text: "Le vestiaire vous voit déjà en meneur d'hommes. On vous propose de passer vos diplômes d'entraîneur en parallèle.",
    options: [
      { label: "Se lancer dans les diplômes", hint: "Vision", outcomes: [
        { weight: 100, text: "Vous décryptez le jeu autrement : votre lecture tactique grimpe d'un cran.", fx: { m: 4, mor: 2 } },
      ] },
      { label: "Une chose à la fois", hint: "Focus", outcomes: [
        { weight: 100, text: "Vous préférez rester pleinement joueur. Chaque chose en son temps.", fx: { form: 2, mor: 1 } },
      ] },
    ],
  },
  {
    id: "ev_milestone_match", cat: "Records", icon: "🎖️", w: 8,
    cond: { aMin: 30, minClubSeasons: 3 },
    text: "Vous approchez d'un cap symbolique de matchs sous ce maillot. Le club prépare une petite cérémonie en votre honneur.",
    options: [
      { label: "Honorer le cap par une grande perf", hint: "Fierté", outcomes: [
        { weight: 60, text: "Match de gala pour l'occasion : le public se lève, l'émotion est totale.", fx: { rep: 4, mor: 6, form: 3 } },
        { weight: 40, text: "La pression de bien faire le jour J vous crispe un peu.", fx: { form: -3, mor: 2 } },
      ] },
      { label: "Rester simple, un match comme un autre", hint: "Humilité", outcomes: [
        { weight: 100, text: "« Juste un match de plus. » La sobriété force le respect.", fx: { mor: 3, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_jersey_retired", cat: "Hommage", icon: "👕", w: 7,
    cond: { aMin: 32, minRep: 66, minClubSeasons: 4 },
    text: "Geste rarissime : le club envisage de retirer votre numéro, pour que plus personne ne le porte après vous. La légende faite maillot.",
    options: [
      { label: "Accepter l'honneur suprême", hint: "Légende", outcomes: [
        { weight: 100, text: "Votre numéro monte au firmament du club, à jamais. Une poignée de joueurs seulement connaissent ça.", fx: { rep: 7, mor: 8 } },
      ] },
      { label: "Décliner par humilité", hint: "Modeste", outcomes: [
        { weight: 100, text: "Vous refusez, gêné par tant d'honneurs. Le club vous en admire davantage.", fx: { rep: 4, mor: 4, m: 1 } },
      ] },
    ],
  },
  {
    id: "ev_superstition", cat: "Insolite", icon: "🧦", w: 8,
    cond: { aMin: 20 },
    text: "Vous ne marquez que quand vous enfilez la chaussette gauche en premier. Le rituel vire doucement à l'obsession.",
    options: [
      { label: "Entretenir le rituel, sans complexe", hint: "Rituel", outcomes: [
        { weight: 60, text: "Le rituel vous met en confiance : la mécanique tourne.", fx: { form: 4, mor: 3 } },
        { weight: 40, text: "Le jour où le rituel foire, la tête s'emballe pour rien.", fx: { form: -3, mor: -2 } },
      ] },
      { label: "S'en libérer, rester rationnel", hint: "Raison", outcomes: [
        { weight: 100, text: "Vous cassez la superstition : votre jeu ne dépend que de vous. Sain.", fx: { m: 3, mor: 2 } },
      ] },
    ],
  },
  {
    id: "ev_nemesis", cat: "Rivalité", icon: "⚔️", w: 9,
    cond: { aMin: 24, minRep: 52 },
    text: "Le duel de toute une génération : face à vous, votre rival de toujours. La presse ne parle que de ce mano a mano.",
    options: [
      { label: "Écraser le rival, établir la hiérarchie", hint: "Ego", outcomes: [
        { weight: 50, text: "Vous le surclassez sous les yeux du monde : la hiérarchie est posée.", fx: { rep: 6, mor: 6, c: 3 } },
        { weight: 50, text: "Il vous domine ce soir-là. La comparaison fait mal.", fx: { rep: -3, mor: -5 } },
      ] },
      { label: "Ignorer le cirque, jouer collectif", hint: "Équipe", outcomes: [
        { weight: 100, text: "Vous refusez le duel d'ego et faites gagner l'équipe. La vraie classe.", fx: { team: 5, m: 3, mor: 3 } },
      ] },
    ],
  },
  {
    id: "ev_ultras_love", cat: "Supporters", icon: "📣", w: 9,
    cond: { aMin: 22, minClubSeasons: 2 },
    text: "Les ultras déploient un tifo géant à votre effigie : vous voilà idole du virage. Un lien rare se noue avec la tribune.",
    options: [
      { label: "Communier avec le virage", hint: "Fusion", outcomes: [
        { weight: 100, text: "Chaque but célébré sous leur tribune : une histoire d'amour qui décuple vos forces.", fx: { mor: 7, rep: 3, form: 2 } },
      ] },
      { label: "Garder de la distance, rester pro", hint: "Réserve", outcomes: [
        { weight: 100, text: "Reconnaissant mais mesuré, vous gardez la tête froide. Respectable.", fx: { mor: 3, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_academy", cat: "Reconversion", icon: "🏫", w: 7,
    cond: { aMin: 34, minRep: 60, minMoney: 10 },
    text: "Et si vous ouvriez une académie pour révéler les talents de demain ? Un projet ambitieux, coûteux, mais qui vous survivra.",
    options: [
      { label: "Fonder l'académie", hint: "Héritage", outcomes: [
        { weight: 100, text: "Des dizaines de gamins formés à votre image : vous plantez un arbre dont d'autres profiteront de l'ombre. Magnifique.", fx: { rep: 5, mor: 6, money: -4 } },
      ] },
      { label: "Attendre la fin de carrière", hint: "Patience", outcomes: [
        { weight: 100, text: "Le projet mûrit dans un tiroir : d'abord finir en beauté sur le terrain.", fx: { mor: 2, m: 1 } },
      ] },
    ],
  },
  {
    id: "ev_red_card_storm", cat: "Terrain", icon: "🟥", w: 9,
    cond: { aMin: 20 },
    text: "Carton rouge sévère à un moment clé, et la polémique enfle : geste d'humeur ou décision injuste de l'arbitre ? Les caméras tournent en boucle.",
    options: [
      { label: "Contester haut et fort", hint: "Colère", outcomes: [
        { weight: 40, text: "Votre coup de gueule fait mouche : la sanction est allégée, l'opinion vous suit.", fx: { rep: 2, ban: 2, mor: 1 } },
        { weight: 60, text: "La fédération n'apprécie pas la sortie : suspension alourdie pour contestation.", fx: { ban: 8, rep: -3, mor: -4 } },
      ] },
      { label: "Assumer et s'excuser", hint: "Humilité", outcomes: [
        { weight: 100, text: "Mea culpa sobre : vous prenez la sanction et coupez court à la polémique.", fx: { ban: 4, m: 2, mor: -1 } },
      ] },
    ],
  },
  {
    id: "ev_relegation_fight", cat: "Crise", icon: "🆘", w: 9,
    cond: { levels: ["d1", "d2"], aMin: 22 },
    text: "Le club est englué dans la lutte pour le maintien. Le vestiaire vacille, et tous les regards se tournent vers vous pour sortir la tête de l'eau.",
    options: [
      { label: "Prendre l'équipe sur son dos", hint: "Leader", outcomes: [
        { weight: 55, text: "Vous tirez le groupe vers le haut : un vrai leader dans la tempête.", fx: { rep: 6, mor: 6, form: 3, team: 4 } },
        { weight: 45, text: "Vous vous épuisez à tout porter, au bord de la rupture.", fx: { mor: -8, form: -3, rep: 1 } },
      ] },
      { label: "Faire son job sans surjouer", hint: "Sobre", outcomes: [
        { weight: 60, text: "Régulier et solide, vous tenez votre rang dans la bourrasque.", fx: { mor: 3, m: 2 } },
        { weight: 40, text: "Trop discret quand il fallait des leaders : on vous le fait remarquer.", fx: { mor: -5, rep: -2 } },
      ] },
    ],
  },
  {
    id: "ev_greedy_agent", cat: "Entourage", icon: "🤝", w: 8,
    cond: { aMin: 23, minRep: 50 },
    text: "Votre agent pousse fort pour un transfert qui l'arrange, lui et sa commission, plus que votre carrière. Le malaise grandit.",
    options: [
      { label: "Suivre l'agent, encaisser la prime", hint: "Facilité", outcomes: [
        { weight: 50, text: "Le move rapporte gros à court terme, mais laisse un goût amer.", fx: { money: 4, mor: -3, rep: -2 } },
        { weight: 50, text: "Mauvais choix sportif dicté par l'argent : votre cote en pâtit.", fx: { money: 3, rep: -4, mor: -4 } },
      ] },
      { label: "Reprendre la main sur sa carrière", hint: "Autonomie", outcomes: [
        { weight: 100, text: "Vous recadrez votre agent : désormais, c'est vous qui décidez. Sain.", fx: { m: 3, mor: 3, rep: 1 } },
      ] },
    ],
  },
  {
    id: "ev_comeback_goal", cat: "Blessure", icon: "🔥", w: 9,
    cond: { flag: "big_injury", aMin: 22 },
    text: "Premier match après votre grosse blessure. 90e minute, un ballon qui traîne dans la surface, et soudain tout un stade retient son souffle.",
    options: [
      { label: "Tenter le geste du retour", hint: "Panache", outcomes: [
        { weight: 55, text: "BUT DU RETOUR ! Le stade explose, les larmes coulent : le revenant est de retour, plus fort qu'avant.", fx: { rep: 6, mor: 10, form: 5 } },
        { weight: 45, text: "Le geste manque de justesse, la rouille est là. Mais le simple fait d'y être vaut de l'or.", fx: { mor: 4, form: 2 } },
      ] },
      { label: "Jouer simple, savourer d'être là", hint: "Sagesse", outcomes: [
        { weight: 100, text: "Pas de folie : vous retrouvez vos sensations pas à pas. Le plus dur est derrière vous.", fx: { mor: 6, form: 3, m: 1 } },
      ] },
    ],
  },

  // ══════════════ LOT : records, club, insolite, médias, vie perso, capitanat ══════════════
  {
    id: "ev_goal_record", cat: "Records", icon: "🎯", w: 8,
    cond: { aMin: 26, minRep: 45, pos: ["att", "mil"] },
    text: "Vous approchez d'un cap symbolique de buts en carrière. La presse compte à rebours, la pression monte à chaque ballon.",
    options: [
      { label: "Chasser le record coûte que coûte", hint: "Faim", outcomes: [
        { weight: 55, text: "Vous claquez le but du cap sous les projecteurs : votre nom entre dans les tablettes.", fx: { rep: 5, mor: 7, form: 3 } },
        { weight: 45, text: "L'obsession du chiffre vous crispe devant le but pendant des semaines.", fx: { form: -4, mor: -2 } },
      ] },
      { label: "Laisser le record venir à vous", hint: "Sérénité", outcomes: [
        { weight: 100, text: "Vous jouez pour l'équipe ; le record tombe tout seul, sans forcer. La classe.", fx: { rep: 3, mor: 4, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_club_elder", cat: "Records", icon: "🎖️", w: 7,
    cond: { aMin: 32, minClubSeasons: 5 },
    text: "Vous voilà le doyen du vestiaire, mémoire vivante du club. Les jeunes vous regardent comme une institution.",
    options: [
      { label: "Endosser le rôle de patron", hint: "Aura", outcomes: [
        { weight: 100, text: "Vous transmettez, vous cadrez, vous rassurez : le club tourne autour de vous.", fx: { rep: 4, mor: 5, team: 5, c: 2 } },
      ] },
      { label: "Rester un joueur parmi les autres", hint: "Humilité", outcomes: [
        { weight: 100, text: "Pas de discours, que l'exemple. Le respect n'en est que plus grand.", fx: { mor: 3, m: 2, team: 2 } },
      ] },
    ],
  },
  {
    id: "ev_fund_takeover", cat: "Club", icon: "💼", w: 9,
    cond: { aMin: 20, notFlag: "fund_club" },
    text: "Un fonds d'investissement rachète le club et promet des moyens colossaux. L'ambition explose… la pression aussi.",
    options: [
      { label: "Embrasser le projet ambitieux", hint: "Ambition", outcomes: [
        { weight: 55, text: "Recrues de standing, objectifs relevés : le club change de dimension et vous porte.", fx: { rep: 4, mor: 4, clubBoost: 1, flag: "fund_club" } },
        { weight: 45, text: "Les stars affluent et la concurrence à votre poste devient féroce.", fx: { rep: 3, mor: -3, flag: "fund_club" } },
      ] },
      { label: "Se méfier de l'argent roi", hint: "Prudence", outcomes: [
        { weight: 100, text: "Vous gardez la tête froide face à l'euphorie : le foot d'abord, le reste suivra.", fx: { m: 3, mor: 1, flag: "fund_club" } },
      ] },
    ],
  },
  {
    id: "ev_admin_demotion", cat: "Crise", icon: "⚖️", w: 8,
    cond: { levels: ["elite", "d1", "d2"], aMin: 23 },
    text: "Sanction couperet : pour raisons financières, le club est menacé de rétrogradation administrative. Le vestiaire tremble.",
    options: [
      { label: "Rester par loyauté et se battre", hint: "Fidélité", outcomes: [
        { weight: 60, text: "Vous refusez de fuir le navire : les supporters n'oublieront jamais.", fx: { rep: 5, mor: 4, team: 4 } },
        { weight: 40, text: "Le club sombre malgré tout ; la saison vire au cauchemar sportif.", fx: { mor: -8, form: -3, rep: 2 } },
      ] },
      { label: "Activer son départ tant qu'il est temps", hint: "Raison", outcomes: [
        { weight: 100, text: "Vous partez la tête haute avant la tempête : choix pro, un brin froid.", fx: { transfer: { d: 0 }, mor: -2, rep: -1 } },
      ] },
    ],
  },
  {
    id: "ev_stadium_opening", cat: "Club", icon: "🏟️", w: 8,
    cond: { aMin: 22, minClubSeasons: 2 },
    text: "Le club inaugure son nouveau stade flambant neuf. On vous confie le coup d'envoi de cette ère nouvelle.",
    options: [
      { label: "Marquer l'histoire du premier match", hint: "Symbole", outcomes: [
        { weight: 55, text: "Premier but dans le nouvel écrin : votre nom sur la plaque inaugurale, à jamais.", fx: { rep: 5, mor: 6, form: 2 } },
        { weight: 45, text: "L'émotion vous submerge, la soirée reste belle malgré un match discret.", fx: { mor: 3, rep: 1 } },
      ] },
      { label: "Savourer le moment sans pression", hint: "Instant", outcomes: [
        { weight: 100, text: "Vous humez l'ambiance d'un nouveau chapitre : reconnaissant, apaisé.", fx: { mor: 4, m: 1 } },
      ] },
    ],
  },
  {
    id: "ev_pitch_invasion", cat: "Insolite", icon: "🚨", w: 8,
    cond: { aMin: 19 },
    text: "En plein match bouillant, des supporters envahissent la pelouse. La confusion est totale autour de vous.",
    options: [
      { label: "Protéger un coéquipier dans la cohue", hint: "Sang-froid", outcomes: [
        { weight: 100, text: "Vous gardez la tête froide et mettez un jeune à l'abri : geste salué partout.", fx: { rep: 4, team: 4, mor: 2 } },
      ] },
      { label: "Filer aux vestiaires sans demander son reste", hint: "Sécurité", outcomes: [
        { weight: 100, text: "Prudence avant tout : vous quittez la pelouse au pas de course.", fx: { mor: -1, m: 1 } },
      ] },
    ],
  },
  {
    id: "ev_floodlight_fail", cat: "Insolite", icon: "💡", w: 7,
    cond: { aMin: 18 },
    text: "Panne de projecteurs : le stade plonge dans le noir, le match est suspendu une heure. L'attente casse tous les rythmes.",
    options: [
      { label: "Garder le groupe concentré", hint: "Focus", outcomes: [
        { weight: 60, text: "Vous remobilisez tout le monde ; à la reprise, l'équipe repart pied au plancher.", fx: { form: 3, team: 3, c: 1 } },
        { weight: 40, text: "Impossible de se remettre dedans : la fin de match est décousue.", fx: { form: -3, mor: -1 } },
      ] },
      { label: "Décompresser en plaisantant", hint: "Détente", outcomes: [
        { weight: 100, text: "Vous détendez le vestiaire pendant la coupure : l'ambiance reste légère.", fx: { mor: 2, team: 2 } },
      ] },
    ],
  },
  {
    id: "ev_heatwave_match", cat: "Physique", icon: "🥵", w: 8,
    cond: { aMin: 18, aMax: 35 },
    text: "Canicule écrasante, 40°C sur la pelouse. Chaque course coûte double, la déshydratation guette.",
    options: [
      { label: "Gérer l'effort intelligemment", hint: "Économie", outcomes: [
        { weight: 100, text: "Vous dosez, vous choisissez vos courses : lucide quand les autres fondent.", fx: { m: 2, form: 2 } },
      ] },
      { label: "Tout donner malgré la fournaise", hint: "Bravoure", outcomes: [
        { weight: 50, text: "Vous survolez la chaleur par pur mental : un exploit physique salué.", fx: { rep: 3, form: 3, p: 1 } },
        { weight: 50, text: "Vous finissez au bord du malaise, cuit pour plusieurs jours.", fx: { form: -5, mor: -2 } },
      ] },
    ],
  },
  {
    id: "ev_decisive_og", cat: "Terrain", icon: "😱", w: 8,
    cond: { aMin: 20, pos: ["def", "mil", "gk"] },
    text: "Le pire scénario : un but contre votre camp au pire moment offre la victoire à l'adversaire. Le stade retient son souffle.",
    options: [
      { label: "Assumer devant tout le monde", hint: "Caractère", outcomes: [
        { weight: 60, text: "Vous prenez la parole, endossez la faute : le vestiaire vous relève, grandi.", fx: { rep: 2, m: 3, team: 3, mor: -2 } },
        { weight: 40, text: "La honte colle à la peau ; les nuits suivantes sont blanches.", fx: { mor: -7, form: -3 } },
      ] },
      { label: "Se réfugier dans le silence", hint: "Repli", outcomes: [
        { weight: 100, text: "Vous encaissez seul, sans un mot. Le doute s'installe pour un temps.", fx: { mor: -5, form: -2 } },
      ] },
    ],
  },
  {
    id: "ev_viral_meme", cat: "Réseaux", icon: "😂", w: 8,
    cond: { aMin: 19, minRep: 40 },
    text: "Une de vos mimiques devient un mème viral vu par des millions de gens. Internet ne parle plus que de ça.",
    options: [
      { label: "Jouer le jeu avec autodérision", hint: "Second degré", outcomes: [
        { weight: 100, text: "Vous surfez sur la blague avec malice : le public adore, votre cote grimpe.", fx: { rep: 5, mor: 3 } },
      ] },
      { label: "Ignorer le cirque numérique", hint: "Distance", outcomes: [
        { weight: 100, text: "Vous restez concentré sur le terrain, loin du bruit. Sobre et pro.", fx: { m: 2, mor: 1 } },
      ] },
    ],
  },
  {
    id: "ev_videogame_cover", cat: "Médias", icon: "🎮", w: 8,
    cond: { aMin: 22, minRep: 66 },
    text: "Le jeu vidéo de foot numéro un veut VOTRE visage sur la jaquette de son édition mondiale. Consécration pop.",
    options: [
      { label: "Accepter la jaquette planétaire", hint: "Icône", outcomes: [
        { weight: 100, text: "Votre visage dans des millions de foyers : star bien au-delà des stades.", fx: { rep: 7, money: 3, mor: 4 } },
      ] },
      { label: "Décliner, gêné par l'exposition", hint: "Réserve", outcomes: [
        { weight: 100, text: "Vous préférez la discrétion à la lumière : rare, et respecté pour ça.", fx: { m: 2, mor: 2 } },
      ] },
    ],
  },
  {
    id: "ev_biopic_offer", cat: "Médias", icon: "🎬", w: 7,
    cond: { aMin: 30, minRep: 72 },
    text: "Un studio veut porter votre vie à l'écran : un biopic sur votre parcours, des galères aux sommets.",
    options: [
      { label: "Ouvrir les portes de son histoire", hint: "Héritage", outcomes: [
        { weight: 100, text: "Votre légende devient récit universel : des gamins rêveront grâce à vous.", fx: { rep: 6, mor: 5, money: 2 } },
      ] },
      { label: "Garder son intimité", hint: "Pudeur", outcomes: [
        { weight: 100, text: "Certaines choses ne se racontent qu'à soi. Vous refusez, en paix.", fx: { m: 2, mor: 2 } },
      ] },
    ],
  },
  {
    id: "ev_charity_gala", cat: "Vie perso", icon: "🎗️", w: 7,
    cond: { aMin: 27, minRep: 55, minMoney: 6 },
    text: "Vous organisez un grand gala caritatif pour une cause qui vous tient à cœur. Le tout-foot répond présent.",
    options: [
      { label: "S'investir corps et âme", hint: "Cœur", outcomes: [
        { weight: 100, text: "Une soirée mémorable, des fonds records : vous rendez au jeu ce qu'il vous a donné.", fx: { rep: 5, mor: 6, money: -2 } },
      ] },
      { label: "Prêter juste son image", hint: "Mesure", outcomes: [
        { weight: 100, text: "Votre nom suffit à faire venir du monde : efficace, sans en faire trop.", fx: { rep: 3, mor: 2 } },
      ] },
    ],
  },
  {
    id: "ev_captain_speech", cat: "Vestiaire", icon: "©️", w: 9,
    cond: { flag: "captain", aMin: 24 },
    text: "Vestiaire tendu à la mi-temps, le match part à la dérive. En tant que capitaine, tous les yeux se tournent vers vous.",
    options: [
      { label: "Sortir le discours qui réveille", hint: "Meneur", outcomes: [
        { weight: 60, text: "Vos mots claquent : l'équipe repart au combat et renverse tout. Un vrai patron.", fx: { rep: 5, team: 6, form: 4, mor: 4 } },
        { weight: 40, text: "Le message ne passe pas ce soir ; le groupe reste éteint.", fx: { team: -2, mor: -3 } },
      ] },
      { label: "Mener par l'exemple, sans un mot", hint: "Silence", outcomes: [
        { weight: 100, text: "Pas de grand discours : vous haussez votre niveau et le groupe suit.", fx: { form: 3, team: 3, c: 2 } },
      ] },
    ],
  },
  {
    id: "ev_boot_deal", cat: "Finance", icon: "👟", w: 8,
    cond: { aMin: 21, minRep: 55 },
    text: "Un équipementier majeur pose un contrat de chaussures sur la table : belle somme, mais obligations d'image.",
    options: [
      { label: "Signer le gros contrat", hint: "Business", outcomes: [
        { weight: 60, text: "Le chèque est conséquent et l'exposition mondiale : vous devenez une marque.", fx: { money: 4, rep: 3 } },
        { weight: 40, text: "Les obligations promo grignotent votre préparation : agaçant.", fx: { money: 4, form: -2, mor: -1 } },
      ] },
      { label: "Rester libre de toute attache", hint: "Liberté", outcomes: [
        { weight: 100, text: "Vous gardez les mains libres : le terrain d'abord, les contrats plus tard.", fx: { m: 2, mor: 1 } },
      ] },
    ],
  },
];

/* ============================================================
   MICRO-ÉVÉNEMENTS — brèves de saison sans choix, affichées
   dans le récap. Poids relatifs, fx légers.
   ============================================================ */
const MICRO_EVENTS = [
  { id: "mi_good_form", aMin: 16, aMax: 35, w: 10, text: "Une série d'entraînements de haute volée impressionne le staff.", fx: { t: 2, form: 3 } },
  { id: "mi_bad_form", aMin: 16, aMax: 35, w: 10, text: "Un passage à vide inquiète un peu le staff technique.", fx: { form: -4, mor: -2 } },
  { id: "mi_minor_injury", aMin: 16, aMax: 35, w: 9, text: "Une gêne musculaire vous prive de quelques matchs.", fx: { inj: 3 } },
  { id: "mi_team_bond", aMin: 16, aMax: 35, w: 7, text: "Une soirée d'équipe mémorable ressoude le vestiaire.", fx: { mor: 4 } },
  { id: "mi_team_tension", aMin: 18, aMax: 35, w: 7, text: "Une embrouille de vestiaire plombe l'ambiance quelques semaines.", fx: { mor: -4 } },
  { id: "mi_viral_skill", aMin: 17, aMax: 34, w: 6, text: "Un de vos gestes fait le tour des réseaux sociaux.", fx: { rep: 3 } },
  { id: "mi_press_hitpiece", aMin: 18, aMax: 35, w: 6, text: "Un tabloïd vous consacre un portrait au vitriol.", fx: { rep: -3, mor: -2 } },
  { id: "mi_new_coach", aMin: 18, aMax: 34, w: 6, text: "Un nouvel entraîneur débarque et rebat toutes les cartes.", fx: { form: -2, m: 1 } },
  { id: "mi_small_sponsor", aMin: 19, aMax: 34, w: 6, text: "Une marque locale signe un petit contrat d'image avec vous.", fx: { money: 0.3, rep: 1 } },
  { id: "mi_family_visit", aMin: 16, aMax: 35, w: 7, text: "Un séjour prolongé de vos proches vous fait un bien fou.", fx: { mor: 5 } },
  { id: "mi_homesick", aMin: 17, aMax: 30, w: 5, text: "Une bouffée de nostalgie du pays vous serre le cœur.", fx: { mor: -3 } },
  { id: "mi_tactic_talk", aMin: 20, aMax: 35, w: 5, text: "De longues discussions tactiques avec un vétéran aiguisent votre lecture du jeu.", fx: { m: 2, t: 1 } },
  { id: "mi_fatigue", aMin: 25, aMax: 36, w: 7, text: "L'accumulation des matchs pèse sur l'organisme.", fx: { form: -4, p: -1 } },
  { id: "mi_local_award", aMin: 20, aMax: 35, w: 5, text: "Une distinction locale récompense votre saison.", fx: { rep: 3, mor: 2 } },
  { id: "mi_bad_tackle", aMin: 16, aMax: 34, w: 2, text: "Un tacle assassin vous envoie de longues semaines à l'infirmerie.", fx: { inj: 12, p: -4, mor: -4, flag: "big_injury" } },
  { id: "mi_derby_win", aMin: 18, aMax: 35, w: 5, text: "Un derby remporté avec la manière : le public est conquis.", fx: { rep: 3, mor: 3 } },
  { id: "mi_transfer_rumor", aMin: 20, aMax: 33, w: 6, text: "Une folle rumeur de transfert agite les réseaux sans lendemain.", fx: { rep: 2, mor: -1 } },
  { id: "mi_language", aMin: 18, aMax: 30, w: 4, foreignLang: true, text: "Vos progrès dans la langue locale font fondre les supporters.", fx: { c: 2, mor: 2 } },
  { id: "mi_nutritionist", aMin: 20, aMax: 34, w: 5, text: "Un nouveau protocole nutritionnel dope votre condition.", fx: { p: 3, form: 2 } },
  { id: "mi_confidence_dip", aMin: 18, aMax: 35, w: 6, text: "Une période de doute vous fait jouer petit bras.", fx: { form: -3, m: -1 } },
  { id: "mi_wonder_goal", aMin: 17, aMax: 35, w: 5, pos: ["att", "mil", "def"], text: "Un but venu d'ailleurs entre directement au panthéon du club.", fx: { rep: 4, mor: 3 } },
  { id: "mi_wonder_save", aMin: 17, aMax: 35, w: 5, pos: ["gk"], text: "Une triple parade irréelle entre directement au panthéon du club.", fx: { rep: 4, mor: 3 } },
  { id: "mi_captain_praise", aMin: 18, aMax: 34, w: 5, text: "Le capitaine vous cite en exemple devant tout le groupe.", fx: { mor: 4, c: 1 } },
  { id: "mi_charity_visit", aMin: 18, aMax: 36, w: 4, text: "Votre visite surprise à l'hôpital pour enfants émeut tout le pays.", fx: { rep: 3, mor: 3 } },
  { id: "mi_car_trouble", aMin: 19, aMax: 32, w: 3, text: "Votre bolide flambant neuf finit dans le décor (sans gravité). La presse s'en donne à cœur joie.", fx: { money: -0.4, rep: -1 } },
  { id: "mi_video_analysis", aMin: 21, aMax: 35, w: 4, text: "Des heures d'analyse vidéo corrigent un défaut récurrent de votre jeu.", fx: { t: 2 } },
  { id: "mi_fan_tattoo", aMin: 22, aMax: 36, w: 3, text: "Un supporter se fait tatouer votre visage. C'est flatteur. Et un peu effrayant.", fx: { rep: 2, mor: 1 } },
  { id: "mi_old_friend", aMin: 20, aMax: 36, w: 4, text: "Des retrouvailles avec un ami d'enfance vous remettent les pieds sur terre.", fx: { mor: 4, m: 1 } },
  { id: "mi_sleep_coach", aMin: 24, aMax: 36, w: 4, text: "Un coach du sommeil transforme vos nuits, et vos matchs.", fx: { form: 4 } },
  { id: "mi_missed_pen", aMin: 18, aMax: 35, w: 5, text: "Un penalty décisif manqué vous trotte dans la tête des semaines.", fx: { m: -2, mor: -3 } },
  { id: "mi_assist_record", aMin: 20, aMax: 34, w: 4, pos: ["att", "mil", "def"], text: "Votre vision du jeu affole les statisticiens cette saison.", fx: { rep: 2, t: 1 } },
  { id: "mi_coach_dinner", aMin: 19, aMax: 35, w: 5, text: "Un long dîner en tête-à-tête avec le coach clarifie votre rôle dans le projet.", fx: { coach: 6, m: 1 } },
  { id: "mi_late_training", aMin: 17, aMax: 34, w: 5, text: "Trois retards à l'entraînement en un mois : amende symbolique et regards appuyés.", fx: { dis: -4, coach: -4 } },
  { id: "mi_team_dinner", aMin: 18, aMax: 36, w: 5, text: "Vous organisez un dîner d'équipe surprise : le vestiaire n'en revient pas.", fx: { team: 6, mor: 2 } },
  { id: "mi_rondo_king", aMin: 17, aMax: 33, w: 4, text: "Invaincu au toro depuis des semaines : le vestiaire vous surnomme « l'Anguille ».", fx: { team: 3, c: 2 } },
  { id: "mi_curfew_break", aMin: 18, aMax: 28, w: 4, text: "Une sortie nocturne repérée par un supporter finit en story Instagram.", fx: { dis: -5, rep: -2 } },
];

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
  // OVR attendu d'un titulaire (plus c'est haut, plus la concurrence est rude)
  expectedLevel: { regional: 46, d3: 49, d2: 55, d1: 67, elite: 80 },
  // Statut au club (rôle) : seuils de marge (OVR − expectedLevel) → cran de rôle,
  // et probabilité qu'une recrue star débarque à ton poste (te rétrograde).
  role: { margins: [6, 2, -2, -6], starSignChance: 0.14 },
  // Barre de recrutement : OVR minimum pour qu'un club de ce niveau vous SIGNE
  // quand il s'agit de MONTER d'un cran. Grimper se mérite — un club d'élite ne
  // recrute qu'un vrai joueur d'élite (82+), pas un bon joueur de D1 en forme.
  signingBar: { regional: 40, d3: 48, d2: 56, d1: 70, elite: 82 },
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
  ballonMinOvr: 85,
  ballonMinRep: 73,
  ballonCap: 0.36, // plafond de proba sur une saison stratosphérique
  ballonPtsFloor: 3.0, // points de saison en deçà desquels le sacre est hors de portée
  ballonSlope: 0.042, // pente : proba par point de saison au-dessus du plancher
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
   PERCENTILES DE SCORE — seuils des centiles 1→99 du score de
   carrière (computeCareerScore) sur 50 000 carrières simulées.
   Affiché sur la fiche finale : « meilleure que X % des destins ».
   À régénérer avec `node simulate.js 50000 table` si BALANCE ou
   les événements changent sensiblement.
   ============================================================ */
const SCORE_PERCENTILES = [
  63, 72, 88, 92, 95, 97, 98, 100, 101, 102, 103, 104, 104, 105, 106, 107, 108, 108, 109, 110,
  110, 111, 111, 112, 113, 113, 114, 115, 115, 116, 117, 117, 118, 118, 119, 120, 120, 121, 122, 122,
  123, 124, 125, 125, 126, 127, 128, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
  141, 142, 143, 144, 145, 146, 147, 149, 150, 151, 153, 154, 155, 157, 158, 160, 161, 163, 164, 166,
  168, 169, 171, 173, 175, 177, 179, 181, 184, 187, 189, 193, 196, 200, 206, 211, 218, 229, 245
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
  { id: "triple", cat: "trophees", icon: "🎯", name: "Triplé mythique", secret: true, desc: "Gagner le championnat, la Coupe des Champions et la Coupe du Monde la même saison." },
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
  { id: "comeback", cat: "secret", icon: "🔄", name: "Renaissance", secret: true, desc: "Mener une carrière complète juste après une carrière brisée." },
  { id: "survivor", cat: "secret", icon: "🩹", name: "Miraculé", secret: true, desc: "Terminer une carrière complète malgré une blessure très grave." },
  { id: "panenka_or", cat: "secret", icon: "🥄", name: "La Cuillère", secret: true, desc: "Réussir une panenka dans une finale." },
  { id: "double_agent", cat: "secret", icon: "😈", name: "Ennemi public", secret: true, desc: "Signer chez le club rival juré de vos supporters." },
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
    ARCHETYPES, POSITIONS, ORIGINS, COUNTRIES, CONTINENTAL_CUPS, NATIONAL_CUPS, NATIONS_LEAGUE, NL_STAGES, LEVELS, ROLES,
    LEVEL_ORDER, CLUBS, CLUBS_BY_LEVEL, COMPETITIONS, COACH_NAMES, TRAITS,
    AWARDS, KEY_MOMENTS,
    EVENTS, MICRO_EVENTS, RIVAL_NEWS_GOOD, RIVAL_NEWS_BAD, RIVAL_NEWS_AHEAD,
    RIVAL_NEWS_BEHIND, WORLD_NEWS, WC_STAGES, WC_STAGES_48, YOUTH_TIERS, YOUTH_STAGES, OLYMPIC_STAGES, BALANCE, HEADLINES,
    UNTAKEN_PATH_TEMPLATES, DAILY_QUESTS, WEEKLY_CHALLENGES, LEGEND_QUESTS, BADGE_CATS, BADGES,
    PERKS, PERK_SLOTS, STORIES, SCORE_PERCENTILES, STREAK_MILESTONES, COUNTRY_LANG,
  };
  Object.assign(global, dataExports);
  module.exports = dataExports;
}
