// Textes du moteur, unes de presse, brèves et récits.

/* ============================================================
   NEWS DU RIVAL & BRÈVES DU MONDE — lignes d'ambiance du récap.
   {rival} = nom du rival. Good = saison réussie du rival.
   ============================================================ */
export const RIVAL_NEWS_GOOD = [
  "📰 {rival} enchaîne les récitals : la presse en fait son favori pour les trophées.",
  "📰 {rival} rend une copie monumentale en match couperet. La comparaison avec vous fait rage.",
  "📰 Transfert retentissant : {rival} rejoint un cador et prend une dimension nouvelle.",
  "📰 {rival} soulève un trophée majeur et nargue ses détracteurs.",
  "📰 Les statistiques de {rival} affolent l'Europe entière cette saison.",
];

// Duel médiatique direct avec le rival (choisi selon qui domine la carrière)
export const RIVAL_NEWS_AHEAD = [
  "📊 Le débat est relancé : la presse vous place devant {rival} dans la hiérarchie de votre génération.",
  "📊 Sondage du magazine OneFootball : 61% des fans vous préfèrent à {rival}.",
  "📊 {rival} l'admet à demi-mot en interview : « Il a une longueur d'avance sur moi, pour l'instant. »",
];

export const RIVAL_NEWS_BEHIND = [
  "📊 Le verdict des observateurs est cruel : {rival} a pris une longueur d'avance dans votre duel de génération.",
  "📊 Une du magazine Onze d'Or : « {rival}, le patron de sa génération ». Votre nom n'apparaît qu'en page 12.",
  "📊 « Et lui, il en est où ? » : le documentaire consacré à {rival} vous réduit à un second rôle.",
];

export const RIVAL_NEWS_BAD = [
  "📰 Saison compliquée pour {rival}, relégué sur le banc de son club.",
  "📰 {rival} traverse une polémique après des propos maladroits en interview.",
  "📰 Blessure au genou pour {rival} : plusieurs mois d'absence.",
  "📰 Le transfert de {rival} vire au fiasco : déjà des rumeurs de départ.",
  "📰 {rival} traverse un passage à vide depuis trois mois. Les critiques pleuvent.",
];

export const WORLD_NEWS = [
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
   TEXTES DU MOTEUR — les phrases que engine écrit dans
   l'historique de carrière, les récaps et les pastilles d'effet.

   Elles vivaient auparavant en dur dans engine, ce qui mélangeait
   simulation et présentation : le moteur est censé calculer, content
   fournir les mots (c'est déjà le cas de HEADLINES, WC_STAGES,
   RIVAL_NEWS_*, UNTAKEN_PATH_TEMPLATES). Les rassembler ici les rend
   aussi traduisibles par le même mécanisme que le reste du contenu.

   Marqueurs : {club} {name} {nat} {country} {coach} {year} {age} sont
   substitués depuis l'état de carrière ; les autres ({div}, {fee},
   {rank}…) sont fournis par l'appelant. « de {x} » applique l'élision
   française (« de {club} » → « d'Osaka »).
   Rendu par engine.tx(s, clé, valeurs).
   ============================================================ */
export const ENGINE_TEXT: Record<string, string> = {
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
  natSwitchLate: "Jamais appelé par {from}, changement de sélection à {age} ans : cap sur {target}.",
  firstCap: "Première convocation avec {nat}.",
  firstCapYoung: "Première convocation avec {nat} — à seulement {age} ans !",
  natRetire: "Fin de l'aventure en sélection avec {nat} : place à la nouvelle génération.",
  youthCall: "Sélectionné en {tier} de {nat}.",
  youthWin: "Vainqueur du {tournament} {year} !",
  // Grammaire des noms de pays : "articles-fr" active les articles français
  // (« la France », « du Brésil »…) dans engine.natForms. Le pack anglais
  // traduit cette valeur, ce qui les désactive : l'anglais n'en veut pas.
  grammar: "articles-fr",
  youthCupName: "Coupe des Champions U17",
  youthU17World: "Coupe du Monde U17",
  youthClubWin: "Vainqueur de la {cupName} {year} avec les U17 de {club} !",
  squadToFirst: "Promu en équipe première de {club}.",
  squadToReserve: "Fin du parcours en U17 : place à l'équipe réserve de {club}.",
  squadDown: "Renvoyé en équipe réserve de {club} pour retrouver du temps de jeu.",
  winAgeCap: "À {age} ans, {club} ne peut plus vous aligner à ce niveau : il faut descendre d'un étage pour continuer.",
  vetNoClub: "À {age} ans, plus aucun club ne se manifeste. Le téléphone ne sonne plus : c'est la fin du voyage.",

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
  arabWinner: "Vainqueur de la Coupe arabe {year} avec {nat} !",
  arabFinalist: "Finaliste de la Coupe arabe {year} — l'argent au goût amer.",
  arabSemi: "Demi-finaliste de la Coupe arabe {year}.",
  gamesGold: "🥇 Médaille d'or aux {games} {year} avec {nat} !",
  gamesSilver: "🥈 Médaille d'argent aux {games} {year}.",
  gamesBronze: "🥉 Médaille de bronze aux {games} {year}.",

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
  supercupWin: "Vainqueur de la {cupName} {year} !",
  supercupLoss: "{cupName} {year} perdue face au tenant de l'autre coupe.",
  clubInvestor: "Un investisseur propulse {club} en {div}.",
  clubDemoted: "{club} est rétrogradé administrativement en {div}.",
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

  // --- Sponsors & confiance du club ---
  sponsorSigned: "Nouveau partenaire : contrat {dealLabel}.",
  frozenOutWarning: "Le vestiaire ne vous voit plus dans ses plans : mis à l'écart, votre temps de jeu va s'effondrer la saison prochaine.",
  forcedLoanWarning: "La défiance persiste malgré la mise à l'écart : le club a tranché, direction un prêt la saison prochaine — sans vous laisser le choix du principe.",

  // Rival anonyme, quand aucun nom n'est fourni au rendu d'un texte.
  rivalFallback: "votre grand rival",

  // --- Divisions & centres de formation ---
  divElite: "Élite",
  divRegional: "Rég.",
  academyElite: "Centre d'élite — infrastructures de pointe, concurrence féroce",
  academyD1: "Centre professionnel réputé — un cap sérieux vers le haut niveau",
  academyD2: "Club formateur solide — du temps de jeu et de vrais éducateurs",
  academyD3: "Club modeste mais structuré — peu de moyens, beaucoup de terrain",
  academyD4: "Petit club discret — loin des projecteurs, mais un vrai tremplin",
  academyRegional: "Club local — l'école de la débrouille, près des vôtres",
  academyAbroad: "Centre étranger — un cran au-dessus, mais loin des vôtres dès 16 ans : le mal du pays vous attend",
  youngExile: "Parti à l'étranger à 16 ans : les premiers mois loin des siens sont rudes.",

  // --- Coupe du Monde & Jeux Olympiques (intitulés de phase) ---
  wcInFinal: "En finale !",
  thirdPlaceLabel: "3ᵉ place",
  fourthPlaceLabel: "4ᵉ place",
  wcThirdText: "Battus en demi-finale, vous vous relevez pour arracher la 3ᵉ place. Un podium mondial, ça ne se refuse pas.",
  wcFourthText: "La demi-finale perdue pèse encore dans les jambes : le match pour la 3ᵉ place vous échappe aussi. Au pied du podium.",
  olyBronzeText: "Battus en demie, vous remportez le match pour la 3ᵉ place : le bronze olympique est à vous.",
  olyFourthText: "Demi-finale perdue, puis le match pour le bronze qui vous échappe : la plus cruelle des places, au pied du podium.",
  wcFinalText: "Votre nation renverse tout sur son passage : LA FINALE ! À 90 minutes du toit du monde.",
  wcChampionLabel: "CHAMPION DU MONDE",
  gamesBronzeText: "Battus en demie, vous remportez le match pour la 3ᵉ place : le bronze est à vous.",
  gamesFourthText: "Demi-finale perdue, puis le match pour le bronze qui vous échappe : la plus cruelle des places, au pied du podium.",
  arabWinnerLabel: "VAINQUEUR DE LA COUPE ARABE",
  arabThirdText: "Battus en demie, vous remportez le match pour la 3ᵉ place de la Coupe arabe : un podium, et la tête haute.",
  arabFourthText: "Demi-finale perdue, puis le match pour la 3ᵉ place qui vous échappe : au pied du podium de la Coupe arabe.",
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
  momCont2Win: "TROPHÉE REMPORTÉ !",
  momCont3Win: "BOUCLIER REMPORTÉ !",
  momContFail: "Finale continentale perdue",
  momContEuFail: "Finale perdue",
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
  // Qualifications des sélections (cf. qualifiers.ts)
  natCompWc: "la Coupe du Monde",
  natCompEu: "l'Euro",
  natCompAm: "la Copa América",
  natCompAf: "la CAN",
  natCompAs: "la Coupe d'Asie",
  natCompOc: "la Coupe d'Océanie",
  lineQualHost: "🏟️ Pays hôte : {nat} dispute {comp} {when} d'office.",
  lineQualAuto: "✅ Place assurée : {nat} dispute {comp} {when} d'office.",
  lineQualDirect: "✅ Qualifications : {rank}ᵉ du groupe, {nat} décroche son billet pour {comp} {when} !",
  lineQualDirectFirst: "✅ Qualifications : premiers du groupe, {nat} décroche son billet pour {comp} {when} !",
  lineQualOut: "❌ Qualifications : {rank}ᵉ du groupe, {nat} ne verra pas {comp} {when}.",
  lineDnq: "📺 Pas de qualification : {comp} {when} se jouera sans {nat}.",
  momNatPlayoff: "Barrage pour {comp} {when}",
  momNatPlayoffWin: "QUALIFIÉS !",
  momNatPlayoffFail: "Éliminés en barrage",
  natPlayoffWin: "Qualification arrachée en barrage avec {nat} pour {comp} {when}.",
  natPlayoffLoss: "Barrage perdu avec {nat} : {comp} {when} se jouera sans vous.",
  natDnqLabel: "Non qualifiés",
  nlLeagueLabel: "Ligue {league} · {rank}ᵉ",
  nlLeagueLabelFirst: "Ligue {league} · 1re place",
  nlPromoted: "Montée en Ligue {league} de la Ligue des Sélections avec {nat} !",
  nlRelegated: "Descente en Ligue {league} de la Ligue des Sélections avec {nat}.",
  nlTextUp: "Premiers du groupe : {nat} monte en Ligue {league}.",
  nlTextStay: "{rank}ᵉ du groupe : {nat} reste en Ligue {league}.",
  nlTextDown: "Derniers du groupe : {nat} redescend en Ligue {league}.",
  lineEuroTicket: "🏆 Sacre en Coupe Nationale : vous voilà qualifié pour une coupe continentale la saison prochaine !",
  // Coupes continentales de clubs : qualification au classement (cf. engine/clubcups.ts).
  lineContSeason: "🌍 Cette saison, {club} est engagé en {cupName}.",
  lineContNone: "📉 Pas de coupe continentale cette saison pour {club} : la place s'est perdue au classement.",
  lineContQual: "🎟️ {rank}ᵉ place : {club} décroche sa place en {cupName} pour la saison prochaine.",
  lineContQualChamp: "🎟️ Champion : {club} jouera la {cupName} la saison prochaine.",
  lineContQualMissed: "📉 {rank}ᵉ place : {club} manque les places continentales. Pas de coupe la saison prochaine.",
  continentalBallon: "{name} {year} — le continent à vos pieds.",

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
   UNES DE PRESSE — titre généré dans le récap selon la saison.
   {name} = joueur, {club} = club. Choisi par engine.headlineFor.
   ============================================================ */
export const HEADLINES = {
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
export const UNTAKEN_PATH_TEMPLATES = [
  "À {age} ans, un autre chemin s'offrait à vous. Nul ne saura jamais où il vous aurait mené.",
  "Vous repensez parfois à ce choix fait à {age} ans. Une autre version de votre carrière existe peut-être, quelque part.",
  "Il y a cette décision prise à {age} ans… et si vous aviez emprunté l'autre voie ? Le mystère restera entier.",
  "À {age} ans, votre destin s'est joué sur un fil. L'option que vous n'avez pas choisie reste à jamais une inconnue.",
  "Ce jour-là, à {age} ans, une bifurcation s'est présentée. Vous ne saurez jamais ce qu'elle vous aurait réservé.",
];
