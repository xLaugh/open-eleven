// Notes de mise à jour, affichées aux joueurs (écran « Nouveautés » de l'accueil).
//
// Une entrée par version du moteur (ENGINE_VERSION), la plus récente EN PREMIER. Le
// numéro de la première entrée est celui que l'accueil affiche, et un test vérifie qu'il
// suit ENGINE_VERSION : avancer la version sans écrire sa note fait échouer « npm test ».
//
// Écrites pour les joueurs, pas pour les développeurs : ce qui change dans LEUR partie.
// Les titres et les lignes passent par la traduction comme le reste du contenu.

export type ChangeKind = "new" | "balance" | "fix";

export interface ChangelogEntry {
  version: string;
  /** AAAA-MM-JJ */
  date: string;
  title: string;
  items: { kind: ChangeKind; text: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "10.90",
    date: "2026-10-30",
    title: "Espagnol, arabe et mode Rivaux",
    items: [
      { kind: "new", text: "Le jeu se joue maintenant en espagnol et en arabe, avec une mise en page de droite à gauche pour l'arabe." },
      { kind: "new", text: "Salles : nouveau mode Rivaux. Chacun sa carrière et son club, jamais le même que les autres. Les saisons avancent ensemble, et après chacune, vous recevez les nouvelles de vos rivaux et votre place au classement." },
      { kind: "fix", text: "Des textes restaient en français dans les autres langues (accueil, compte, duels, salles, fiche finale) : ils sont traduits." },
      { kind: "fix", text: "Un club champion pouvait être envoyé au barrage de maintien, et relégué s'il le perdait : son titre le protège désormais, en solo comme en salle." },
      { kind: "balance", text: "Le Maroc rejoint les grandes sélections : 10e force mondiale en Coupe du Monde, devant l'Italie, la Belgique et l'Uruguay." },
    ],
  },
  {
    version: "10.89",
    date: "2026-10-28",
    title: "Coupes d'Europe au classement et vingt nouveaux événements",
    items: [
      { kind: "new", text: "Les coupes continentales se gagnent au classement de la saison passée, comme en vrai : top 4 en Coupe des Champions en Angleterre, Espagne, Italie et Allemagne, top 3 en France, top 2 au Portugal, aux Pays-Bas, en Belgique et en Turquie, le champion ailleurs. Les places suivantes mènent au Trophée et au Bouclier, plus nombreuses dans les championnats moyens et petits." },
      { kind: "new", text: "Hors d'Europe aussi : top 4 au Brésil et en Argentine, top 2 dans les autres pays, le champion en Océanie. Le vainqueur de la coupe nationale garde sa place en Trophée." },
      { kind: "balance", text: "Les grands clubs ne sont plus qualifiés d'office : ils finissent plus souvent en haut du classement, mais une saison ratée peut leur coûter l'Europe. À l'inverse, un club modeste porté par une grande saison peut décrocher sa place." },
      { kind: "new", text: "Le bilan de saison annonce la coupe jouée par votre club et celle qu'il a gagnée pour la saison suivante. En rejoignant un club, vous savez tout de suite s'il joue l'Europe." },
      { kind: "new", text: "Dix nouveaux événements pour les débuts (16-19 ans) : bourse d'une université américaine, éducateur renvoyé, douleur cachée avant la vitrine des pros, semaine avec l'équipe première, duel avec votre rival au tournoi des centres… Les premières saisons se ressemblent beaucoup moins." },
      { kind: "new", text: "Cinq pour la fin de carrière (baisse de salaire ou offres de l'étranger, mémoires, enfant au centre de formation, ovation chez l'ennemi…) et cinq pour le cœur de carrière (coéquipier en détresse, tentative de corruption, coups francs, podcast sans filtre…)." },
      { kind: "new", text: "24 nouvelles brèves de saison, surtout pour les jeunes années et après 33 ans, qui n'en avaient presque pas." },
    ],
  },
  {
    version: "10.88",
    date: "2026-10-27",
    title: "Toutes vos carrières sur votre compte",
    items: [
      { kind: "new", text: "Connecté, chaque carrière terminée est enregistrée sur votre compte, quel que soit le mode (carrière, défi du jour, duel, histoire, salle) : jusqu'à 1000, et plus seulement les 20 dernières." },
      { kind: "new", text: "Panthéon : un onglet « Mon compte » montre tout l'historique, filtrable par mode, avec la fiche complète de chaque carrière. Les favorites sont gardées pour toujours." },
      { kind: "new", text: "Les carrières déjà présentes au Panthéon de l'appareil rejoignent le compte à la connexion." },
    ],
  },
  {
    version: "10.87",
    date: "2026-10-24",
    title: "Qualifications des sélections",
    items: [
      { kind: "new", text: "Qualifications comme dans la réalité : toutes les nations jouent leurs éliminatoires, et seules les qualifiées disputent la Coupe du Monde (48), l'Euro, la CAN, la Coupe d'Asie (24), la Copa América (16) et la Coupe d'Océanie (8)." },
      { kind: "new", text: "Barrages de qualification joués en moment décisif, pour l'Euro, le Mondial et le barrage intercontinental." },
      { kind: "new", text: "Ligue des Sélections en quatre divisions (A à D), avec montées et descentes ; seule la Ligue A joue le trophée." },
      { kind: "balance", text: "Les tournois opposent désormais les vrais qualifiés : fini les petites nations en quart de Mondial par hasard. Pays hôtes réels jusqu'en 2034." },
    ],
  },
  {
    version: "10.86",
    date: "2026-10-24",
    title: "Clubs régionaux et salles repensées",
    items: [
      { kind: "new", text: "Salles repensées : les étapes de la partie, une place par joueur avec son avatar et son état, des invitations en un clic (et annulables), et un seul bouton pour la suite." },
      { kind: "new", text: "Un échelon régional (« Rég. ») dans les 13 grands championnats, avec 66 clubs amateurs : votre carrière peut désormais commencer tout en bas de la pyramide." },
    ],
  },
  {
    version: "10.85",
    date: "2026-10-24",
    title: "Classement du championnat",
    items: [
      { kind: "fix", text: "Un club ne peut plus finir premier de son championnat sans être sacré champion : la première place est désormais réservée au titre." },
    ],
  },
  {
    version: "10.84",
    date: "2026-10-23",
    title: "Neuf nouveaux événements",
    items: [
      { kind: "new", text: "Physique : un régime extrême avant un grand tournoi, et une cabine de cryothérapie qui divise le vestiaire." },
      { kind: "new", text: "Réseaux : une vidéo de vous devient un mème mondial, et un faux compte à votre nom arnaque vos supporters." },
      { kind: "new", text: "Rivalité : votre rival vous provoque avant un derby, puis vous dispute la même place en sélection." },
      { kind: "new", text: "Records : la légende du club qui détient le record de buts n'apprécie pas de vous voir approcher." },
      { kind: "new", text: "Retraite : un dernier défi dans votre pays natal, et un ancien coéquipier devenu entraîneur qui veut vous dans son staff." },
    ],
  },
  {
    version: "10.83",
    date: "2026-10-23",
    title: "Nouveau site et nouvelles compétitions",
    items: [
      { kind: "new", text: "Le jeu a désormais son propre serveur : comptes, sauvegardes, amis, duels et salles ne dépendent plus d'un service extérieur. Vos comptes et vos parties ont été repris." },
      { kind: "new", text: "Nouvelles compétitions : la Coupe arabe, et les Jeux régionaux en U23 (Jeux asiatiques, africains, panaméricains et du Pacifique)." },
      { kind: "new", text: "Cette page de nouveautés, et la version du jeu affichée sur l'accueil." },
      { kind: "new", text: "Fiche finale : le classement du club à chaque saison, et la sélection saison par saison (matchs, buts, passes décisives, tournois joués)." },
      { kind: "new", text: "Profil : choisissez votre avatar parmi 36, consultez votre propre fiche telle que les autres la voient, et retrouvez « Mon compte » rangé en trois onglets (Profil, Sauvegarde, Sécurité)." },
      { kind: "new", text: "Notifications : une cloche 🔔 et un bandeau en direct quand on vous invite, vous défie, accepte votre demande d'ami ou rejoint votre salle — avec les boutons pour répondre aussitôt." },
      { kind: "new", text: "Salles : comparatif côte à côte de tous les membres et historique saison par saison de chacun, en direct comme en fin de carrière." },
      { kind: "balance", text: "Salles : la saison du club est la même pour tous (classement, montée, descente, finales et leur résultat), tirée selon le niveau moyen de l'équipe. Une finale se joue ensemble ; votre choix décide de votre prestation." },
      { kind: "balance", text: "Offres de transfert plus variées : davantage de pays proposés, et moins de clubs africains pour un joueur qui n'est pas africain." },
      { kind: "balance", text: "Votre entourage pèse sur le mercato : la famille limite les offres, un agent ambitieux en apporte davantage." },
      { kind: "fix", text: "Salles : un joueur ne peut plus prendre une saison d'avance sur les autres." },
      { kind: "fix", text: "Salles : un transfert voté en cours de saison s'applique à tous avant la saison suivante, et un changement de division du club vaut pour toute la salle." },
      { kind: "fix", text: "En anglais, un club d'élite n'est plus traité comme une division inférieure (plus de « barrage de montée » depuis l'élite)." },
      { kind: "fix", text: "En anglais, les étapes de la Coupe du Monde ne restent plus en français." },
      { kind: "fix", text: "Sécurité renforcée : 16 caractères minimum pour tout nouveau mot de passe, et plusieurs protections ajoutées." },
    ],
  },
  {
    version: "10.81",
    date: "2026-10-07",
    title: "Palmarès et noms de pays",
    items: [
      { kind: "balance", text: "Le palier « Icône mondiale » devient plus rare : il est réservé aux plus grandes carrières." },
      { kind: "new", text: "Le palmarès s'adapte au continent de votre club." },
      { kind: "fix", text: "Les noms de pays prennent leur article : « en France », « au Brésil », « aux Pays-Bas »…" },
    ],
  },
  {
    version: "10.80",
    date: "2026-10-06",
    title: "Double nationalité",
    items: [
      { kind: "new", text: "Un binational jamais appelé en sélection a une seconde chance de choisir son autre pays." },
      { kind: "fix", text: "Les derniers ajouts sont traduits en anglais, sponsors et coupes U17 compris." },
    ],
  },
  {
    version: "10.79",
    date: "2026-10-06",
    title: "U17, réserve et match pour la 3ᵉ place",
    items: [
      { kind: "new", text: "Les débuts passent par les U17 et la réserve avant l'équipe première." },
      { kind: "new", text: "Les tournois se jouent avec un match pour la 3ᵉ place." },
      { kind: "balance", text: "Le niveau des vétérans est plafonné." },
    ],
  },
  {
    version: "10.77",
    date: "2026-10-03",
    title: "Centres de formation",
    items: [
      { kind: "new", text: "Plus de choix de centres de formation au départ, dont une offre venue de l'étranger." },
      { kind: "fix", text: "Hors d'Europe, le bilan de saison affiche le bon nom des coupes continentales." },
    ],
  },
  {
    version: "10.76",
    date: "2026-10-03",
    title: "Sponsors par paliers",
    items: [
      { kind: "new", text: "Les sponsors arrivent par paliers de réputation, à la place du simple renouvellement de contrat." },
    ],
  },
  {
    version: "10.75",
    date: "2026-08-24",
    title: "Sponsors et événements",
    items: [
      { kind: "new", text: "Offres de sponsors plus variées, et sept nouveaux événements." },
    ],
  },
  {
    version: "10.73",
    date: "2026-08-24",
    title: "Pyramide des divisions",
    items: [
      { kind: "balance", text: "La D3 est réservée aux grands championnats, et la pyramide des petites nations est simplifiée." },
    ],
  },
  {
    version: "10.72",
    date: "2026-08-24",
    title: "Mercato",
    items: [
      { kind: "new", text: "Offres de transfert plus variées, et huit nouveaux événements." },
      { kind: "fix", text: "Le niveau des clubs déjà croisés s'affiche correctement." },
    ],
  },
  {
    version: "10.70",
    date: "2026-08-24",
    title: "Contrats et confiance",
    items: [
      { kind: "new", text: "Les contrats de sponsoring restent actifs au fil de votre carrière." },
      { kind: "new", text: "La confiance de l'entraîneur et de la direction met désormais la pression." },
    ],
  },
  {
    version: "10.69",
    date: "2026-08-16",
    title: "Salles multijoueur",
    items: [
      { kind: "new", text: "Carrière commune : jusqu'à 4 amis vivent la même carrière dans le même club, et votent ensemble les transferts." },
      { kind: "new", text: "Onglet Salle en jeu, comparatif des statistiques entre membres, et trophées de club partagés." },
      { kind: "new", text: "Amis et Duels réunis dans un seul panneau." },
      { kind: "new", text: "Un palier D4 pour l'Angleterre, distinct du football régional." },
    ],
  },
  {
    version: "10.68",
    date: "2026-08-13",
    title: "Supercoupe continentale",
    items: [
      { kind: "new", text: "Nouvelle Supercoupe continentale, pour les vainqueurs de C1 ou de C2." },
    ],
  },
];
