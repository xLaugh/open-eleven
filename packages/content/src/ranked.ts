// Ranked et étoiles du défi du jour.
//
// Chaque jour, le défi porte un OBJECTIF (tiré de la date, le même pour tous, adapté au
// profil imposé) qui rapporte de 0 à 3 étoiles. La première partie terminée du jour
// compte pour le ranked : les étoiles y deviennent des points de rang, selon le palier.
// Le serveur rejoue la partie et recalcule les étoiles lui-même (cf. engine/stars.ts).

// Paliers, du plus bas au plus haut. gain[n] = points de rang pour n étoiles : plus on
// monte, plus on attend de vous (une journée sans étoile coûte des points dès l'Or).
// La Légende n'a pas de division : ses points s'accumulent et font le classement.
export const RANKED_TIERS = [
  { id: "bronze", name: "Bronze", img: "ranked/bronze.svg", color: "#b0703a", gain: [0, 2, 4, 6] },
  { id: "silver", name: "Argent", img: "ranked/argent.svg", color: "#8e9aa4", gain: [0, 2, 4, 6] },
  { id: "gold", name: "Or", img: "ranked/or.svg", color: "#e0a91f", gain: [-2, 1, 3, 5] },
  { id: "platinum", name: "Platine", img: "ranked/platine.svg", color: "#3f88c5", gain: [-2, 1, 3, 5] },
  { id: "diamond", name: "Diamant", img: "ranked/diamant.svg", color: "#7a4bc0", gain: [-4, -1, 2, 4] },
  { id: "legend", name: "Légende", img: "ranked/legende.svg", color: "#e0701c", gain: [-4, -1, 2, 4] },
];
export const RANKED_UNRANKED = { name: "Non classé", img: "ranked/non-classe.svg" };

export const RANKED_RULES = {
  // Points pour passer à la division supérieure (III → II → I → palier suivant).
  pointsPerDivision: 10,
  divisions: 3,
  // Jours protégés après l'arrivée dans un nouveau palier : les points ne descendent
  // pas sous 0, on ne peut donc pas retomber aussitôt.
  protectDays: 3,
  // Inactivité : à partir de ce palier (Diamant), chaque tranche de jours sans partie
  // classée coûte des points, pour que le haut du classement reste vivant.
  decayFromTier: 4,
  decayEveryDays: 3,
  decayPoints: 2,
};

// Objectifs du défi : trois paliers d'étoiles chacun (labels[1..3]). {n} = seuil chiffré du jour.
export const DAILY_OBJECTIVES = {
  club: { icon: "🏟️", title: "Saison de club", labels: { 1: "Gagner une coupe nationale", 2: "Être champion de première division", 3: "Gagner une coupe continentale de clubs" } },
  wc: { icon: "🌍", title: "Parcours au Mondial", labels: { 1: "Atteindre les quarts de finale", 2: "Atteindre les demi-finales", 3: "Atteindre la finale" } },
  cont: { icon: "🏆", title: "Coupe continentale des nations", labels: { 1: "Atteindre les quarts de finale", 2: "Atteindre les demi-finales", 3: "Atteindre la finale" } },
  ballon: { icon: "⭐", title: "Ballon d'Or", labels: { 1: "Finir dans le top 30", 2: "Finir dans le top 10", 3: "Monter sur le podium" } },
  goals: { icon: "⚽", title: "Buteur", labels: { 1: "{n} buts en carrière", 2: "{n} buts en carrière", 3: "{n} buts en carrière" } },
  cleanSheets: { icon: "🧤", title: "Le mur", labels: { 1: "{n} matchs sans encaisser", 2: "{n} matchs sans encaisser", 3: "{n} matchs sans encaisser" } },
  caps: { icon: "🎽", title: "Fidèle à la sélection", labels: { 1: "{n} sélections", 2: "{n} sélections", 3: "{n} sélections" } },
};

// Libellés COURTS des paliers (« clé + numéro de palier »), pour la carte de l'accueil
// et le rappel en jeu ; les libellés complets restent en info-bulle.
export const DAILY_OBJECTIVE_SHORTS: Record<string, string> = {
  club1: "Coupe nationale", club2: "Titre en D1", club3: "Coupe continentale",
  wc1: "Quarts", wc2: "Demies", wc3: "Finale",
  cont1: "Quarts", cont2: "Demies", cont3: "Finale",
  ballon1: "Top 30", ballon2: "Top 10", ballon3: "Podium",
  goals1: "{n} buts", goals2: "{n} buts", goals3: "{n} buts",
  cleanSheets1: "{n} sans encaisser", cleanSheets2: "{n} sans encaisser", cleanSheets3: "{n} sans encaisser",
  caps1: "{n} sélections", caps2: "{n} sélections", caps3: "{n} sélections",
};

// Tirage et seuils, calibrés sur des milliers de défis simulés : avec des choix au
// hasard, environ un joueur sur deux décroche une étoile et un sur cinq les trois.
// minW = force de nation minimale pour que l'objectif soit atteignable.
export const DAILY_OBJECTIVE_POOL = [
  { id: "club", weight: 3, minW: 0 },
  { id: "wc", weight: 2, minW: 0.55 },
  { id: "cont", weight: 2, minW: 0.35 },
  { id: "ballon", weight: 1, minW: 0.35 },
  { id: "stats", weight: 2, minW: 0 },
  { id: "caps", weight: 1, minW: 0 },
];
export const DAILY_STAT_THRESHOLDS = {
  goals: { att: [300, 400, 480], mil: [90, 130, 170], def: [40, 52, 62] },
  cleanSheets: [330, 370, 420],
  // Par force de nation : [minW, seuils].
  caps: [
    { minW: 0.55, n: [50, 90, 120] },
    { minW: 0.35, n: [60, 100, 130] },
    { minW: 0, n: [50, 85, 110] },
  ],
};
