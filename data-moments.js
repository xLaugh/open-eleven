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
    },
      {
        title: "LE CHEMIN DU RETOUR",
        text: "Quatrième mois de rééducation. Le groupe s'entraîne de l'autre côté du mur ; ici, il n'y a que le vélo et votre respiration. Vos tests stagnent depuis trois semaines : mêmes chiffres, même douleur sourde.",
        options: [
          {
            id: "basics",
            label: "Tout reprendre depuis les gammes, sans regarder le calendrier",
            hint: "Discipliné",
            base: 0.82,
            recover: 13,
            setback: 3,
            repWin: 0,
            failText: "Trois semaines de plus pour rien : la courbe reste plate, et plus personne au club n'ose avancer de date de retour."
          },
          {
            id: "youth",
            label: "Reprendre les oppositions avec les jeunes du centre",
            hint: "Humble",
            base: 0.68,
            recover: 10,
            setback: 7,
            repWin: 2,
            traitWin: "leader"
          },
          {
            id: "night",
            label: "Doubler les séances en salle, seul, le soir",
            hint: "Têtu",
            base: 0.56,
            recover: 7,
            setback: 12,
            repWin: 4,
            repFail: -3,
            failText: "Le staff finit par comprendre d'où vient l'inflammation. Vos horaires sont surveillés, votre parole vaut moins, et la douleur s'est réinstallée."
          },
          {
            id: "contact",
            label: "Passer aux appuis et aux impacts à pleine charge dès demain",
            hint: "Impatient",
            base: 0.44,
            recover: 5,
            setback: 16,
            repWin: 7,
            repFail: -5
          }
        ],
        winText: "Un matin, sans prévenir, les chiffres repartent. Le plateau cède, la douleur sourde s'efface, et vous passez devant la porte de la salle de soins sans même ralentir.",
        failText: "La zone lâche à la première vraie charge. Nouvelle imagerie, nouveau protocole, et quatre mois de travail à refaire depuis le début."
      },
      {
        title: "LE CHEMIN DU RETOUR",
        text: "Des mois d'arrêt, et la douleur revient dès que vous forcez. Le chirurgien montre le tendon abîmé : réopérer, c'est repartir de zéro sur un genou neuf. Le staff de {club}, lui, veut vous revoir sur la pelouse le plus tôt possible.",
        options: [
          {
            id: "conserve",
            label: "Suivre le staff et reprendre sans opérer",
            hint: "Prudent",
            base: 0.84,
            recover: 7,
            setback: 3,
            repWin: 0
          },
          {
            id: "surgery",
            label: "Vous faire réopérer et repartir de zéro",
            hint: "Radical",
            base: 0.62,
            recover: 18,
            setback: 9,
            repWin: 3,
            winText: "Le genou neuf tient. Le retour aura pris des mois de plus que prévu, mais vous rejouez sans rien surveiller : le pire est vraiment derrière vous."
          },
          {
            id: "inject",
            label: "Revenir infiltré, sans attendre le feu vert",
            hint: "Douloureux",
            base: 0.46,
            recover: 4,
            setback: 15,
            repWin: 6,
            repFail: -4,
            traitWin: "clutch",
            winText: "Vous rejouez des semaines avant tout le monde, piqûre après piqûre. Le vestiaire sait ce que ce retour vous a coûté — et le genou, lui, tient bon.",
            failText: "Le produit ne masque plus rien. On vous arrête en pleine séance, et le bistouri que vous refusiez finit par décider à votre place."
          }
        ],
        winText: "La douleur s'en va, pour de bon. Vous ne guettez plus la sensation à chaque appui : vous rejouez, sans y penser.",
        failText: "Le genou décide seul : la douleur revient plus tôt et plus fort, et la date de retour recule encore de plusieurs semaines."
      }
    ],
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
    mil: [
      {
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
      {
        title: "FINALE DE LA COUPE DU MONDE",
        text: "23e minute, 0-0, et vous avez déjà perdu trois ballons faciles. La finale est trop grande : vos jambes le savent, le stade aussi. Sur la ligne de touche, le sélectionneur vient de demander à un remplaçant de s'échauffer.",
        options: [
          {
            id: "simple",
            label: "Tout jouer en une touche, le temps de respirer",
            hint: "Sobre",
            base: 0.78,
            repWin: 1
          },
          {
            id: "press",
            label: "Aller arracher un ballon très haut, à la rage",
            hint: "Rage",
            base: 0.62,
            repWin: 3,
            repFail: -2,
            failText: "Vous arrivez une demi-seconde trop tard : carton jaune, et le sélectionneur ne prend plus le risque de vous garder. Remplacé à l'heure de jeu, vous vivez la défaite depuis le banc, une serviette sur la tête."
          },
          {
            id: "demand",
            label: "Réclamer chaque ballon, quitte à en reperdre",
            hint: "Culot",
            base: 0.54,
            repWin: 5,
            repFail: -3,
            traitWin: "clutch"
          },
          {
            id: "switch",
            label: "Renverser le jeu d'un long ballon pour réveiller le stade",
            hint: "Panache",
            base: 0.44,
            repWin: 8,
            repFail: -5,
            traitWin: "showman",
            winText: "Le renversement traverse tout le terrain et réveille quatre-vingt mille personnes d'un coup. À partir de cette minute, la finale passe par votre pied : CHAMPIONS DU MONDE."
          }
        ],
        winText: "Le fil se renoue, le remplaçant se rassoit, et vous jouez cette finale jusqu'à la dernière seconde. Elle finira du bon côté : CHAMPIONS DU MONDE.",
        failText: "Vous ne trouvez jamais votre finale. Remplacé à l'heure de jeu, vous vivez la défaite depuis le banc, une serviette sur la tête."
      },
      {
        title: "FINALE DE LA COUPE DU MONDE",
        text: "68e minute, 1-1 : votre défenseur central est expulsé. Vingt-deux minutes à jouer à dix contre onze, en finale de Coupe du Monde. Le sélectionneur cherche votre regard depuis sa ligne — c'est au milieu qu'il faut tout refaire.",
        options: [
          {
            id: "drop",
            label: "Reculer d'un cran et boucher le trou en défense",
            hint: "Sacrifice",
            base: 0.76,
            repWin: 1
          },
          {
            id: "hold",
            label: "Garder le ballon le plus longtemps possible",
            hint: "Maîtrise",
            base: 0.64,
            repWin: 3,
            repFail: -2
          },
          {
            id: "lead",
            label: "Replacer toute l'équipe à la voix et tenir le bloc",
            hint: "Patron",
            base: 0.56,
            repWin: 6,
            repFail: -3,
            traitWin: "leader"
          },
          {
            id: "go",
            label: "Aller chercher le but tout de suite, à dix",
            hint: "Folie",
            base: 0.42,
            repWin: 10,
            repFail: -6,
            traitWin: "showman",
            winText: "Personne n'attend ça d'une équipe à dix : le but tombe dans la foulée, et le stade met dix secondes à y croire. CHAMPIONS DU MONDE, à dix contre onze.",
            failText: "Vous montez tous, et le contre traverse un terrain vide. Le but adverse tombe à la 74e, et cette fois il n'y a plus personne derrière. La finale se perd à dix."
          }
        ],
        winText: "Le trou se referme si vite que l'infériorité numérique ne se voit jamais. La finale se termine du bon côté : CHAMPIONS DU MONDE, à dix contre onze.",
        failText: "L'équipe se coupe en deux, le but adverse tombe à la 79e, et il n'y a plus assez de jambes pour revenir. La finale se perd à dix."
      }
    ],
    def: [
      {
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
      {
        title: "FINALE DE LA COUPE DU MONDE",
        text: "87e minute, 0-0, et l'arbitre accorde enfin un corner. Le sélectionneur vous fait signe de monter : vous avez la taille, et il ne reste presque plus rien à jouer. Quatre-vingt mille personnes se lèvent d'un seul mouvement.",
        options: [
          {
            id: "stay",
            label: "Rester en couverture et penser au contre adverse",
            hint: "Discipline",
            base: 0.74,
            repWin: 0,
            winText: "Le corner ne donne rien, mais le contre non plus : vous êtes seul au bon endroit, et vous le coupez avant qu'il ne parte. La finale ira au bout, et elle finira bien : CHAMPIONS DU MONDE.",
            failText: "Le corner ne donne rien, et sur le contre qui suit, vous êtes une foulée trop loin. Le but tombe dans la minute, et la finale s'achève sans que vous soyez monté une seule fois."
          },
          {
            id: "first",
            label: "Attaquer le premier poteau à la déviation",
            hint: "Timing",
            base: 0.58,
            repWin: 4,
            repFail: -2
          },
          {
            id: "far",
            label: "Se cacher au second poteau et surgir seul",
            hint: "Ruse",
            base: 0.5,
            repWin: 6,
            repFail: -3
          },
          {
            id: "bully",
            label: "Aller défier le gardien dans ses six mètres",
            hint: "Culotté",
            base: 0.4,
            repWin: 9,
            repFail: -5,
            traitWin: "showman",
            winText: "Le gardien ne sort jamais : il vous a dans le dos et il le sait. Le ballon traîne dans les six mètres, et il finit au fond. CHAMPIONS DU MONDE."
          }
        ],
        winText: "Le ballon finit au fond à trois minutes de la fin, et plus personne ne recolle. Le titre mondial se gagne sur une tête de défenseur : CHAMPIONS DU MONDE.",
        failText: "Le corner ne donne rien, et la finale bascule un peu plus tard du mauvais côté. Vice-champions du monde : un titre que personne ne vient fêter."
      },
      {
        title: "FINALE DE LA COUPE DU MONDE",
        text: "101e minute, votre sélection mène 2-1 et ne touche plus un ballon sur dix. En face, tout part dans votre surface, et le bloc recule de dix mètres à chaque vague. La ligne défensive attend un ordre : le vôtre.",
        options: [
          {
            id: "waste",
            label: "Casser le rythme et geler chaque seconde",
            hint: "Cynique",
            base: 0.7,
            repWin: 1
          },
          {
            id: "deep",
            label: "Reculer à cinq et tout défendre dans la surface",
            hint: "Bunker",
            base: 0.6,
            repWin: 4,
            repFail: -2
          },
          {
            id: "aerial",
            label: "Prendre chaque duel aérien, un par un",
            hint: "Duel",
            base: 0.52,
            repWin: 6,
            repFail: -3
          },
          {
            id: "trap",
            label: "Remonter le bloc de vingt mètres et jouer le hors-jeu",
            hint: "Audace",
            base: 0.44,
            repWin: 9,
            repFail: -5,
            traitWin: "leader",
            winText: "Le bloc remonte de vingt mètres comme un seul homme : trois attaquants se retrouvent en position de hors-jeu, drapeau levé. Ils ne repasseront plus votre ligne : CHAMPIONS DU MONDE.",
            failText: "Le bloc remonte d'un pas trop tard, le drapeau ne se lève pas, et l'égalisation tombe à la 104e. Les tirs au but font le reste : ce pari-là, on vous le ressortira toute votre vie."
          }
        ],
        winText: "La dernière vague meurt sur vos épaules, et le coup de sifflet arrive enfin. CHAMPIONS DU MONDE : les vingt dernières minutes, c'est vous qui les avez tenues.",
        failText: "La ligne craque à la 118e, l'égalisation tombe, et tout s'effondre aux tirs au but. Vous étiez à quelques secondes de l'éternité."
      }
    ],
    gk: [
      {
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
      {
        title: "FINALE DE LA COUPE DU MONDE",
        text: "82e minute, vous menez 1-0. Faute à vingt mètres, légèrement décalée sur votre droite : leur meilleur tireur pose déjà le ballon et fixe votre lucarne. Le mur se forme et attend que vous le placiez.",
        options: [
          {
            id: "wall",
            label: "Dresser un mur de cinq et couvrir votre poteau",
            hint: "Sûr",
            base: 0.72,
            repWin: 2
          },
          {
            id: "shift",
            label: "Décaler le mur d'un pas et guetter l'enroulé",
            hint: "Malin",
            base: 0.62,
            repWin: 3,
            repFail: -2
          },
          {
            id: "bait",
            label: "Découvrir votre premier poteau pour l'inviter à frapper là",
            hint: "Piège",
            base: 0.5,
            repWin: 6,
            repFail: -3,
            traitWin: "clutch",
            winText: "Il frappe précisément là où vous l'avez laissé croire, et vous êtes déjà parti. La parade est presque insultante : CHAMPIONS DU MONDE, sur une cage inviolée."
          },
          {
            id: "solo",
            label: "Renoncer au mur et tout jouer à la lecture",
            hint: "Folie",
            base: 0.38,
            repWin: 11,
            repFail: -6,
            traitWin: "showman",
            winText: "Sans mur, vous partez à l'instant exact où son pied touche le ballon, et vous allez le chercher sous la barre. Cette image tournera pendant cinquante ans : CHAMPIONS DU MONDE.",
            failText: "Sans mur, la frappe part plein axe et vous êtes déjà lancé de l'autre côté : 1-1 à la 83e. La finale se perdra aux tirs au but, et c'est ce mur absent que l'on montrera en boucle."
          }
        ],
        winText: "La frappe ne trouve jamais le chemin de vos filets, et ce coup franc restera le dernier frisson de la finale. CHAMPIONS DU MONDE, sur une cage inviolée.",
        failText: "Le ballon passe exactement là où vous ne l'attendiez pas : 1-1 à la 83e. La finale ira jusqu'aux tirs au but, et ils tourneront du mauvais côté."
      },
      {
        title: "FINALE DE LA COUPE DU MONDE",
        text: "91e minute : la prolongation démarre à peine, 1-1. Un ballon passe par-dessus votre défense et leur attaquant file au duel. Vous sortez de votre surface à pleine vitesse — le premier au ballon décidera peut-être de la finale.",
        options: [
          {
            id: "clear",
            label: "Dégager de volée le plus loin possible",
            hint: "Sûr",
            base: 0.74,
            repWin: 1
          },
          {
            id: "shield",
            label: "Prendre le duel épaule contre épaule et l'emmener vers la touche",
            hint: "Costaud",
            base: 0.6,
            repWin: 3,
            repFail: -2
          },
          {
            id: "slide",
            label: "Se coucher dans un tacle glissé plein axe",
            hint: "Risqué",
            base: 0.48,
            repWin: 7,
            repFail: -4,
            traitWin: "clutch",
            failText: "Vous prenez l'homme et pas le ballon : rouge direct. Votre équipe finit la prolongation à dix, avec un remplaçant dans les cages, et la finale lui échappe avant même les tirs au but."
          },
          {
            id: "relay",
            label: "Contrôler sous la semelle et lancer le contre d'une seule ouverture",
            hint: "Folie",
            base: 0.38,
            repWin: 11,
            repFail: -7,
            traitWin: "showman",
            winText: "Vous l'effacez sous la semelle, relevez la tête, et votre ouverture traverse soixante mètres jusqu'à l'attaquant lancé. Le stade n'a jamais vu un gardien faire ça en finale : CHAMPIONS DU MONDE.",
            failText: "Votre semelle glisse d'un rien, il vous prend le ballon dans les pieds et pousse dans la cage vide. Le geste était magnifique une demi-seconde plus tôt ; il sera revu au ralenti pendant vingt ans."
          }
        ],
        winText: "Vous êtes au ballon avant lui, et la finale repart dans l'autre sens. La demi-heure qui suit ne verra plus une seule occasion adverse : CHAMPIONS DU MONDE, avec un gardien en état de grâce.",
        failText: "Il vous prend le ballon d'un demi-pas et pousse dans la cage vide. Il restera une demi-heure pour recoller, et elle s'écoulera sans rien donner."
      }
    ],
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
    any: [
      {
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
      {
        title: "RETROUVAILLES",
        text: "26e minute, 0-0. En face de vous, le vieux défenseur qui vous a tout appris à l'entraînement : averti depuis dix minutes, une cheville bandée depuis l'échauffement, et plus la vitesse de ses vingt ans. Depuis sa zone technique, votre entraîneur hurle de l'attaquer encore et encore — au deuxième carton, il saute. Le ballon arrive dans votre pied.",
        options: [
          {
            id: "spare",
            label: "Servir l'autre côté et le laisser tranquille",
            hint: "Loyal",
            base: 0.66,
            repWin: 1,
            winText: "Le ballon file de l'autre côté et le but tombe au bout de l'action. Votre ancien mentor a parfaitement compris ce que vous veniez de refuser de faire : au coup de sifflet, il vous cherche dans le rond central pour vous serrer contre lui."
          },
          {
            id: "duel",
            label: "Le prendre de vitesse, ballon devant, sans l'accrocher",
            hint: "Franc",
            base: 0.54,
            repWin: 4,
            repFail: -2
          },
          {
            id: "orders",
            label: "Suivre la consigne et le harceler jusqu'au carton",
            hint: "Cynique",
            base: 0.46,
            repWin: 7,
            repFail: -4,
            winText: "Le second carton tombe avant la demi-heure. Votre ancien mentor sort la tête basse sous les sifflets de son propre virage, son équipe termine à dix et {club} déroule. Vous avez gagné le match et perdu un ami dans la même soirée.",
            failText: "C'est vous que l'arbitre finit par avertir : le vieux renard a encaissé sans broncher, puis obtenu la faute au meilleur moment. Le stade se moque de vous, et votre entraîneur vous change de côté dès la pause."
          },
          {
            id: "nutmeg",
            label: "Le petit pont, sous les yeux de son banc",
            hint: "Cruel",
            base: 0.38,
            repWin: 10,
            repFail: -6,
            traitWin: "showman",
            winText: "Le ballon passe entre ses jambes et le stade entier lâche le même cri. Vous centrez dans la foulée, {club} ouvre le score, et l'image du petit pont tournera en boucle toute la semaine.",
            failText: "Il referme les jambes au dernier centième et le ballon reste coincé sous sa semelle. Tout un stade éclate de rire pendant que vous vous relevez, et votre entraîneur vous change de côté dès la pause."
          }
        ],
        winText: "L'action va jusqu'au bout : {club} ouvre le score dans la minute qui suit et votre côté ne se referme plus de la soirée. Sur le banc d'en face, on change de système avant la demi-heure pour éteindre l'incendie.",
        failText: "Le vieux renard vous avait lu avant même que vous décidiez : il coupe la trajectoire, récupère et relance le contre qui fait mal. À la pause, votre entraîneur vous change de côté sans un mot d'explication."
      },
      {
        title: "RETROUVAILLES",
        text: "87e minute, 1-1, penalty pour {club}. Le tireur attitré est sorti à l'heure de jeu et le ballon vous reste dans les mains. En face, votre ancien gardien replace ses gants sans se presser : six saisons à vous arrêter chaque matin à l'entraînement, il connaît votre course d'élan, votre respiration, votre côté. Il vous sourit — il sait que vous savez.",
        options: [
          {
            id: "give",
            label: "Rendre le ballon au capitaine",
            hint: "Prudent",
            base: 0.62,
            repWin: 0,
            winText: "Le capitaine prend le ballon et le met au fond sans trembler. {club} repart avec la victoire, et votre ancien gardien vous cherche du regard en se relevant : vous n'êtes pas tombé dans le piège, et il le sait.",
            failText: "Le capitaine s'élance et votre ancien gardien plonge du bon côté, comme s'il avait lu le scénario des semaines à l'avance. Le match s'achève sur 1-1, et tout le monde a vu qui n'a pas voulu du ballon."
          },
          {
            id: "switch",
            label: "Changer de côté au dernier appui",
            hint: "Bluff",
            base: 0.52,
            repWin: 4,
            repFail: -2,
            traitWin: "clutch"
          },
          {
            id: "usual",
            label: "Frapper là où il vous attend, plein pied",
            hint: "Défi",
            base: 0.44,
            repWin: 7,
            repFail: -4,
            winText: "Vous frappez exactement là où il vous attendait, et la puissance suffit : ses gants effleurent le cuir sans le dévier. {club} repart avec la victoire, et il reste longtemps assis à fixer ses paumes.",
            failText: "Il part du bon côté sans même feindre l'hésitation : il vous attendait là depuis six ans. Le match s'achève sur 1-1, et son virage scande votre nom comme une insulte jusqu'au bout."
          },
          {
            id: "panenka",
            label: "Tenter la panenka sous ses yeux",
            hint: "Cruel",
            base: 0.36,
            repWin: 11,
            repFail: -7,
            traitWin: "showman",
            winText: "La balle piquée retombe doucement derrière lui, à l'endroit exact qu'il venait de quitter. {club} repart avec la victoire, et cette image-là fera le tour du pays avant la fin de la nuit.",
            failText: "Il ne bouge pas d'un centimètre. La balle piquée retombe dans ses gants comme un cadeau et il la garde serrée contre lui en vous regardant, longtemps. Le stade rit, le match s'achève sur 1-1, et il vous faudra des mois pour faire taire cette image."
          }
        ],
        winText: "Le ballon finit au fond et le stade se tait d'un coup. Votre ancien gardien reste assis dans sa cage, incapable de se relever : {club} tient son but d'avance jusqu'au bout et repart avec la victoire.",
        failText: "Le ballon ne rentre pas. Votre ancien gardien se relève en hurlant vers son virage, le stade entier avec lui, et le match s'achève sur ce goût-là : 1-1, et l'impression d'avoir laissé filer la seule vraie occasion de la soirée."
      }
    ],
    gk: [
      {
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
      {
        title: "RETROUVAILLES",
        text: "34e minute, 0-0. Vos anciens partenaires viennent presser à cinq sur votre relance : ils ont répété ce piège avec vous pendant des saisons et connaissent chacune de vos manies. Une passe en retrait vous revient dans les pieds, deux attaquants lancés à dix mètres, et le virage siffle déjà.",
        options: [
          {
            id: "clear",
            label: "Tout envoyer devant sans discuter",
            hint: "Sûr",
            base: 0.78,
            repWin: 0,
            failText: "Le dégagement part trop plat et revient aussitôt dans l'axe : le but tombe sur la deuxième vague, à trente mètres de vous. Vos anciens partenaires savourent, et il ne vous reste qu'à aller chercher le ballon au fond de vos filets."
          },
          {
            id: "wide",
            label: "Chercher le latéral d'une passe tendue",
            hint: "Propre",
            base: 0.6,
            repWin: 2
          },
          {
            id: "chip",
            label: "Lober le pressing d'une louche vers le milieu",
            hint: "Audacieux",
            base: 0.5,
            repWin: 5,
            repFail: -3,
            winText: "La louche passe au-dessus de cinq maillots et retombe pile dans la course du milieu. {club} repart à quatre contre trois, et le pressing d'en face ne remontera plus jamais aussi haut de la soirée."
          },
          {
            id: "dribble",
            label: "Éliminer le premier attaquant d'un crochet",
            hint: "Culot",
            base: 0.42,
            repWin: 8,
            repFail: -5,
            traitWin: "showman",
            winText: "Le crochet passe à dix centimètres du tacle et tout le stade retient son souffle. Vous servez le milieu dans la foulée, {club} repart lancé dans le dos du bloc, et sur le banc d'en face on n'en revient pas d'avoir été pris à son propre jeu."
          }
        ],
        winText: "Le ballon ressort de la zone de danger et le piège se referme sur du vide. {club} respire, remonte son bloc de vingt mètres, et le pressing d'en face n'aura plus jamais la même conviction de la soirée.",
        failText: "Le ballon est perdu aux abords de votre surface et le but tombe dans la foulée. Vos anciens partenaires savourent : ils vous ont piégé avec votre propre mode d'emploi, et il ne vous reste qu'à aller chercher le ballon au fond de vos filets."
      },
      {
        title: "RETROUVAILLES",
        text: "90e+4, {club} mène d'un but. Dernier corner pour votre ancien club, et son gardien remonte dans votre surface : c'est le gamin que vous avez formé là-bas, celui qui a hérité de votre place et de votre numéro. Le ballon part vers le premier poteau, et les six mètres deviennent un champ de bataille.",
        options: [
          {
            id: "line",
            label: "Rester sur votre ligne et assurer le rebond",
            hint: "Sage",
            base: 0.72,
            repWin: 1,
            failText: "Vous restez cloué sur votre ligne pendant que la mêlée décide à votre place : le ballon rebondit devant vos pieds et votre ancien protégé le pousse au fond du bout du pied. Vous n'avez pas bougé d'un mètre, et c'est exactement ce qu'on vous reprochera pendant des semaines."
          },
          {
            id: "punch",
            label: "Sortir au poing et dégager la surface à la voix",
            hint: "Autorité",
            base: 0.6,
            repWin: 3,
            repFail: -2,
            traitWin: "leader"
          },
          {
            id: "hold",
            label: "Monter au-dessus de votre ancien protégé pour capter",
            hint: "Duel",
            base: 0.5,
            repWin: 6,
            repFail: -3,
            traitWin: "clutch"
          },
          {
            id: "counter",
            label: "Capter et lancer le contre, la cage d'en face est vide",
            hint: "Panache",
            base: 0.38,
            repWin: 11,
            repFail: -6,
            traitWin: "showman",
            winText: "Vous captez et vous lancez l'ailier dans la seconde. Cinquante mètres plus loin, il pousse le ballon dans une cage abandonnée : {club} enfonce le clou au bout du temps additionnel, et votre ancien protégé n'a même pas eu le temps de faire demi-tour."
          }
        ],
        winText: "Le danger est écarté et l'arbitre siffle dans la foulée. {club} tient sa victoire, et votre ancien protégé vient serrer vos gants avant même de quitter la surface : ce soir, l'élève a appris quelque chose de plus.",
        failText: "Le ballon vous échappe d'un rien et finit au fond dans la mêlée : votre ancien protégé, buteur au bout du temps additionnel, court vers son virage en fusion. Vous restez à genoux dans vos six mètres, longtemps après le coup de sifflet final."
      }
    ],
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
    },
      {
        title: "FINALE CONTINENTALE",
        text: "84e minute, {club} mène 1-0 en finale continentale. Vous repoussez une première frappe à bout portant, et le ballon reste là, vivant, à trois mètres de votre ligne, au milieu de six paires de jambes. Personne ne sait où il va rebondir.",
        options: [
          {
            id: "smother",
            label: "Se jeter dessus et l'étouffer sous vous",
            hint: "Instinct",
            base: 0.68,
            repWin: 2
          },
          {
            id: "clear",
            label: "Le repousser du pied, n'importe où",
            hint: "Panique utile",
            base: 0.74,
            repWin: 1,
            failText: "Le dégagement part sur un attaquant à l'entrée de la surface, qui remet dedans avant que vous soyez relevé. L'égalisation tombe, puis le second : le trophée continental repart dans leurs bagages."
          },
          {
            id: "freeze",
            label: "Rester debout et couvrir la trajectoire",
            hint: "Sang-froid",
            base: 0.56,
            repWin: 5,
            repFail: -3,
            traitWin: "clutch"
          },
          {
            id: "grab",
            label: "Le cueillir à une main dans la forêt de crampons",
            hint: "Folie",
            base: 0.4,
            repWin: 9,
            repFail: -6,
            traitWin: "showman",
            winText: "Vos doigts se referment dessus au ras du sol, sous trois semelles. L'arbitre siffle la faute, le stade souffle, et plus rien ne passera : {club} soulève la coupe continentale.",
            failText: "Une semelle arrive avant vos doigts et le ballon file au fond. {club} ne s'en remet pas : la coupe continentale se joue sans vous jusqu'au coup de sifflet, et se perd."
          }
        ],
        winText: "Le ballon meurt enfin dans vos gants, et cette mêlée aura été la dernière alerte de la finale. {club} tient son trophée continental.",
        failText: "Le ballon franchit la ligne dans la confusion la plus totale. {club} ne reviendra jamais : la coupe continentale leur échappe, à six minutes du sacre."
      },
      {
        title: "FINALE CONTINENTALE",
        text: "84e minute, 1-1 en finale continentale. Un ballon perdu au milieu, et leur attaquant avale déjà trente mètres dans le dos de tout le monde. Personne ne reviendra sur lui : entre son ballon et le trophée, il n'y a plus que vous, et deux secondes pour décider.",
        options: [
          {
            id: "angle",
            label: "Reculer en fermant l'angle",
            hint: "Métier",
            base: 0.64,
            repWin: 1
          },
          {
            id: "smother",
            label: "Sortir dans ses pieds",
            hint: "Instinct",
            base: 0.56,
            repWin: 3,
            repFail: -2
          },
          {
            id: "trap",
            label: "Lui ouvrir un côté et plonger dessus",
            hint: "Piège",
            base: 0.46,
            repWin: 6,
            repFail: -3,
            traitWin: "clutch"
          },
          {
            id: "sweep",
            label: "Sortir de la surface et couper sa course",
            hint: "Va-tout",
            base: 0.38,
            repWin: 8,
            repFail: -5,
            traitWin: "showman",
            winText: "Le ballon file en touche à vingt-cinq mètres de votre but et le stade met une seconde entière à comprendre ce qu'il vient de voir. La finale reste entière : {club} la gagnera plus tard dans la nuit, et votre sortie tournera en boucle jusqu'à l'été.",
            failText: "Il vous efface d'un crochet à vingt-cinq mètres et n'a plus qu'à pousser le ballon dans le but vide. 1-2, {club} ne reviendra pas, et l'on ne retiendra de votre finale que cette course de trop."
          }
        ],
        winText: "L'action meurt devant vous, et la finale reste entière. {club} finira par faire sauter le verrou avant la fin de la nuit et soulèvera la coupe continentale — mais c'est cette seconde-là que le continent rejouera en boucle.",
        failText: "Le ballon finit au fond de vos filets. 1-2 à six minutes de la fin, {club} jette ses dernières forces sans jamais retrouver le chemin du but : la coupe continentale s'envole sur une seule course."
      }
    ],
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
    mil: [
      {
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
      {
        title: "BARRAGE DE MONTÉE",
        text: "Mi-temps du barrage, 0-0, et un vestiaire où plus personne n'ose parler. Leur meneur a touché deux fois plus de ballons que n'importe qui, {club} n'a jamais conservé le ballon plus de dix secondes d'affilée, et l'entraîneur pose la question à voix haute : qu'est-ce qu'on change pour la seconde période ?",
        options: [
          {
            id: "mark",
            label: "Vous proposer pour le prendre en individuelle",
            hint: "Sacrifice",
            base: 0.66,
            repWin: 2
          },
          {
            id: "deep",
            label: "Reculer d'un cran, verrouiller l'axe et jouer le contre",
            hint: "Calculateur",
            base: 0.56,
            repWin: 4,
            repFail: -2
          },
          {
            id: "press",
            label: "Imposer un pressing haut de tout le milieu, quitte à s'épuiser",
            hint: "Ambitieux",
            base: 0.46,
            repWin: 7,
            repFail: -3,
            failText: "Le pressing tient vingt minutes, puis les jambes lâchent. Les espaces s'ouvrent partout, et {club} laisse filer le barrage dans le dernier quart d'heure."
          },
          {
            id: "lead",
            label: "Demander le brassard du jeu et prendre la direction du milieu",
            hint: "Patron",
            base: 0.38,
            repWin: 10,
            repFail: -5,
            traitWin: "leader",
            winText: "Tout passe par vous pendant quarante-cinq minutes, jusqu'à ce qu'ils finissent par courir après le ballon : {club} déroule et MONTE."
          }
        ],
        winText: "La seconde période n'a plus rien à voir : leur meneur sort du match, {club} passe devant et ne recule plus jusqu'au coup de sifflet. La montée est au bout.",
        failText: "Rien ne change. Il continue de servir tout le monde, {club} recule mètre après mètre, et le barrage s'achève sans que vous ayez jamais eu la main sur ce match."
      },
      {
        title: "BARRAGE DE MONTÉE",
        text: "Le barrage est mal engagé : 0-1 à l'heure de jeu, et les tribunes commencent à siffler leurs propres joueurs. Trente minutes pour renverser une saison entière, dans un entrejeu où {club} perd tous les duels.",
        options: [
          {
            id: "simple",
            label: "Sécuriser chaque ballon et refaire circuler proprement",
            hint: "Sage",
            base: 0.7,
            repWin: 1
          },
          {
            id: "tempo",
            label: "Accélérer chaque ballon, une touche, toujours vers l'avant",
            hint: "Rythme",
            base: 0.56,
            repWin: 4,
            repFail: -2
          },
          {
            id: "box",
            label: "Attaquer la surface à chaque occasion, quitte à déserter l'entrejeu",
            hint: "Risqué",
            base: 0.44,
            repWin: 7,
            repFail: -4,
            failText: "Vous êtes dans leur surface au moment où le contre part de la vôtre : le 0-2 tombe, et le barrage est plié bien avant la fin."
          },
          {
            id: "show",
            label: "Défier leur défense en un-contre-un dès que vous touchez le ballon",
            hint: "Folie",
            base: 0.36,
            repWin: 10,
            repFail: -6,
            traitWin: "showman"
          }
        ],
        winText: "Le stade se rallume en dix minutes, le bloc adverse recule, puis craque : {club} renverse le barrage et MONTE.",
        failText: "Rien ne prend jamais. Le match s'éteint, les sifflets reviennent, et {club} quitte le barrage condamné à une saison de plus dans la même division."
      }
    ],
    def: [
      {
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
      {
        title: "BARRAGE DE MONTÉE",
        text: "94e minute du barrage, 0-0. Dernier corner pour {club}, et même votre gardien traverse le terrain pour venir grossir la mêlée dans la surface. Vous êtes le plus grand du groupe : tout le stade cherche votre numéro des yeux.",
        options: [
          {
            id: "stay",
            label: "Rester au point de repli pour couvrir le contre",
            hint: "Discipline",
            base: 0.68,
            repWin: 2,
            repFail: -2,
            winText: "Le corner est repoussé et leur contre part à toute vitesse, droit sur le seul homme resté en arrière. Vous coupez tout, et {club} force la décision dans les prolongations : la montée est là.",
            failText: "Le contre file quand même dans votre dos, plein axe, et personne ne revient. {club} tombe à la dernière seconde de son barrage, sans même avoir droit aux prolongations."
          },
          {
            id: "screen",
            label: "Bloquer leur gardien pour libérer un coéquipier",
            hint: "Malin",
            base: 0.56,
            repWin: 4,
            repFail: -2,
            failText: "L'arbitre a tout vu : faute sur le gardien, coup franc pour eux, et le corner ne donne rien. Tout le monde repart pour les prolongations, dont {club} ne sortira pas vainqueur : la montée attendra encore un an."
          },
          {
            id: "far",
            label: "Surgir au second poteau et croiser la tête",
            hint: "Instinct",
            base: 0.44,
            repWin: 7,
            repFail: -3,
            traitWin: "clutch"
          },
          {
            id: "volley",
            label: "Tenter la reprise acrobatique dans la mêlée",
            hint: "Folie",
            base: 0.34,
            repWin: 12,
            repFail: -7,
            traitWin: "showman"
          }
        ],
        winText: "Le ballon finit au fond dans un chaos indescriptible, l'arbitre siffle dans la foulée : {club} MONTE sur le dernier ballon de sa saison !",
        failText: "Le ballon passe au-dessus de tout le monde et l'arbitre renvoie les vingt-deux pour les prolongations. {club} n'en aura plus les jambes, et la montée s'en va au bout de la nuit."
      },
      {
        title: "BARRAGE DE MONTÉE",
        text: "Match retour du barrage, à l'extérieur, dans un chaudron où plus personne ne s'entend. Vingtième minute : {club} n'a pas tenu trois passes et la ligne recule sur chaque long ballon. Autour de vous, les plus jeunes ont déjà les jambes lourdes.",
        options: [
          {
            id: "deep",
            label: "Faire reculer tout le monde et défendre très bas",
            hint: "Prudent",
            base: 0.68,
            repWin: 1
          },
          {
            id: "voice",
            label: "Replacer chacun à la voix, ballon après ballon",
            hint: "Patron",
            base: 0.58,
            repWin: 4,
            repFail: -2,
            traitWin: "leader"
          },
          {
            id: "line",
            label: "Remonter la ligne de dix mètres et jouer le hors-jeu",
            hint: "Culotté",
            base: 0.48,
            repWin: 6,
            repFail: -3,
            failText: "Le piège se referme deux fois, puis s'ouvre en grand : le drapeau reste baissé, leur avant-centre part seul, et {club} court après le score jusqu'au bout de la soirée."
          },
          {
            id: "step",
            label: "Sortir de la ligne pour agresser leur meneur dès qu'il touche le ballon",
            hint: "Va-tout",
            base: 0.38,
            repWin: 9,
            repFail: -5
          }
        ],
        winText: "La tempête passe, le chaudron s'éteint peu à peu, et {club} finit par relever la tête : la montée se gagne sur la pelouse adverse.",
        failText: "La ligne craque à la première vraie accélération, puis une deuxième fois. {club} court après le match toute la soirée, et la montée reste dans l'autre camp."
      }
    ],
    gk: [
      {
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
      {
        title: "BARRAGE DE MONTÉE",
        text: "Barrage décisif, 74e minute, 1-1. Un ballon passe par-dessus votre défense et leur avant-centre part au duel, plein axe. Vous êtes avancé de quelques mètres devant votre ligne, seul face à cette course, et le stade entier se lève d'un bloc.",
        options: [
          {
            id: "back",
            label: "Reculer vite et défendre votre ligne",
            hint: "Sûr",
            base: 0.66,
            repWin: 1
          },
          {
            id: "angle",
            label: "Avancer pas à pas pour réduire l'angle",
            hint: "Métier",
            base: 0.56,
            repWin: 4,
            repFail: -2
          },
          {
            id: "feet",
            label: "Plonger dans ses pieds à l'entrée de la surface",
            hint: "Courage",
            base: 0.46,
            repWin: 7,
            repFail: -4,
            traitWin: "clutch"
          },
          {
            id: "out",
            label: "Sortir hors de votre surface pour le devancer de la tête",
            hint: "Folie",
            base: 0.36,
            repWin: 10,
            repFail: -6,
            failText: "Il vous devance à vingt-cinq mètres de vos buts et pousse le ballon dans la cage vide sans même presser le pas. {club} ne s'en relèvera pas, et la montée part avec cette image."
          }
        ],
        winText: "Le danger est écarté d'un souffle, le stade repart de plus belle, et {club} passe devant dans la foulée pour décrocher la montée.",
        failText: "Il gagne son duel et le ballon finit au fond. {club} pousse jusqu'au bout sans jamais y revenir : la montée s'envole sur une seule action."
      },
      {
        title: "BARRAGE DE MONTÉE",
        text: "Cinq minutes à tenir : {club} mène 1-0 et ce but vaut la montée. En face, tout part dans votre surface — longues touches, centres à répétition, leur défenseur central monté en pointe. Le vieux stade tremble à chaque ballon.",
        options: [
          {
            id: "line",
            label: "Rester sur votre ligne et laisser vos défenseurs dégager",
            hint: "Prudent",
            base: 0.66,
            repWin: 1
          },
          {
            id: "time",
            label: "Garder le ballon quelques secondes de trop à chaque prise",
            hint: "Cynique",
            base: 0.6,
            repWin: 2,
            repFail: -3,
            failText: "L'arbitre en a assez : jaune pour antijeu, et trois minutes de plus affichées au tableau. {club} craque dans ce temps volé, et regarde l'autre monter à sa place."
          },
          {
            id: "press",
            label: "Diriger le marquage à la voix et coller un homme sur leur géant",
            hint: "Patron",
            base: 0.52,
            repWin: 5,
            repFail: -3,
            traitWin: "leader"
          },
          {
            id: "claim",
            label: "Sortir loin dans la mêlée pour capter chaque centre",
            hint: "Autorité",
            base: 0.44,
            repWin: 8,
            repFail: -5,
            traitWin: "clutch"
          }
        ],
        winText: "Le déluge passe au-dessus de vous sans jamais rentrer. Au coup de sifflet final, c'est le gardien que l'on porte en triomphe : {club} MONTE.",
        failText: "Un centre de trop, une main qui tremble : l'égalisation tombe dans les arrêts de jeu, et {club} s'écroule dans les prolongations qui suivent. C'est l'autre qui monte."
      }
    ],
  },

  // --- Phase 2 : les deux bornes d'une carrière -----------------------------
  // Contrairement au derby ou aux retrouvailles, ces deux moments ne sont PAS
  // tirés au sort : ils se déclenchent une fois exactement, au premier match
  // professionnel et au dernier. Tout le monde doit les vivre.
  debut: {
    any: [
      {
        title: "PREMIER MATCH PROFESSIONNEL",
        text: "71e minute, {club} mène d'un but, et le quatrième arbitre lève enfin le panneau avec votre numéro. Vous avez dix-sept ans, un maillot floqué le matin même, et quelque part dans le virage, votre mère n'a pas lâché la main de votre père depuis la mi-temps. L'entraîneur vous glisse une dernière consigne que vous n'entendez déjà plus.",
        options: [
          {
            id: "simple",
            label: "Jouer en une touche et vous fondre dans l'équipe",
            hint: "Sage",
            base: 0.8,
            repWin: 1
          },
          {
            id: "work",
            label: "Courir pour les autres et prendre tous les efforts à votre compte",
            hint: "Généreux",
            base: 0.66,
            repWin: 3,
            repFail: -2
          },
          {
            id: "ask",
            label: "Réclamer chaque ballon, quitte à en perdre quelques-uns",
            hint: "Culot",
            base: 0.52,
            repWin: 5,
            repFail: -3,
            traitWin: "clutch",
            failText: "Vous réclamez tout et vous ratez beaucoup : au bout de dix minutes, le capitaine joue sans plus vous regarder. Vingt minutes pour se montrer, vingt minutes à se manquer devant ceux qui décident."
          },
          {
            id: "moment",
            label: "Tenter le geste qui fait lever le stade dès votre première touche",
            hint: "Folie",
            base: 0.36,
            repWin: 9,
            repFail: -5,
            traitWin: "showman",
            winText: "Votre première touche de ballon en professionnel est un geste que personne n'attendait d'un gamin de dix-sept ans, et tout un stade se lève d'un coup. On repassera ces trois secondes-là toute la semaine, et la seule question, au club, sera de savoir pourquoi vous n'aviez pas joué plus tôt.",
            failText: "Le geste ne passe pas, le ballon file en touche, et le banc entier lève les bras au ciel. On pardonne l'audace à un gamin ; on lui rappelle surtout qu'il en était à sa première touche."
          }
        ],
        winText: "Vingt minutes, pas une de plus, et pas une seconde où vous avez semblé de trop. Dans le couloir, l'entraîneur vous attrape par la nuque sans un mot : la prochaine feuille de match ne se discutera pas.",
        failText: "Les vingt minutes passent sans vous, comme si le match se jouait à côté. Vous sortez sans avoir rien laissé, et dans le couloir, personne ne vient vous dire le contraire."
      },
      {
        title: "PREMIER MATCH PROFESSIONNEL",
        text: "L'entraîneur a annoncé hier soir que vous étiez titulaire, et depuis, vous n'avez pas vraiment dormi. Une heure avant le coup d'envoi, votre maillot est accroché tout au bout du vestiaire, à la place que personne ne prend jamais. Autour, les anciens déroulent leurs rituels sans vous voir. Vous ne savez même pas si vous avez le droit de vous asseoir.",
        options: [
          {
            id: "quiet",
            label: "Prendre la place du bout et ne déranger personne",
            hint: "Discret",
            base: 0.76,
            repWin: 1
          },
          {
            id: "greet",
            label: "Faire le tour du vestiaire et serrer la main de chacun",
            hint: "Poli",
            base: 0.64,
            repWin: 3,
            repFail: -2
          },
          {
            id: "sing",
            label: "Monter sur le banc et chanter, comme le veut la tradition",
            hint: "Bizutage",
            base: 0.5,
            repWin: 6,
            repFail: -3,
            traitWin: "showman",
            winText: "Vous chantez faux, très fort, jusqu'au bout, et le vestiaire finit debout à taper sur les casiers. Le match, ensuite, vous paraît presque simple : ces gars-là jouent avec vous, plus devant vous.",
            failText: "La voix se casse à la deuxième phrase et personne ne vient à votre secours. Le silence dure trop longtemps, et il vous suit sur la pelouse : vous jouez tout le match la tête basse."
          },
          {
            id: "speak",
            label: "Demander le silence et dire ce que ce maillot représente pour vous",
            hint: "Aplomb",
            base: 0.38,
            repWin: 9,
            repFail: -5,
            traitWin: "leader",
            winText: "Vous parlez trente secondes, sans trembler, et le capitaine vous coupe d'une main sur l'épaule : « on y va ». À dix-sept ans, vous venez de prendre la parole dans un vestiaire professionnel, et le match qui suit ne vous fait plus peur.",
            failText: "Les mots sortent mal, trop haut, et un ancien vous demande gentiment de vous rasseoir. Vous montez sur la pelouse avec l'impression d'avoir déjà tout raté, et le match ne fait rien pour vous rassurer."
          }
        ],
        winText: "Le match qui suit ne ressemble à rien de ce que vous avez connu au centre, et pourtant vous ne le subissez jamais. À la sortie, deux anciens vous attendent pour rentrer avec vous : dans ce vestiaire-là, vous avez désormais une place.",
        failText: "Vous jouez tout le match à côté de vos crampons, sans jamais oser réclamer un ballon. Au retour, vos affaires sont déjà rangées dans un coin du vestiaire : personne ne vous en veut, mais personne ne vous attend non plus."
      },
      {
        title: "PREMIER MATCH PROFESSIONNEL",
        text: "Sixième minute de votre premier match, et le ballon vient enfin vers vous : une longue ouverture à mi-hauteur, dos au jeu. Derrière vous, un joueur de trente-quatre ans a déjà posé l'avant-bras sur vos reins et ne dit rien. C'est le premier ballon professionnel de votre vie, et tout un stade le regarde avec vous.",
        options: [
          {
            id: "back",
            label: "Remettre en une touche et repartir dans la course",
            hint: "Sobre",
            base: 0.84,
            repWin: 0
          },
          {
            id: "hold",
            label: "Protéger le ballon, encaisser le contact et attendre du soutien",
            hint: "Costaud",
            base: 0.66,
            repWin: 3,
            repFail: -2
          },
          {
            id: "turn",
            label: "Vous retourner dans son dos et sortir de la pression, ballon au pied",
            hint: "Culot",
            base: 0.5,
            repWin: 6,
            repFail: -3,
            traitWin: "clutch"
          },
          {
            id: "roulette",
            label: "Tenter la roulette, dos au jeu, sur le premier ballon",
            hint: "Folie",
            base: 0.36,
            repWin: 9,
            repFail: -5,
            traitWin: "showman",
            winText: "La roulette passe, le vieux briscard reste planté, et tout un stade lâche le même cri. Pour un premier ballon en professionnel, personne ici n'en avait vu de pareil.",
            failText: "Vous perdez le ballon au milieu de votre geste, et l'ancien ne se prive pas de vous le rappeler jusqu'à la mi-temps. Un premier ballon gâché pour une figure de salon : l'entraîneur ne dira rien, mais il aura tout vu."
          }
        ],
        winText: "Le ballon est bien traité, la charge n'a rien donné, et le vieux briscard vous regarde autrement en remontant. À partir de cette seconde-là, vous jouez votre match au lieu de l'attendre.",
        failText: "Le ballon vous échappe sous la charge et le contre part dans la foulée. Vous mettrez une demi-heure à en retoucher un autre, et la moitié du stade a déjà retenu votre nom pour la mauvaise raison."
      }
    ],
    gk: [
      {
        title: "PREMIER MATCH PROFESSIONNEL",
        text: "Douzième minute de votre premier match, sous une pluie qui ne s'arrête plus. Coup franc excentré : le ballon part très haut vers vos six mètres, et votre défense recule d'un même mouvement en vous laissant décider. Personne, dans cette surface, ne sait encore si l'on peut compter sur vos gants.",
        options: [
          {
            id: "line",
            label: "Rester sur votre ligne et laisser vos défenseurs s'en charger",
            hint: "Prudent",
            base: 0.74,
            repWin: 1,
            winText: "Vos défenseurs s'en chargent : la tête est contrée à deux mètres de vous et le ballon file en touche. Vous n'avez pas bougé d'un centimètre, et c'était le bon choix — pour une première alerte sous cette pluie, personne ne viendra vous chercher.",
            failText: "Cloué sur votre ligne, vous regardez la tête plonger devant vous sans avoir avancé d'un mètre. C'est exactement ce que l'on retiendra du gamin après le match : il n'est pas sorti."
          },
          {
            id: "punch",
            label: "Sortir au poing et taper le ballon le plus loin possible",
            hint: "Sobre",
            base: 0.62,
            repWin: 3,
            repFail: -2
          },
          {
            id: "catch",
            label: "Monter au-dessus de la mêlée et capter à deux mains",
            hint: "Autorité",
            base: 0.48,
            repWin: 6,
            repFail: -3,
            traitWin: "leader"
          },
          {
            id: "cut",
            label: "Sortir jusqu'au point de penalty et couper la trajectoire avant tout le monde",
            hint: "Folie",
            base: 0.36,
            repWin: 9,
            repFail: -6,
            traitWin: "showman",
            winText: "Vous traversez la moitié de votre surface sous la pluie et vous cueillez le ballon à deux mètres du sol, avant même que la tête parte. Le stade découvre d'un coup qu'il a un gardien, et qu'il n'a pas encore vingt ans.",
            failText: "Vos gants glissent sur le ballon mouillé au point de penalty, et le but ouvert derrière vous fait le reste. Une sortie de gamin, dira-t-on : trop loin, trop tôt, sous la pire des pluies."
          }
        ],
        winText: "Le ballon est écarté, la surface se vide, et votre défenseur central vient taper dans vos gants avant même de remonter. Sur ce ballon-là, vous venez de gagner le droit de jouer votre match.",
        failText: "Le ballon vous passe au-dessus et la reprise ne laisse aucune chance à personne. Aller chercher le ballon au fond de ses filets à la douzième minute de sa première titularisation : il y a des débuts plus doux."
      },
      {
        title: "PREMIER MATCH PROFESSIONNEL",
        text: "Trente-huitième minute de votre premier match, 0-0. Votre défenseur vous remet en retrait sans regarder, et leur attaquant est déjà lancé sur vous. Vingt mille personnes retiennent leur souffle en même temps : au centre de formation, on vous demandait de jouer ; ici, on vous demande surtout de ne pas vous tromper.",
        options: [
          {
            id: "row",
            label: "Dégager en tribune et assumer les sifflets",
            hint: "Sûr",
            base: 0.82,
            repWin: 0,
            failText: "Vous voulez dégager haut et vous croisez le ballon : il part en corner, et le stade souffle un peu trop fort. On ne vous en voudra pas, mais on l'a vu."
          },
          {
            id: "long",
            label: "Chercher l'avant-centre d'une longue relance",
            hint: "Sobre",
            base: 0.66,
            repWin: 3,
            repFail: -2
          },
          {
            id: "side",
            label: "Ouvrir sur le côté, dans l'intervalle, comme à l'entraînement",
            hint: "Culot",
            base: 0.5,
            repWin: 6,
            repFail: -4,
            traitWin: "clutch"
          },
          {
            id: "dribble",
            label: "L'effacer d'un contrôle et ressortir le ballon au pied",
            hint: "Folie",
            base: 0.36,
            repWin: 10,
            repFail: -6,
            traitWin: "showman",
            winText: "Vous le laissez venir, vous ouvrez le corps au dernier instant, et vous ressortez le ballon proprement pendant qu'il file dans le vide. Le stade met une seconde à comprendre, puis se met debout : à dix-sept ans, dans sa propre surface, il faut du culot.",
            failText: "Il vous prend le ballon dans la surface et vous n'avez plus qu'à regarder. Le but est encaissé sur votre premier vrai geste de professionnel, et cette image-là mettra des mois à s'effacer."
          }
        ],
        winText: "Le ballon ressort proprement, le danger s'éloigne, et votre défenseur vous adresse un pouce levé sans se retourner. À partir de cette action, on vous remet le ballon sans hésiter.",
        failText: "Le ballon ne ressort pas comme prévu et l'action tourne mal. Pendant vingt minutes, plus personne ne vous remettra en retrait — dans une équipe professionnelle, ça se voit tout de suite."
      },
      {
        title: "PREMIER MATCH PROFESSIONNEL",
        text: "Une heure avant le coup d'envoi, le numéro un se blesse à l'échauffement des gardiens. L'entraîneur traverse la pelouse, vous regarde et dit simplement : « tu joues ». Vos parents sont déjà en tribune avec leur billet de spectateurs, et il vous reste soixante minutes pour devenir gardien professionnel.",
        options: [
          {
            id: "breathe",
            label: "Vous isoler dans un coin du vestiaire et respirer",
            hint: "Calme",
            base: 0.74,
            repWin: 1
          },
          {
            id: "video",
            label: "Revoir sur la tablette du staff toutes les frappes de leur buteur",
            hint: "Méthode",
            base: 0.62,
            repWin: 3,
            repFail: -2
          },
          {
            id: "defense",
            label: "Réunir la défense et lui dire, un par un, qu'elle peut compter sur vous",
            hint: "Aplomb",
            base: 0.5,
            repWin: 6,
            repFail: -3,
            traitWin: "leader"
          },
          {
            id: "kop",
            label: "Aller saluer le virage, seul, avant même l'échauffement",
            hint: "Panache",
            base: 0.38,
            repWin: 9,
            repFail: -5,
            traitWin: "showman",
            winText: "Le virage vous répond avant même de savoir qui vous êtes, et ce mur de bruit ne vous quitte plus des quatre-vingt-dix minutes. Le vieux stade a adopté son gardien avant le coup d'envoi ; il ne restait plus qu'à le mériter, et vous l'avez fait.",
            failText: "Le virage vous regarde saluer sans un mot, et le premier ballon relâché suffit à lui donner raison. On ne se présente pas à ces gens-là avant d'avoir rien prouvé : ils vous le rappellent à chaque sortie du match."
          }
        ],
        winText: "Le match passe sans jamais vous engloutir : quelques ballons faciles pour se rassurer, deux vrais arrêts ensuite, et pas un instant de flottement. À la sortie, l'entraîneur ne vous dit rien de plus que le matin — mais il ne cherchera pas d'autre gardien pour le prochain match.",
        failText: "Vous traversez ce match sans jamais y entrer, et les deux ballons qu'il fallait tenir vous filent entre les gants. Sur le parking, vos parents vous attendent quand même : c'est la seule chose qui vous fasse du bien de la soirée."
      }
    ]
  },

  last_match: {
    any: [
      {
        title: "LE MATCH D'ADIEU",
        text: "Vestiaire, vingt minutes avant le coup d'envoi de votre dernier match. Le capitaine dénoue son brassard et vous le tend sans un mot : ce soir il est à vous, tout le groupe était d'accord avant même d'en parler. Les crampons se sont tus, et vingt paires d'yeux attendent que vous disiez quelque chose.",
        options: [
          {
            id: "silent",
            label: "Enfiler le brassard et sortir sans un mot",
            hint: "Pudeur",
            base: 0.8,
            repWin: 1
          },
          {
            id: "thanks",
            label: "Remercier un par un ceux qu'on ne remercie jamais",
            hint: "Gratitude",
            base: 0.68,
            repWin: 3,
            traitWin: "leader"
          },
          {
            id: "young",
            label: "Ne parler qu'aux plus jeunes et leur laisser une dernière consigne",
            hint: "Héritage",
            base: 0.56,
            repWin: 6,
            repFail: -2,
            traitWin: "leader"
          },
          {
            id: "promise",
            label: "Promettre à voix haute une soirée dont on parlera longtemps",
            hint: "Panache",
            base: 0.42,
            repWin: 10,
            repFail: -4,
            traitWin: "showman",
            winText: "Vous aviez promis, et le stade a tout eu : un but, une passe, et cette façon de courir comme si le corps ne comptait plus. Le tunnel des vestiaires met dix minutes à vous avaler, tellement il reste de mains à serrer.",
            failText: "La promesse était belle ; elle vous a seulement coûté vos vingt premières minutes, à trop vouloir. On ne retiendra pas la soirée annoncée, seulement un joueur qui a essayé jusqu'au bout — et ce n'est déjà pas rien."
          }
        ],
        winText: "Vous sortez du tunnel le brassard au bras, et le stade est déjà debout. Pendant quatre-vingt-dix minutes, l'équipe joue pour vous sans jamais le dire, et vous quittez la pelouse avec ce sentiment très rare d'avoir été exactement à votre place jusqu'à la dernière seconde.",
        failText: "Le match ne vient jamais : les jambes sont lourdes, les ballons vous fuient, et le brassard pèse plus qu'il ne porte. Vous terminez cette dernière soirée en spectateur de vous-même. Personne ne vous en voudra — vous, un peu, longtemps."
      },
      {
        title: "LE MATCH D'ADIEU",
        text: "80e minute, {club} mène de deux buts, et le quatrième arbitre tient déjà le panneau à la main. Votre entraîneur cherche votre regard depuis sa zone technique : la minute, c'est vous qui la choisissez. Les tribunes, elles, se lèvent dès que quelqu'un s'approche de la ligne de touche.",
        options: [
          {
            id: "now",
            label: "Sortir maintenant et saluer les quatre tribunes",
            hint: "Apaisé",
            base: 0.8,
            repWin: 1,
            failText: "Le panneau se lève, vous traversez la pelouse… et le stade met trois secondes de trop à comprendre. L'ovation arrive alors que vous êtes déjà assis, une veste sur les épaules. Ce n'était pas la sortie rêvée ; c'était quand même la vôtre."
          },
          {
            id: "five",
            label: "Demander cinq minutes de plus pour toucher un dernier ballon",
            hint: "Sursis",
            base: 0.66,
            repWin: 3
          },
          {
            id: "end",
            label: "Jouer jusqu'à la dernière seconde, quitte à finir sur les genoux",
            hint: "Orgueil",
            base: 0.54,
            repWin: 6,
            repFail: -2,
            traitWin: "clutch"
          },
          {
            id: "one_more",
            label: "Rester et monter chercher un dernier but",
            hint: "Folie",
            base: 0.4,
            repWin: 10,
            repFail: -4,
            traitWin: "showman",
            winText: "Le dernier ballon de votre carrière finit au fond, et le stade explose comme il ne l'avait plus fait depuis des années. Vos coéquipiers vous portent jusqu'à la ligne de touche : il n'existait pas de plus belle façon de s'en aller.",
            failText: "Le dernier ballon passe à côté du poteau, et le stade applaudit quand même l'audace. Vous sortez le souffle court, avec ce petit regret qui ne pèsera rien dans dix ans — mais qui pèse ce soir."
          }
        ],
        winText: "Quand vous quittez enfin la pelouse, tout le stade est debout, les deux camps confondus, et le banc adverse applaudit lui aussi. Vous mettez une minute entière à rejoindre la ligne de touche, et personne ne se rassoit avant que vous ayez disparu dans le tunnel.",
        failText: "La fin arrive presque à la dérobée : un dégagement en tribune, un coup de sifflet, et c'est déjà terminé. Vous saluez en marchant, un peu à contretemps de l'ovation, avec l'impression d'avoir manqué de peu le dernier instant — et celui-là ne se rejoue pas."
      },
      {
        title: "LE MATCH D'ADIEU",
        text: "78e minute, {club} mène de trois buts et le match est joué depuis longtemps. Penalty sifflé — et il se passe quelque chose d'étrange : le tireur attitré ramasse le ballon, traverse toute la surface et vous le pose dans les mains. Derrière le but, le virage scande déjà votre nom.",
        options: [
          {
            id: "refuse",
            label: "Rendre le ballon : ce penalty n'est pas le vôtre",
            hint: "Pudeur",
            base: 0.72,
            repWin: 0,
            winText: "Vous rendez le ballon, et le tireur le met au fond en vous montrant du doigt avant même de se retourner. Toute l'équipe court vers vous plutôt que vers lui : ce penalty que vous n'avez pas voulu tirer, le stade s'en souviendra mieux que d'un but.",
            failText: "Vous rendez le ballon, et la frappe s'envole au-dessus de la barre. Le stade applaudit quand même, par habitude, puis le jeu repart sans vous. Ce dernier geste-là, vous ne saurez jamais ce qu'il aurait donné."
          },
          {
            id: "placed",
            label: "Le placer tranquillement dans un coin, sans forcer",
            hint: "Sobre",
            base: 0.68,
            repWin: 2,
            failText: "Vous le placez sans forcer, et le gardien part exactement du bon côté. Il vous cherche du regard en se relevant, presque désolé : le dernier but, lui, n'aura pas eu lieu."
          },
          {
            id: "power",
            label: "L'envoyer sous la barre de toutes vos forces, une dernière fois",
            hint: "Panache",
            base: 0.5,
            repWin: 6,
            repFail: -2,
            traitWin: "showman"
          },
          {
            id: "kid",
            label: "Confier le ballon au gamin qui n'a jamais marqué chez les pros",
            hint: "Transmission",
            base: 0.4,
            repWin: 11,
            repFail: -2,
            traitWin: "leader",
            winText: "Le gamin met dix secondes à comprendre, puis pose le ballon sans trembler et le met au fond. Il court vers vous les bras ouverts, tout le banc derrière lui, et vous savez exactement ce que vous laissez ici en partant.",
            failText: "Le gamin frappe à côté et reste planté là, les mains sur la tête. Vous allez le chercher, vous lui dites quelque chose que personne n'entendra jamais, et le stade applaudit cette image plus fort que n'importe quel but. Le penalty est manqué ; la soirée n'aura pas son dernier but, seulement quelque chose de plus doux."
          }
        ],
        winText: "Le ballon finit au fond, et tout le stade se lève d'un bloc. Ce but-là ne changera rien au classement ; c'est pourtant celui dont la ville parlera le plus longtemps.",
        failText: "La frappe file au-dessus de la barre, et le stade éclate d'un rire tendre avant de se lever quand même. Il en faudrait beaucoup plus pour abîmer une soirée pareille — mais le dernier but, lui, n'aura pas eu lieu."
      }
    ],
    gk: [
      {
        title: "LE MATCH D'ADIEU",
        text: "90e+3, {club} mène de deux buts et l'arbitre a déjà la main sur son sifflet. Leur milieu arme une dernière frappe enroulée de vingt-cinq mètres, qui monte vers votre lucarne. Vous le savez en la voyant partir : c'est le dernier ballon de votre carrière.",
        options: [
          {
            id: "punch",
            label: "Repousser des deux poings vers la touche, sans prendre de risque",
            hint: "Métier",
            base: 0.78,
            repWin: 1
          },
          {
            id: "catch",
            label: "Aller la capter à deux mains et garder le ballon contre vous",
            hint: "Propreté",
            base: 0.64,
            repWin: 3
          },
          {
            id: "tip",
            label: "La détourner du bout des gants sur la barre",
            hint: "Précision",
            base: 0.52,
            repWin: 6,
            repFail: -2,
            traitWin: "clutch"
          },
          {
            id: "fly",
            label: "Partir de tout votre long, tant pis pour la retombée",
            hint: "Folie",
            base: 0.4,
            repWin: 10,
            repFail: -3,
            traitWin: "showman",
            winText: "Vous partez de tout votre long et vous allez chercher le ballon là où votre corps ne vous emmenait plus depuis des années. Cette parade fera la une de tous les journaux demain matin, et personne, sur l'image, ne verra un gardien à quelques secondes de la retraite.",
            failText: "Vos doigts passent à trois centimètres du ballon, qui finit sous la barre. Vous restez allongé un peu plus longtemps que nécessaire, le temps que le stade se lève : le geste était celui de vos vingt ans, le corps, non. Personne ne vous en voudra jamais pour celui-là."
          }
        ],
        winText: "Le ballon ne rentre pas, et le coup de sifflet final tombe dans la seconde. Vos coéquipiers arrivent tous en même temps, et le stade reste debout longtemps après que le tableau d'affichage s'est éteint : la dernière image de vous, ce sera celle-là.",
        failText: "La frappe finit dans vos filets à la dernière seconde. Vous allez chercher le ballon au fond, vous le posez sur le rond central, et l'arbitre siffle la fin sans que le jeu reprenne. Le stade se lève quand même, longuement — mais ce dernier ballon-là, vous le reverrez souvent."
      },
      {
        title: "LE MATCH D'ADIEU",
        text: "75e minute, {club} mène d'un but. Sur le banc, le gamin de dix-neuf ans que vous avez pris sous votre aile depuis trois saisons a enfilé ses gants et remonté ses chaussettes. Le quatrième arbitre attend, votre entraîneur attend : c'est votre dernier match, et ce serait peut-être son premier.",
        options: [
          {
            id: "finish",
            label: "Finir le match : on ne lâche pas une cage à un but d'écart",
            hint: "Métier",
            base: 0.74,
            repWin: 1
          },
          {
            id: "late",
            label: "Attendre les toutes dernières minutes pour le faire entrer",
            hint: "Prudent",
            base: 0.64,
            repWin: 3
          },
          {
            id: "gloves",
            label: "Sortir maintenant et lui passer vos gants devant tout le stade",
            hint: "Passation",
            base: 0.52,
            repWin: 6,
            repFail: -2,
            winText: "Il tient la cage un quart d'heure avec vos gants aux mains, et il ne concède rien. Vous regardez ça depuis la touche, debout, et vous comprenez que la meilleure chose que vous laissiez à ce club n'est pas dans les vitrines."
          },
          {
            id: "armband",
            label: "Lui laisser les gants, le brassard et la fin du match",
            hint: "Confiance",
            base: 0.4,
            repWin: 10,
            repFail: -3,
            traitWin: "leader",
            winText: "Il tient la cage un quart d'heure sans trembler, avec le brassard qui lui tombe sur le coude et le stade derrière lui. Au coup de sifflet, c'est lui qui vous cherche des yeux avant de fêter quoi que ce soit : vous ne partez pas, vous vous prolongez."
          }
        ],
        winText: "Le but d'avance tient jusqu'au bout, et le coup de sifflet libère un stade entier. Après la dernière poignée de main, vos gants finissent dans les mains du gamin, et il ne les lâchera plus de la soirée : ce qui s'est transmis là, aucun tableau d'affichage ne l'affichera jamais.",
        failText: "L'égalisation tombe dans le dernier quart d'heure, sur un ballon que personne n'aurait pu arrêter. Le stade se lève quand même à la fin, longuement, pour le gardien qui s'en va — mais ce dernier match n'aura pas eu la fin qu'on lui souhaitait."
      },
      {
        title: "LE MATCH D'ADIEU",
        text: "90e+4, {club} mène de trois buts et il ne reste plus rien à jouer. Corner pour votre équipe, et le stade entier se met à scander la même chose en montrant l'autre surface du doigt : votre nom. Sur le banc, votre entraîneur hausse les épaules en souriant — c'est vous qui voyez.",
        options: [
          {
            id: "stay",
            label: "Rester dans vos six mètres, le métier jusqu'au bout",
            hint: "Digne",
            base: 0.76,
            repWin: 0,
            winText: "Vous ne bougez pas d'un mètre, les bras croisés dans vos six mètres, et le stade finit par comprendre. L'ovation qui monte alors n'est pas celle qu'on réserve aux gestes fous : c'est celle qu'on garde pour ceux qui ont fait le métier jusqu'à la dernière seconde.",
            failText: "Vous ne bougez pas, le corner ne donne rien, et le stade retombe d'un coup, un peu déçu. Le sifflet final arrive dans la foulée. Vous n'avez rien à vous reprocher — seulement une image que vous n'aurez pas."
          },
          {
            id: "halfway",
            label: "Monter jusqu'au rond central et regarder de loin",
            hint: "Sage",
            base: 0.66,
            repWin: 2
          },
          {
            id: "box",
            label: "Monter dans la surface et attaquer le premier poteau",
            hint: "Culot",
            base: 0.5,
            repWin: 7,
            repFail: -2,
            winText: "Vous prenez le ballon de la tête au premier poteau et il finit au fond. Vos coéquipiers vous ensevelissent près du drapeau de corner : le dernier but de votre carrière est le seul que personne n'attendait de vous."
          },
          {
            id: "take",
            label: "Réclamer le corner et le tirer vous-même",
            hint: "Folie",
            base: 0.38,
            repWin: 11,
            repFail: -3,
            traitWin: "showman",
            winText: "Vous posez le ballon au drapeau sous les hurlements, et vous l'enroulez au second poteau : une tête au bout, et le fond des filets. La dernière passe décisive de votre carrière, tirée d'un corner, à la 94e minute de votre dernier match.",
            failText: "Le centre est trop long, personne ne le touche, et le ballon finit dans les gants d'en face. L'arbitre siffle la fin, le stade rit et applaudit en même temps : tirer les corners n'aura jamais été votre métier — mais tout le monde vous aura vu essayer."
          }
        ],
        winText: "Le ballon traîne dans la surface, rebondit deux fois et finit au fond, dans un vacarme que ce stade n'avait plus produit depuis des années. Ce but-là ne compte pour rien au classement ; il sera pourtant sur toutes les photos de demain matin, et plus personne ne se rassoit jusqu'au coup de sifflet.",
        failText: "Le corner ne donne rien, le ballon file en touche, et l'arbitre siffle la fin dans la foulée. Le stade se lève quand même pour vous, longuement — il ne manquait qu'une dernière image à cette soirée, et elle ne viendra pas."
      }
    ]
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
