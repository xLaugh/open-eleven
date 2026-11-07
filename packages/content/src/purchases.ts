// Achats de carrière : un écran « Dépenses » à chaque intersaison, un achat au plus.
//
// Prix : max(min, salary × salaire annuel du contrat), en M€ — un achat pèse autant
// en D3 qu'en élite. kind :
//   • duration : actif pendant `seasons` saisons, renouvelable une fois échu ;
//   • once     : une fois par carrière ;
//   • invest   : placer une part de la fortune (pari), au plus une fois tous les `every` ans.
// Effets plafonnés (cf. SHOP_EFFECTS) : acheter aide, ne gagne pas à votre place.
export const SHOP_ITEMS = [
  { id: "trainer", icon: "🏋️", name: "Préparateur physique perso", desc: "Moins de blessures, et quelques saisons de plus au haut niveau.", kind: "duration", seasons: 3, min: 0.15, salary: 0.25 },
  { id: "mental", icon: "🧠", name: "Coach mental", desc: "Un moral solide et plus de sang-froid dans les grands rendez-vous.", kind: "duration", seasons: 3, min: 0.15, salary: 0.25 },
  { id: "nutrition", icon: "🥗", name: "Nutritionniste", desc: "Une forme plus stable d'une saison à l'autre.", kind: "duration", seasons: 3, min: 0.05, salary: 0.1 },
  { id: "agent", icon: "🤝", name: "Agent star", desc: "Un carnet d'adresses en or : plus d'offres de transfert.", kind: "duration", seasons: 3, min: 0.1, salary: 0.3, minAge: 20 },
  { id: "house", icon: "🏡", name: "Maison pour la famille", desc: "Un foyer stable : le moral s'en ressent durablement.", kind: "once", min: 0.5, salary: 1 },
  { id: "car", icon: "🏎️", name: "Voiture de luxe", desc: "On parle de vous… pas toujours pour le football.", kind: "once", min: 0.3, salary: 0.6 },
  { id: "charity", icon: "❤️", name: "Fondation caritative", desc: "Votre nom au service des autres : réputation et héritage.", kind: "once", min: 1, salary: 0.8, minRep: 50 },
  { id: "invest", icon: "📈", name: "Investissement", desc: "Placer un tiers de votre fortune : ça passe ou ça casse.", kind: "invest", every: 3, minMoney: 1.5 },
  { id: "academy", icon: "⚽", name: "Académie à votre nom", desc: "Former les talents de demain : la marque des légendes.", kind: "once", min: 6, salary: 2.5, minAge: 31 },
];

export const SHOP_EFFECTS = {
  trainerInjuryMult: 0.75, // risque de blessure × 0,75
  trainerLongevity: 2,     // la pression de retraite recule (≈ une saison)
  mentalMoment: 0.04,      // +4 points de réussite dans les moments décisifs
  mentalMoral: 5,          // moral visé à l'intersaison
  nutritionForm: 6,        // forme visée à l'intersaison
  houseMoral: 6,           // moral visé, pour toujours
  houseMoralNow: 10,
  carRep: 4, carDiscipline: -8,
  agentOffers: 1,          // une offre de transfert de plus
  charityRep: 5, charityScore: 6,
  academyRep: 3, academyScore: 12,
  investShare: 1 / 3,
  // Issues du placement : [poids, multiplicateur de la mise].
  investOutcomes: [[40, 1.8], [35, 1.05], [25, 0.3]] as [number, number][],
};
