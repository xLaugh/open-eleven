// Scénarios supplémentaires des moments décisifs (10.94) : ils s'ajoutent à ceux de
// moments.ts et sont tirés au hasard parmi tous. Même format (cf. moments.ts).
import type { Dict, MomentVariant } from "./types";

export const KEY_MOMENTS_EXTRA: Dict<Dict<MomentVariant[]>> = {
  "cup_final": {
    "field": [
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Prolongation de la finale, 1-1, et {club} joue à dix depuis l'exclusion d'un coéquipier. 112e minute : un long ballon vous tombe dans les pieds, seul face à trois défenseurs.",
        "options": [
          {
            "id": "hold",
            "label": "Garder le ballon et faire remonter le bloc",
            "hint": "Sûr",
            "base": 0.66,
            "repWin": 2
          },
          {
            "id": "foul",
            "label": "Chercher la faute au contact",
            "hint": "Malin",
            "base": 0.6,
            "repWin": 2
          },
          {
            "id": "solo",
            "label": "Partir seul contre trois",
            "hint": "Héroïque",
            "base": 0.42,
            "repWin": 7,
            "repFail": -4,
            "traitWin": "clutch"
          },
          {
            "id": "shoot",
            "label": "Frapper de loin par surprise",
            "hint": "Culotté",
            "base": 0.46,
            "repWin": 5,
            "repFail": -3
          }
        ],
        "winText": "À dix contre onze, vous tenez, vous usez, vous trouvez la faille : {club} soulève la coupe au bout de la prolongation, et c'est vous qu'on porte en triomphe !",
        "failText": "Le ballon se perd, et le contre adverse punit une équipe à bout de souffle. À dix, la coupe était trop lourde à porter."
      },
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Finale sous le déluge, 0-0 à la 80e. La pelouse est une piscine, le ballon s'arrête dans les flaques et le match n'est plus qu'une suite de fautes. Un ballon traîne devant vous, à vingt mètres du but.",
        "options": [
          {
            "id": "skid",
            "label": "Frapper à ras de terre pour faire fuser le ballon",
            "hint": "Malin",
            "base": 0.58,
            "repWin": 3
          },
          {
            "id": "lay",
            "label": "Pousser le ballon dans la course d'un coéquipier",
            "hint": "Collectif",
            "base": 0.64,
            "repWin": 2
          },
          {
            "id": "flick",
            "label": "Le soulever au-dessus des flaques et enchaîner",
            "hint": "Technique",
            "base": 0.46,
            "repWin": 5,
            "repFail": -2
          },
          {
            "id": "volley",
            "label": "Sortir le ballon de l'eau et reprendre de volée",
            "hint": "Légendaire",
            "base": 0.38,
            "repWin": 8,
            "repFail": -5,
            "traitWin": "showman"
          }
        ],
        "winText": "Le ballon file sur l'eau et trompe tout le monde : 1-0 ! Dans ce marécage, c'est vous qui avez trouvé la seule façon de marquer, et {club} tient sa coupe.",
        "failText": "Le ballon meurt dans une flaque, le contre part, et un but de raccroc douche {club}. La coupe se perd dans la boue."
      },
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Tirs au but de la finale, 4-4. Vous êtes le cinquième tireur de {club}. Le gardien adverse a plongé à sa droite sur les quatre premiers tirs, et il vous fixe en souriant.",
        "options": [
          {
            "id": "logic",
            "label": "Prendre l'autre côté, comme le dit la logique",
            "hint": "Logique",
            "base": 0.6,
            "repWin": 2
          },
          {
            "id": "same",
            "label": "Le croiser là où il plonge, il ne vous y attend plus",
            "hint": "Bluff",
            "base": 0.5,
            "repWin": 4,
            "repFail": -3
          },
          {
            "id": "roof",
            "label": "Frapper fort au milieu, sous la barre",
            "hint": "Puissant",
            "base": 0.56,
            "repWin": 3,
            "repFail": -2
          },
          {
            "id": "wait",
            "label": "Attendre qu'il bouge et placer à l'opposé",
            "hint": "Sang-froid",
            "base": 0.46,
            "repWin": 6,
            "repFail": -4,
            "traitWin": "zen"
          }
        ],
        "winText": "Le ballon file d'un côté, le gardien de l'autre : la coupe est à {club}, et vous courez vers le virage les bras en croix !",
        "failText": "Le gardien a deviné. Il se relève en hurlant, et la coupe change de camp sur votre tir. Le retour vers le rond central sera le plus long de votre vie."
      }
    ],
    "mil": [
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Finale noyée sous l'averse, 1-1 à la 75e. Chaque passe s'arrête dans l'eau, l'arbitre siffle une faute toutes les trente secondes, et le match se joue au milieu, là où vous êtes.",
        "options": [
          {
            "id": "long",
            "label": "Jouer long et aérien, au-dessus des flaques",
            "hint": "Pragmatique",
            "base": 0.62,
            "repWin": 2
          },
          {
            "id": "short",
            "label": "S'entêter à jouer court et redonner du rythme",
            "hint": "Puriste",
            "base": 0.44,
            "repWin": 6,
            "repFail": -3
          },
          {
            "id": "fight",
            "label": "Gagner chaque duel, transformer le match en combat",
            "hint": "Guerrier",
            "base": 0.58,
            "repWin": 3,
            "repFail": -1
          },
          {
            "id": "setpiece",
            "label": "Provoquer les fautes et miser sur les coups de pied arrêtés",
            "hint": "Malin",
            "base": 0.54,
            "repWin": 4
          }
        ],
        "winText": "Vous avez compris ce match avant tout le monde : {club} le gagne dans la boue, et la coupe brille d'autant plus qu'elle est crottée !",
        "failText": "Une glissade, un ballon qui s'arrête net, et l'adversaire en profite. La coupe se perd dans un marécage, sur un détail."
      },
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Finale, 1-1 à l'heure de jeu. Votre capitaine s'effondre, la cheville tordue, et c'est à vous qu'il tend le brassard avant de sortir. L'équipe flotte, l'adversaire sent le moment.",
        "options": [
          {
            "id": "calm",
            "label": "Ralentir le jeu et remettre de l'ordre",
            "hint": "Sûr",
            "base": 0.66,
            "repWin": 2
          },
          {
            "id": "push",
            "label": "Remonter tout le bloc de dix mètres",
            "hint": "Audace",
            "base": 0.5,
            "repWin": 5,
            "repFail": -3
          },
          {
            "id": "talk",
            "label": "Réunir les cadres et changer de plan",
            "hint": "Leader",
            "base": 0.58,
            "repWin": 3,
            "traitWin": "leader"
          },
          {
            "id": "promise",
            "label": "Promettre la coupe au capitaine et tout donner",
            "hint": "Émotion",
            "base": 0.44,
            "repWin": 6,
            "repFail": -3
          }
        ],
        "winText": "Brassard au bras, vous reprenez la finale en main, et {club} finit par la gagner. Dans le vestiaire, le capitaine blessé insiste : c'est vous qui lèverez le trophée en premier.",
        "failText": "Le brassard ne suffit pas à recoudre l'équipe. L'adversaire passe devant et ne lâche plus : la coupe s'échappe le soir de votre premier capitanat."
      },
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Tirs au but de la finale. Le coach vous désigne comme premier tireur, celui qui donne le ton. Le gardien adverse sautille sur sa ligne et ne vous lâche pas des yeux.",
        "options": [
          {
            "id": "strong",
            "label": "Votre côté fort, comme à l'entraînement",
            "hint": "Sûr",
            "base": 0.66,
            "repWin": 2
          },
          {
            "id": "weak",
            "label": "Le côté opposé, pour le surprendre",
            "hint": "Bluff",
            "base": 0.52,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "look",
            "label": "Regarder un côté et frapper de l'autre",
            "hint": "Malin",
            "base": 0.48,
            "repWin": 5,
            "repFail": -3
          },
          {
            "id": "chip",
            "label": "La panenka pour lancer la séance",
            "hint": "Légendaire",
            "base": 0.38,
            "repWin": 8,
            "repFail": -6,
            "traitWin": "showman"
          }
        ],
        "winText": "Premier tir, premier but, et le ton est donné : {club} remporte la séance sans trembler. La coupe est à vous !",
        "failText": "Arrêté. Le gardien exulte, la séance part du mauvais pied et ne s'en remet jamais : la coupe s'envole dès le premier tir."
      }
    ],
    "def": [
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Prolongation de la finale, {club} mène 1-0 mais joue à dix depuis la 95e. Leurs attaquants arrivent par vagues, et votre ligne défensive est à bout de souffle.",
        "options": [
          {
            "id": "low",
            "label": "Reculer et verrouiller la surface",
            "hint": "Bunker",
            "base": 0.62,
            "repWin": 2
          },
          {
            "id": "trap",
            "label": "Monter d'un cran pour les mettre hors-jeu",
            "hint": "Risqué",
            "base": 0.46,
            "repWin": 5,
            "repFail": -4
          },
          {
            "id": "block",
            "label": "Se jeter devant chaque frappe",
            "hint": "Courage",
            "base": 0.56,
            "repWin": 4,
            "repFail": -1
          },
          {
            "id": "organize",
            "label": "Hurler les consignes et replacer tout le monde",
            "hint": "Leader",
            "base": 0.58,
            "repWin": 3,
            "traitWin": "leader"
          }
        ],
        "winText": "Trente minutes à dix, pas un but encaissé : {club} soulève la coupe, et vos jambes tremblent encore sur le podium.",
        "failText": "La digue cède à la 118e. À dix, impossible de repartir : la coupe s'envole aux tirs au but, et vous ne sentez plus vos jambes."
      },
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Finale, 0-0 à la 55e. Votre capitaine sort sur civière et c'est à vous, le patron de la défense, qu'il confie le brassard. Leur numéro 9 vient déjà vous chambrer.",
        "options": [
          {
            "id": "ignore",
            "label": "L'ignorer et rester concentré",
            "hint": "Zen",
            "base": 0.64,
            "repWin": 2,
            "traitWin": "zen"
          },
          {
            "id": "first",
            "label": "Lui faire sentir le premier duel",
            "hint": "Rugueux",
            "base": 0.5,
            "repWin": 4,
            "repFail": -3
          },
          {
            "id": "tighten",
            "label": "Rassembler la défense et resserrer les lignes",
            "hint": "Collectif",
            "base": 0.62,
            "repWin": 2
          },
          {
            "id": "up",
            "label": "Monter sur les coups de pied arrêtés pour marquer",
            "hint": "Culotté",
            "base": 0.44,
            "repWin": 7,
            "repFail": -3
          }
        ],
        "winText": "Le brassard au bras, vous tenez la baraque, et {club} finit par marquer. Leur 9 repart sans un tir cadré, et c'est vous qui levez la coupe le premier.",
        "failText": "Leur 9 a le dernier mot sur un ballon que vous pensiez tenir. La coupe file, et votre soirée de capitaine finit dans le silence."
      },
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Tirs au but de la finale, mort subite. Parmi les joueurs de champ, il ne reste plus que vous, qui n'avez pas tiré un penalty depuis les équipes de jeunes. Vous posez le ballon, le cœur au bord des lèvres.",
        "options": [
          {
            "id": "decided",
            "label": "Choisir un côté avant l'élan, et ne plus en changer",
            "hint": "Décidé",
            "base": 0.64,
            "repWin": 2
          },
          {
            "id": "hard",
            "label": "Fermer les yeux et frapper fort au milieu",
            "hint": "Puissant",
            "base": 0.58,
            "repWin": 3
          },
          {
            "id": "late",
            "label": "Attendre le plongeon du gardien",
            "hint": "Sang-froid",
            "base": 0.44,
            "repWin": 6,
            "repFail": -4,
            "traitWin": "zen"
          },
          {
            "id": "top",
            "label": "Viser la lucarne, comme un attaquant",
            "hint": "Culotté",
            "base": 0.4,
            "repWin": 7,
            "repFail": -4
          }
        ],
        "winText": "Filets ! Le défenseur que personne n'attendait marque le tir de la victoire : {club} soulève la coupe, et vos coéquipiers vous ensevelissent.",
        "failText": "Le gardien s'interpose. Vous restez à genoux au point de penalty pendant que l'adversaire fête la coupe : un défenseur n'aurait jamais dû vivre ça."
      }
    ],
    "gk": [
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Tirs au but de la finale, 4-3 pour {club} après quatre tirs. Leur cinquième tireur est un ancien coéquipier : vous l'avez vu tirer des centaines de penaltys à l'entraînement, et il le sait.",
        "options": [
          {
            "id": "habit",
            "label": "Plonger sur son côté habituel",
            "hint": "Mémoire",
            "base": 0.5,
            "repWin": 3
          },
          {
            "id": "double",
            "label": "Parier qu'il a changé, plonger à l'opposé",
            "hint": "Bluff",
            "base": 0.44,
            "repWin": 5,
            "repFail": -2
          },
          {
            "id": "word",
            "label": "Lui glisser un mot en lui rendant le ballon",
            "hint": "Provoc",
            "base": 0.42,
            "repWin": 6,
            "repFail": -3,
            "traitWin": "showman"
          },
          {
            "id": "stand",
            "label": "Rester debout jusqu'au dernier instant",
            "hint": "Sang-froid",
            "base": 0.48,
            "repWin": 3
          }
        ],
        "winText": "Vous partez du bon côté et le ballon s'écrase sur vos gants : {club} remporte la coupe, et votre ancien coéquipier vient vous serrer dans ses bras, dépité.",
        "failText": "Il vous connaît aussi bien que vous le connaissez. Le ballon file de l'autre côté, la séance continue… et la coupe finit dans les mains adverses."
      },
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Prolongation de la finale, 1-1, et {club} joue à dix. Les tirs pleuvent sur votre but, et à la 114e leur ailier déboule sur la gauche pour un centre tendu vers le second poteau.",
        "options": [
          {
            "id": "claim",
            "label": "Sortir et capter le centre",
            "hint": "Autorité",
            "base": 0.5,
            "repWin": 4,
            "repFail": -3
          },
          {
            "id": "line",
            "label": "Rester sur la ligne et attendre la reprise",
            "hint": "Sûr",
            "base": 0.62,
            "repWin": 2
          },
          {
            "id": "punch",
            "label": "Boxer le ballon le plus loin possible",
            "hint": "Efficace",
            "base": 0.58,
            "repWin": 2
          },
          {
            "id": "read",
            "label": "Anticiper la remise en retrait et couvrir le premier poteau",
            "hint": "Lecture",
            "base": 0.44,
            "repWin": 6,
            "repFail": -3,
            "traitWin": "clutch"
          }
        ],
        "winText": "Le danger est écarté, et votre équipe à dix tient jusqu'aux tirs au but, que {club} remporte. La coupe a été gagnée dans votre surface, centre après centre.",
        "failText": "Le ballon termine au fond sur cette dernière vague. À dix, {club} n'a plus la force de revenir : la coupe s'envole."
      },
      {
        "title": "FINALE DE LA COUPE NATIONALE",
        "text": "Finale sous une pluie battante, {club} mène 1-0 à la 85e. Le terrain est gorgé d'eau, et leur milieu arme une frappe de trente mètres qui va rebondir juste devant vous.",
        "options": [
          {
            "id": "tip",
            "label": "Plonger pour dévier en corner",
            "hint": "Sûr",
            "base": 0.64,
            "repWin": 2
          },
          {
            "id": "catch",
            "label": "Bloquer le ballon contre la poitrine",
            "hint": "Audace",
            "base": 0.44,
            "repWin": 5,
            "repFail": -4
          },
          {
            "id": "body",
            "label": "Mettre tout le corps derrière et accepter le rebond",
            "hint": "Prudent",
            "base": 0.58,
            "repWin": 2
          },
          {
            "id": "fist",
            "label": "Le repousser des poings loin de la surface",
            "base": 0.52,
            "repWin": 3,
            "repFail": -1
          }
        ],
        "winText": "Ce rebond traître, vous l'aviez lu : le ballon ne passe pas, et {club} tient jusqu'au bout. Une coupe trempée, des gants pleins de boue, et le sourire du soir.",
        "failText": "Le ballon fuse sur l'eau et vous glisse sous le ventre. 1-1, puis la prolongation tourne mal : la coupe se perd sous l'averse."
      }
    ]
  },
  "continental_final": {
    "field": [
      {
        "title": "FINALE CONTINENTALE",
        "text": "Finale continentale, 1-1 à la 80e. Vous venez de marquer… mais la VAR annule pour un hors-jeu d'un orteil. Dix minutes à jouer, et le sang vous bout dans les veines.",
        "options": [
          {
            "id": "reset",
            "label": "Effacer et revenir au plan",
            "hint": "Zen",
            "base": 0.64,
            "repWin": 2,
            "traitWin": "zen"
          },
          {
            "id": "press",
            "label": "Transformer la rage en pressing",
            "hint": "Hargne",
            "base": 0.56,
            "repWin": 3,
            "repFail": -1
          },
          {
            "id": "again",
            "label": "Réclamer tous les ballons pour remarquer",
            "hint": "Ego",
            "base": 0.46,
            "repWin": 6,
            "repFail": -3
          },
          {
            "id": "same",
            "label": "Refaire exactement le même appel, un pas plus tard",
            "hint": "Têtu",
            "base": 0.42,
            "repWin": 7,
            "repFail": -3,
            "traitWin": "clutch"
          }
        ],
        "winText": "Le deuxième but, cette fois, personne ne peut l'annuler : {club} est champion du continent, et vous avez eu raison deux fois !",
        "failText": "Le but refusé vous colle aux crampons : l'adversaire profite d'un temps faible, et la finale continentale s'envole. Ce hors-jeu d'un orteil vous hantera longtemps."
      },
      {
        "title": "FINALE CONTINENTALE",
        "text": "Finale continentale, 0-0 à l'heure de jeu. L'adversaire a fait son choix : deux hommes sur vous, à chaque ballon. Vous n'en avez pas touché un propre depuis vingt minutes.",
        "options": [
          {
            "id": "decoy",
            "label": "Jouer les leurres pour libérer les autres",
            "hint": "Collectif",
            "base": 0.64,
            "repWin": 2
          },
          {
            "id": "drop",
            "label": "Décrocher au milieu pour les entraîner avec vous",
            "hint": "Malin",
            "base": 0.58,
            "repWin": 3,
            "traitWin": "genius"
          },
          {
            "id": "swap",
            "label": "Permuter avec l'ailier pour brouiller les pistes",
            "hint": "Mobile",
            "base": 0.52,
            "repWin": 4,
            "repFail": -1
          },
          {
            "id": "force",
            "label": "Forcer quand même le duel à un contre deux",
            "hint": "Ego",
            "base": 0.42,
            "repWin": 7,
            "repFail": -4,
            "traitWin": "showman"
          }
        ],
        "winText": "Ils étaient deux sur vous ; il en manquait un ailleurs. La faille s'ouvre, {club} marque, et le trophée continental se soulève sur votre coup de génie !",
        "failText": "Étouffé, vous ne trouvez jamais la sortie, et l'adversaire marque à l'autre bout. La finale continentale vous a été confisquée à deux contre un."
      },
      {
        "title": "FINALE CONTINENTALE",
        "text": "93e minute de la finale continentale, 1-1. Coup franc pour {club} à trente-cinq mètres, plein axe. Le mur s'installe, le gardien est avancé, et tout le stade attend un centre.",
        "options": [
          {
            "id": "cross",
            "label": "Centrer au second poteau pour les grands",
            "hint": "Collectif",
            "base": 0.62,
            "repWin": 2
          },
          {
            "id": "short",
            "label": "Jouer court et décaler pour une frappe",
            "hint": "Malin",
            "base": 0.54,
            "repWin": 3
          },
          {
            "id": "dip",
            "label": "Frappe flottante qui plonge sous la barre",
            "hint": "Signature",
            "base": 0.46,
            "repWin": 6,
            "repFail": -2,
            "traitWin": "clutch"
          },
          {
            "id": "direct",
            "label": "Frapper directement de toutes vos forces",
            "hint": "Puissant",
            "base": 0.42,
            "repWin": 7,
            "repFail": -3
          }
        ],
        "winText": "Le ballon trouve sa cible au bout du temps additionnel : {club} est sur le toit du continent, et ce coup franc lointain entre dans la légende !",
        "failText": "Le ballon est capté, le contre part, et la séance de tirs au but tourne mal. Le sacre continental s'est joué à trente-cinq mètres près."
      }
    ],
    "gk": [
      {
        "title": "FINALE CONTINENTALE",
        "text": "93e minute de la finale continentale, {club} mène 1-0. Coup franc adverse à vingt mètres, légèrement excentré. Leur spécialiste pose le ballon, et votre mur attend vos consignes.",
        "options": [
          {
            "id": "classic",
            "label": "Mur de quatre, et se placer côté ouvert",
            "hint": "Classique",
            "base": 0.6,
            "repWin": 2
          },
          {
            "id": "lying",
            "label": "Un joueur allongé derrière le mur",
            "hint": "Prévoyant",
            "base": 0.56,
            "repWin": 3
          },
          {
            "id": "step",
            "label": "Faire un pas côté mur au dernier moment",
            "hint": "Bluff",
            "base": 0.48,
            "repWin": 5,
            "repFail": -2,
            "traitWin": "clutch"
          },
          {
            "id": "small",
            "label": "Mur réduit, et tout miser sur votre détente",
            "hint": "Culotté",
            "base": 0.44,
            "repWin": 6,
            "repFail": -4
          }
        ],
        "winText": "Vous claquez le ballon au-dessus de la barre d'une main ferme. Le corner est dégagé, l'arbitre siffle : {club} est champion du continent, et vos gants entrent dans l'histoire !",
        "failText": "Le ballon enroule le mur et se loge dans la lucarne. 1-1 à la 93e : {club} vacille, et le trophée continental s'envole en prolongation."
      },
      {
        "title": "FINALE CONTINENTALE",
        "text": "Dernière minute de la prolongation en finale continentale, 2-2. Long ballon adverse dans votre surface, trois attaquants lancés, et le ballon tombe pile entre votre ligne et le point de penalty.",
        "options": [
          {
            "id": "claim",
            "label": "Sortir et capter haut, au-dessus de tout le monde",
            "hint": "Autorité",
            "base": 0.5,
            "repWin": 5,
            "repFail": -4,
            "traitWin": "leader"
          },
          {
            "id": "punch",
            "label": "Sortir des poings et dégager loin",
            "hint": "Sûr",
            "base": 0.62,
            "repWin": 2
          },
          {
            "id": "line",
            "label": "Rester sur votre ligne et attendre la tête",
            "hint": "Prudent",
            "base": 0.56,
            "repWin": 1
          },
          {
            "id": "call",
            "label": "Hurler à votre défenseur de jouer le ballon de la tête",
            "hint": "Collectif",
            "base": 0.52,
            "repWin": 2,
            "repFail": -1
          }
        ],
        "winText": "Le danger s'éteint dans votre surface, et la finale part aux tirs au but, où {club} ne tremble pas. Le continent est à vous, et cette dernière sortie y est pour beaucoup !",
        "failText": "Le ballon flotte, une tête surgit dans la mêlée, et le filet tremble. À la dernière minute de la prolongation, le trophée continental vous échappe."
      }
    ]
  },
  "wc_final": {
    "field": [
      {
        "title": "FINALE DE LA COUPE DU MONDE",
        "text": "Tirs au but de la finale, 4-4, dernier tir. Le gardien adverse est votre coéquipier en club : il a vu chacun de vos penaltys à l'entraînement depuis trois saisons, et il vous sourit en reculant sur sa ligne.",
        "options": [
          {
            "id": "switch",
            "label": "Changer de côté pour la première fois de votre vie",
            "hint": "Sûr",
            "base": 0.64,
            "repWin": 3
          },
          {
            "id": "habit",
            "label": "Votre côté habituel, mais en pleine puissance",
            "hint": "Bluff",
            "base": 0.5,
            "repWin": 4,
            "repFail": -3
          },
          {
            "id": "wait",
            "label": "Attendre qu'il bouge, jusqu'au dernier pas",
            "hint": "Patient",
            "base": 0.56,
            "repWin": 4,
            "repFail": -2,
            "traitWin": "zen"
          },
          {
            "id": "center",
            "label": "Plein centre, sous la barre",
            "hint": "Culotté",
            "base": 0.44,
            "repWin": 8,
            "repFail": -6,
            "traitWin": "clutch"
          }
        ],
        "winText": "Il avait tout deviné, sauf ce tir-là. AU FOND ! Votre nation est championne du monde, et vous aurez beaucoup de choses à lui raconter à la reprise de l'entraînement.",
        "failText": "Il ne bouge pas d'un centimètre et repousse. Il vous connaissait trop bien : votre nation s'incline, et le vestiaire du club sera bien silencieux à la reprise."
      },
      {
        "title": "FINALE DE LA COUPE DU MONDE",
        "text": "112e minute, 1-1. Votre mollet se bloque net sur un sprint. Il reste un dernier changement, et le sélectionneur hésite en vous regardant boiter vers la ligne de touche.",
        "options": [
          {
            "id": "leave",
            "label": "Sortir et laisser la place à des jambes fraîches",
            "hint": "Lucide",
            "base": 0.7,
            "repWin": 1,
            "winText": "Depuis le banc, une poche de glace sur le mollet, vous voyez votre remplaçant faire la différence. Champion du monde sans avoir fini la finale — mais champion, et sans le moindre regret."
          },
          {
            "id": "stay",
            "label": "Rester et jouer en pivot dans la surface",
            "hint": "Courage",
            "base": 0.5,
            "repWin": 6,
            "repFail": -3,
            "traitWin": "leader"
          },
          {
            "id": "treat",
            "label": "Se faire soigner et tenir jusqu'aux tirs au but",
            "hint": "Malin",
            "base": 0.6,
            "repWin": 3
          },
          {
            "id": "sprint",
            "label": "Ignorer la douleur et repartir au pressing",
            "hint": "Fou",
            "base": 0.42,
            "repWin": 8,
            "repFail": -5
          }
        ],
        "winText": "Le corps tient, l'esprit plus encore : votre nation arrache la Coupe du Monde, et la photo de vous, boitant vers les tribunes en liesse, fera le tour de la planète.",
        "failText": "La jambe lâche au pire moment, et la défaite tombe. On se demandera longtemps si vous auriez dû rester — ou sortir."
      },
      {
        "title": "FINALE DE LA COUPE DU MONDE",
        "text": "90e+5, 0-1. Dernière action de la finale : coup franc à vingt-deux mètres, plein axe. Le mur est immense, leur gardien a tout arrêté ce soir. Le ballon est à vous.",
        "options": [
          {
            "id": "curl",
            "label": "Enrouler par-dessus le mur, lucarne opposée",
            "base": 0.5,
            "repWin": 6,
            "repFail": -2
          },
          {
            "id": "under",
            "label": "Frapper sous le mur qui saute",
            "hint": "Malin",
            "base": 0.46,
            "repWin": 7,
            "repFail": -3,
            "traitWin": "genius"
          },
          {
            "id": "power",
            "label": "Une frappe sèche, tendue, pleine puissance",
            "hint": "Quitte ou double",
            "base": 0.44,
            "repWin": 7,
            "repFail": -3
          },
          {
            "id": "cross",
            "label": "Centrer au second poteau pour la tête du défenseur monté",
            "hint": "Collectif",
            "base": 0.62,
            "repWin": 3
          }
        ],
        "winText": "LE BUT DE LA DERNIÈRE SECONDE ! Votre nation égalise au bout du temps additionnel, puis l'emporte en prolongation, portée par votre coup de génie.",
        "failText": "Le ballon s'écrase sur le mur, le coup de sifflet final retentit. À genoux sur la pelouse, vous regardez les autres soulever la coupe."
      }
    ],
    "mil": [
      {
        "title": "FINALE DE LA COUPE DU MONDE",
        "text": "L'hymne retentit et votre gorge se noue : le grand-père qui vous a appris le football n'est plus là pour voir ça. Les larmes montent, et dans trente secondes, c'est vous qui toucherez le premier ballon de la finale.",
        "options": [
          {
            "id": "sing",
            "label": "Laisser couler les larmes et chanter à pleins poumons",
            "hint": "Sincère",
            "base": 0.6,
            "repWin": 4
          },
          {
            "id": "void",
            "label": "Fermer les yeux et faire le vide",
            "hint": "Zen",
            "base": 0.68,
            "repWin": 1,
            "traitWin": "zen"
          },
          {
            "id": "cry",
            "label": "Serrer vos coéquipiers et lancer le cri de guerre",
            "hint": "Leader",
            "base": 0.54,
            "repWin": 5,
            "repFail": -2,
            "traitWin": "leader"
          },
          {
            "id": "kickoff",
            "label": "Tenter la frappe directe depuis le rond central",
            "hint": "Folie",
            "base": 0.38,
            "repWin": 12,
            "repFail": -5,
            "traitWin": "showman"
          }
        ],
        "winText": "L'émotion devient carburant : vous dominez l'entrejeu de la première à la dernière minute, et votre nation est championne du monde. Là-haut, quelqu'un a sûrement vu ça.",
        "failText": "Le nœud dans la gorge ne se défait jamais : vous jouez une finale à côté de vous-même, et votre nation s'incline sans que vous ayez pesé."
      },
      {
        "title": "FINALE DE LA COUPE DU MONDE",
        "text": "Le sélectionneur vous a confié un marquage individuel sur le meneur adverse, meilleur joueur du tournoi. 55e minute, 0-0 : il commence à vous échapper, et chacune de ses touches fait lever le stade.",
        "options": [
          {
            "id": "stick",
            "label": "Le coller jusqu'au bout, quitte à disparaître en attaque",
            "hint": "Discipliné",
            "base": 0.66,
            "repWin": 2
          },
          {
            "id": "foul",
            "label": "Le faire tomber dès son prochain contrôle pour marquer le territoire",
            "hint": "Rugueux",
            "base": 0.52,
            "repWin": 3,
            "repFail": -4
          },
          {
            "id": "talk",
            "label": "Lui parler, l'agacer, le sortir de son match",
            "hint": "Vicieux",
            "base": 0.5,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "release",
            "label": "Lâcher le marquage et l'obliger à défendre sur vous",
            "hint": "Audace",
            "base": 0.44,
            "repWin": 8,
            "repFail": -5,
            "traitWin": "genius"
          }
        ],
        "winText": "Le meilleur joueur du tournoi n'a plus touché un ballon utile : la Coupe du Monde est à votre nation, et les spécialistes parlent du match parfait d'un milieu de l'ombre.",
        "failText": "Il trouve enfin l'espace qu'il cherchait, et sa passe tue la finale. Votre nation perd la Coupe du Monde sur le seul ballon que vous lui avez laissé."
      }
    ],
    "def": [
      {
        "title": "FINALE DE LA COUPE DU MONDE",
        "text": "108e minute, 1-1. Vous êtes averti depuis la 40e, et leur ailier le plus rapide vient d'entrer, tout frais, dans votre couloir. Il vous fixe et accélère.",
        "options": [
          {
            "id": "show",
            "label": "Reculer et l'orienter vers l'extérieur",
            "hint": "Prudent",
            "base": 0.64,
            "repWin": 2
          },
          {
            "id": "contact",
            "label": "Rester au contact, sans jamais mettre le pied",
            "base": 0.54,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "tackle",
            "label": "Tacler au moment exact, quitte à voir rouge",
            "hint": "Quitte ou double",
            "base": 0.44,
            "repWin": 7,
            "repFail": -6,
            "traitWin": "clutch"
          },
          {
            "id": "double",
            "label": "Appeler le milieu pour le prendre à deux",
            "hint": "Collectif",
            "base": 0.6,
            "repWin": 3
          }
        ],
        "winText": "Il n'est jamais passé. Pas une fois. Votre nation gagne la Coupe du Monde aux tirs au but, et vous l'avez gagnée, vous, dans votre couloir.",
        "failText": "Il vous efface d'un crochet et centre en retrait : but. Ce carton jaune vous aura lié les jambes jusqu'au bout de la finale."
      },
      {
        "title": "FINALE DE LA COUPE DU MONDE",
        "text": "Leur capitaine vous a cassé le nez d'un coup de coude à la 30e, sans carton. 75e minute, 0-0 : le sang a séché, et il vient se placer contre vous sur un coup franc, un sourire en coin.",
        "options": [
          {
            "id": "cool",
            "label": "Garder la tête froide et ne jouer que le ballon",
            "hint": "Zen",
            "base": 0.68,
            "repWin": 2,
            "traitWin": "zen"
          },
          {
            "id": "payback",
            "label": "Lui rendre la monnaie, discrètement",
            "hint": "Vengeance",
            "base": 0.46,
            "repWin": 3,
            "repFail": -6
          },
          {
            "id": "whisper",
            "label": "Lui parler à l'oreille jusqu'à ce qu'il craque",
            "hint": "Vicieux",
            "base": 0.52,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "header",
            "label": "Le battre là où ça fait mal : chaque duel de la tête",
            "hint": "Fierté",
            "base": 0.5,
            "repWin": 6,
            "repFail": -3
          }
        ],
        "winText": "Vous le dominez sur chaque duel jusqu'au coup de sifflet final : votre nation est championne du monde, et votre nez cassé devient le symbole d'une équipe qui n'a rien lâché.",
        "failText": "Il a obtenu ce qu'il voulait : vous sortir de votre match. Une seconde d'inattention, leur but tombe, et la Coupe du Monde s'en va avec lui."
      }
    ],
    "gk": [
      {
        "title": "FINALE DE LA COUPE DU MONDE",
        "text": "Le déluge s'abat sur le stade depuis la mi-temps. 85e minute, 1-0 pour votre nation : leur milieu arme de trente mètres, et le ballon fuse sur la pelouse détrempée en rebonds imprévisibles.",
        "options": [
          {
            "id": "parry",
            "label": "Repousser sur le côté, loin des attaquants",
            "hint": "Sûr",
            "base": 0.66,
            "repWin": 2
          },
          {
            "id": "hold",
            "label": "Bloquer à deux mains, coûte que coûte",
            "hint": "Autorité",
            "base": 0.5,
            "repWin": 5,
            "repFail": -4
          },
          {
            "id": "smother",
            "label": "Plonger en avant pour étouffer le rebond",
            "base": 0.56,
            "repWin": 3,
            "repFail": -2
          },
          {
            "id": "foot",
            "label": "Parade réflexe du pied",
            "hint": "Instinct",
            "base": 0.44,
            "repWin": 7,
            "repFail": -3,
            "traitWin": "clutch"
          }
        ],
        "winText": "Le ballon glisse, rebondit, accélère… et meurt dans vos gants. Dix minutes plus tard, votre nation est championne du monde, et personne n'oubliera l'arrêt sous le déluge.",
        "failText": "Le rebond traître vous trompe, le ballon file sous votre corps. Égalisation, prolongation, défaite : on reparlera longtemps de cette flaque."
      },
      {
        "title": "FINALE DE LA COUPE DU MONDE",
        "text": "119e minute, 1-1. Le gardien remplaçant, un spécialiste des tirs au but, s'échauffe derrière le banc. Le sélectionneur vous regarde : un signe de votre part, et il le fait entrer pour la séance.",
        "options": [
          {
            "id": "yield",
            "label": "Accepter et céder votre place pour l'équipe",
            "hint": "Collectif",
            "base": 0.66,
            "repWin": 2,
            "winText": "Depuis le banc, vous voyez votre remplaçant arrêter le tir décisif, et vous êtes le premier à lui sauter dans les bras. Champion du monde, et fier de ce choix."
          },
          {
            "id": "refuse",
            "label": "Refuser d'un geste : cette finale, vous la finirez",
            "hint": "Fierté",
            "base": 0.5,
            "repWin": 7,
            "repFail": -5,
            "traitWin": "leader"
          },
          {
            "id": "notes",
            "label": "Rester, et demander ses notes sur les tireurs adverses",
            "hint": "Malin",
            "base": 0.58,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "promise",
            "label": "Rester, et promettre au banc d'arrêter deux tirs",
            "hint": "Culotté",
            "base": 0.42,
            "repWin": 10,
            "repFail": -6,
            "traitWin": "showman"
          }
        ],
        "winText": "Le choix était le bon : la séance tourne en votre faveur, et votre nation soulève la Coupe du Monde. Ceux qui doutaient se sont tus.",
        "failText": "La séance vous échappe, et avec elle la Coupe du Monde. On disséquera longtemps ce dernier choix, minute par minute."
      }
    ]
  },
  "derby": {
    "att": [
      {
        "title": "LE DERBY",
        "text": "Depuis l'échauffement, le virage adverse vous a choisi pour cible : chants, banderole à votre nom, sifflets à chaque contrôle. 65e minute, 0-0, le ballon arrive enfin pour vous dans la surface, juste devant eux.",
        "options": [
          {
            "id": "calm",
            "label": "Placer du plat, sans un regard pour le virage",
            "hint": "Froid",
            "base": 0.62,
            "repWin": 2,
            "traitWin": "zen"
          },
          {
            "id": "drive",
            "label": "Croiser en force sous leurs yeux",
            "base": 0.5,
            "repWin": 5,
            "repFail": -3
          },
          {
            "id": "square",
            "label": "Remiser pour l'attaquant mieux placé",
            "hint": "Collectif",
            "base": 0.66,
            "repWin": 1
          },
          {
            "id": "top",
            "label": "Viser la lucarne pour les faire taire",
            "hint": "Provoc",
            "base": 0.42,
            "repWin": 9,
            "repFail": -5,
            "traitWin": "showman"
          }
        ],
        "winText": "BUT ! Et puis le silence. Ce silence-là, devant un virage soudain muet, vous vous en souviendrez toute votre vie. Le derby est à vous.",
        "failText": "Raté, et le virage adverse exulte comme s'il avait marqué. Ils vous chanteront ça jusqu'au prochain derby."
      },
      {
        "title": "LE DERBY",
        "text": "Leur défenseur central était votre colocataire au centre de formation : il connaît chacune de vos feintes, et il vous l'a rappelé dans le tunnel, hilare. 80e minute, 1-1, vous voilà face à lui, ballon au pied.",
        "options": [
          {
            "id": "new",
            "label": "Sortir la feinte qu'il ne vous a jamais vue faire",
            "hint": "Inédit",
            "base": 0.46,
            "repWin": 6,
            "repFail": -3,
            "traitWin": "genius"
          },
          {
            "id": "fav",
            "label": "Votre crochet favori, plus vite que jamais",
            "base": 0.52,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "onetwo",
            "label": "Jouer en une touche et filer dans son dos",
            "base": 0.58,
            "repWin": 3
          },
          {
            "id": "simple",
            "label": "Décaler simplement le latéral qui monte",
            "hint": "Sûr",
            "base": 0.66,
            "repWin": 1
          }
        ],
        "winText": "Lui au sol, vous au fond des filets. Vous l'aiderez à se relever… après la célébration. Le derby est à vous.",
        "failText": "Il avait tout lu, comme à l'époque. Ballon récupéré, contre, but : il vous fait un clin d'œil en remontant le terrain."
      },
      {
        "title": "LE DERBY",
        "text": "Fumigènes et pétards : l'arbitre interrompt le derby à la 74e, 1-1. Vingt minutes au vestiaire, puis le jeu reprend dans une fumée qui traîne encore. Vous avez les jambes raides, et la première occasion est pour vous.",
        "options": [
          {
            "id": "quick",
            "label": "Frapper tout de suite, avant que le gardien ne voie le ballon",
            "hint": "Opportuniste",
            "base": 0.48,
            "repWin": 5,
            "repFail": -2
          },
          {
            "id": "control",
            "label": "Contrôler et prendre le temps de retrouver vos sensations",
            "base": 0.64,
            "repWin": 2
          },
          {
            "id": "smoke",
            "label": "L'enroulé, en comptant sur la fumée pour cacher la trajectoire",
            "hint": "Culotté",
            "base": 0.42,
            "repWin": 7,
            "repFail": -3
          },
          {
            "id": "contact",
            "label": "Provoquer le contact pour obtenir le penalty",
            "hint": "Malin",
            "base": 0.52,
            "repWin": 3,
            "repFail": -4
          }
        ],
        "winText": "Le stade encore enfumé explose : votre but met fin à la soirée la plus folle de la saison. Le derby est à vous.",
        "failText": "Les jambes froides n'ont pas suivi. L'occasion passe, le derby aussi, dans une fumée qui sent la défaite."
      }
    ],
    "mil": [
      {
        "title": "LE DERBY",
        "text": "Leur capitaine vous insulte et vous marche sur les pieds depuis une heure ; vous avez déjà pris un jaune pour une réaction. 70e minute, 1-1 : il vous bouscule encore, et l'arbitre n'a rien vu.",
        "options": [
          {
            "id": "ignore",
            "label": "L'ignorer et jouer : la meilleure réponse, c'est le ballon",
            "hint": "Zen",
            "base": 0.66,
            "repWin": 2,
            "traitWin": "zen"
          },
          {
            "id": "nutmeg",
            "label": "Lui répondre par un petit pont humiliant",
            "hint": "Panache",
            "base": 0.44,
            "repWin": 8,
            "repFail": -4,
            "traitWin": "showman"
          },
          {
            "id": "ref",
            "label": "Alerter l'arbitre, calmement, pour le faire avertir",
            "hint": "Malin",
            "base": 0.58,
            "repWin": 2
          },
          {
            "id": "shove",
            "label": "Lui rendre la charge, dans les règles… ou presque",
            "hint": "Rugueux",
            "base": 0.46,
            "repWin": 4,
            "repFail": -6
          }
        ],
        "winText": "C'est lui qui craque le premier : second jaune, il sort, et vous dictez la fin du derby jusqu'à la victoire. Le sang-froid a gagné.",
        "failText": "Il a réussi son coup : vous perdez le fil, la perte de balle de trop arrive, et le derby bascule. La ville n'a qu'un nom à la bouche, et c'est le vôtre."
      },
      {
        "title": "LE DERBY",
        "text": "Corner pour vous à la 85e, 0-0, juste devant le virage adverse. Briquets et gobelets pleuvent autour du poteau de corner ; l'arbitre vous fait signe de le tirer quand même.",
        "options": [
          {
            "id": "near",
            "label": "Tirer vite, rentrant, au premier poteau",
            "base": 0.54,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "short",
            "label": "Le jouer court pour quitter la zone de tir",
            "hint": "Prudent",
            "base": 0.66,
            "repWin": 1
          },
          {
            "id": "smile",
            "label": "Prendre votre temps, sourire au virage, puis brosser au second poteau",
            "hint": "Provoc",
            "base": 0.44,
            "repWin": 8,
            "repFail": -4,
            "traitWin": "showman"
          },
          {
            "id": "olympic",
            "label": "Viser le but direct, à la rentrée",
            "hint": "Folie",
            "base": 0.38,
            "repWin": 11,
            "repFail": -3
          }
        ],
        "winText": "Le ballon trouve la bonne tête : BUT ! Vous célébrez à deux mètres d'un virage furieux, sous une pluie de gobelets. Le derby est à vous.",
        "failText": "Le corner meurt dans les gants du gardien, et le contre adverse est foudroyant. Le virage vous salue, ironique, jusqu'au coup de sifflet."
      },
      {
        "title": "LE DERBY",
        "text": "Deuxième minute du derby. La tradition veut que le premier duel donne le ton du match : leur milieu arrive vers vous, ballon au pied, et tout le stade retient son souffle.",
        "options": [
          {
            "id": "crunch",
            "label": "Le tacle appuyé, réglementaire, qui fait trembler le virage",
            "hint": "Guerrier",
            "base": 0.52,
            "repWin": 5,
            "repFail": -3
          },
          {
            "id": "harass",
            "label": "Le harceler sans faute et gagner le duel à l'usure",
            "hint": "Patient",
            "base": 0.64,
            "repWin": 2
          },
          {
            "id": "dribble",
            "label": "Lui prendre le ballon et le dribbler dans la foulée",
            "hint": "Panache",
            "base": 0.44,
            "repWin": 7,
            "repFail": -3,
            "traitWin": "showman"
          },
          {
            "id": "trap",
            "label": "Appeler deux coéquipiers et l'étouffer",
            "hint": "Collectif",
            "base": 0.6,
            "repWin": 2,
            "traitWin": "leader"
          }
        ],
        "winText": "Le premier duel est pour vous, et tout le derby suit le même chemin : votre équipe l'emporte, avec votre rage pour carburant.",
        "failText": "Premier duel perdu, et le ton est donné… pour eux. Votre équipe court après le score tout le derby, et finit par le perdre."
      }
    ],
    "def": [
      {
        "title": "LE DERBY",
        "text": "Leur avant-centre, votre meilleur ami chez les jeunes, vous a promis un but en conférence de presse. 75e minute, 1-1 : il reçoit dos au but dans votre surface, et vous êtes collé à lui.",
        "options": [
          {
            "id": "tight",
            "label": "Le coller et l'empêcher de se retourner",
            "hint": "Sûr",
            "base": 0.64,
            "repWin": 2
          },
          {
            "id": "intercept",
            "label": "Anticiper la remise et couper la trajectoire",
            "hint": "Lecture",
            "base": 0.5,
            "repWin": 5,
            "repFail": -3
          },
          {
            "id": "chirp",
            "label": "Le chambrer pour le déconcentrer",
            "hint": "Vicieux",
            "base": 0.52,
            "repWin": 3,
            "repFail": -2
          },
          {
            "id": "bait",
            "label": "Le laisser se retourner pour contrer sa frappe",
            "hint": "Culotté",
            "base": 0.42,
            "repWin": 8,
            "repFail": -4,
            "traitWin": "genius"
          }
        ],
        "winText": "Pas de but pour lui ce soir : vous avez tenu votre promesse à vous, celle de l'en empêcher. Le derby est à vous, et c'est lui qui paiera le dîner.",
        "failText": "Il tient sa promesse, sous vos yeux. Le derby est perdu, et sa conférence de presse d'après-match sera insupportable."
      },
      {
        "title": "LE DERBY",
        "text": "Jets d'objets : l'arbitre arrête le derby à la 80e, 1-0 pour vous. À la reprise, un quart d'heure plus tard, l'adversaire jette toutes ses forces dans votre surface, et votre défense est froide, désorganisée.",
        "options": [
          {
            "id": "lead",
            "label": "Rassembler la ligne et la faire monter de dix mètres",
            "hint": "Leader",
            "base": 0.52,
            "repWin": 5,
            "repFail": -3,
            "traitWin": "leader"
          },
          {
            "id": "deep",
            "label": "Reculer dans la surface et tout dégager",
            "hint": "Prudent",
            "base": 0.66,
            "repWin": 1
          },
          {
            "id": "stall",
            "label": "Contester chaque décision pour casser leur élan",
            "hint": "Cynique",
            "base": 0.48,
            "repWin": 3,
            "repFail": -4
          },
          {
            "id": "keep",
            "label": "Relancer court pour leur confisquer le ballon",
            "hint": "Audace",
            "base": 0.44,
            "repWin": 7,
            "repFail": -3
          }
        ],
        "winText": "Votre défense tient la tempête. Coup de sifflet final : le derby interrompu est à vous, et personne ne vous l'enlèvera.",
        "failText": "L'interruption leur a profité : égalisation dans la confusion, puis le coup de grâce. Un derby qu'il fallait simplement finir…"
      },
      {
        "title": "LE DERBY",
        "text": "Le virage a craqué des dizaines de fumigènes, et une fumée rouge retombe sur votre surface. 88e minute, 1-1 : un centre adverse surgit du brouillard, vous ne le voyez qu'au dernier moment.",
        "options": [
          {
            "id": "head",
            "label": "Dégager de la tête, n'importe où",
            "hint": "Sûr",
            "base": 0.64,
            "repWin": 2
          },
          {
            "id": "chest",
            "label": "Amortir de la poitrine et relancer proprement",
            "hint": "Classe",
            "base": 0.44,
            "repWin": 7,
            "repFail": -4,
            "traitWin": "zen"
          },
          {
            "id": "post",
            "label": "Couvrir le premier poteau à l'instinct",
            "hint": "Instinct",
            "base": 0.5,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "call",
            "label": "Crier au gardien de sortir et le protéger",
            "hint": "Collectif",
            "base": 0.58,
            "repWin": 3
          }
        ],
        "winText": "Vous jaillissez de la fumée et le ballon est dégagé : le centre fait chou blanc, et votre équipe arrache le derby dans la foulée.",
        "failText": "Le ballon sort du brouillard une seconde trop tard pour vous. Leur tête au fond… le derby se perd dans la fumée."
      }
    ],
    "gk": [
      {
        "title": "LE DERBY",
        "text": "Derrière votre but, le virage adverse vous bombarde d'insultes depuis le coup d'envoi. À la 60e, un briquet vous frôle la tempe. L'arbitre s'approche et vous demande si vous voulez continuer.",
        "options": [
          {
            "id": "continue",
            "label": "Continuer sans broncher, dos au virage",
            "hint": "Zen",
            "base": 0.66,
            "repWin": 2,
            "traitWin": "zen"
          },
          {
            "id": "stop",
            "label": "Exiger une pause le temps de calmer la tribune",
            "hint": "Ferme",
            "base": 0.6,
            "repWin": 3
          },
          {
            "id": "shush",
            "label": "Leur répondre d'un doigt sur la bouche",
            "hint": "Provoc",
            "base": 0.44,
            "repWin": 7,
            "repFail": -5,
            "traitWin": "showman"
          },
          {
            "id": "camera",
            "label": "Ramasser le briquet et le tendre à l'arbitre devant les caméras",
            "hint": "Malin",
            "base": 0.52,
            "repWin": 4,
            "repFail": -2
          }
        ],
        "winText": "Plus rien ne passe : vous arrêtez tout pendant la dernière demi-heure, et le derby se termine dans vos gants, face à un virage réduit au silence.",
        "failText": "Vous avez perdu le fil : une frappe anodine vous échappe quelques minutes plus tard. Le virage, lui, savait exactement ce qu'il faisait."
      },
      {
        "title": "LE DERBY",
        "text": "Leur attaquant a partagé vos entraînements pendant trois saisons : il sait que vous plongez toujours tôt. 85e minute, 1-1, il part seul au but et vous regarde déjà dans les yeux.",
        "options": [
          {
            "id": "stand",
            "label": "Rester debout jusqu'au bout, contre votre nature",
            "hint": "Patient",
            "base": 0.54,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "earlydive",
            "label": "Plonger tôt quand même, en pariant sur le double bluff",
            "hint": "Bluff",
            "base": 0.44,
            "repWin": 7,
            "repFail": -4,
            "traitWin": "genius"
          },
          {
            "id": "rush",
            "label": "Sortir loin pour lui fermer l'angle avant qu'il réfléchisse",
            "hint": "Agressif",
            "base": 0.58,
            "repWin": 3
          },
          {
            "id": "retreat",
            "label": "Reculer et laisser votre défenseur revenir",
            "hint": "Prudent",
            "base": 0.64,
            "repWin": 1
          }
        ],
        "winText": "Il avait tout prévu… sauf ça. ARRÊT ! Il se prend la tête à deux mains : ce derby, vous l'avez gagné à la mémoire.",
        "failText": "Il vous connaît par cœur, et le prouve. But. En remontant, il vous tapote l'épaule : le geste le plus douloureux de la soirée."
      },
      {
        "title": "LE DERBY",
        "text": "90e+3, vous menez 1-0. Chaque dégagement déclenche une bronca, et l'arbitre vous a déjà averti pour perte de temps. Le ballon est dans vos mains, leur bloc presse haut.",
        "options": [
          {
            "id": "short",
            "label": "Relancer court vers votre défenseur, sous pression",
            "hint": "Audace",
            "base": 0.46,
            "repWin": 6,
            "repFail": -5
          },
          {
            "id": "long",
            "label": "Dégagement long, au fond du camp adverse",
            "hint": "Sûr",
            "base": 0.68,
            "repWin": 1
          },
          {
            "id": "throw",
            "label": "Relance rapide à la main pour lancer le contre",
            "base": 0.5,
            "repWin": 5,
            "repFail": -2
          },
          {
            "id": "hold",
            "label": "Garder encore quelques secondes, quitte à prendre un second jaune",
            "hint": "Cynique",
            "base": 0.56,
            "repWin": 2,
            "repFail": -4
          }
        ],
        "winText": "Coup de sifflet final ! Vous avez géré les dernières secondes comme un vieux briscard, et le derby est à vous.",
        "failText": "Le ballon est récupéré dans votre camp, le centre tombe, et l'égalisation tue la fête. Le derby vous file entre les doigts dans le temps additionnel."
      }
    ]
  },
  "relegation_playoff": {
    "field": [
      {
        "title": "BARRAGE DE MAINTIEN",
        "text": "Battu 2-0 à l'aller, {club} mène 1-0 au retour à la 70e minute. Il manque un but pour forcer la prolongation, et le ballon vous arrive dos au but, à l'entrée de la surface, avec un défenseur collé à vos reins.",
        "options": [
          {
            "id": "lay",
            "label": "Remiser en une touche pour le milieu qui arrive lancé",
            "hint": "Collectif",
            "base": 0.62,
            "repWin": 2
          },
          {
            "id": "turn",
            "label": "Pivoter sur le défenseur et frapper dans la foulée",
            "hint": "Risqué",
            "base": 0.46,
            "repWin": 6,
            "repFail": -3
          },
          {
            "id": "foul",
            "label": "Chercher le contact pour obtenir le coup franc",
            "hint": "Malin",
            "base": 0.56,
            "repWin": 3,
            "repFail": -1
          },
          {
            "id": "back",
            "label": "Talonnade aveugle vers l'appel de l'ailier",
            "hint": "Culotté",
            "base": 0.4,
            "repWin": 8,
            "repFail": -4,
            "traitWin": "showman"
          }
        ],
        "winText": "Le deuxième but tombe, le stade rugit, et {club} renverse le barrage dans la prolongation. Le maintien est arraché, et c'est vous qui avez rallumé la mèche.",
        "failText": "L'action s'éteint, puis le match avec elle. {club} a remonté la moitié du chemin, jamais l'autre : c'est la descente."
      },
      {
        "title": "BARRAGE DE MAINTIEN",
        "text": "Barrage retour, 0-0 à la demi-heure, et votre propre public siffle chaque passe en retrait. Une banderole « Mouillez le maillot ou partez » barre la tribune principale. Vous récupérez le ballon au milieu, et vous sentez les tribunes attendre quelque chose.",
        "options": [
          {
            "id": "calm",
            "label": "Faire tourner calmement, sans écouter les sifflets",
            "hint": "Sang-froid",
            "base": 0.64,
            "repWin": 2,
            "traitWin": "zen"
          },
          {
            "id": "run",
            "label": "Traverser le terrain balle au pied pour réveiller le stade",
            "hint": "Patron",
            "base": 0.5,
            "repWin": 5,
            "repFail": -2
          },
          {
            "id": "long",
            "label": "Tenter la frappe de quarante mètres sur le gardien avancé",
            "hint": "Folie",
            "base": 0.38,
            "repWin": 10,
            "repFail": -6
          },
          {
            "id": "wing",
            "label": "Écarter vite sur l'aile et attaquer la surface",
            "hint": "Collectif",
            "base": 0.56,
            "repWin": 3
          }
        ],
        "winText": "Les sifflets se changent en chant. {club} prend le match par le col, marque deux fois avant l'heure de jeu et sauve sa place devant un public réconcilié.",
        "failText": "Le ballon est perdu, le contre file, et les sifflets deviennent une clameur. {club} ne s'en remet pas : la descente se vit sous les huées."
      },
      {
        "title": "BARRAGE DE MAINTIEN",
        "text": "116e minute de la prolongation, 1-1 au cumulé. Vos mollets brûlent, deux coéquipiers sont déjà au sol avec des crampes. Un dégagement adverse retombe dans le rond central : vous êtes le seul à pouvoir partir en contre.",
        "options": [
          {
            "id": "hold",
            "label": "Garder le ballon dans le coin et viser les tirs au but",
            "hint": "Prudent",
            "base": 0.6,
            "repWin": 1
          },
          {
            "id": "go",
            "label": "Partir seul, puiser dans ce qu'il vous reste",
            "hint": "Courage",
            "base": 0.46,
            "repWin": 7,
            "repFail": -3,
            "traitWin": "clutch"
          },
          {
            "id": "wait",
            "label": "Ralentir et attendre que le bloc remonte",
            "hint": "Collectif",
            "base": 0.54,
            "repWin": 3
          },
          {
            "id": "chip",
            "label": "Tenter le lob de quarante mètres au premier contrôle",
            "hint": "Folie",
            "base": 0.38,
            "repWin": 10,
            "repFail": -5,
            "traitWin": "showman"
          }
        ],
        "winText": "Vous trouvez des forces que vous ne vous connaissiez pas. Le ballon finit au fond, vous vous effondrez sur la pelouse : {club} reste dans la division, et vous ne sentez plus vos jambes.",
        "failText": "Le corps refuse le dernier effort. Le ballon vous échappe, le temps file, et {club} perd tout ce qu'il lui restait : la descente tombe au bout de la nuit."
      }
    ],
    "gk": [
      {
        "title": "BARRAGE DE MAINTIEN",
        "text": "{club} a ramené un précieux but de chez eux, et ce but suffit encore à la 82e minute. Une passe en retrait trop courte de votre défenseur central : leur attaquant surgit, seul face à vous, à quatorze mètres.",
        "options": [
          {
            "id": "big",
            "label": "Rester debout le plus longtemps possible et faire le grand",
            "hint": "Métier",
            "base": 0.6,
            "repWin": 3
          },
          {
            "id": "dive",
            "label": "Plonger dans ses pieds avant qu'il n'arme",
            "hint": "Courage",
            "base": 0.5,
            "repWin": 5,
            "repFail": -3
          },
          {
            "id": "bait",
            "label": "Ouvrir volontairement le premier poteau pour l'y attirer",
            "hint": "Culotté",
            "base": 0.42,
            "repWin": 8,
            "repFail": -4,
            "traitWin": "genius"
          },
          {
            "id": "shout",
            "label": "Hurler sur votre défenseur pour qu'il revienne gêner la frappe",
            "hint": "Collectif",
            "base": 0.54,
            "repWin": 2,
            "repFail": -1
          }
        ],
        "winText": "Le ballon s'écrase sur votre corps et file en corner. Le stade respire de nouveau : {club} tient son but d'avance jusqu'au bout et reste dans la division.",
        "failText": "Il ne tremble pas. Le ballon se loge au fond, le but à l'extérieur ne vaut plus rien, et {club} glisse vers la division inférieure."
      },
      {
        "title": "BARRAGE DE MAINTIEN",
        "text": "Un déluge s'abat sur le barrage, la pelouse est une piscine et chaque ballon fuse en touchant le sol. 0-0, il reste un quart d'heure, et leur milieu arme une frappe lointaine qui va rebondir juste devant vous.",
        "options": [
          {
            "id": "parry",
            "label": "Repousser sur le côté, loin des attaquants",
            "hint": "Sûr",
            "base": 0.66,
            "repWin": 1
          },
          {
            "id": "catch",
            "label": "Tenter de la capter malgré le rebond",
            "hint": "Risqué",
            "base": 0.48,
            "repWin": 5,
            "repFail": -3
          },
          {
            "id": "body",
            "label": "Se coucher derrière le ballon, tout le corps en barrage",
            "hint": "Métier",
            "base": 0.56,
            "repWin": 3
          },
          {
            "id": "punch",
            "label": "Avancer et boxer le ballon avant qu'il ne touche le sol",
            "hint": "Culotté",
            "base": 0.4,
            "repWin": 8,
            "repFail": -5
          }
        ],
        "winText": "Le ballon gicle, vous l'étouffez à la seconde tentative. Dans la boue jusqu'aux coudes, vous tenez le zéro, et {club} arrache son maintien au bout d'une soirée noyée.",
        "failText": "Le rebond trompe tout le monde, vous le premier. Le ballon passe sous votre corps et {club} descend sur un but que personne n'oubliera."
      },
      {
        "title": "BARRAGE DE MAINTIEN",
        "text": "120e minute, {club} mène d'un but au cumulé. Dernier corner pour eux : leur gardien est monté, leurs deux colosses se battent avec vos défenseurs dans les six mètres. Le ballon part, brossé vers votre point de penalty.",
        "options": [
          {
            "id": "line",
            "label": "Rester sur votre ligne et faire confiance à vos défenseurs",
            "hint": "Prudent",
            "base": 0.58,
            "repWin": 1
          },
          {
            "id": "claim",
            "label": "Sortir dans le paquet et capter le ballon au plus haut",
            "hint": "Patron",
            "base": 0.5,
            "repWin": 6,
            "repFail": -4,
            "traitWin": "leader"
          },
          {
            "id": "punch",
            "label": "Boxer loin, quitte à prendre un coup",
            "hint": "Courage",
            "base": 0.56,
            "repWin": 3
          },
          {
            "id": "shout",
            "label": "Hurler pour réorganiser le marquage avant le centre",
            "hint": "Malin",
            "base": 0.62,
            "repWin": 2,
            "repFail": -1
          }
        ],
        "winText": "Le ballon est dégagé, l'arbitre siffle dans la foulée. Vous tombez à genoux dans votre surface : {club} est sauvé, et c'est le dernier ballon de la saison qui a scellé son sort.",
        "failText": "Une tête, un seul contact, et le ballon passe hors de portée. Tirs au but dans la foulée, perdus : {club} descend après avoir tenu cent dix-neuf minutes."
      }
    ]
  },
  "nat_playoff": {
    "field": [
      {
        "title": "BARRAGE DE QUALIFICATION",
        "text": "Battue 1-0 à l'aller, la sélection est tenue en échec à domicile à la 75e. Tout un pays s'impatiente dans les tribunes. Un centre trop long revient vers vous au point de penalty, sur votre mauvais pied.",
        "options": [
          {
            "id": "weak",
            "label": "Frapper du mauvais pied, en pleine confiance",
            "hint": "Culotté",
            "base": 0.44,
            "repWin": 7,
            "repFail": -3
          },
          {
            "id": "control",
            "label": "Contrôler pour remettre le ballon sur le bon pied",
            "base": 0.52,
            "repWin": 4,
            "repFail": -1
          },
          {
            "id": "cut",
            "label": "Remettre en retrait pour la frappe du capitaine",
            "hint": "Collectif",
            "base": 0.58,
            "repWin": 2
          },
          {
            "id": "bike",
            "label": "Se jeter dans un retourné acrobatique",
            "hint": "Folie",
            "base": 0.38,
            "repWin": 11,
            "repFail": -6,
            "traitWin": "showman"
          }
        ],
        "winText": "Le but égalisateur rallume le stade, et le second tombe dans le temps additionnel. Le pays entier se met à chanter : la sélection ira au grand tournoi.",
        "failText": "Le ballon s'envole dans la tribune, et le stade gronde. La sélection ne trouvera jamais la faille : le tournoi se jouera sans elle."
      },
      {
        "title": "BARRAGE DE QUALIFICATION",
        "text": "Match retour sur une pelouse bosselée, devant un public qui vise vos yeux au laser depuis le coup d'envoi. 0-0 au cumulé à la 80e : coup franc à vingt-deux mètres, et l'arbitre a déjà dû interrompre le jeu deux fois à cause des projectiles.",
        "options": [
          {
            "id": "wait",
            "label": "Attendre que l'arbitre fasse cesser les lasers avant de tirer",
            "hint": "Sang-froid",
            "base": 0.56,
            "repWin": 3,
            "traitWin": "zen"
          },
          {
            "id": "low",
            "label": "Frapper à ras de terre sous le mur qui saute",
            "hint": "Malin",
            "base": 0.48,
            "repWin": 6,
            "repFail": -2
          },
          {
            "id": "cross",
            "label": "Centrer pour la tête de votre défenseur central",
            "hint": "Collectif",
            "base": 0.6,
            "repWin": 2
          },
          {
            "id": "top",
            "label": "Tout envoyer en pleine lucarne",
            "hint": "Panache",
            "base": 0.4,
            "repWin": 9,
            "repFail": -4
          }
        ],
        "winText": "Le ballon gonfle les filets et un silence glacé tombe sur le stade. Ce but à l'extérieur suffit : vos coéquipiers s'agrippent à vous, la sélection décroche son billet en terre hostile.",
        "failText": "Le mur renvoie le ballon, le contre file dans votre dos, et le stade explose. La sélection rentre au pays sans billet, et avec des bleus partout."
      },
      {
        "title": "BARRAGE DE QUALIFICATION",
        "text": "Le sélectionneur vous fait entrer à la 105e minute de la prolongation, 1-1 au cumulé. Vous avez les jambes fraîches et vingt-deux joueurs épuisés autour de vous. Premier ballon : une ouverture dans la profondeur, et leur défense qui ne court plus.",
        "options": [
          {
            "id": "sprint",
            "label": "Tout donner dans le sprint et frapper au premier poteau",
            "base": 0.5,
            "repWin": 5,
            "repFail": -2
          },
          {
            "id": "keeper",
            "label": "Dribbler le gardien, le stade derrière vous",
            "hint": "Risqué",
            "base": 0.44,
            "repWin": 8,
            "repFail": -4,
            "traitWin": "clutch"
          },
          {
            "id": "corner",
            "label": "Filer vers le poteau de corner pour user les secondes",
            "hint": "Prudent",
            "base": 0.6,
            "repWin": 1,
            "repFail": -1
          },
          {
            "id": "square",
            "label": "Attendre le soutien et servir l'avant-centre",
            "hint": "Collectif",
            "base": 0.56,
            "repWin": 3
          }
        ],
        "winText": "Le ballon franchit la ligne, et la tribune s'effondre sur elle-même. Entré il y a trois minutes, vous venez d'envoyer la sélection au grand tournoi.",
        "failText": "L'occasion s'évanouit, et les tirs au but tournent mal. Le joker n'aura pas suffi : la sélection regardera le tournoi de loin."
      }
    ],
    "gk": [
      {
        "title": "BARRAGE DE QUALIFICATION",
        "text": "93e minute du retour, la sélection est qualifiée pour un but. Dernier corner adverse : leur gardien est dans votre surface, vingt joueurs se tiennent par le maillot, et tout le pays regarde entre ses doigts.",
        "options": [
          {
            "id": "claim",
            "label": "Sortir et capter, quitte à se faire bousculer",
            "hint": "Patron",
            "base": 0.5,
            "repWin": 6,
            "repFail": -4,
            "traitWin": "leader"
          },
          {
            "id": "line",
            "label": "Rester sur la ligne, prêt pour la reprise",
            "hint": "Prudent",
            "base": 0.58,
            "repWin": 2
          },
          {
            "id": "punch",
            "label": "Boxer des deux poings vers l'extérieur",
            "hint": "Sûr",
            "base": 0.62,
            "repWin": 1,
            "repFail": -1
          },
          {
            "id": "fist",
            "label": "Attaquer le ballon d'une main, à bout de bras, au-dessus de tous",
            "hint": "Folie",
            "base": 0.4,
            "repWin": 9,
            "repFail": -5,
            "traitWin": "clutch"
          }
        ],
        "winText": "Le ballon est à vous, serré contre la poitrine. L'arbitre siffle : la sélection est qualifiée, et vos coéquipiers vous soulèvent au milieu de la surface.",
        "failText": "Une déviation, un ballon qui traîne, et le gardien adverse égalise du genou. Les tirs au but ne pardonnent pas : la sélection reste à quai."
      },
      {
        "title": "BARRAGE DE QUALIFICATION",
        "text": "Barrage en terre hostile : des fumigènes ont noyé votre surface dans un brouillard rouge, le match vient de reprendre après dix minutes d'arrêt. 0-0, il reste un quart d'heure, et leur buteur déclenche une frappe que vous ne voyez qu'au dernier moment.",
        "options": [
          {
            "id": "reflex",
            "label": "Faire confiance à vos réflexes, rien d'autre",
            "hint": "Instinct",
            "base": 0.5,
            "repWin": 5,
            "repFail": -2,
            "traitWin": "clutch"
          },
          {
            "id": "block",
            "label": "Fermer l'angle et se faire le plus large possible",
            "hint": "Métier",
            "base": 0.58,
            "repWin": 2
          },
          {
            "id": "post",
            "label": "Couvrir le premier poteau, là où il frappe le plus souvent",
            "hint": "Malin",
            "base": 0.62,
            "repWin": 1,
            "repFail": -1
          },
          {
            "id": "dive",
            "label": "Plonger au jugé vers le côté du tir",
            "hint": "Risqué",
            "base": 0.42,
            "repWin": 7,
            "repFail": -3
          }
        ],
        "winText": "Une main sortie du brouillard, et le ballon frappe la barre avant de filer en corner. La sélection tient le nul, puis frappe au bout du match : billet décroché en terre ennemie.",
        "failText": "Le ballon sort du brouillard trop tard pour vous. Le stade s'embrase, et la sélection quitte le pays sans la qualification qu'elle était venue chercher."
      },
      {
        "title": "BARRAGE DE QUALIFICATION",
        "text": "Battue 2-1 à l'aller, la sélection mène 1-0 au retour : le but marqué là-bas la qualifie. 86e minute, perte de balle au milieu, et deux attaquants foncent sur vous, seuls, à deux contre un.",
        "options": [
          {
            "id": "hold",
            "label": "Rester au milieu des deux et retarder la décision",
            "hint": "Sang-froid",
            "base": 0.56,
            "repWin": 3
          },
          {
            "id": "ball",
            "label": "Sortir sur le porteur pour forcer la passe",
            "hint": "Risqué",
            "base": 0.46,
            "repWin": 6,
            "repFail": -3
          },
          {
            "id": "cut",
            "label": "Anticiper la passe et couper la trajectoire",
            "hint": "Culotté",
            "base": 0.4,
            "repWin": 9,
            "repFail": -4,
            "traitWin": "genius"
          },
          {
            "id": "back",
            "label": "Reculer sur la ligne en attendant les défenseurs",
            "hint": "Prudent",
            "base": 0.6,
            "repWin": 1,
            "repFail": -1
          }
        ],
        "winText": "Vous gagnez le duel du bout des doigts. Les défenseurs reviennent, le temps s'écoule, et la sélection valide sa qualification sur cet arrêt-là.",
        "failText": "Une passe, une poussée dans le but vide. Le but à l'extérieur ne compte plus, la prolongation tourne court, et la sélection ne verra pas le tournoi."
      },
      {
        "title": "BARRAGE DE QUALIFICATION",
        "text": "Dernière seconde de la prolongation, 2-2 au cumulé. Vous avez le ballon dans les mains, l'adversaire s'est jeté en avant, et toute votre équipe vous regarde : un dernier contre est encore possible, ou bien les tirs au but.",
        "options": [
          {
            "id": "throw",
            "label": "Relancer vite à la main vers l'ailier lancé",
            "hint": "Collectif",
            "base": 0.48,
            "repWin": 6,
            "repFail": -2
          },
          {
            "id": "kick",
            "label": "Dégager de volée vers votre avant-centre",
            "hint": "Va-tout",
            "base": 0.42,
            "repWin": 8,
            "repFail": -3
          },
          {
            "id": "keep",
            "label": "Garder le ballon et aller aux tirs au but, où vous vous sentez fort",
            "hint": "Sang-froid",
            "base": 0.56,
            "repWin": 4,
            "repFail": -2,
            "traitWin": "zen"
          },
          {
            "id": "wait",
            "label": "Attendre que vos défenseurs se replacent avant de relancer",
            "hint": "Prudent",
            "base": 0.6,
            "repWin": 2
          }
        ],
        "winText": "Votre choix est le bon. Que ce soit au bout du contre ou au bout de la séance, la sélection décroche son billet, et c'est votre décision que les commentateurs refont en boucle.",
        "failText": "Rien ne tourne en votre faveur. Le ballon se perd, la séance de tirs au but aussi, et la sélection s'arrête à une seconde du tournoi."
      }
    ]
  },
  "promo_playoff": {
    "field": [
      {
        "title": "BARRAGE DE MONTÉE",
        "text": "Défait 2-0 à l'aller, {club} mène 1-0 au retour à la 84e. Un centre fuyant traverse la surface, et vous êtes au second poteau, coincé entre le latéral et le poteau.",
        "options": [
          {
            "id": "head",
            "label": "Remettre de la tête dans l'axe",
            "hint": "Collectif",
            "base": 0.6,
            "repWin": 2
          },
          {
            "id": "dive",
            "label": "Plonger pour la tête plongeante au ras du poteau",
            "hint": "Courage",
            "base": 0.48,
            "repWin": 6,
            "repFail": -2,
            "traitWin": "clutch"
          },
          {
            "id": "volley",
            "label": "Reprendre de volée du pied gauche",
            "hint": "Risqué",
            "base": 0.42,
            "repWin": 8,
            "repFail": -3
          },
          {
            "id": "control",
            "label": "Contrôler de la poitrine et temporiser",
            "base": 0.54,
            "repWin": 3,
            "repFail": -1
          }
        ],
        "winText": "2-0, tout est à refaire pour eux. {club} étouffe la fin de match et arrache la montée aux tirs au but : le but du second poteau restera sur toutes les écharpes.",
        "failText": "Le ballon effleure le poteau et sort. {club} a remonté la moitié du retard, et la montée reste suspendue à ce centimètre-là."
      },
      {
        "title": "BARRAGE DE MONTÉE",
        "text": "Match retour chez eux, 0-0 au cumulé à l'heure de jeu. Un but à l'extérieur, et ils devront en marquer deux. Contre éclair : vous voilà lancé à trois contre deux, le stade adverse soudain muet.",
        "options": [
          {
            "id": "give",
            "label": "Fixer le défenseur et servir l'appel de droite",
            "hint": "Collectif",
            "base": 0.58,
            "repWin": 3
          },
          {
            "id": "self",
            "label": "Garder le ballon et frapper au premier poteau",
            "base": 0.5,
            "repWin": 5,
            "repFail": -2
          },
          {
            "id": "dummy",
            "label": "Feinter la passe et rentrer dans l'axe",
            "hint": "Culotté",
            "base": 0.44,
            "repWin": 7,
            "repFail": -3,
            "traitWin": "genius"
          },
          {
            "id": "slow",
            "label": "Ralentir pour attendre le reste de l'équipe",
            "hint": "Prudent",
            "base": 0.64,
            "repWin": 1,
            "repFail": -1
          }
        ],
        "winText": "Le ballon file au fond, et dans le parcage visiteur, c'est l'émeute. Ce but à l'extérieur les condamne : {club} tient le score et MONTE au nez de tout un stade.",
        "failText": "L'action meurt dans les gants du gardien, et le stade se réveille d'un coup. Ils marquent dix minutes plus tard : {club} rentre chez lui sans la montée."
      },
      {
        "title": "BARRAGE DE MONTÉE",
        "text": "112e minute de la prolongation, 1-1. Une frappe de votre milieu est repoussée par le gardien, le ballon traîne à six mètres. Vous êtes à terre, épuisé, et deux défenseurs reviennent sur vous.",
        "options": [
          {
            "id": "poke",
            "label": "Pousser le ballon du bout du pied, encore au sol",
            "hint": "Instinct",
            "base": 0.52,
            "repWin": 5,
            "repFail": -1,
            "traitWin": "clutch"
          },
          {
            "id": "up",
            "label": "Se relever et frapper fort",
            "hint": "Risqué",
            "base": 0.44,
            "repWin": 6,
            "repFail": -3
          },
          {
            "id": "shield",
            "label": "Protéger le ballon pour obtenir le penalty",
            "hint": "Malin",
            "base": 0.56,
            "repWin": 3,
            "repFail": -2
          },
          {
            "id": "back",
            "label": "Remettre en retrait au premier qui arrive",
            "hint": "Collectif",
            "base": 0.6,
            "repWin": 2
          }
        ],
        "winText": "Le ballon roule, roule, et franchit la ligne. Les remplaçants envahissent le terrain, la prolongation se termine dans un vacarme continu : {club} MONTE !",
        "failText": "Un défenseur sauve sur la ligne. Les tirs au but arrivent, et {club} n'en sort pas vainqueur : la montée se dérobe au bout de cent vingt minutes."
      }
    ],
    "mil": [
      {
        "title": "BARRAGE DE MONTÉE",
        "text": "92e minute du barrage, 1-1 au cumulé, dernier corner pour {club}. C'est vous qui le tirez. Derrière vous, dix mille personnes suivent l'écran géant installé sur la grand-place de la ville.",
        "options": [
          {
            "id": "near",
            "label": "Brosser au premier poteau pour la déviation",
            "base": 0.52,
            "repWin": 4,
            "repFail": -1
          },
          {
            "id": "far",
            "label": "Envoyer au second poteau pour votre grand défenseur",
            "hint": "Collectif",
            "base": 0.56,
            "repWin": 3
          },
          {
            "id": "short",
            "label": "Jouer à deux et chercher un centre plus rentrant",
            "hint": "Malin",
            "base": 0.6,
            "repWin": 2,
            "repFail": -1
          },
          {
            "id": "direct",
            "label": "Tenter le corner direct, brossé vers la lucarne",
            "hint": "Folie",
            "base": 0.38,
            "repWin": 12,
            "repFail": -5,
            "traitWin": "showman"
          }
        ],
        "winText": "Le ballon trouve sa cible, la tête claque, le filet tremble. Sur la grand-place, on danse dans les fontaines : {club} MONTE sur votre dernier ballon.",
        "failText": "Le gardien capte sans trembler, l'arbitre siffle. Les tirs au but tournent mal, et sur la grand-place, l'écran géant s'éteint sur une ville en silence."
      },
      {
        "title": "BARRAGE DE MONTÉE",
        "text": "Prolongation du barrage, 1-1. {club} vient de perdre un joueur sur carton rouge, et vous êtes désormais seul dans l'entrejeu face à trois milieux adverses. Quinze minutes à tenir, ou à renverser.",
        "options": [
          {
            "id": "screen",
            "label": "Rester devant la défense et couper chaque ligne de passe",
            "hint": "Prudent",
            "base": 0.62,
            "repWin": 2
          },
          {
            "id": "foul",
            "label": "Casser le rythme par de petites fautes intelligentes",
            "hint": "Malin",
            "base": 0.56,
            "repWin": 2,
            "repFail": -2
          },
          {
            "id": "carry",
            "label": "Porter chaque ballon récupéré jusqu'à leur surface",
            "hint": "Patron",
            "base": 0.46,
            "repWin": 7,
            "repFail": -3,
            "traitWin": "leader"
          },
          {
            "id": "pens",
            "label": "Viser les tirs au but et réconforter chacun",
            "hint": "Sang-froid",
            "base": 0.54,
            "repWin": 3,
            "repFail": -1,
            "traitWin": "zen"
          }
        ],
        "winText": "À dix, {club} ne plie jamais. Vous êtes partout, sur chaque ballon, et le barrage bascule de votre côté : la montée est au bout d'une prolongation héroïque.",
        "failText": "L'infériorité numérique finit par peser. Un décalage de trop, un but dans les dernières minutes : {club} tombe à dix, et la montée avec lui."
      }
    ],
    "def": [
      {
        "title": "BARRAGE DE MONTÉE",
        "text": "Battu 1-0 à l'aller, {club} est toujours à 0-0 au retour à la 85e. L'entraîneur fait de grands gestes : vous montez en pointe, défenseur central transformé en avant-centre pour les dernières minutes.",
        "options": [
          {
            "id": "flick",
            "label": "Jouer les déviations de la tête pour les attaquants",
            "hint": "Collectif",
            "base": 0.58,
            "repWin": 3
          },
          {
            "id": "keeper",
            "label": "Bousculer leur gardien sur chaque ballon aérien",
            "hint": "Malin",
            "base": 0.52,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "attack",
            "label": "Attaquer chaque centre comme si c'était le dernier",
            "hint": "Courage",
            "base": 0.46,
            "repWin": 7,
            "repFail": -3,
            "traitWin": "clutch"
          },
          {
            "id": "stay",
            "label": "Refuser et garder votre poste pour éviter le contre",
            "hint": "Prudent",
            "base": 0.6,
            "repWin": 0,
            "repFail": -2
          }
        ],
        "winText": "Le central a des pieds d'avant-centre ce soir : le ballon finit au fond, {club} renverse le cumul dans la prolongation et MONTE. Vous ne redescendrez jamais tout à fait de ce soir-là.",
        "failText": "Chaque centre vous file au-dessus de la tête. L'arbitre siffle la fin sur un dégagement adverse : {club} reste à quai, et vous redescendez lentement vers votre moitié de terrain."
      },
      {
        "title": "BARRAGE DE MONTÉE",
        "text": "117e minute, {club} est qualifié pour un but. Leur entraîneur vient de lancer son ailier le plus rapide, frais comme au premier jour. Vous avez un carton jaune, des crampes au mollet, et il fonce droit sur vous.",
        "options": [
          {
            "id": "show",
            "label": "L'orienter vers la ligne de touche, sans jamais plonger",
            "hint": "Métier",
            "base": 0.6,
            "repWin": 2
          },
          {
            "id": "help",
            "label": "Appeler le milieu en couverture et doubler",
            "hint": "Collectif",
            "base": 0.62,
            "repWin": 1,
            "repFail": -1
          },
          {
            "id": "tackle",
            "label": "Tacler malgré le carton jaune",
            "hint": "Va-tout",
            "base": 0.42,
            "repWin": 8,
            "repFail": -5
          },
          {
            "id": "shoulder",
            "label": "Le prendre à l'épaule dès son premier contrôle",
            "hint": "Courage",
            "base": 0.5,
            "repWin": 5,
            "repFail": -2
          }
        ],
        "winText": "Il ne passe pas, ni cette fois ni les suivantes. L'arbitre siffle, vous vous écroulez de crampes en souriant : {club} MONTE, et le dernier verrou, c'était vous.",
        "failText": "Un crochet, une accélération, et votre mollet lâche au pire moment. Le centre trouve preneur, et {club} perd la montée aux tirs au but."
      }
    ],
    "gk": [
      {
        "title": "BARRAGE DE MONTÉE",
        "text": "Votre bourde à l'aller a fait la une du journal local, et tout le stade vous attend au tournant pour le retour. Cinquième minute : premier centre adverse, haut, flottant, en plein dans votre zone.",
        "options": [
          {
            "id": "claim",
            "label": "Sortir franchement et capter, pour montrer que vous êtes là",
            "hint": "Patron",
            "base": 0.52,
            "repWin": 6,
            "repFail": -4,
            "traitWin": "leader"
          },
          {
            "id": "punch",
            "label": "Boxer loin, sans prendre de risque",
            "hint": "Sûr",
            "base": 0.64,
            "repWin": 1
          },
          {
            "id": "line",
            "label": "Laisser vos défenseurs s'en charger",
            "hint": "Prudent",
            "base": 0.56,
            "repWin": 0,
            "repFail": -2
          },
          {
            "id": "calm",
            "label": "Capter, puis relancer tranquillement comme si de rien n'était",
            "hint": "Sang-froid",
            "base": 0.48,
            "repWin": 5,
            "repFail": -3,
            "traitWin": "zen"
          }
        ],
        "winText": "Le premier ballon est à vous, et tous les suivants aussi. Vous ne tremblez plus de la soirée : {club} MONTE, et le journal de demain titrera sur votre revanche.",
        "failText": "Le ballon vous glisse des gants une deuxième fois. Le stade se tait, puis gronde : {club} ne s'en relève pas, et la montée part avec votre confiance."
      },
      {
        "title": "BARRAGE DE MONTÉE",
        "text": "{club} est qualifié grâce au but marqué chez eux, mais à la 89e, coup franc pour l'adversaire à vingt-trois mètres. Leur spécialiste pose le ballon : il en a mis neuf cette saison, presque toujours au-dessus du mur.",
        "options": [
          {
            "id": "wall4",
            "label": "Mur de quatre et vous couvrez votre côté",
            "hint": "Métier",
            "base": 0.6,
            "repWin": 2
          },
          {
            "id": "lie",
            "label": "Coucher un joueur derrière le mur contre la frappe rasante",
            "hint": "Malin",
            "base": 0.54,
            "repWin": 3,
            "repFail": -1
          },
          {
            "id": "cheat",
            "label": "Faire un pas vers votre gauche pour le pousser à tirer côté mur",
            "hint": "Culotté",
            "base": 0.44,
            "repWin": 8,
            "repFail": -4,
            "traitWin": "genius"
          },
          {
            "id": "nowall",
            "label": "Un mur minimal pour garder tout l'angle en vue",
            "hint": "Risqué",
            "base": 0.48,
            "repWin": 6,
            "repFail": -3
          }
        ],
        "winText": "Il enroule au-dessus du mur, et vous êtes déjà là, la main ferme sous la barre. Corner, puis le coup de sifflet final : {club} MONTE grâce à son but à l'extérieur et à vos gants.",
        "failText": "Le ballon passe au-dessus du mur et retombe juste sous la barre. Le but à l'extérieur ne sert plus à rien, et {club} s'écroule dans la prolongation."
      }
    ]
  },
  "injury": {
    "any": [
      {
        "title": "LE CHEMIN DU RETOUR",
        "text": "Six semaines après l'opération, le médecin parle encore de six autres. Mais {club} joue une finale dans vingt jours, et l'entraîneur est passé hier soir à la salle de soins : « Si vous pouvez tenir vingt minutes, je vous veux sur le banc. »",
        "options": [
          {
            "id": "stands",
            "label": "Regarder la finale depuis la tribune et suivre le protocole",
            "hint": "Sûr",
            "base": 0.84,
            "recover": 13,
            "setback": 3,
            "repWin": 0
          },
          {
            "id": "bench",
            "label": "Viser le banc et vingt minutes, pas une de plus",
            "hint": "Mesuré",
            "base": 0.64,
            "recover": 9,
            "setback": 8,
            "repWin": 3
          },
          {
            "id": "start",
            "label": "Exiger d'être titulaire pour la finale",
            "hint": "Risqué",
            "base": 0.42,
            "recover": 5,
            "setback": 16,
            "repWin": 7,
            "repFail": -5,
            "traitWin": "clutch",
            "winText": "Vous jouez la finale de bout en bout, et la cicatrice ne se rappelle à vous qu'au moment de lever les bras. Le staff médical, lui, n'a pas regardé un seul ballon : il ne regardait que votre jambe.",
            "failText": "Une demi-heure, et la jambe se dérobe sur un simple appui. Vous quittez la finale sur une civière, et le médecin ne parle plus de six semaines."
          }
        ],
        "winText": "Le protocole va à son terme sans accroc : quand vous retrouvez enfin le groupe, la jambe ne vous envoie plus aucun signal. Vous êtes de retour, et pour longtemps.",
        "failText": "La cicatrice tire, puis brûle. L'imagerie confirme ce que vous sentiez déjà : il faut tout ralentir, et la date du retour s'éloigne encore."
      },
      {
        "title": "LE CHEMIN DU RETOUR",
        "text": "Le médecin vous a déclaré apte il y a dix jours. Pourtant, à chaque opposition, vous retirez la jambe une fraction de seconde avant le contact. Personne ne dit rien, mais tout le monde l'a vu — et vous aussi.",
        "options": [
          {
            "id": "mental",
            "label": "Travailler avec un préparateur mental, à votre rythme",
            "hint": "Patient",
            "base": 0.8,
            "recover": 12,
            "setback": 4,
            "repWin": 1,
            "traitWin": "zen"
          },
          {
            "id": "reserve",
            "label": "Demander à jouer un match avec la réserve",
            "hint": "Humble",
            "base": 0.66,
            "recover": 9,
            "setback": 7,
            "repWin": 2
          },
          {
            "id": "tackle",
            "label": "Vous jeter dans le premier tacle de la prochaine séance",
            "hint": "Rageur",
            "base": 0.48,
            "recover": 6,
            "setback": 14,
            "repWin": 5,
            "repFail": -4,
            "winText": "Le tacle claque, propre, à pleine vitesse. Vous vous relevez avec le ballon, et le vieux défenseur d'en face vous tape dans la main sans un mot : le message est passé dans tout le groupe.",
            "failText": "Vous arrivez trop tard, trop raide, à contretemps. La jambe encaisse mal, et le kiné vous raccompagne par le bras jusqu'à la salle de soins."
          }
        ],
        "winText": "Un jour, au milieu d'une opposition banale, vous vous rendez compte que vous n'y pensez plus. La jambe va au contact toute seule : la blessure est enfin derrière vous.",
        "failText": "La peur se change en raideur, la raideur en contracture. Le corps a écouté la tête, et le retour recule de plusieurs semaines."
      }
    ]
  },
  "old_club": {
    "any": [
      {
        "title": "RETROUVAILLES",
        "text": "À l'annonce des équipes, votre nom déclenche un vacarme étrange : les supporters de votre ancien club se partagent entre ovation et sifflets. Avant le coup d'envoi, vous passez juste devant eux, et des dizaines de visages que vous connaissez par cœur vous regardent.",
        "options": [
          {
            "id": "applaud",
            "label": "Aller les applaudir, les mains au-dessus de la tête",
            "hint": "Classe",
            "base": 0.62,
            "repWin": 3
          },
          {
            "id": "focus",
            "label": "Ne regarder que le ballon, rien d'autre",
            "hint": "Concentré",
            "base": 0.7,
            "repWin": 1,
            "traitWin": "zen"
          },
          {
            "id": "shirt",
            "label": "Offrir votre maillot d'échauffement au premier rang",
            "hint": "Généreux",
            "base": 0.54,
            "repWin": 5,
            "repFail": -3
          },
          {
            "id": "crest",
            "label": "Embrasser l'écusson de {club} sous leurs yeux",
            "hint": "Provocateur",
            "base": 0.42,
            "repWin": 7,
            "repFail": -6,
            "traitWin": "showman",
            "winText": "Le geste rend fou votre ancien virage, mais vous répondez sur le terrain : un match énorme, et chaque sifflet devient une ovation de l'autre côté du stade. Les supporters de {club} viennent de vous adopter pour de bon.",
            "failText": "Le geste met le feu à tout un virage, et votre soirée tourne au cauchemar : chaque ballon perdu est fêté comme un but. Même dans votre propre camp, on trouve que vous en avez trop fait."
          }
        ],
        "winText": "Les sifflets s'éteignent un à un, couverts par les applaudissements. Libéré, vous livrez un match plein, et au coup de sifflet final, même les plus durs de votre ancien virage vous saluent.",
        "failText": "Les sifflets redoublent à chacun de vos ballons. Vous jouez crispé, à contretemps, et votre ancien public repart avec la seule victoire qui l'intéressait ce soir."
      },
      {
        "title": "RETROUVAILLES",
        "text": "64e minute, 0-0. Le ballon traverse toute la surface et tombe dans vos pieds, à six mètres, le but grand ouvert. Derrière la cage, votre ancien virage vous fixe en silence : vous allez marquer contre le club qui vous a tant donné.",
        "options": [
          {
            "id": "respect",
            "label": "Pousser au fond, puis lever les mains en signe de respect",
            "hint": "Respect",
            "base": 0.7,
            "repWin": 2
          },
          {
            "id": "team",
            "label": "Marquer et courir droit vers vos coéquipiers",
            "hint": "Collectif",
            "base": 0.64,
            "repWin": 3
          },
          {
            "id": "square",
            "label": "Glisser le ballon à un partenaire pour ne pas marquer vous-même",
            "hint": "Pudique",
            "base": 0.56,
            "repWin": 4,
            "repFail": -3,
            "winText": "Votre partenaire n'a plus qu'à pousser le ballon au fond. Vous l'enlacez sans un cri, et votre ancien virage, qui a tout compris, se met à scander votre nom.",
            "failText": "La passe arrive une demi-seconde trop tard, et le défenseur revenu de nulle part dégage sur la ligne. Sur le banc, votre entraîneur se prend la tête à deux mains : la pudeur ne gagne pas les matchs."
          },
          {
            "id": "shush",
            "label": "Marquer et célébrer devant eux, l'index sur la bouche",
            "hint": "Provocateur",
            "base": 0.42,
            "repWin": 8,
            "repFail": -6,
            "traitWin": "showman",
            "winText": "Le ballon au fond, vous filez vers le virage, l'index sur la bouche, et le stade se tait d'un coup. Un silence que vous n'oublierez jamais — et que vos nouveaux supporters vous remercieront longtemps de leur avoir offert.",
            "failText": "Vous pensez à la célébration avant de frapper, et le ballon s'envole au-dessus de la barre. Le virage vous rend le geste, l'index sur la bouche, jusqu'au coup de sifflet final."
          }
        ],
        "winText": "Le filet tremble, et le stade se fend en deux. {club} mène, et votre ancien public, après une seconde de stupeur, finit par vous applaudir : on ne siffle pas quelqu'un qui marque avec cette classe.",
        "failText": "Le ballon heurte le poteau et revient dans les bras du gardien. Le virage explose, et vous comprenez que c'est votre cœur qui a tremblé avant votre pied."
      }
    ],
    "gk": [
      {
        "title": "RETROUVAILLES",
        "text": "À l'échauffement, vous rejoignez la cage située devant votre ancien virage. D'un côté, une immense banderole « Merci pour tout » ; de l'autre, des sifflets qui ne s'arrêtent plus. C'est ce but-là que vous défendrez pendant toute la première période.",
        "options": [
          {
            "id": "salute",
            "label": "Saluer le virage, gants levés, avant le premier ballon",
            "hint": "Classe",
            "base": 0.62,
            "repWin": 3
          },
          {
            "id": "bubble",
            "label": "Garder le casque jusqu'au dernier moment et rester dans votre bulle",
            "hint": "Concentré",
            "base": 0.7,
            "repWin": 1,
            "traitWin": "zen"
          },
          {
            "id": "toss",
            "label": "Demander à votre capitaine de changer de camp au tirage au sort",
            "hint": "Malin",
            "base": 0.58,
            "repWin": 2,
            "repFail": -2
          },
          {
            "id": "gloves",
            "label": "Lancer vos gants d'échauffement au premier rang",
            "hint": "Généreux",
            "base": 0.48,
            "repWin": 6,
            "repFail": -4
          }
        ],
        "winText": "Vous tenez votre cage comme au temps où ce virage chantait pour vous : deux arrêts réflexes avant la pause, et une sortie aérienne qui fait taire les derniers siffleurs. À la mi-temps, la banderole est toujours là.",
        "failText": "Le premier ballon aérien vous glisse des gants sous un vacarme immense. Le virage vous le fait payer toute la soirée, et chaque dégagement devient une épreuve."
      },
      {
        "title": "RETROUVAILLES",
        "text": "71e minute, {club} mène 1-0, penalty pour votre ancien club. Le tireur est votre ancien compagnon de chambre : des centaines de penalties à l'entraînement, et il sait que vous plongez presque toujours à droite. Il pose le ballon en souriant, et vous savez qu'il sait.",
        "options": [
          {
            "id": "right",
            "label": "Plonger à droite, comme toujours",
            "hint": "Double bluff",
            "base": 0.46,
            "repWin": 5,
            "repFail": -1
          },
          {
            "id": "left",
            "label": "Partir à gauche, pour une fois",
            "hint": "Malin",
            "base": 0.5,
            "repWin": 3
          },
          {
            "id": "middle",
            "label": "Rester au centre jusqu'au bout",
            "hint": "Culotté",
            "base": 0.4,
            "repWin": 7,
            "repFail": -4,
            "traitWin": "clutch"
          },
          {
            "id": "talk",
            "label": "Lui parler, retarder, le faire douter",
            "hint": "Guerre des nerfs",
            "base": 0.48,
            "repWin": 4,
            "repFail": -2
          }
        ],
        "winText": "Vous l'avez lu : le ballon finit dans vos gants. Votre vieux complice se prend la tête à deux mains, puis éclate de rire en vous montrant du doigt. {club} garde son but d'avance jusqu'au bout.",
        "failText": "Il vous envoie du mauvais côté, exactement comme il vous l'avait promis il y a des années. En revenant vers le rond central, il vous tapote l'épaule — et ça fait plus mal que le but."
      }
    ]
  },
  "debut": {
    "any": [
      {
        "title": "PREMIER MATCH PROFESSIONNEL",
        "text": "88e minute, 1-1. Le panneau s'allume avec votre numéro, et l'entraîneur vous attrape par la nuque : « Un ballon. Vous n'en aurez qu'un. » Trente secondes après votre entrée, le voilà dans vos pieds, dans le camp adverse, devant un stade qui ne connaît même pas encore votre nom.",
        "options": [
          {
            "id": "simple",
            "label": "La passe simple au partenaire le plus proche",
            "hint": "Sûr",
            "base": 0.72,
            "repWin": 1,
            "winText": "Passe propre, appel, relais : l'action file et le but tombe au bout de la séquence. Votre nom n'apparaîtra pas sur la feuille de match, mais le vestiaire, lui, a tout vu."
          },
          {
            "id": "through",
            "label": "Chercher la passe en profondeur dans le dos de la défense",
            "base": 0.52,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "dribble",
            "label": "Provoquer le premier défenseur, balle au pied",
            "hint": "Culotté",
            "base": 0.46,
            "repWin": 6,
            "repFail": -3
          },
          {
            "id": "shot",
            "label": "Frapper de loin, sans réfléchir",
            "hint": "Folie",
            "base": 0.38,
            "repWin": 9,
            "repFail": -4,
            "traitWin": "showman",
            "winText": "La frappe part sans élan, sans calcul, et vient se loger sous la barre. Votre premier ballon professionnel est un but, et un stade entier cherche votre nom dans le programme."
          }
        ],
        "winText": "Le ballon fait exactement ce que vous vouliez. L'action va au bout, {club} arrache la victoire dans les dernières secondes, et ce soir, tout le stade a appris votre nom.",
        "failText": "Le ballon vous échappe d'un rien, et le contre adverse part dans la foulée. Le match se termine sur un nul que personne ne vous reproche, mais sur le chemin du vestiaire, vous rejouez ce ballon cent fois."
      },
      {
        "title": "PREMIER MATCH PROFESSIONNEL",
        "text": "Neuvième minute de votre premier match. Votre toute première passe de professionnel finit dans les pieds adverses, et le ballon est au fond des filets de {club} quinze secondes plus tard. Un murmure parcourt les tribunes ; sur le terrain, personne ne vous regarde.",
        "options": [
          {
            "id": "safe",
            "label": "Jouer à une touche, sans risque, jusqu'à la mi-temps",
            "hint": "Prudent",
            "base": 0.7,
            "repWin": 1
          },
          {
            "id": "sorry",
            "label": "Aller vous excuser auprès de votre gardien, puis repartir",
            "hint": "Humble",
            "base": 0.64,
            "repWin": 2
          },
          {
            "id": "demand",
            "label": "Réclamer le ballon dès la remise en jeu",
            "hint": "Courageux",
            "base": 0.56,
            "repWin": 5,
            "repFail": -3
          },
          {
            "id": "duels",
            "label": "Vous jeter dans tous les duels pour vous racheter",
            "hint": "Rageur",
            "base": 0.46,
            "repWin": 6,
            "repFail": -4,
            "failText": "Le troisième duel arrive trop tard : carton jaune, et l'entraîneur fait s'échauffer quelqu'un dès la minute suivante. Vous sortez avant la pause, sans avoir pu vous racheter."
          }
        ],
        "winText": "Ballon après ballon, le murmure se tait. À la mi-temps, un ancien vous ébouriffe les cheveux sans rien dire, et quand {club} égalise en seconde période, vous êtes dans l'action. La première erreur est déjà loin.",
        "failText": "Le doute ne vous lâche plus : chaque contrôle est une épreuve, chaque passe une prière. L'entraîneur vous sort à l'heure de jeu, avec une main posée sur l'épaule qui en dit long."
      }
    ],
    "gk": [
      {
        "title": "PREMIER MATCH PROFESSIONNEL",
        "text": "84e minute, 1-1. Le gardien titulaire vient d'être expulsé pour une faute de dernier recours, et c'est penalty. Vous retirez votre chasuble sur la ligne de touche, sans échauffement, les mains encore froides : votre carrière professionnelle commence par un seul ballon.",
        "options": [
          {
            "id": "read",
            "label": "Attendre le dernier moment et lire ses appuis",
            "hint": "Patient",
            "base": 0.48,
            "repWin": 3
          },
          {
            "id": "coach",
            "label": "Partir du côté indiqué par l'entraîneur des gardiens",
            "hint": "Discipliné",
            "base": 0.52,
            "repWin": 2
          },
          {
            "id": "big",
            "label": "Vous faire immense au centre et fixer le tireur",
            "hint": "Culotté",
            "base": 0.4,
            "repWin": 7,
            "repFail": -3,
            "traitWin": "clutch"
          },
          {
            "id": "delay",
            "label": "Prendre votre temps, refaire vos gants, le faire attendre",
            "hint": "Guerre des nerfs",
            "base": 0.45,
            "repWin": 4,
            "repFail": -2
          }
        ],
        "winText": "Votre premier ballon de professionnel finit dans vos gants. Vos coéquipiers vous ensevelissent sous une montagne de maillots, et {club} tient le nul jusqu'au bout : une entrée de quelques secondes qu'on racontera longtemps.",
        "failText": "Le ballon file dans le petit filet, de l'autre côté. Personne ne vous en veut — qui arrête un penalty à froid ? — mais la première ligne de votre carrière est un but encaissé."
      },
      {
        "title": "PREMIER MATCH PROFESSIONNEL",
        "text": "Vingtième minute, premier corner contre vous. Leur vieil avant-centre se colle à vous, vous marche sur les pieds et vous glisse à l'oreille que vous allez lâcher le premier ballon. L'arbitre ne voit rien ; votre défense non plus.",
        "options": [
          {
            "id": "punch",
            "label": "Boxer le ballon, quoi qu'il arrive",
            "hint": "Sûr",
            "base": 0.68,
            "repWin": 1
          },
          {
            "id": "ref",
            "label": "Interpeller l'arbitre avant la frappe du corner",
            "hint": "Malin",
            "base": 0.6,
            "repWin": 2,
            "repFail": -1
          },
          {
            "id": "silent",
            "label": "Ne rien répondre et sortir au point le plus haut",
            "hint": "Froid",
            "base": 0.54,
            "repWin": 4,
            "traitWin": "zen"
          },
          {
            "id": "shove",
            "label": "Le repousser franchement avant que le ballon parte",
            "hint": "Rugueux",
            "base": 0.46,
            "repWin": 5,
            "repFail": -4,
            "failText": "L'arbitre, qui ne voyait rien, voit enfin quelque chose : votre geste. Carton jaune, et le vieil attaquant se relève en souriant ; il a obtenu exactement ce qu'il cherchait."
          }
        ],
        "winText": "Le ballon arrive, vous le captez à deux mains au-dessus de toutes les têtes. Le vieil attaquant hausse les sourcils et vous laisse tranquille pour le reste du match : dans cette surface, on vient d'apprendre à vous respecter.",
        "failText": "Le ballon vous échappe dans la bousculade et finit dans les pieds d'un adversaire. Le but est refusé de justesse, mais le vieil attaquant rit, et il revient se coller à vous à chaque corner."
      }
    ]
  },
  "last_match": {
    "any": [
      {
        "title": "LE MATCH D'ADIEU",
        "text": "Les deux équipes forment une haie d'honneur à la sortie du tunnel, et vous la traversez entouré de votre famille. Au coup d'envoi, le capitaine adverse vous serre la main et prévient en souriant : « Aucun cadeau ce soir. » Le premier ballon du match est pour vous.",
        "options": [
          {
            "id": "simple",
            "label": "Jouer simple et laisser le match venir à vous",
            "hint": "Sûr",
            "base": 0.7,
            "repWin": 1
          },
          {
            "id": "voice",
            "label": "Rassembler le groupe et donner le ton à la voix",
            "hint": "Leader",
            "base": 0.62,
            "repWin": 3,
            "traitWin": "leader"
          },
          {
            "id": "press",
            "label": "Presser comme à vingt ans dès la première minute",
            "hint": "Généreux",
            "base": 0.54,
            "repWin": 4,
            "repFail": -2
          },
          {
            "id": "lob",
            "label": "Tenter le lob du rond central dès le coup d'envoi",
            "hint": "Légendaire",
            "base": 0.38,
            "repWin": 10,
            "repFail": -3,
            "traitWin": "showman",
            "winText": "Le ballon monte, monte, et le gardien adverse recule trop tard. Le premier ballon de votre dernier match finit au fond des filets, et le stade entier comprend qu'il vient de voir quelque chose qu'on racontera longtemps.",
            "failText": "Le ballon s'envole loin au-dessus de la barre, sous un mélange de rires et d'applaudissements. Le geste était beau ; vos jambes, elles, n'ont plus vingt ans, et le match vous file entre les doigts."
          }
        ],
        "winText": "Vous jouez votre dernier match comme le premier, avec la même faim et une carrière de métier en plus. {club} l'emporte, et le capitaine adverse a tenu parole : il ne vous a rien donné, vous avez tout pris vous-même.",
        "failText": "Les jambes ne suivent plus tout à fait ce que la tête leur demande. Le match vous échappe peu à peu, et c'est au coup de sifflet final, dans l'étreinte du capitaine adverse, que vous trouvez enfin votre moment."
      },
      {
        "title": "LE MATCH D'ADIEU",
        "text": "Coup de sifflet final de votre dernier match. Le stade ne se vide pas : on a installé un micro au rond central, et des milliers de personnes attendent. Vous avez écrit un discours, plié en quatre dans votre chaussette, et vos mains tremblent déjà.",
        "options": [
          {
            "id": "speech",
            "label": "Lire le discours préparé, mot pour mot",
            "hint": "Sûr",
            "base": 0.7,
            "repWin": 2
          },
          {
            "id": "lap",
            "label": "Ne rien dire et faire le tour d'honneur, seul, sous les chants",
            "hint": "Pudique",
            "base": 0.62,
            "repWin": 3,
            "traitWin": "zen",
            "winText": "Vous faites le tour du terrain sans un mot, lentement, en saluant chaque tribune. Le stade chante pour vous jusqu'au tunnel : vous n'aviez besoin de rien dire.",
            "failText": "À mi-parcours, des supporters débordent la sécurité et envahissent la pelouse. Votre tour d'honneur s'achève dans la cohue, sans que vous ayez pu saluer la dernière tribune."
          },
          {
            "id": "heart",
            "label": "Ranger la feuille et parler avec le cœur",
            "hint": "Sincère",
            "base": 0.54,
            "repWin": 5,
            "repFail": -2
          },
          {
            "id": "boots",
            "label": "Laisser vos crampons au point de penalty, sans un mot",
            "hint": "Légendaire",
            "base": 0.46,
            "repWin": 8,
            "repFail": -3,
            "traitWin": "showman",
            "winText": "Vous délacez vos crampons, les posez sur le point blanc et repartez en chaussettes vers le tunnel. Aucune parole n'aurait dit mieux : l'image fera le tour du pays dès le soir même.",
            "failText": "Le geste se perd dans la confusion : un employé du stade ramasse les crampons, croyant à un oubli, et vous devez revenir les chercher sous des rires gênés."
          }
        ],
        "winText": "Votre voix tient jusqu'au bout. Quand vous rendez le micro, le stade entier scande votre nom, et vos coéquipiers vous portent en triomphe pour un dernier tour de terrain.",
        "failText": "L'émotion vous prend à la gorge à la deuxième phrase, et les mots ne viennent plus. Le stade vous applaudit quand même, longtemps — mais vous auriez voulu dire tant de choses."
      }
    ],
    "gk": [
      {
        "title": "LE MATCH D'ADIEU",
        "text": "85e minute, {club} mène de trois buts. Penalty pour l'adversaire, et leur tireur, un vieux rival croisé pendant quinze ans, vous adresse un clin d'œil en posant le ballon : il tirera au milieu, doucement, pour vous offrir un dernier arrêt. Du moins, c'est ce que son regard semble dire.",
        "options": [
          {
            "id": "accept",
            "label": "Rester au centre et accepter le cadeau",
            "hint": "Sûr",
            "base": 0.66,
            "repWin": 2
          },
          {
            "id": "angle",
            "label": "Avancer de deux pas pour lui fermer l'angle, en souriant",
            "hint": "Malin",
            "base": 0.56,
            "repWin": 3
          },
          {
            "id": "real",
            "label": "Lui faire signe de tirer pour de vrai",
            "hint": "Panache",
            "base": 0.5,
            "repWin": 6,
            "repFail": -2,
            "winText": "Il hoche la tête, frappe fort dans le coin, et vous allez chercher le ballon du bout des doigts. Un vrai arrêt, sur une vraie frappe : votre vieux rival est le premier à applaudir."
          },
          {
            "id": "dive",
            "label": "Plonger quand même, le vrai duel jusqu'au bout",
            "hint": "Fier",
            "base": 0.44,
            "repWin": 5,
            "repFail": -2,
            "traitWin": "clutch"
          }
        ],
        "winText": "Le ballon finit dans vos gants, et le stade se lève comme pour un titre. Votre vieux rival traverse la surface pour vous serrer dans ses bras : vous terminez votre carrière sur un arrêt, offert ou arraché, peu importe.",
        "failText": "Le ballon file au fond, et votre vieux rival lève les mains en s'excusant — ou en riant, difficile à dire. Le stade siffle pour la forme, puis vous applaudit : il y a pire façon d'encaisser le dernier but d'une carrière."
      },
      {
        "title": "LE MATCH D'ADIEU",
        "text": "Votre dernier match se termine aux tirs au but : 4-4 après cinq tireurs de chaque côté, et c'est à {club} de commencer la mort subite. Vos coéquipiers se retournent tous vers vous en même temps. Vous n'avez plus tiré un penalty depuis le centre de formation.",
        "options": [
          {
            "id": "placed",
            "label": "Tir placé, côté ouvert",
            "hint": "Sûr",
            "base": 0.66,
            "repWin": 2
          },
          {
            "id": "power",
            "label": "Une frappe de dégagement, plein centre",
            "hint": "Puissant",
            "base": 0.58,
            "repWin": 3
          },
          {
            "id": "runup",
            "label": "Prendre une longue course d'élan, comme un attaquant",
            "hint": "Culotté",
            "base": 0.5,
            "repWin": 5,
            "repFail": -2
          },
          {
            "id": "chip",
            "label": "La pichenette au centre, pour finir en beauté",
            "hint": "Légendaire",
            "base": 0.4,
            "repWin": 10,
            "repFail": -4,
            "traitWin": "showman"
          }
        ],
        "winText": "Le filet tremble, et vous filez vers votre cage sous une ovation. Le tireur adverse, déstabilisé, frappe au-dessus : {club} l'emporte, et la dernière image de votre carrière est un but.",
        "failText": "Le gardien adverse plonge du bon côté. Vous retournez dans votre cage pour un dernier duel, mais le tireur suivant ne tremble pas : votre carrière s'achève sur un penalty manqué, sous des applaudissements qui n'y changent rien."
      }
    ]
  }
};
