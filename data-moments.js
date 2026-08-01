/* ============================================================
   Moments décisifs

   Les scénarios des rencontres qui comptent : finales, barrages, derbys,
   séances de tirs au but. Chaque moment décline une variante « field » et une
   variante « gk » — un gardien ne vit pas une finale comme un attaquant.

   Extrait de data.js : CONTENU PUR, zéro logique. Ce fichier est autonome —
   il ne référence aucune autre table — et doit être chargé AVANT data.js,
   dont le bloc d'export Node le recense.
   ============================================================ */

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
  // Barrage de MAINTIEN : la relégation ne tombe plus en silence, elle se joue.
  // Gagner = le club se sauve ; perdre = descente. Même structure que le barrage
  // de montée (moment décisif interactif), symétrie voulue.
  relegation_playoff: {
    field: [{
      title: "BARRAGE DE MAINTIEN",
      text: "Barrage de la dernière chance, 1-1 au cumulé, cinquième minute du temps additionnel. Penalty pour {club} : la saison entière, et la survie du club dans la division, tiennent sur ce ballon.",
      options: [
        { id: "cold", label: "Frapper franchement, sans trembler", base: 0.55, repWin: 3 },
        { id: "panenka", label: "Tenter la panenka", hint: "Audacieux", base: 0.38, repWin: 8, repFail: -6 },
        { id: "corner", label: "Viser le petit filet", base: 0.48, repWin: 4 },
        { id: "give", label: "Laisser le penalty au capitaine", hint: "Prudent", base: 0.5, repWin: 0 },
      ],
      winText: "LE STADE EXPLOSE ! {club} se maintient au bout du suspense — vous avez sauvé la saison de tout un club.",
      failText: "Le gardien part du bon côté. {club} est relégué, et le silence du stade restera longtemps dans vos oreilles.",
    }, {
      title: "BARRAGE DE MAINTIEN",
      text: "Match retour du barrage, {club} mène d'un but mais recule depuis vingt minutes. Le coach vous demande de prendre le jeu à votre compte pour tuer le match.",
      options: [
        { id: "keep", label: "Garder le ballon, faire couler le temps", hint: "Prudent", base: 0.56 },
        { id: "kill", label: "Porter le ballon et chercher le second but", base: 0.5, repWin: 5 },
        { id: "press", label: "Ordonner un pressing tout-terrain", hint: "Risqué", base: 0.42, repWin: 7, repFail: -4 },
      ],
      winText: "Vous tenez le ballon comme on tient une corde : {club} arrache son maintien, et vous en êtes le patron.",
      failText: "Le bloc craque dans les dernières minutes. Égalisation, puis le coup de grâce : {club} descend.",
    }],
    gk: [{
      title: "BARRAGE DE MAINTIEN",
      text: "Barrage de la dernière chance, 1-1 au cumulé, cinquième minute du temps additionnel. Penalty contre {club} : la survie du club dans la division tient sur cet arrêt, et sur vos gants seuls.",
      options: [
        { id: "read", label: "Lire ses appuis jusqu'au bout", hint: "Patient", base: 0.5 },
        { id: "early", label: "Partir tôt sur son côté fort", base: 0.44 },
        { id: "center", label: "Rester au centre", hint: "Culotté", base: 0.4, repWin: 6, repFail: -3 },
        { id: "mind", label: "Gagner la guerre des nerfs", base: 0.46, repWin: 3, traitWin: "clutch" },
      ],
      winText: "L'ARRÊT DU MAINTIEN ! Le stade explose : {club} reste en vie, et toute une ville saura à qui elle le doit.",
      failText: "Le ballon file sous vos gants. {club} est relégué, et le silence du stade restera longtemps dans vos oreilles.",
    }, {
      title: "BARRAGE DE MAINTIEN",
      text: "Match retour du barrage, {club} mène d'un but mais subit depuis vingt minutes. Le bloc recule sur votre surface : c'est à vous de tenir la baraque jusqu'au bout.",
      options: [
        { id: "command", label: "Prendre la surface à la voix", hint: "Autorité", base: 0.56, repWin: 3 },
        { id: "line", label: "Rester scotché sur votre ligne", hint: "Prudent", base: 0.5 },
        { id: "sweep", label: "Sortir loin pour couper toutes les passes", hint: "Risqué", base: 0.42, repWin: 7, repFail: -4 },
        { id: "time", label: "Faire couler le temps sur chaque ballon", base: 0.52, repWin: 2, repFail: -2 },
      ],
      winText: "Vous sortez tout : {club} arrache son maintien, et le dernier rempart a porté le club à lui seul.",
      failText: "Une sortie de trop, un centre au second poteau : le bloc craque et {club} descend.",
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

// --- Export Node (data.js / engine.js / simulate.js) -----------------------
// Les constantes rejoignent l'objet global : data.js les recense ensuite dans
// son propre bloc d'export sans avoir à les redéclarer.
if (typeof module !== "undefined" && module.exports) {
  const parts = { KEY_MOMENTS };
  Object.assign(global, parts);
  module.exports = parts;
}
