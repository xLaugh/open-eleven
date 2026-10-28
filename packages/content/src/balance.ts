// Équilibrage : tous les réglages chiffrés du moteur.

import type { Dict, InjuryTier } from "./types";

/* ============================================================
   CONFIG D'ÉQUILIBRAGE — tous les curseurs du moteur.
   Chaque niveau de club a un impact réel et cohérent :
   budget (salaryBase/feeMult), infrastructures (growthInfra),
   visibilité médiatique (mediaVisibility → gains de réputation),
   concurrence au poste (expectedLevel), accès aux trophées.
   ============================================================ */
const BALANCE_VALUES = {
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
  expectedLevel: { regional: 46, d4: 47, d3: 49, d2: 55, d1: 67, elite: 80 },
  // Statut au club (rôle) : seuils de marge (OVR − expectedLevel) → cran de rôle,
  // et probabilité qu'une recrue star débarque à ton poste (te rétrograde).
  role: { margins: [6, 2, -2, -6], starSignChance: 0.14 },
  // Effectif : U17 du club (16 ans) → réserve → équipe première. Les marges
  // sont des écarts OVR − expectedLevel du club.
  //   youthSkip    : marge à partir de laquelle un joueur de 16 ans saute les U17
  //   firstMargin  : marge minimale pour intégrer l'équipe première
  //   demoteMargin : en dessous, un jeune peu utilisé peut redescendre en réserve
  //   anticipation : progression attendue pendant l'intersaison (bilan de fin de saison)
  //   matches/edge/gap : volume de matchs, avantage de niveau et écart de niveau
  //                      de l'équipe de jeunes / réserve par rapport à l'équipe première
  squad: {
    youthSkip: 8, firstMargin: -4, demoteMargin: -9, anticipation: 3, firstByAge: 20,
    matches: { youth: [20, 28], reserve: [22, 30] },
    edge: { youth: 1.5, reserve: 1.25 },
    gap: { youth: 16, reserve: 8 },
  },
  // Plafond de niveau des vétérans (âge → niveau maximum). Au-dessus, le club
  // ne prolonge pas et il faut descendre ; les gardiens gagnent gkBonus ans.
  // noClubBase/noClubStep : probabilité que personne ne se manifeste (retraite).
  veteranCap: { caps: [{ age: 45, level: "d3" }, { age: 43, level: "d2" }], gkBonus: 2, noClubBase: 0.15, noClubStep: 0.1, noClubMax: 0.7 },
  // Barre de recrutement : OVR minimum pour qu'un club de ce niveau vous SIGNE
  // quand il s'agit de MONTER d'un cran. Grimper se mérite — mais à 82 la barre
  // d'élite était au-dessus du peakOvr p90 : 90 % des carrières ne voyaient JAMAIS
  // l'élite (donc ni Ligue des Champions, ni Ballon d'Or, ni salaires d'élite).
  signingBar: { regional: 40, d4: 44, d3: 48, d2: 56, d1: 70, elite: 78 },
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
  matchesByLevel: { regional: [30, 38], d4: [31, 39], d3: [33, 41], d2: [36, 44], d1: [40, 48], elite: [44, 54] },
  // Titre de division (ne compte comme trophée national qu'en d1/élite)
  titleChance: { regional: 0.12, d4: 0.11, d3: 0.1, d2: 0.08, d1: 0.06, elite: 0.3 },
  cupChance: { regional: 0.004, d4: 0.007, d3: 0.01, d2: 0.02, d1: 0.08, elite: 0.18 },
  // Chance d'ATTEINDRE la finale continentale (la gagner se joue en moment
  // décisif). Hors d'Europe, la D1 EST le sommet (pas de clubs "élite") : elle
  // conteste donc sa Coupe des Champions comme l'élite européenne conteste la sienne.
  continentalReach: {
    eu: { elite: 0.17, d1: 0.03, d2: 0, d3: 0, d4: 0, regional: 0 },
    // Hors d'Europe, seuls les deux ou quatre premiers de D1 jouent la C1 (cf.
    // CLUB_CUP_SLOTS) : ce sont les favoris du continent, d'où une portée plus haute.
    other: { elite: 0.17, d1: 0.3, d2: 0, d3: 0, d4: 0, regional: 0 },
  },
  // Coupes continentales secondaires de clubs (TOUS continents, pas seulement
  // l'Europe). On s'y qualifie au classement de première division (cf.
  // CLUB_CUP_SLOTS) ; la C2 s'ouvre aussi au vainqueur de Coupe Nationale, TOUTES
  // divisions. Portée d'ATTEINDRE la finale (× teamBoost), par niveau du club.
  // Mêmes probabilités partout : aucune raison de rendre un continent plus facile
  // qu'un autre à ce palier. Un géant tombé en C3 en est le grand favori.
  subCupReach: {
    c2: { elite: 0.22, d1: 0.16, d2: 0.08, d3: 0.06, regional: 0.04 },
    c3: { elite: 0.35, d1: 0.3, d2: 0.25, d3: 0.15 },
  },
  // Récompenses C2/C3 (le C1 garde son barème codé en dur, ternaire eu/hors-eu).
  subCupReward: {
    2: { money: 0.6, rep: 4, moral: 9, impact: 11, ballon: 0.7 },
    3: { money: 0.35, rep: 3, moral: 8, impact: 8, ballon: 0 },
  },
  // Supercoupe continentale (C1 vs C2, cf. CONTINENTAL_SUPERCUP) : disputée par
  // le vainqueur du C1 OU du C2 de la saison, contre le vainqueur de l'autre
  // coupe (adversaire abstrait, pas de club simulé). supercupChance = probabilité
  // d'être retenu pour ce match ; supercupWinChance = probabilité de le gagner.
  supercupChance: 0.5,
  supercupWinChance: 0.5,
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
  salaryBase: { regional: 0.03, d4: 0.04, d3: 0.05, d2: 0.09, d1: 0.9, elite: 5.0 },
  // Indemnités que le niveau peut aligner
  feeMult: { regional: 0.12, d4: 0.16, d3: 0.2, d2: 0.3, d1: 0.7, elite: 1.2 },
  // Qualité des infrastructures → vitesse de progression
  growthInfra: { regional: 0.85, d4: 0.87, d3: 0.88, d2: 0.95, d1: 1.1, elite: 1.25 },
  // Exposition médiatique → amplification des gains de réputation
  mediaVisibility: { regional: 0.55, d4: 0.6, d3: 0.65, d2: 0.75, d1: 1.0, elite: 1.3 },
  // Poids de base du niveau de centre de formation au départ
  // Rég. bas : seul échelon des micro-pays (le poids n'y joue pas), il reste une option
  // parmi d'autres dans les grands championnats (environ un départ sur trois).
  academyWeights: { regional: 10, d4: 33, d3: 32, d2: 30, d1: 24, elite: 12 },
  academySurpriseChance: 0.05, // un grand centre mise sur un profil modeste
  academyAbroadChance: 0.35, // un centre étranger (même continent) se manifeste
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
  // Ballon d'Or CONTINENTAL (Asie/Afrique/Océanie) : barre plus basse que le
  // mondial ci-dessus — récompense continentale, pas planétaire. Réutilise
  // ballonMinOvr/ballonMinRep/ballonMomentum/ballonDynasty (assouplis dans
  // engine.rollContinentalBallon) mais son propre plancher/pente/plafond.
  ballonContPtsFloor: 1.8,
  ballonContSlope: 0.09,
  ballonContCap: 0.55,
  // --- Vie des clubs : montées, descentes, changements de dimension ---
  relegationChance: { d1: 0.045, d2: 0.07, d3: 0.08, d4: 0.09 }, // par saison, modulé par vos perfs
  // Les géants historiques (élite de base) ne coulent presque jamais en D2
  eliteRelegShield: 0.25,
  // Dans un pays qui a des clubs élite, un club de D1 ordinaire joue le titre face à
  // eux : il le gagne moins souvent, et finit plus bas (cf. engine/clubcups.ts).
  d1TitleInEliteLeague: 0.5,
  playoffChance: { regional: 0.17, d4: 0.155, d3: 0.14, d2: 0.12 }, // barrage de montée si saison solide
  clubRiseSeasons: 2, // saisons consécutives dans le haut du classement pour
  clubFadeSeasons: 2, // changer de dimension (d1→élite) ou décliner (élite→d1)
  // --- Moments décisifs de saison ---
  derbyMomentChance: 0.06, // par saison
  oldClubMomentChance: 0.4, // la saison qui suit un transfert
  cupFinalReachMult: 1.7, // proba d'atteindre la finale = cupChance × ce facteur
  // --- Meilleurs buteurs : titre domestique & Soulier d'Or européen ---
  topScorerGoals: { regional: 20, d4: 20, d3: 21, d2: 22, d1: 24, elite: 26 }, // seuil de buts par niveau
  // Meilleur buteur d'un tournoi de SÉLECTION : seuil de buts sur le tournoi.
  // Volontairement SANS tirage, comme la distinction du Mondial qui existait
  // déjà — aucun hasard consommé, donc aucune carrière modifiée et aucun duel
  // invalidé. Un tournoi se joue en 3 à 8 matchs : les seuils sont bas.
  compScorerGoals: { wc: 5, cont: 4, natl: 4, olympic: 4, arab: 4, games: 4 },
  // Jeux régionaux (Asie, Afrique, Amériques, Pacifique) : tournoi U23 ouvert plus
  // largement que les Jeux Olympiques — barre d'OVR plus basse — mais seulement à
  // ceux que le grand tournoi de l'année n'a pas retenus.
  regionalGames: { minAge: 17, minOvr: 59, minOvrNoCall: 67, overageMaxAge: 29, overageMinRep: 55, overageChance: 0.25 },
  // Force d'une nation dans un tournoi de groupe (Coupe arabe, Jeux régionaux) :
  // rapportée à la meilleure nation du groupe, sinon les nations d'Océanie ne
  // gagneraient jamais leurs propres Jeux. Plancher : même la plus petite a sa chance.
  groupStrengthFloor: 0.05,
  // --- Offres de transfert et de prêt : d'où viennent les clubs, et combien ---
  // Poids d'un pays selon son CONTINENT, pour le choix des clubs proposés. Sans lui,
  // le pays était tiré uniformément : avec 56 nations africaines sur 223, l'Afrique
  // fournissait près d'une offre sur cinq à un joueur européen. Ici l'Europe passe
  // devant, l'Afrique ferme la marche ; `home` multiplie le poids du continent du
  // joueur (un Africain reste donc plus souvent courtisé près de chez lui).
  offerContinent: { home: 1.6, weights: { eu: 1, am: 0.75, as: 0.6, oc: 0.35, af: 0.18 } },
  // Nombre d'offres d'un mercato : [nombre, poids]. Il plafonnait à 3.
  offerCount: [[2, 20], [3, 35], [4, 28], [5, 17]],
  loanOfferCount: [[2, 40], [3, 40], [4, 20]],
  // L'entourage filtre ou démarche : écart appliqué au nombre d'offres d'un mercato
  // (une famille trie les sollicitations, un agent ambitieux fait jouer la concurrence).
  offerCountByEntourage: { family: -1, shark: 1, crew: 0 },
  offerCountMax: 6,
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
   À régénérer (nouvelle simulation) si BALANCE ou les événements
   changent sensiblement.
   ============================================================ */
export const SCORE_PERCENTILES = [
  63, 72, 84, 88, 91, 93, 94, 95, 97, 98, 99, 100, 100, 101, 102, 103, 104, 105, 105, 106,
  107, 107, 108, 109, 110, 110, 111, 112, 112, 113, 114, 114, 115, 116, 116, 117, 118, 119, 119, 120,
  121, 122, 122, 123, 124, 125, 125, 126, 127, 128, 129, 130, 131, 132, 133, 133, 134, 135, 136, 137,
  138, 139, 140, 142, 143, 144, 145, 146, 147, 148, 150, 151, 152, 153, 155, 156, 158, 159, 160, 162,
  164, 165, 167, 169, 171, 173, 176, 178, 180, 183, 186, 189, 193, 196, 201, 207, 214, 224, 241
];

// Sous-tables indexées par un identifiant qui peut ne pas y figurer (« playoffChance[lvl] || 0 ») :
// leur type littéral, qui énumère les seules clés présentes, interdirait de les lire avec un
// niveau, un tour ou un entourage quelconque. Les valeurs, elles, restent exactement celles-ci.
type Widened = {
  objectiveRating: Dict<number>; playoffChance: Dict<number>; relegationChance: Dict<number>; goldenShoeCoef: Dict<number>;
  compScorerGoals: Dict<number>; prodigyOrigin: Dict<number>; prodigyLifestyle: Dict<number>; prodigyEntourage: Dict<number>;
  offerCountByEntourage: Dict<number>;
  offerContinent: { home: number; weights: Dict<number> };
  subCupReach: { c2: Dict<number>; c3: Dict<number> };
  subCupReward: Record<number, { money: number; rep: number; moral: number; impact: number; ballon: number }>;
  injury: Omit<typeof BALANCE_VALUES["injury"], "labels" | "tiers"> & { labels: Dict<string>; tiers: InjuryTier[] };
  squad: Omit<typeof BALANCE_VALUES["squad"], "matches" | "edge" | "gap"> & { matches: Dict<number[]>; edge: Dict<number>; gap: Dict<number> };
  signingBar: Dict<number>; expectedLevel: Dict<number>; salaryBase: Dict<number>; feeMult: Dict<number>; academyWeights: Dict<number>;
};
export const BALANCE: Omit<typeof BALANCE_VALUES, keyof Widened> & Widened = BALANCE_VALUES;
