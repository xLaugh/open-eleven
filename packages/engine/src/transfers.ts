// Mercato : offres, prêts, sponsors, fenêtre de transfert.

import { rng } from "./rng";
import { clamp, rand, randInt, pick, weightedRandom, sampleDiverseByCountry, fmtMoney } from "./utils";
import { tx } from "./text";
import { roleForClub } from "./role";
import { squadOf, squadForClub } from "./squad";
import { clubHomeOf, continentOf, countryOf, lvlOf } from "./clubs";
import { ovr, hasTrait } from "./player";
import type { CareerState, Club, LevelId, LoanOffer, OfferSpec, SeasonReport, TransferOffer, TransferWindow } from "./types";
import { BALANCE, CLUBS, CLUBS_BY_LEVEL, COACH_NAMES, LEVEL_ORDER } from "@open-eleven/content";

// --- Mercato -----------------------------------------------------------------
// Poids d'un pays comme destination, pour CE joueur : le continent du club
// compte (BALANCE.offerContinent), avec un bonus pour celui du joueur.
// Aucun tirage : une simple dérivation.
function destinationWeight(s: CareerState) {
  const mine = continentOf(s.nationality.homeCountryId);
  const { home, weights } = BALANCE.offerContinent;
  return (countryId: string) => {
    const cont = continentOf(countryId);
    return ((cont && weights[cont]) || 0.3) * (cont === mine ? home : 1);
  };
}

export function marketValue(s: CareerState) {
  const ageF = s.age < 24 ? 1.35 : s.age <= 28 ? 1.1 : s.age <= 31 ? 0.65 : 0.3;
  // Coefficient revu à la baisse (0.85, était 1.5) pour des montants de
  // transfert plus réalistes : les indemnités s'étaient envolées trop haut.
  return Math.max(0.2, (ovr(s) - 50) * 0.85 * ageF * (1 + s.rep / 90));
}

export function salaryFor(s: CareerState, club: Club) {
  const country = countryOf(club.countryId);
  // Les pétromonarchies du Golfe (Arabie Saoudite, Qatar, Émirats) paient sur
  // une base "élite" quel que soit le niveau réel du club : c'est tout leur
  // argument (« l'or du désert »).
  const levelBase = country && country.gulf ? BALANCE.salaryBase.elite : BALANCE.salaryBase[lvlOf(s, club)];
  // Le salaire suit la carrière : un vétéran sur le déclin ne touche plus les
  // émoluments de sa grande époque. Au-delà de 30 ans, la barre baisse par
  // paliers (un club ne prolonge plus un trentenaire au même tarif qu'à 27 ans).
  const ageSal = s.age <= 30 ? 1 : s.age <= 33 ? 0.82 : s.age <= 36 ? 0.6 : s.age <= 39 ? 0.42 : 0.3;
  const base = levelBase * (country ? country.salaryMult : 1) * ageSal;
  return Math.max(0.02, Math.round(base * (0.4 + ovr(s) / 90 + s.rep / 160) * rand(0.85, 1.25) * 100) / 100);
}

export function buildOffer(s: CareerState, club: Club) {
  const gulf = !!(countryOf(club.countryId) || {}).gulf;
  return {
    club,
    fee: Math.max(0.1, Math.round(marketValue(s) * BALANCE.feeMult[lvlOf(s, club)] * (gulf ? 1.4 : 1) * rand(0.8, 1.3) * 10) / 10),
    salary: salaryFor(s, club),
    years: randInt(2, 5),
    gulf,
    role: roleForClub(s, club), // statut proposé (Espoir → Titulaire) : la vraie info de décision
  };
}

// spec : { d, toLevel (niveau imposé), cross, gulf, home (pays natal),
//          domestic (même pays) }. Règle des mineurs : avant 18 ans, un
//          joueur au Brésil ne peut pas être transféré à l'étranger.
export function offersFor(s: CareerState, spec?: OfferSpec | null): TransferOffer[] {
  const d = spec && spec.d != null ? spec.d : 0;
  let targetLevel = spec && spec.toLevel
    ? spec.toLevel
    : LEVEL_ORDER[clamp(LEVEL_ORDER.indexOf(lvlOf(s, s.club)) + d, 0, LEVEL_ORDER.length - 1)];
  // Barre de recrutement : pour MONTER d'un cran (transfert ordinaire), il faut
  // en avoir le niveau. Un OVR sous la barre du niveau visé fait capoter la
  // promotion — on reste à son étage. Les chemins spéciaux (Golfe, retour au
  // pays/formateur, club ciblé, descente forcée) ne sont pas concernés.
  if (!(spec && (spec.toLevel || spec.clubId || spec.origin || spec.gulf || spec.exotic || spec.home))) {
    const curIdx = LEVEL_ORDER.indexOf(lvlOf(s, s.club));
    if (LEVEL_ORDER.indexOf(targetLevel) > curIdx && ovr(s) < (BALANCE.signingBar[targetLevel] || 0)) {
      targetLevel = LEVEL_ORDER[curIdx]; // pas encore le niveau : la montée n'a pas lieu
    }
  }
  const minorLock = s.age < 18 && s.club.countryId === "br";
  // Salle « Rivaux » : le club d'un rival n'est jamais une destination (aucun effet hors salle).
  const free = (c: Club) => !(s.blockedClubs && s.blockedClubs.includes(c.id));
  let pool: Club[];
  if (spec && spec.clubId) {
    // Événement/Histoire ciblé : UN club précis vient vous chercher.
    const target = CLUBS.filter((c) => c.id === spec.clubId && c.id !== s.club.id && free(c));
    return target.map((club) => buildOffer(s, club));
  } else if (spec && spec.origin) {
    // Retour aux sources : uniquement le club formateur (aucun repli)
    const originPool = CLUBS.filter((c) => c.id === s.clubsPlayed[0] && c.id !== s.club.id && free(c));
    return originPool.map((club) => buildOffer(s, club));
  } else if (spec && (spec.gulf || spec.exotic) && !minorLock) {
    // « Or du désert » : un club du Golfe (Arabie Saoudite / Qatar) vient vous chercher.
    // (spec.exotic : ancien nom de spec.gulf, encore accepté par sécurité.)
    pool = CLUBS.filter((c) => !!countryOf(c.countryId)?.gulf && c.id !== s.club.id);
  } else {
    pool = CLUBS_BY_LEVEL[targetLevel].filter((c) => {
      const co = countryOf(c.countryId);
      if (co!.gulf) return false; // le Golfe ne se signe jamais par un transfert ordinaire
      if (c.id === s.club.id) return false;
      if (minorLock) return c.countryId === s.club.countryId;
      if (spec && spec.home) return c.countryId === clubHomeOf(s.nationality);
      if (spec && spec.domestic) return c.countryId === s.club.countryId;
      if (spec && spec.cross) return c.countryId !== s.club.countryId;
      return true;
    });
  }
  pool = pool.filter(free);
  if (pool.length === 0 && spec && spec.home) {
    // Aucun club du pays natal à ce niveau : élargir aux niveaux voisins
    pool = CLUBS.filter((c) => c.countryId === clubHomeOf(s.nationality) && c.id !== s.club.id && !(countryOf(c.countryId) || {}).gulf && free(c));
  }
  if (pool.length === 0) pool = CLUBS_BY_LEVEL[targetLevel].filter((c) => c.id !== s.club.id && free(c));
  // Plus d'offres, venues de plus de pays (c'était 1 à 3), et pondérées par continent.
  const drawn = weightedRandom(BALANCE.offerCount, (e) => e[1])[0];
  const shift = (s.entourage && BALANCE.offerCountByEntourage[s.entourage.id]) || 0;
  const count = Math.min(pool.length, clamp(drawn + shift, 1, BALANCE.offerCountMax));
  const offers = sampleDiverseByCountry<Club>(pool, count, destinationWeight(s)).map((club) => buildOffer(s, club));
  // Une clause libératoire rend le joueur plus abordable → plus d'offres sérieuses
  if (s.flags.release_clause) offers.forEach((o) => { o.fee = Math.round(o.fee * 0.75 * 10) / 10; });
  return offers;
}

export function loanOffersFor(s: CareerState) {
  const idx = LEVEL_ORDER.indexOf(lvlOf(s, s.club));
  const levels = [LEVEL_ORDER[Math.max(0, idx - 1)], LEVEL_ORDER[Math.max(0, idx - 2)]];
  let pool = CLUBS.filter((c) => levels.includes(c.level) && c.id !== s.club.id && !(countryOf(c.countryId) || {}).gulf && !(s.blockedClubs && s.blockedClubs.includes(c.id)));
  const domestic = pool.filter((c) => c.countryId === s.club.countryId);
  if (domestic.length >= 2) pool = domestic;
  const count = Math.min(pool.length, weightedRandom(BALANCE.loanOfferCount, (e) => e[1])[0]);
  return sampleDiverseByCountry(pool, count, destinationWeight(s)).map((club): LoanOffer => ({ club, loan: true }));
}

export function applyLoan(s: CareerState, offer: LoanOffer) {
  // Un prêt, c'est du temps de jeu chez les pros : l'effectif d'origine est
  // mémorisé pour le retour.
  s.loan = { parentClub: s.club, parentCoach: s.coach, loanClubId: offer.club.id, parentSquad: squadOf(s) };
  s.squad = "first";
  s.club = offer.club;
  s.coach = pick(COACH_NAMES);
  s.coachRel = 58;
  if (!s.clubsPlayed.includes(offer.club.id)) s.clubsPlayed.push(offer.club.id);
  s.transferHistory.push({
    age: s.age,
    fromClubName: s.loan.parentClub.name,
    toClubName: offer.club.name,
    countryName: countryOf(offer.club.countryId)!.name,
    countryId: offer.club.countryId,
    fee: null,
    loan: true,
    level: lvlOf(s, offer.club),
  });
  s.history.push({ age: s.age, text: tx(s, "loanOut", { toClub: offer.club.name }), impact: 4 });
}

export function transferWindow(s: CareerState, report: SeasonReport) {
  if (s.age >= BALANCE.ageMax) return null;
  if (s.loan) return null;
  const contractUp = s.contract.years <= 0;
  let reason: string | null = null, spec: OfferSpec = { d: 0 };

  // Le club de prêt de l'an passé revient avec une offre définitive
  if (s.loanReturn) {
    const club = CLUBS.find((c) => c.id === s.loanReturn.clubId);
    s.loanReturn = null;
    if (club) {
      return {
        reason: tx(s, "winLoanBuy", { club2: club.name }),
        offers: [buildOffer(s, club)],
        contractUp: false,
        renewSalary: salaryFor(s, s.club),
      };
    }
  }

  // Vétéran au-delà de 42 ans : l'élite ferme ses portes. Plus aucun cador ne
  // prolonge — seuls des clubs modestes (D3/D4/Régional le plus souvent, rarement
  // D2/D1) veulent encore d'un joueur de cet âge. Un gardien, dont l'usure est
  // moindre, tient un cran plus haut. Aucune prolongation possible : il faut
  // rebondir plus bas, saison après saison, ou raccrocher.
  if (s.age >= 42) {
    const gk = s.position.id === "gk";
    const r = rng();
    let target: LevelId = gk
      ? (r < 0.15 ? "d1" : r < 0.5 ? "d2" : r < 0.75 ? "d3" : r < 0.9 ? "d4" : "regional")
      : (r < 0.04 ? "d1" : r < 0.13 ? "d2" : r < 0.5 ? "d3" : r < 0.75 ? "d4" : "regional");
    const curIdx = LEVEL_ORDER.indexOf(lvlOf(s, s.club));
    // Plafond d'âge : passé un certain âge, plus personne n'aligne un joueur
    // au-dessus d'un niveau donné. Tant qu'il est AU-DESSUS du plafond, le
    // club ne prolonge pas (aucun « Rester ») : il faut descendre, au pays
    // si un club de ce niveau existe. Et si personne ne se manifeste, la
    // carrière s'arrête là.
    const V = BALANCE.veteranCap;
    const capRule = V.caps.find((c) => s.age >= c.age + (gk ? V.gkBonus : 0));
    if (capRule) {
      const capLevel = capRule.level as LevelId;
      const capIdx = LEVEL_ORDER.indexOf(capLevel);
      if (LEVEL_ORDER.indexOf(target) > capIdx) target = capLevel;
      if (curIdx > capIdx) {
        const firstCapAge = V.caps[V.caps.length - 1].age + (gk ? V.gkBonus : 0);
        const pNone = clamp(V.noClubBase + (s.age - firstCapAge) * V.noClubStep, 0, V.noClubMax);
        const offers = rng() < pNone ? [] : offersFor(s, { toLevel: target, domestic: true });
        if (!offers.length) {
          s.retiring = true;
          const reason = tx(s, "vetNoClub");
          s.history.push({ age: s.age, text: reason, impact: -6 });
          return { retire: true, reason, offers: [] as TransferOffer[], contractUp: false };
        }
        return { reason: tx(s, "winAgeCap"), offers, contractUp: false, noStay: true, renewSalary: salaryFor(s, s.club) };
      }
    }
    if (LEVEL_ORDER.indexOf(target) > curIdx) target = LEVEL_ORDER[curIdx]; // ne remonte jamais
    return {
      reason: gk
        ? tx(s, "winOldGk")
        : tx(s, "winTooOld"),
      offers: offersFor(s, { toLevel: target }),
      contractUp: false, // pas de prolongation : le vétéran doit descendre pour continuer
      renewSalary: salaryFor(s, s.club),
    };
  }

  // Joueur DÉPASSÉ par le niveau de son club : nettement sous le niveau attendu
  // ET une saison ratée (banc ou note < 6) → le club s'en sépare et le pousse
  // d'un cran (deux s'il est très loin du compte). Aucune prolongation : soit on
  // redescend se relancer, soit on raccroche. C'est le prix du haut niveau.
  const curLvl = lvlOf(s, s.club);
  const expectedHere = BALANCE.expectedLevel[curLvl];
  const outOfDepth = ovr(s) < expectedHere - 7;
  const badSeason = report && (report.benched || (report.rating != null && report.rating < 6.0));
  if (curLvl !== "regional" && outOfDepth && badSeason) {
    const drop = ovr(s) < expectedHere - 16 ? -2 : -1;
    return {
      reason: tx(s, "winTooWeak"),
      offers: offersFor(s, { d: drop }),
      contractUp: false,
      renewSalary: salaryFor(s, s.club),
    };
  }

  if (contractUp) {
    // Le club ne prolonge PAS automatiquement : une saison ratée (note faible,
    // banc, coach à cran) peut le pousser à NE PAS renouveler → il faut rebondir
    // ailleurs, souvent un cran plus bas. Les cadres (Important/Titulaire) sont
    // mieux protégés ; un Espoir/Sporadique est plus vite lâché.
    const r = report && report.rating != null ? report.rating : 6.2;
    const benched = report && report.benched;
    let decline = 0;
    if (r < 5.4 || (benched && s.coachRel < 30)) decline = 0.85;
    else if (benched || r < 6.0 || s.coachRel < 35) decline = 0.55;
    else if (r < 6.4) decline = 0.2;
    decline *= (s.role >= 3 ? 0.55 : s.role <= 1 ? 1.3 : 1);
    if (decline > 0 && rng() < decline) {
      let offers: TransferOffer[] = [];
      for (let d = (r < 5.4 ? -1 : (rng() < 0.5 ? -1 : 0)); d >= -3 && !offers.length; d--) offers = offersFor(s, { d });
      if (offers.length) {
        return {
          reason: tx(s, "winNoRenew"),
          offers, contractUp: false, noStay: true, renewSalary: salaryFor(s, s.club),
        };
      }
      // Aucun club preneur : on n'envoie pas dans le vide → la prolongation a lieu quand même.
    }
    reason = tx(s, "winContractEnd");
    spec = { d: r >= 7.2 ? 1 : 0 };
  } else if (report && report.promoted) {
    reason = tx(s, "winPromoted");
    spec = { d: 1 };
  } else if (report && report.relegated) {
    reason = tx(s, "winRelegated");
    spec = { d: 0 };
  } else if (report && report.benched) {
    if (rng() < 0.65) { reason = tx(s, "winNoGameTime"); spec = { d: -1 }; }
  } else if (report && report.rating >= 7.8 && s.rep >= 50 && lvlOf(s, s.club) !== "elite") {
    if (rng() < 0.5) { reason = tx(s, "winBigSeason"); spec = { d: 1 }; }
  } else if (s.flags.listed) {
    // Placé sur la liste des transferts après un bras de fer
    delete s.flags.listed;
    reason = tx(s, "winListed");
    spec = { d: report && report.rating >= 7 ? 0 : -1 };
  } else if (rng() < BALANCE.windowRandomChance) {
    reason = tx(s, "winRumours");
    spec = { d: rng() < 0.35 ? 1 : 0, cross: rng() < 0.3 };
  }
  if (!reason) return null;
  if (s.age >= 28 && s.rep >= 55 && rng() < 0.25) spec.gulfExtra = true;

  let offers = rng() < BALANCE.noOfferChance && !contractUp ? [] : offersFor(s, spec);
  if (spec.gulfExtra) {
    const gulf = offersFor(s, { gulf: true }); // offre "or du désert" (Arabie Saoudite / Qatar) pour un vétéran coté
    if (gulf.length) offers = offers.concat(gulf.slice(0, 1));
  }
  return { reason, offers, contractUp, renewSalary: salaryFor(s, s.club) };
}

export function applyTransfer(s: CareerState, offer: TransferOffer) {
  const from = s.club;
  s.prevClub = { id: from.id, name: from.name, countryId: from.countryId, level: lvlOf(s, from) };
  s.club = offer.club;
  s.coach = pick(COACH_NAMES);
  s.coachRel = 55 + randInt(0, 8);
  s.teamRel = 52 + randInt(0, 10);
  s.contract = { salary: offer.salary, years: offer.years };
  s.money += Math.min(3, offer.fee * 0.06);
  s.role = (offer.role != null) ? offer.role : roleForClub(s, offer.club); // statut signé
  // Un jeune recruté par un club trop fort pour lui passe par la réserve ;
  // un statut de Rotation ou mieux signé noir sur blanc l'envoie chez les pros.
  s.squad = s.role >= 2 ? "first" : squadForClub(s, offer.club);
  if (s.squad === "youth") s.squad = "reserve"; // on ne recrute pas pour les U17
  s.seasonsAtClub = 0; // nouveau club : la revue de rôle saute la 1re saison
  s.clubMomentum = 0;
  s.clubFade = 0;
  if (!s.clubsPlayed.includes(offer.club.id)) s.clubsPlayed.push(offer.club.id);
  s.transferHistory.push({
    age: s.age,
    fromClubName: from.name,
    toClubName: offer.club.name,
    countryName: countryOf(offer.club.countryId)!.name,
    countryId: offer.club.countryId,
    fee: offer.fee,
    level: lvlOf(s, offer.club),
  });
  s.history.push({ age: s.age, text: tx(s, "transfer", { toClub: offer.club.name, fee: fmtMoney(offer.fee) }), impact: 5 });
  s.justTransferred = true; // retrouvailles possibles la saison suivante
  const newCountry = countryOf(offer.club.countryId);
  if (newCountry) {
    if (!s.continentsPlayed.includes(newCountry.continent)) s.continentsPlayed.push(newCountry.continent);
    if (newCountry.gulf) { // championnats du Golfe (Arabie Saoudite / Qatar) : l'or du désert
      s.flags.played_exotic = true;
      if (s.age >= 33) s.flags.exotic_late = true;
    }
  }
  if (hasTrait(s, "loyal")) s.moral = clamp(s.moral - 4, 5, 100);
}

export function renewContract(s: CareerState, window?: TransferWindow | null) {
  // Une fenêtre sans salaire de prolongation (vétéran sans club) ne prolonge rien : on recalcule.
  s.contract = { salary: window && window.renewSalary != null ? window.renewSalary : salaryFor(s, s.club), years: randInt(2, 4) };
  if (hasTrait(s, "loyal")) s.moral = clamp(s.moral + 4, 5, 100);
}
