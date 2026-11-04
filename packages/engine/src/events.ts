// Choix de l'événement de la saison et résolution d'une option.

import { rng } from "./rng";
import { weightedRandom } from "./utils";
import { renderText } from "./text";
import { applyFx } from "./effects";
import { isWorldCupYear } from "./international";
import { natClubFloorOk } from "./nationality";
import { offersFor, applyTransfer } from "./transfers";
import { countryOf, clubHomeOf, lvlOf } from "./clubs";
import { ovr, hasTrait } from "./player";
import type { CareerState, Club, EventOption, Fx, GameEvent } from "./types";
import { CLUBS, COUNTRY_LANG, EVENTS } from "@open-eleven/content";

// --- Sélection d'événement --------------------------------------------
// Langue principale d'un pays (COUNTRY_LANG) ; un pays non listé parle sa
// langue propre (son id), donc étrangère à toutes les autres.
export function langOf(countryId: string) {
  return (typeof COUNTRY_LANG !== "undefined" && COUNTRY_LANG[countryId]) || countryId;
}
// Vrai si le pays du club actuel ne parle PAS la langue natale du joueur.
export function foreignLangFor(s: CareerState) {
  return langOf(s.club.countryId) !== langOf(s.nationality.homeCountryId);
}

function offersNatCall(ev: GameEvent) {
  return (ev.options || []).some((o: any) => (o.outcomes || []).some((x: any) => x.fx && x.fx.natCall));
}

export function eventEligible(s: CareerState, ev: GameEvent) {
  if (ev.scheduledOnly) return false;
  const c = ev.cond || {};
  if (ev.once !== false && s.usedEvents.includes(ev.id)) return false;
  if (c.aMin != null && s.age < c.aMin) return false;
  if (c.aMax != null && s.age > c.aMax) return false;
  if (c.levels && !c.levels.includes(lvlOf(s, s.club))) return false;
  if (c.pos && !c.pos.includes(s.position.id)) return false;
  if (c.origin && s.origin.id !== c.origin) return false;
  // dual: true → réservé aux joueurs éligibles à une SECONDE sélection, et qui
  // n'ont pas encore tranché (le choix se verrouille dès la première sélection A).
  if (c.dual === true && !(s.dualNat && !s.natTeam.active && !s.natTeam.retired)) return false;
  // dualAlt: true → seconde chance : une autre nation reste accessible et le
  // joueur n'a JAMAIS porté le maillot A (aucune sélection, pas même passée).
  if (c.dualAlt === true && !(s.dualNatAlt && !s.natTeam.active && !s.natTeam.retired && !(s.natTeam.caps > 0))) return false;
  if (c.lifestyle && s.lifestyle.id !== c.lifestyle) return false;
  if (c.entourage && s.entourage.id !== c.entourage) return false;
  const o = ovr(s);
  if (c.minOvr != null && o < c.minOvr) return false;
  if (c.maxOvr != null && o > c.maxOvr) return false;
  if (c.minRep != null && s.rep < c.minRep) return false;
  if (c.maxRep != null && s.rep > c.maxRep) return false;
  if (c.minMoney != null && s.money < c.minMoney) return false;
  if (c.minBallon != null && s.trophies.ballon < c.minBallon) return false;
  if (c.minForm != null && s.form < c.minForm) return false;
  if (c.maxForm != null && s.form > c.maxForm) return false;
  if (c.minMor != null && s.moral < c.minMor) return false;
  if (c.maxMor != null && s.moral > c.maxMor) return false;
  if (c.minDis != null && s.discipline < c.minDis) return false;
  if (c.maxDis != null && s.discipline > c.maxDis) return false;
  if (c.minCoach != null && s.coachRel < c.minCoach) return false;
  if (c.maxCoach != null && s.coachRel > c.maxCoach) return false;
  if (c.minTeam != null && s.teamRel < c.minTeam) return false;
  if (c.maxTeam != null && s.teamRel > c.maxTeam) return false;
  if (c.flag && !s.flags[c.flag]) return false;
  if (c.notFlag && s.flags[c.notFlag]) return false;
  if (c.trait && !hasTrait(s, c.trait)) return false;
  if (c.notTrait && hasTrait(s, c.notTrait)) return false;
  if (c.nat === true && !s.natTeam.active) return false;
  // Un événement qui convoque en sélection ne vient pas sous le plancher de division.
  if (offersNatCall(ev) && !natClubFloorOk(s)) return false;
  if (c.nat === false && (s.natTeam.active || s.natTeam.retired)) return false;
  if (c.wc === true && !isWorldCupYear(s.year)) return false;
  if (c.loan === true && !s.loan) return false;
  if (c.loan === false && s.loan) return false;
  // Vrai UNIQUEMENT la saison qui suit un transfert (posé par applyTransfer,
  // effacé en fin de playSeason) — « premier jour dans le nouveau vestiaire ».
  if (c.justTransferred === true && !s.justTransferred) return false;
  // « À l'étranger » se juge sur le pays de formation : un Réunionnais à Lyon
  // n'est pas un expatrié, il joue chez lui.
  if (c.abroad === true && s.club.countryId === clubHomeOf(s.nationality)) return false;
  if (c.abroad === false && s.club.countryId !== clubHomeOf(s.nationality)) return false;
  // Événements de choc linguistique : n'ont de sens que si le pays du club
  // parle une autre langue que la langue natale (un Argentin en Espagne, non).
  if (c.foreignLang === true && !foreignLangFor(s)) return false;
  if (c.exoticClub === false && (countryOf(s.club.countryId) || {}).gulf) return false; // déjà au Golfe → pas d'offre "or du désert"
  // Continent d'origine du joueur (nationalité) : événements de sélection
  // propres à un continent, ex. la Coupe d'Afrique (homeContinent: "af").
  if (c.homeContinent) {
    const homeCountry = countryOf(s.nationality.homeCountryId);
    if (!homeCountry || homeCountry.continent !== c.homeContinent) return false;
  }
  if (c.originLevel) {
    const originClub = CLUBS.find((cl) => cl.id === s.clubsPlayed[0]);
    if (!originClub || !c.originLevel.includes(originClub.level)) return false;
  }
  if (c.notAtOriginClub && s.club.id === s.clubsPlayed[0]) return false;
  // Les grands hommages exigent d'avoir marqué l'histoire DU club :
  // ancienneté minimale au club actuel (saisons jouées sous ce maillot)
  if (c.minClubSeasons != null) {
    const seasonsHere = s.seasons.filter((se) => se.clubName === s.club.name).length;
    if (seasonsHere < c.minClubSeasons) return false;
  }
  if (c.chance != null && rng() > c.chance) return false;
  return true;
}

export function pickEvent(s: CareerState) {
  // Décision de crépuscule imposée : la pression de retraite a déclenché
  // l'an passé (advanceYear). « Raccrocher » ou « une saison de plus ? »
  if (s.flags.retire_pending) {
    const ev = EVENTS.find((e) => e.id === "ev_retire_decision");
    if (ev) return ev; // le drapeau est retiré à la résolution (clearFlag)
  }
  const dueIdx = s.scheduled.findIndex((sc) => s.age >= sc.age);
  if (dueIdx >= 0) {
    const due = s.scheduled.splice(dueIdx, 1)[0];
    const ev = EVENTS.find((e) => e.id === due.id);
    if (ev) return ev;
  }
  // L'identité de jeu est un rite de passage garanti : si le hasard ne
  // l'a pas proposée avant, le coach l'impose à 21 ans.
  if (!s.archetype && s.age >= 21) {
    const spec = EVENTS.find((e) => e.id === `ev_spec_${s.position.id}` && !s.usedEvents.includes(e.id));
    if (spec) {
      s.usedEvents.push(spec.id);
      return spec;
    }
  }
  // Rendez-vous à âge fixe (ev.priority) : la fenêtre ne dure qu'une saison,
  // un tirage pondéré parmi des centaines d'événements la ferait manquer
  // neuf fois sur dix. S'il est éligible, il passe avant tout le reste —
  // et il ne retourne jamais dans le tirage ordinaire.
  const prio = EVENTS.find((ev) => ev.priority && eventEligible(s, ev));
  if (prio) {
    if (prio.once !== false) s.usedEvents.push(prio.id);
    return prio;
  }
  const pool = EVENTS.filter((ev) => !ev.priority && eventEligible(s, ev));
  if (pool.length === 0) return null;
  const ev = weightedRandom(pool, (e) => e.w || 10);
  if (ev.once !== false) s.usedEvents.push(ev.id);
  return ev;
}

// Résout une option : tirage pondéré + application. Les transferts
// "direct" (rejoindre LE club de l'histoire, sans liste d'offres)
// sont appliqués immédiatement ici, pour le joueur comme pour le rival.
// Une option peut être conditionnée (ex. "bon transfert" réservé aux
// joueurs réputés) : les portes de sortie dépendent du statut.
export function optionEligible(s: CareerState, option: EventOption) {
  const c = option.cond;
  if (!c) return true;
  if (c.minRep != null && s.rep < c.minRep) return false;
  if (c.maxRep != null && s.rep > c.maxRep) return false;
  if (c.minOvr != null && ovr(s) < c.minOvr) return false;
  if (c.minMoney != null && s.money < c.minMoney) return false;
  if (c.flag && !s.flags[c.flag]) return false;
  if (c.notFlag && s.flags[c.notFlag]) return false;
  return true;
}

export function resolveOption(s: CareerState, option: EventOption) {
  // Chance d'échec croissante avec l'âge, réservée aux options qui la
  // portent explicitement (ex. "Une saison de plus" passé 42 ans) : sous le
  // seuil, ou pour toute autre option du jeu, AUCUN rng supplémentaire n'est
  // consommé (option.ageFailChance vaut undefined presque partout).
  if (option.ageFailChance && s.age > option.ageFailChance.fromAge) {
    const afc = option.ageFailChance;
    const chance = Math.min(afc.cap, (s.age - afc.fromAge) * afc.perYear);
    if (rng() < chance) {
      const outcome = { fx: afc.fx, text: afc.text };
      const chips = applyFx(s, outcome.fx || {});
      const impact = netImpact(outcome.fx);
      s.history.push({ age: s.age, text: renderText(s, outcome.text), impact });
      return { outcome, chips, tone: toneOf(outcome.fx, impact), movedTo: null as Club | null };
    }
  }
  const outcome = weightedRandom(option.outcomes!);
  const chips = applyFx(s, outcome.fx || {});
  let movedTo = null;
  if (outcome.fx && outcome.fx.transfer && outcome.fx.transfer.direct) {
    const offers = offersFor(s, outcome.fx.transfer);
    if (offers.length) {
      applyTransfer(s, offers[0]);
      movedTo = offers[0].club;
      chips.push({ label: `➜ ${movedTo.name}`, kind: "neutral" });
    }
  }
  const impact = netImpact(outcome.fx);
  // Le texte est STOCKÉ rendu, pas brut : l'historique alimente le récit de
  // la fiche finale (pickHighlights → buildNarrative), où un {rival} ou un
  // {dualNat} non substitué s'afficherait tel quel. Le nom du rival n'étant
  // pas connu du moteur ici, {rival} retombe sur sa formulation générique.
  s.history.push({ age: s.age, text: renderText(s, outcome.text), impact });
  return { outcome, chips, tone: toneOf(outcome.fx, impact), movedTo };
}

export function netImpact(fx: Fx | undefined) {
  if (!fx) return 0;
  let n = 0;
  for (const k of ["t", "p", "m", "c", "rep"]) n += fx[k] || 0;
  n += (fx.form || 0) * 0.5 + (fx.mor || 0) * 0.5 + (fx.money || 0) * 2;
  n += (fx.dis || 0) * 0.3 + (fx.coach || 0) * 0.3 + (fx.team || 0) * 0.3;
  if (fx.trophy) n += 12;
  if (fx.inj) n -= fx.inj * 0.8;
  if (fx.end) n = -100;
  return n;
}

export function toneOf(fx: Fx | undefined, impact: number) {
  if (fx && fx.end) return "terrible";
  if (fx && fx.trophy) return "great";
  if (impact >= 9) return "great";
  if (impact >= 3) return "good";
  if (impact <= -12) return "terrible";
  if (impact <= -3) return "bad";
  return "neutral";
}
