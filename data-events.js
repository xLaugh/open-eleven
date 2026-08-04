/* ============================================================
   Événements de carrière

   Le catalogue des situations proposées au joueur saison après saison, et
   les micro-événements d'ambiance. C'est le plus gros volume de contenu du jeu.

   L'ORDRE DE CE TABLEAU COMPTE : le tirage est déterministe et seedé. Insérer
   ou déplacer un événement change toutes les carrières déjà partagées (Défi du
   jour, rejeu des duels). N'ajoutez qu'à la fin.

   Extrait de data.js : CONTENU PUR, zéro logique. Ce fichier est autonome —
   il ne référence aucune autre table — et doit être chargé AVANT data.js,
   dont le bloc d'export Node le recense.
   ============================================================ */

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
    // DOUBLE NATIONALITÉ — le choix de sélection. Ne se présente qu'aux joueurs
    // éligibles à deux nations et pas encore appelés en A (cond.dual + cond.nat:false).
    // Vrai dilemme : les tournois sont pondérés par la force de la nation, mais la
    // barre de sélection monte avec le niveau du club. Petite nation = titulaire
    // presque assuré ; grande nation = sélection à mériter, mais Mondial jouable.
    // Poids élevé : la fenêtre est courte (avant la 1re sélection), le joueur ne doit
    // pas passer à côté du choix.
    id: "ev_dual_nationality", cat: "Sélection", icon: "🌍", w: 60,
    cond: { aMin: 17, aMax: 23, dual: true, nat: false },
    text: "Deux fédérations vous veulent. {nat} vous suit depuis les catégories de jeunes, mais {dualNat} a fait le déplacement : vos origines vous ouvrent leur porte. Il faut trancher — dès le premier match officiel joué, l'autre sélection se referme définitivement.",
    options: [
      { label: "Rester fidèle : {nat}", outcomes: [
        { weight: 55, text: "Vous confirmez {nat}. Le pays salue la fidélité, et vous devenez un visage du projet.", fx: { rep: 3, mor: 5, natLock: true } },
        { weight: 45, text: "Vous choisissez {nat} sans hésiter. La fédération vous voit déjà en cadre.", fx: { mor: 4, c: 2, natLock: true } },
      ] },
      { label: "Choisir {dualNat}", hint: "Change de sélection", outcomes: [
        { weight: 50, text: "Vous optez pour {dualNat}. Nouveau maillot, nouvelles ambitions — et une partie du public d'origine qui ne vous le pardonnera pas.", fx: { rep: 4, mor: 2, natSwitch: true } },
        { weight: 50, text: "Vous rejoignez {dualNat}. La presse d'origine parle de trahison, celle d'accueil d'un renfort de poids.", fx: { rep: 6, mor: -3, natSwitch: true } },
      ] },
    ],
  },
  {
    // ================================================================
    // LOT « LES TRAITS SE VIVENT ». cond.trait n'était utilisé que par UN
    // événement : un joueur pouvait porter « Showman » ou « Fragile » toute sa
    // carrière sans que le jeu ne le lui rappelle jamais. Un événement par trait,
    // qui met en scène sa force ET son revers.
    // ================================================================
    id: "ev_showman_ad", cat: "Médias", icon: "🎬", w: 16,
    cond: { aMin: 21, aMax: 34, trait: "showman", minRep: 45 },
    text: "Une marque de sport veut vous pour sa campagne mondiale : trois jours de tournage, un cachet à six chiffres, et votre visage sur tous les arrêts de bus du pays.",
    options: [
      { label: "Tourner la pub, à fond dans le personnage", outcomes: [
        { weight: 60, text: "La campagne cartonne. Vous devenez un visage connu bien au-delà du football.", fx: { rep: 12, money: 3, c: 4, mor: 5 } },
        { weight: 40, text: "Le spot est ridicule et tourne en boucle. Le vestiaire ne vous laisse pas respirer.", fx: { rep: 4, money: 3, team: -7, mor: -4 } },
      ] },
      { label: "Décliner, je veux qu'on parle de mon jeu", outcomes: [
        { weight: 55, text: "Le refus fait autant de bruit que la pub. On salue un joueur qui reste un joueur.", fx: { rep: 5, coach: 5, m: 4 } },
        { weight: 45, text: "L'agence se vexe, votre agent aussi. Une porte se ferme.", fx: { mor: -3, money: -0.3 } },
      ] },
    ],
  },
  {
    id: "ev_loyal_statue", cat: "Supporters", icon: "🗿", w: 15,
    cond: { aMin: 28, aMax: 40, trait: "loyal", minClubSeasons: 4 },
    text: "Les supporters lancent une cagnotte pour ériger votre statue devant le stade. Vous jouez encore. Le club, gêné, vous laisse trancher.",
    options: [
      { label: "Accepter, ému", outcomes: [
        { weight: 65, text: "La statue est inaugurée sous les chants du virage. Vous appartenez désormais à l'histoire du club.", fx: { rep: 10, mor: 12, team: 6 } },
        { weight: 35, text: "Une statue d'un joueur encore actif : la presse nationale ricane pendant des semaines.", fx: { rep: 3, mor: -4 } },
      ] },
      { label: "Refuser tant que je joue", outcomes: [
        { weight: 70, text: "« Quand j'aurai raccroché. » L'humilité de la réponse fait le tour du pays.", fx: { rep: 7, mor: 6, c: 4 } },
        { weight: 30, text: "La cagnotte est annulée, et certains supporters le prennent comme un rejet.", fx: { mor: -4, team: -3 } },
      ] },
    ],
  },
  {
    id: "ev_mercenary_offer", cat: "Finance", icon: "💼", w: 16,
    cond: { aMin: 24, aMax: 36, trait: "mercenary" },
    text: "Votre réputation vous précède : un club sans histoire mais très riche triple votre salaire. Le projet sportif tient sur une diapositive.",
    options: [
      { label: "Prendre l'argent, sans état d'âme", outcomes: [
        { weight: 60, text: "Contrat signé. Le compte en banque n'a jamais aussi bien joué.", fx: { money: 6, salaryMult: 2.2, rep: -4, transfer: { d: -1 } } },
        { weight: 40, text: "L'argent tombe, le niveau aussi. Vous vous éteignez doucement, loin des projecteurs.", fx: { money: 6, salaryMult: 2.2, rep: -8, form: -8, transfer: { d: -1 } } },
      ] },
      { label: "Refuser, pour une fois", outcomes: [
        { weight: 50, text: "Vous surprenez tout le monde, à commencer par vous. Le vestiaire vous regarde autrement.", fx: { team: 10, coach: 7, mor: 6, clearTrait: "mercenary" } },
        { weight: 50, text: "Vous refusez, et le regrettez chaque fin de mois.", fx: { mor: -6, m: 3 } },
      ] },
    ],
  },
  {
    id: "ev_party_night", cat: "Hygiène de vie", icon: "🌃", w: 16,
    cond: { aMin: 19, aMax: 32, trait: "party" },
    text: "Veille de match important. Un ami organise une soirée « juste deux heures, tu rentres tôt ». Vous savez très bien comment ça finit d'habitude.",
    options: [
      { label: "Y aller, se tenir, rentrer tôt", hint: "Risqué", outcomes: [
        { weight: 40, text: "Deux heures montre en main. Vous dormez bien et plantez un but le lendemain.", fx: { mor: 8, form: 4 } },
        { weight: 60, text: "Il est quatre heures du matin quand vous rentrez. Le match est un calvaire, et ça se voit.", fx: { form: -12, coach: -9, dis: -8, rep: -3 } },
      ] },
      { label: "Rester chez moi", outcomes: [
        { weight: 60, text: "Nuit complète, jambes fraîches : vous êtes le meilleur sur le terrain.", fx: { form: 8, dis: 6, coach: 5 } },
        { weight: 40, text: "Vous ruminez toute la soirée en regardant les stories des autres.", fx: { mor: -5, dis: 4 } },
      ] },
    ],
  },
  {
    id: "ev_glass_specialist", cat: "Blessure", icon: "🩺", w: 17,
    cond: { aMin: 22, aMax: 36, trait: "glass" },
    text: "Trop de pépins, trop souvent. Un spécialiste étranger propose une refonte totale de votre préparation — six mois de travail invisible, sans garantie.",
    options: [
      { label: "Tout reconstruire avec lui", hint: "Long", outcomes: [
        { weight: 55, text: "Six mois d'ingratitude, puis un corps qui ne casse plus. Vous récupérez votre carrière.", fx: { p: 7, form: 5, clearTrait: "glass", mor: 8 } },
        { weight: 45, text: "Le protocole ne prend pas. Vous avez perdu six mois et un peu d'espoir.", fx: { mor: -8, form: -4, money: -1 } },
      ] },
      { label: "Continuer à gérer au jour le jour", outcomes: [
        { weight: 50, text: "Vous apprenez à écouter votre corps mieux que quiconque, et traversez la saison.", fx: { m: 6, dis: 5 } },
        { weight: 50, text: "Nouvelle rechute, au pire moment de la saison.", fx: { inj: 11, mor: -7 } },
      ] },
    ],
  },
  {
    id: "ev_ironman_streak", cat: "Records", icon: "🛡️", w: 15,
    cond: { aMin: 26, aMax: 38, trait: "ironman" },
    text: "Cent-cinquante matchs consécutifs sans manquer une feuille. Le staff médical vous supplie de souffler une journée ; la presse compte les matchs comme on compte les jours.",
    options: [
      { label: "Jouer, encore. La série continue", outcomes: [
        { weight: 55, text: "La série devient un record du club. Votre nom entre dans les livres.", fx: { rep: 9, mor: 8, m: 4 } },
        { weight: 45, text: "Le corps finit par dire non, en plein match. La série s'arrête au pire moment.", fx: { inj: 10, mor: -9 } },
      ] },
      { label: "Souffler une journée, volontairement", outcomes: [
        { weight: 65, text: "Un match de repos, et vous revenez neuf pour le sprint final.", fx: { form: 9, p: 3, mor: 3 } },
        { weight: 35, text: "Votre remplaçant crève l'écran. On vous rappelle que personne n'est irremplaçable.", fx: { role: -1, coach: -5, mor: -6 } },
      ] },
    ],
  },
  {
    id: "ev_genius_freedom", cat: "Identité de jeu", icon: "🎨", w: 16,
    cond: { aMin: 20, aMax: 33, trait: "genius" },
    text: "Le coach vous convoque : « Tu fais des choses que personne ne fait. Mais tu perds trois ballons dangereux par match. Je te laisse libre, ou je te cadre. »",
    options: [
      { label: "Réclamer la liberté totale", outcomes: [
        { weight: 55, text: "Libre, vous devenez injouable. Le championnat entier parle de vos gestes.", fx: { t: 9, rep: 10, mor: 7 } },
        { weight: 45, text: "Trop de déchet. Le coach reprend la main au bout de dix matchs, et l'expérience laisse des traces.", fx: { coach: -8, role: -1, mor: -5 } },
      ] },
      { label: "Accepter d'être cadré", outcomes: [
        { weight: 60, text: "Discipliné, votre talent devient enfin régulier. Vous jouez tous les matchs.", fx: { m: 7, coach: 9, role: 1, t: 2 } },
        { weight: 40, text: "Bridé, vous n'êtes plus vous-même. La magie s'éteint.", fx: { t: -4, mor: -7, rep: -3 } },
      ] },
    ],
  },
  {
    id: "ev_zen_ritual", cat: "Vie perso", icon: "🧘", w: 14,
    cond: { aMin: 22, aMax: 38, trait: "zen" },
    text: "Votre calme intrigue. Un magazine veut consacrer un dossier à votre préparation mentale ; plusieurs coéquipiers vous demandent de les initier.",
    options: [
      { label: "Ouvrir mes séances au groupe", outcomes: [
        { weight: 70, text: "Le vestiaire entier y prend goût. L'équipe joue plus sereinement, et on sait à qui elle le doit.", fx: { team: 12, c: 5, coach: 6, mor: 5 } },
        { weight: 30, text: "Certains se moquent ouvertement. Vous refermez la porte.", fx: { team: -4, m: 4 } },
      ] },
      { label: "Garder ça pour moi", outcomes: [
        { weight: 65, text: "Votre bulle reste intacte, et votre régularité avec elle.", fx: { m: 7, form: 5, dis: 4 } },
        { weight: 35, text: "On vous trouve distant. Le groupe se resserre sans vous.", fx: { team: -6, m: 4 } },
      ] },
    ],
  },
  {
    id: "ev_clutch_reputation", cat: "Terrain", icon: "🎯", w: 16,
    cond: { aMin: 23, aMax: 36, trait: "clutch", minRep: 40 },
    text: "Votre réputation d'homme des grands soirs vous précède. Avant la rencontre décisive, le coach annonce devant le groupe : « Si ça se tend, on donne le ballon au patron. » Tous les regards se tournent vers vous.",
    options: [
      { label: "Assumer, c'est mon rôle", outcomes: [
        { weight: 60, text: "Le match se tend, vous prenez le ballon, et vous le mettez au fond. Encore.", fx: { rep: 10, mor: 10, coach: 7, team: 6 } },
        { weight: 40, text: "Le poids de l'attente vous paralyse. Ce soir-là, le patron n'a pas répondu.", fx: { rep: -6, mor: -9, form: -5 } },
      ] },
      { label: "Renvoyer la responsabilité au collectif", outcomes: [
        { weight: 55, text: "« On gagnera à onze. » Le message passe, le groupe se soude, et ça marche.", fx: { team: 10, c: 5, mor: 4 } },
        { weight: 45, text: "Le coach y voit une dérobade de la part de celui qu'il croyait indéboulonnable.", fx: { coach: -7, rep: -4 } },
      ] },
    ],
  },
  {
    id: "ev_leader_strike", cat: "Crise", icon: "✊", w: 15,
    cond: { aMin: 24, aMax: 38, trait: "leader" },
    text: "Trois mois de salaires impayés. Le groupe veut boycotter l'entraînement et vous demande, en tant que capitaine dans l'âme, de porter la parole devant la direction.",
    options: [
      { label: "Mener le mouvement", hint: "Exposé", outcomes: [
        { weight: 50, text: "Les salaires tombent en 48 heures. Le vestiaire vous suivrait n'importe où.", fx: { team: 15, rep: 6, c: 6, money: 1 } },
        { weight: 50, text: "La direction fait de vous le coupable et vous met au placard.", fx: { coach: -12, role: -1, rep: -3, flag: "listed" } },
      ] },
      { label: "Négocier en coulisses, sans esclandre", outcomes: [
        { weight: 65, text: "Un accord discret est trouvé. Tout le monde y gagne, et personne ne perd la face.", fx: { team: 8, coach: 6, m: 5, money: 0.6 } },
        { weight: 35, text: "Les promesses n'engagent que ceux qui les écoutent. Rien ne bouge.", fx: { team: -5, mor: -6 } },
      ] },
    ],
  },
  {
    // ================================================================
    // LOT « CONSÉQUENCES DIFFÉRÉES » : fx.sched permet de planter une décision
    // dont on récolte le fruit des années plus tard. Le procédé n'était presque
    // pas exploité — c'est pourtant ce qui fait qu'une carrière a une mémoire.
    // ================================================================
    id: "ev_investor_promise", cat: "Club", icon: "🏗️", w: 14,
    cond: { aMin: 21, aMax: 32, levels: ["d2", "d3", "regional"] },
    text: "Un investisseur rachète le club et promet monts et merveilles : « Dans trois ans, on joue le haut du tableau national. » Il vous propose de prolonger pour être le visage du projet.",
    options: [
      { label: "Prolonger et incarner le projet", hint: "Pari", outcomes: [
        { weight: 100, text: "Vous signez. Le club vous présente comme sa pierre angulaire — rendez-vous dans trois ans.", fx: { rep: 4, mor: 6, salaryMult: 1.25, sched: { id: "ev_investor_verdict", inYears: 3 } } },
      ] },
      { label: "Attendre de voir avant de m'engager", outcomes: [
        { weight: 60, text: "Vous restez prudent. Le temps dira qui avait raison.", fx: { m: 4 } },
        { weight: 40, text: "L'investisseur retient votre méfiance et se tourne vers d'autres cadres.", fx: { coach: -5, mor: -3 } },
      ] },
    ],
  },
  {
    id: "ev_investor_verdict", cat: "Club", icon: "⚖️", w: 1, scheduledOnly: true,
    text: "Trois ans ont passé depuis la promesse de l'investisseur. L'heure des comptes a sonné, et la presse locale attend le verdict devant les grilles du club.",
    options: [
      { label: "Découvrir le verdict", outcomes: [
        { weight: 40, text: "Promesse tenue : les infrastructures sont sorties de terre, l'effectif a changé de dimension, et le club monte d'un étage.", fx: { clubBoost: 1, mor: 12, rep: 6 } },
        { weight: 35, text: "Le projet a stagné. Ni catastrophe ni révolution — juste des slogans usés.", fx: { mor: -5, m: 4 } },
        { weight: 25, text: "L'investisseur a disparu avec la caisse. Le club est rétrogradé administrativement, et vous étiez le visage de tout ça.", fx: { clubBoost: -1, mor: -12, rep: -6, money: -1 } },
      ] },
    ],
  },
  {
    id: "ev_protege_seed", cat: "Vestiaire", icon: "🌱", w: 14,
    cond: { aMin: 24, aMax: 33 },
    text: "Un stagiaire de seize ans vous demande timidement de rester après l'entraînement pour travailler ses frappes. Il n'a rien d'exceptionnel, mais il a la faim dans les yeux.",
    options: [
      { label: "Rester avec lui, toutes les semaines", outcomes: [
        { weight: 100, text: "Deux heures de plus chaque semaine, pendant des mois. Personne ne le remarque — sauf lui.", fx: { c: 4, team: 5, mor: 4, sched: { id: "ev_protege_return", inYears: 6 } } },
      ] },
      { label: "Décliner, j'ai ma propre carrière à mener", outcomes: [
        { weight: 60, text: "Vous vous concentrez sur vous. C'est votre droit le plus strict.", fx: { t: 3, form: 3 } },
        { weight: 40, text: "Son regard déçu vous poursuit plus longtemps que prévu.", fx: { mor: -3, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_protege_return", cat: "Hommage", icon: "🤲", w: 1, scheduledOnly: true,
    text: "Six ans plus tard, le gamin des frappes du soir est devenu professionnel — et il vient de croiser votre route sur un terrain. Avant le coup d'envoi, il vient vous chercher devant tout le stade.",
    options: [
      { label: "L'accueillir comme il se doit", outcomes: [
        { weight: 55, text: "Il vous cite comme celui qui a tout changé, micro tendu, en direct. Le football entier retient l'histoire.", fx: { rep: 10, mor: 14, c: 5 } },
        { weight: 45, text: "Retrouvailles chaleureuses et pudiques. Ça ne se voit pas dans les statistiques, mais ça vaut une carrière.", fx: { mor: 10, c: 4, team: 4 } },
      ] },
    ],
  },
  {
    // ---- Expatriation : cond.abroad et cond.foreignLang étaient quasi inutilisés,
    // alors que jouer loin de chez soi est une des grandes histoires du football. ----
    id: "ev_language_wall", cat: "Vie perso", icon: "🗣️", w: 16,
    cond: { aMin: 19, aMax: 34, foreignLang: true },
    text: "Trois mois à l'étranger, et vous ne comprenez toujours pas les consignes tactiques sans traducteur. Le coach commence à s'agacer de devoir répéter.",
    options: [
      { label: "Prendre des cours intensifs tous les soirs", outcomes: [
        { weight: 70, text: "Six mois plus tard, vous parlez en réunion vidéo. Le vestiaire vous adopte pour de bon.", fx: { m: 7, team: 12, coach: 8, c: 4 } },
        { weight: 30, text: "Les cours s'ajoutent à la charge d'entraînement. Vous êtes épuisé.", fx: { form: -6, m: 4, team: 5 } },
      ] },
      { label: "M'appuyer sur un coéquipier qui parle ma langue", outcomes: [
        { weight: 55, text: "Il devient votre interprète et votre meilleur ami. Vous survivez très bien ainsi.", fx: { team: 7, mor: 5 } },
        { weight: 45, text: "Vous vous enfermez dans une bulle. Le reste du groupe vous reste étranger.", fx: { team: -8, coach: -5, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_expat_roots", cat: "Vie perso", icon: "✈️", w: 14,
    cond: { aMin: 24, aMax: 36, abroad: true, minRep: 30 },
    text: "Votre famille est restée au pays. Les enfants grandissent sur écran interposé, et la question revient à chaque appel : jusqu'à quand ?",
    options: [
      { label: "Les faire venir, coûte que coûte", outcomes: [
        { weight: 65, text: "Toute la famille s'installe. Vous retrouvez un équilibre, et ça se voit dès le week-end suivant.", fx: { mor: 12, form: 6, money: -1 } },
        { weight: 35, text: "Le déracinement est dur pour eux. La culpabilité pèse plus lourd que l'absence.", fx: { mor: -7, form: -4, money: -1.5 } },
      ] },
      { label: "Chercher un club plus près de chez moi", outcomes: [
        { weight: 55, text: "Un retour se dessine. Moins prestigieux, mais enfin chez vous.", fx: { mor: 8, transfer: { home: true } } },
        { weight: 45, text: "Aucune porte ne s'ouvre au pays. Il faudra tenir encore.", fx: { mor: -5, m: 4 } },
      ] },
    ],
  },
  {
    // ---- Le sommet : cond.minBallon n'était utilisé qu'une fois. ----
    id: "ev_ballon_pressure", cat: "Médias", icon: "👑", w: 18,
    cond: { aMin: 25, aMax: 36, minBallon: 1 },
    text: "Ballon d'Or en poche, chaque match devient un examen. Un éditorial demande ouvertement si vous n'êtes pas déjà « sur la pente descendante » — après trois matchs sans but.",
    options: [
      { label: "Répondre sur le terrain, sans un mot", outcomes: [
        { weight: 65, text: "Vous enchaînez une série monstrueuse. Le silence était la meilleure réponse.", fx: { rep: 9, form: 8, mor: 7, m: 5 } },
        { weight: 35, text: "La pression s'installe malgré vous. Le geste devient laborieux.", fx: { form: -8, mor: -7 } },
      ] },
      { label: "Recadrer le journaliste publiquement", outcomes: [
        { weight: 45, text: "Votre sortie fait date. Plus personne n'ose écrire une ligne de travers.", fx: { rep: 6, c: 5, mor: 6 } },
        { weight: 55, text: "On vous trouve arrogant. La presse entière se ligue contre vous.", fx: { rep: -8, mor: -6, dis: -4 } },
      ] },
    ],
  },
  {
    id: "ev_record_hunt", cat: "Records", icon: "📈", w: 14,
    cond: { aMin: 27, aMax: 39, minRep: 45 },
    text: "Il vous manque quelques réalisations pour effacer un record historique du club. La fin de saison ne compte plus au classement, mais le record, lui, compte pour l'éternité.",
    options: [
      { label: "Tout faire pour le record", hint: "Individualiste", outcomes: [
        { weight: 55, text: "Le record tombe dans les dernières minutes de la saison. Votre nom restera au fronton.", fx: { rep: 11, mor: 10, m: 3 } },
        { weight: 45, text: "Vous forcez trop, les partenaires le voient, et le record vous échappe de peu.", fx: { team: -8, mor: -7, rep: -2 } },
      ] },
      { label: "Jouer collectif, tant pis pour le record", outcomes: [
        { weight: 70, text: "Vous distribuez au lieu de conclure. Le vestiaire n'oubliera pas ce geste-là.", fx: { team: 12, c: 5, coach: 6, mor: 4 } },
        { weight: 30, text: "Le record file à un rival, et le regret s'installe pour de bon.", fx: { mor: -6, m: 3 } },
      ] },
    ],
  },
  {
    id: "ev_shirt_number", cat: "Insolite", icon: "🔢", w: 12,
    cond: { aMin: 20, aMax: 34 },
    text: "Le numéro mythique du club se libère : celui d'une légende dont le maillot est encore accroché dans tous les bars de la ville. L'intendant vous le propose.",
    options: [
      { label: "Prendre le numéro et l'assumer", hint: "Exposé", outcomes: [
        { weight: 50, text: "Vous le portez si bien que la ville finit par oublier l'ancien. Consécration.", fx: { rep: 10, mor: 8, c: 4 } },
        { weight: 50, text: "Chaque mauvais match ravive la comparaison. Le maillot pèse une tonne.", fx: { rep: -5, mor: -8, form: -5 } },
      ] },
      { label: "Garder le mien, je me construis seul", outcomes: [
        { weight: 65, text: "Votre numéro à vous, votre histoire à vous. Les supporters respectent la démarche.", fx: { mor: 6, m: 4, rep: 2 } },
        { weight: 35, text: "L'intendant le donne à un jeune recruté, qui en fait son emblème. Léger pincement.", fx: { mor: -3 } },
      ] },
    ],
  },
  {
    // ---- Lot « jeunes années » : la tranche 16-21 ans était deux fois moins
    // fournie que la trentaine, alors que c'est la phase qui décide si le joueur
    // s'attache à sa carrière. ----
    id: "ev_academy_cut", cat: "Crise", icon: "✂️", w: 16,
    cond: { aMin: 16, aMax: 18 },
    text: "Fin de saison au centre : le directeur sportif convoque les familles une par une. Sur trente garçons, huit seront conservés. Votre nom est sur la liste des indécis.",
    options: [
      { label: "Doubler les séances, tout donner", hint: "Épuisant", outcomes: [
        { weight: 45, text: "Vous vous entraînez jusqu'à l'écœurement. Le staff tranche en votre faveur : vous restez.", fx: { p: 5, m: 4, coach: 8, mor: 4 } },
        { weight: 30, text: "L'effort paie, mais votre corps encaisse mal la charge.", fx: { p: 3, coach: 5, inj: 4 } },
        { weight: 25, text: "Vous forcez trop, trop vite. Le corps lâche au pire moment.", fx: { inj: 9, mor: -8, coach: -3 } },
      ] },
      { label: "Jouer relâché, montrer ce que je sais faire", outcomes: [
        { weight: 50, text: "Libéré de la pression, vous réalisez vos meilleurs matchs de l'année. Conservé.", fx: { t: 4, mor: 6, coach: 5 } },
        { weight: 50, text: "Le staff prend votre détachement pour de la nonchalance. Vous passez à deux doigts de la porte.", fx: { coach: -8, mor: -6 } },
      ] },
      { label: "Chercher discrètement un autre centre", hint: "Prudent", outcomes: [
        { weight: 55, text: "Un club voisin vous ouvre ses portes avant même le verdict. Vous partez la tête haute.", fx: { c: 3, transfer: { d: 0, domestic: true } } },
        { weight: 45, text: "La rumeur remonte au directeur. Conservé, mais on n'oubliera pas que vous cherchiez ailleurs.", fx: { coach: -10, team: -5, rep: 2 } },
      ] },
    ],
  },
  {
    id: "ev_boarding_homesick", cat: "Vie perso", icon: "🏠", w: 14,
    cond: { aMin: 16, aMax: 19 },
    text: "Troisième mois d'internat. Les autres rient dans le couloir ; vous, vous fixez le plafond en pensant à la cuisine de chez vous. Le week-end de permission approche.",
    options: [
      { label: "Rentrer au pays quelques jours", outcomes: [
        { weight: 60, text: "Trois jours chez vous, et vous revenez rechargé comme une batterie neuve.", fx: { mor: 12, form: 5 } },
        { weight: 40, text: "Le retour est encore plus dur que le départ. Vous traînez ce vague à l'âme des semaines.", fx: { mor: -6, form: -5 } },
      ] },
      { label: "Rester et m'accrocher au groupe", outcomes: [
        { weight: 55, text: "Vous forcez le contact avec les autres pensionnaires. Une bande se forme, et l'internat devient une maison.", fx: { team: 10, mor: 6, c: 3 } },
        { weight: 45, text: "Vous restez, mais seul dans votre chambre. Les semaines s'étirent.", fx: { mor: -8, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_youth_captain", cat: "Vestiaire", icon: "🅒", w: 13,
    cond: { aMin: 17, aMax: 20, minTeam: 45 },
    text: "L'éducateur cherche un capitaine pour les U19. Il hésite entre vous et le meneur de jeu du groupe, plus âgé, plus bavard.",
    options: [
      { label: "Me porter candidat", outcomes: [
        { weight: 50, text: "Le brassard vous va comme un gant : vous parlez peu, mais chaque mot porte.", fx: { c: 5, m: 4, team: 6, trait: "leader" } },
        { weight: 50, text: "Vous obtenez le brassard, mais le vestiaire vous trouve prématuré. Il faudra le mériter.", fx: { c: 2, team: -4, m: 3 } },
      ] },
      { label: "Le laisser à l'autre et me concentrer sur mon jeu", outcomes: [
        { weight: 60, text: "Libéré des responsabilités, vous explosez techniquement sur la seconde partie de saison.", fx: { t: 6, form: 6 } },
        { weight: 40, text: "Vous jouez bien, mais l'éducateur note votre absence de leadership dans son rapport.", fx: { t: 3, coach: -4 } },
      ] },
    ],
  },
  {
    id: "ev_body_transform", cat: "Physique", icon: "💪", w: 14,
    cond: { aMin: 17, aMax: 21 },
    text: "Le préparateur physique est formel : votre corps d'adolescent ne tiendra pas le rythme des professionnels. Il propose un programme de renforcement sur mesure pour l'intersaison.",
    options: [
      { label: "Suivre le programme à la lettre", outcomes: [
        { weight: 65, text: "Six semaines de fonte et de proprioception : vous revenez avec un corps d'homme.", fx: { p: 8, m: 3, mor: 3 } },
        { weight: 35, text: "Vous prenez de la masse, mais perdez en légèreté dans les premiers appuis.", fx: { p: 7, t: -2 } },
      ] },
      { label: "Y aller à mon rythme, sans me dénaturer", outcomes: [
        { weight: 55, text: "Un entre-deux malin : vous gagnez en solidité sans rien perdre de votre toucher.", fx: { p: 4, t: 2 } },
        { weight: 45, text: "Trop tendre pour le niveau au-dessus. Les duels vous rappellent à l'ordre toute la saison.", fx: { p: 1, form: -5, coach: -3 } },
      ] },
      { label: "Refuser, mon jeu repose sur la vitesse", hint: "Risqué", outcomes: [
        { weight: 40, text: "Vous restez un félin, et votre vitesse devient votre marque de fabrique.", fx: { t: 5, rep: 3 } },
        { weight: 60, text: "Le corps ne suit pas la cadence : première vraie blessure musculaire.", fx: { inj: 7, p: -2, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_loan_or_bench", cat: "Mercato", icon: "🔁", w: 20,
    cond: { aMin: 18, aMax: 22, levels: ["d1", "elite"], nat: false },
    text: "Le coach est honnête : chez les pros, vous jouerez peu cette saison. Un club de l'échelon inférieur veut vous prêter et promet un rôle central. Rester et gratter des minutes, ou partir et tout jouer ?",
    options: [
      { label: "Partir en prêt et jouer", hint: "Temps de jeu", outcomes: [
        { weight: 60, text: "Prêt accepté. Titulaire dès la première journée, vous vivez enfin une saison pleine.", fx: { mor: 8, loan: true } },
        { weight: 40, text: "Le prêt se fait, mais le club d'accueil traverse une crise : le rôle promis se discute chaque semaine.", fx: { mor: -2, loan: true } },
      ] },
      { label: "Rester et m'imposer ici", hint: "Ambitieux", outcomes: [
        { weight: 40, text: "Vous grignotez des minutes, puis une place. Le coach finit par compter sur vous.", fx: { role: 1, coach: 7, m: 4, rep: 3 } },
        { weight: 60, text: "Une saison de banc. Vous vous entraînez au plus haut niveau, mais l'année de jeu est perdue.", fx: { role: -1, mor: -9, t: 2 } },
      ] },
    ],
  },
  {
    id: "ev_first_agent_pick", cat: "Entourage", icon: "🤝", w: 15,
    cond: { aMin: 17, aMax: 22 },
    text: "Deux agents vous courtisent. Le premier est un ancien joueur, discret, qui parle formation et patience. Le second est une figure du marché, costume impeccable, carnet d'adresses inépuisable.",
    options: [
      { label: "L'ancien joueur, la voie patiente", outcomes: [
        { weight: 65, text: "Il refuse deux offres à votre place et vous explique pourquoi. Votre carrière se construit sur du solide.", fx: { m: 6, mor: 4, coach: 4 } },
        { weight: 35, text: "Sa prudence vous coûte une belle opportunité. Vous commencez à douter de lui.", fx: { m: 3, mor: -4 } },
      ] },
      { label: "Le requin du marché", hint: "Ambitieux", outcomes: [
        { weight: 50, text: "En six mois, votre nom circule dans toute l'Europe et votre salaire double.", fx: { rep: 8, money: 1.5, salaryMult: 1.3 } },
        { weight: 50, text: "Il vous vend comme un produit. Le vestiaire s'en méfie, et vous aussi.", fx: { rep: 5, team: -8, mor: -5, trait: "mercenary" } },
      ] },
    ],
  },
  {
    // ---- Lot « statut au club » : le système de rôle pilote le temps de jeu mais
    // n'était presque jamais mis en scène par les événements. ----
    id: "ev_role_talk", cat: "Vestiaire", icon: "🗣️", w: 18,
    cond: { aMin: 20, aMax: 34, maxCoach: 62 },
    text: "Trois matchs de suite sur le banc. Vous croisez le coach dans le couloir du centre d'entraînement — c'est maintenant ou jamais pour vider votre sac.",
    options: [
      { label: "Exiger des explications, franchement", hint: "Risqué", outcomes: [
        { weight: 40, text: "Il apprécie le caractère : « Enfin quelqu'un qui a des tripes. » Vous êtes titulaire le week-end suivant.", fx: { role: 1, coach: 8, mor: 7 } },
        { weight: 60, text: "Il n'a pas aimé le ton. Vous voilà encore un peu plus loin du onze.", fx: { role: -1, coach: -10, mor: -6 } },
      ] },
      { label: "Demander calmement ce qu'il attend de moi", outcomes: [
        { weight: 60, text: "Il détaille deux points précis. Vous les travaillez, il le voit, votre temps de jeu remonte.", fx: { coach: 9, t: 3, mor: 4 } },
        { weight: 40, text: "Réponse polie et creuse. Rien ne change, sinon votre lucidité sur votre situation.", fx: { m: 3, mor: -3 } },
      ] },
      { label: "Me taire et répondre sur le terrain", outcomes: [
        { weight: 55, text: "Vous êtes le meilleur à chaque entraînement pendant un mois. Le coach cède à l'évidence.", fx: { role: 1, coach: 6, form: 6, m: 3 } },
        { weight: 45, text: "Vous travaillez en silence, mais personne ne remarque rien. La saison passe.", fx: { m: 4, mor: -5 } },
      ] },
    ],
  },
  {
    id: "ev_new_coach_reset", cat: "Club", icon: "🔄", w: 17,
    cond: { aMin: 19, aMax: 37 },
    text: "Nouveau coach, nouveau discours : « Ici, personne n'a de place acquise. Tout se rejoue à partir de lundi. » Pour certains c'est une menace, pour d'autres une chance.",
    options: [
      { label: "Me vendre dès la première séance", outcomes: [
        { weight: 50, text: "Vous crevez l'écran pendant la préparation. Le nouveau patron bâtit son équipe autour de vous.", fx: { role: 1, coach: 12, rep: 4, mor: 6 } },
        { weight: 50, text: "Vous en faites trop, et il n'aime pas les joueurs qui se montrent. Mauvais départ.", fx: { coach: -8, mor: -4 } },
      ] },
      { label: "Observer, comprendre son système, puis frapper", hint: "Patient", outcomes: [
        { weight: 60, text: "Vous décodez ses attentes avant les autres. En trois semaines, vous êtes indispensable à son plan.", fx: { role: 1, m: 5, coach: 8 } },
        { weight: 40, text: "Le temps que vous compreniez, d'autres ont pris les places. Il faudra attendre.", fx: { role: -1, coach: -3, m: 3 } },
      ] },
    ],
  },
  {
    id: "ev_star_signing_position", cat: "Club", icon: "🌟", w: 16,
    cond: { aMin: 21, aMax: 34, levels: ["d1", "elite"] },
    text: "Le club vient de signer une recrue à grand renfort de communication… exactement à votre poste. La presse locale a déjà fait ses comptes : il y a un titulaire de trop.",
    options: [
      { label: "Aller au duel, tous les jours", outcomes: [
        { weight: 45, text: "Vous ne lâchez rien : c'est LUI qui finit sur le banc. Le vestiaire en parle encore.", fx: { role: 1, coach: 8, rep: 6, mor: 8, m: 4 } },
        { weight: 55, text: "Le club a mis trop d'argent sur lui pour vous choisir. Vous reculez d'un cran.", fx: { role: -1, mor: -7, coach: -3 } },
      ] },
      { label: "Proposer au coach de jouer différemment", hint: "Malin", outcomes: [
        { weight: 55, text: "Vous vous décalez d'un cran et devenez complémentaire. Vous jouez tous les deux.", fx: { t: 4, m: 5, coach: 6 } },
        { weight: 45, text: "L'idée séduit sur le papier, mais vous perdez vos repères dans ce rôle bâtard.", fx: { form: -7, mor: -4 } },
      ] },
      { label: "Demander mon départ", hint: "Radical", outcomes: [
        { weight: 50, text: "Le club comprend et vous laisse partir vers un projet où vous êtes le patron.", fx: { transfer: { d: -1 }, mor: 4 } },
        { weight: 50, text: "La direction refuse et prend note de votre manque de patience.", fx: { coach: -7, team: -4, flag: "listed" } },
      ] },
    ],
  },
  {
    // ---- Lot « survie du club » : la lutte pour le maintien n'existait que par le
    // barrage final, jamais dans le vécu de la saison. ----
    id: "ev_survival_sprint", cat: "Crise", icon: "🔥", w: 17,
    cond: { aMin: 19, aMax: 38, levels: ["d1", "d2", "d3"] },
    text: "Cinq journées de la fin, le club est dans la zone rouge. Le président réunit le groupe : primes doublées en cas de maintien, mais l'ambiance est électrique et la presse ne lâche rien.",
    options: [
      { label: "Prendre l'équipe sur mon dos", hint: "Exposé", outcomes: [
        { weight: 45, text: "Vous portez le club dans le money-time. Le maintien porte votre nom, et le stade le sait.", fx: { rep: 10, mor: 10, team: 8, m: 5, trait: "clutch" } },
        { weight: 55, text: "Vous forcez, vous ratez, et la pression retombe sur vous plus que sur les autres.", fx: { rep: -5, form: -8, mor: -7 } },
      ] },
      { label: "Assurer le minimum, ne pas se blesser", hint: "Prudent", outcomes: [
        { weight: 55, text: "Sobre et propre, vous traversez la fin de saison sans dommage.", fx: { m: 3 } },
        { weight: 45, text: "Les supporters vous jugent transparent au pire moment. On s'en souviendra.", fx: { rep: -6, team: -6, mor: -4 } },
      ] },
      { label: "Souder le vestiaire en dehors du terrain", outcomes: [
        { weight: 60, text: "Repas, discussions, mise au point entre joueurs : le groupe se resserre et s'en sort.", fx: { team: 12, c: 4, mor: 6 } },
        { weight: 40, text: "Les clans sont trop installés. Vos efforts se perdent dans les non-dits.", fx: { team: -3, mor: -4, m: 2 } },
      ] },
    ],
  },
  {
    id: "ev_wage_cut", cat: "Finance", icon: "📉", w: 13,
    cond: { aMin: 22, aMax: 38, levels: ["d2", "d3", "regional"] },
    text: "Le club a mal digéré sa saison. La direction convoque les gros salaires : une baisse volontaire aiderait à garder l'effectif compétitif.",
    options: [
      { label: "Accepter la baisse", outcomes: [
        { weight: 65, text: "Votre geste marque les esprits, du vestiaire aux tribunes. Vous devenez un cadre moral du club.", fx: { salaryMult: 0.78, team: 12, coach: 8, rep: 4, trait: "loyal" } },
        { weight: 35, text: "Vous acceptez, et le club recrute… un joueur mieux payé que vous à votre poste.", fx: { salaryMult: 0.8, mor: -8, coach: 3 } },
      ] },
      { label: "Refuser, un contrat est un contrat", outcomes: [
        { weight: 55, text: "Vous tenez votre position, légitimement. La direction encaisse sans broncher.", fx: { m: 3 } },
        { weight: 45, text: "L'info fuite dans la presse locale. Les supporters vous désignent comme le symbole du problème.", fx: { rep: -6, team: -7, mor: -5 } },
      ] },
    ],
  },
  {
    // ---- Divers : catégories les moins fournies (Identité de jeu, Insolite,
    // Supporters, Hygiène de vie). ----
    id: "ev_position_switch_late", cat: "Identité de jeu", icon: "♟️", w: 14,
    cond: { aMin: 26, aMax: 36, minOvr: 60 },
    text: "Le coach vous prend à part avec une vidéo : « Tes jambes ne feront pas dix ans de plus, mais ta lecture du jeu, si. Recule d'une ligne, et tu joues jusqu'à 38 ans. »",
    options: [
      { label: "Reculer d'un cran, jouer avec la tête", outcomes: [
        { weight: 65, text: "Le repositionnement est une renaissance : vous voyez le jeu deux temps avant tout le monde.", fx: { m: 9, t: 3, coach: 6, mor: 5 } },
        { weight: 35, text: "L'adaptation est laborieuse, et vous perdez ce qui faisait votre force sans gagner le reste.", fx: { form: -8, mor: -6, m: 3 } },
      ] },
      { label: "Rester à mon poste, c'est mon identité", outcomes: [
        { weight: 50, text: "Vous tenez votre rang à l'ancienne, sur l'orgueil et le métier.", fx: { m: 4, rep: 3, mor: 4 } },
        { weight: 50, text: "Les jambes parlent avant l'orgueil. La saison est difficile.", fx: { p: -4, form: -6, coach: -4 } },
      ] },
    ],
  },
  {
    id: "ev_lucky_socks", cat: "Insolite", icon: "🧿", w: 11,
    cond: { aMin: 20, aMax: 40 },
    text: "Depuis six matchs sans défaite, vous enfilez la même paire de chaussettes trouées et empruntez le même couloir. Le kiné menace de les jeter à la machine.",
    options: [
      { label: "Défendre mes chaussettes bec et ongles", outcomes: [
        { weight: 55, text: "Le vestiaire en fait une légende. L'histoire tourne sur les réseaux et vous rend attachant.", fx: { rep: 5, mor: 6, team: 5 } },
        { weight: 45, text: "On vous chambre sans pitié, et la série s'arrête le week-end suivant.", fx: { mor: -4, form: -3 } },
      ] },
      { label: "Laisser tomber, ce n'est que du tissu", outcomes: [
        { weight: 60, text: "Libéré de vos rituels, vous jouez plus léger que jamais.", fx: { m: 5, form: 4, trait: "zen" } },
        { weight: 40, text: "Vous y pensez tout le match. Rien ne va.", fx: { form: -6, m: -2 } },
      ] },
    ],
  },
  {
    id: "ev_ultras_visit", cat: "Supporters", icon: "📣", w: 13,
    cond: { aMin: 20, aMax: 36, maxForm: 62 },
    text: "Après trois défaites, une délégation d'ultras franchit les grilles du centre d'entraînement. Ils ne veulent pas des excuses, ils veulent parler aux joueurs.",
    options: [
      { label: "Aller les voir seul, sans le service de sécurité", hint: "Courageux", outcomes: [
        { weight: 55, text: "Une heure debout sous la pluie à les écouter. Vous en ressortez adopté à vie.", fx: { rep: 8, team: 6, mor: 6, c: 4 } },
        { weight: 45, text: "Le ton monte, les caméras arrivent. Le club vous reproche d'avoir envenimé l'affaire.", fx: { coach: -7, mor: -6, rep: -3 } },
      ] },
      { label: "Laisser le capitaine et le club gérer", outcomes: [
        { weight: 60, text: "La délégation repart calmée. Vous n'avez rien gagné, rien perdu.", fx: { m: 2 } },
        { weight: 40, text: "Votre absence est remarquée dans le virage. La banderole du week-end porte votre nom.", fx: { rep: -5, mor: -6 } },
      ] },
    ],
  },
  {
    id: "ev_sleep_science", cat: "Hygiène de vie", icon: "😴", w: 13,
    cond: { aMin: 20, aMax: 34 },
    text: "Le club recrute un spécialiste du sommeil. Son verdict est sans appel : vos nuits sont hachées, et ça se voit sur vos fins de match.",
    options: [
      { label: "Suivre le protocole complet", hint: "Contraignant", outcomes: [
        { weight: 70, text: "Couvre-feu numérique, chambre noire, horaires fixes : vous découvrez ce que veut dire être vraiment reposé.", fx: { p: 5, form: 8, dis: 8, mor: 3 } },
        { weight: 30, text: "Le protocole vous obsède au point de vous empêcher de dormir. Ironique.", fx: { form: -4, m: -2 } },
      ] },
      { label: "Écouter poliment et ne rien changer", outcomes: [
        { weight: 50, text: "Vous continuez comme avant, sans dégât visible cette saison.", fx: { mor: 2 } },
        { weight: 50, text: "La fatigue chronique s'installe et grignote vos performances mois après mois.", fx: { form: -8, p: -3, dis: -5 } },
      ] },
    ],
  },
  {
    id: "ev_mentor_youngster", cat: "Vestiaire", icon: "🧑‍🏫", w: 15,
    cond: { aMin: 29, aMax: 40 },
    text: "Un gamin de dix-sept ans vient d'intégrer le groupe pro. Il joue à votre poste, il est brillant, et il vous regarde comme on regarde une affiche de chambre d'ado.",
    options: [
      { label: "Le prendre sous mon aile", outcomes: [
        { weight: 70, text: "Vous lui apprenez tout. Le club et le vestiaire voient en vous bien plus qu'un joueur.", fx: { c: 7, team: 10, coach: 6, mor: 6, trait: "leader" } },
        { weight: 30, text: "Vous le formez si bien qu'il vous prend votre place en fin de saison.", fx: { role: -1, c: 5, team: 8, mor: -5 } },
      ] },
      { label: "Le tenir à distance, c'est un concurrent", outcomes: [
        { weight: 45, text: "Vous protégez votre territoire et gardez votre place une saison de plus.", fx: { coach: 3, m: 3, mor: 2 } },
        { weight: 55, text: "Le vestiaire trouve l'attitude petite. Votre image de cadre en prend un coup.", fx: { team: -9, rep: -4, mor: -4 } },
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
    cond: { aMin: 24, aMax: 31, minTeam: 62, minClubSeasons: 3, notFlag: "captain" },
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
        { weight: 65, text: "Vous fédérez le groupe et haussez le ton au bon moment : un vrai patron est né.", fx: { rep: 5, m: 4, team: 6, mor: 5, flag: "captain" } },
        { weight: 35, text: "La responsabilité pèse plus lourd que prévu sur votre propre jeu.", fx: { form: -3, mor: -3, team: 2, flag: "captain" } },
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

// --- Export Node (data.js / engine.js / simulate.js) -----------------------
// Les constantes rejoignent l'objet global : data.js les recense ensuite dans
// son propre bloc d'export sans avoir à les redéclarer.
if (typeof module !== "undefined" && module.exports) {
  const parts = { EVENTS, MICRO_EVENTS };
  Object.assign(global, parts);
  module.exports = parts;
}
