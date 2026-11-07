// Vieillissement, vie du club et intersaison.

import { rng } from "./rng";
import { hasPurchase } from "./shop";
import { clamp, rand, randInt, pick } from "./utils";
import { trajGrowthMult } from "./potential";
import { natCallBarFor, natClubFloorOk } from "./nationality";
import { tx } from "./text";
import { playingTimeFactor, longevityScore } from "./role";
import { countryOf, divShort, lvlOf, setClubLevel, shiftClubLevel } from "./clubs";
import { ovr, hasTrait } from "./player";
import type { CareerState } from "./types";
import { BALANCE, CLUBS, COACH_NAMES, ROLE_ESPOIR_MAX_AGE, SHOP_EFFECTS } from "@open-eleven/content";

// --- Vieillissement, vie du club & intersaison ------------------------------
export function advanceYear(s: CareerState) {
  // Semaines de BLESSURE de la saison écoulée (hors suspension), capturées AVANT
  // le reset (plus bas) : servent au frein de croissance et à la pression de
  // retraite. La perte est RÉCUPÉRABLE (on freine la progression de l'année, on
  // n'érode pas définitivement les stats — une pépite n'est jamais condamnée).
  const seasonInj = s.seasonInjuryWeeks || 0;
  s.seasonsAtClub = (s.seasonsAtClub || 0) + 1; // une saison de plus au club (débloque la revue de rôle)
  const pt = playingTimeFactor(s);
  // Développement des jeunes : un Espoir joue peu en compétition mais s'ENTRAÎNE
  // au haut niveau → sa progression n'est pas étranglée par le manque de minutes.
  const devPt = s.age <= 21 ? Math.max(pt, 0.5) : pt;
  // Infrastructures : le niveau du club, pondéré par la qualité de formation du
  // PAYS (country.growthMult). Progresser en Régionale au Bhoutan ne pouvait pas
  // valoir la Régionale en France — c'est désormais le cas.
  const ctry = countryOf(s.club.countryId);
  const gM = ((ctry && ctry.growthMult != null) ? ctry.growthMult : 1) / BALANCE.countryGrowthRef;
  const infra = BALANCE.growthInfra[lvlOf(s, s.club)] * gM;
  const gap = s.potCap - ovr(s);
  let potDamp = gap <= 0 ? 0.15 : gap <= 4 ? 0.45 : 1;
  if (s.flags.prodigy && s.age <= 20) potDamp = Math.max(potDamp, 0.85); // un prodige ne freine pas jeune
  const injDamp = clamp(1 - seasonInj / BALANCE.injury.growthDamp, 0.55, 1);
  const g = (s.flags.lateBloomer ? 1.15 : 1) * infra * potDamp * trajGrowthMult(s) * injDamp;

  if (s.age <= 21) {
    s.stats.t = clamp(s.stats.t + Math.round(rand(2, 4) * devPt * g * (hasTrait(s, "genius") ? 1.4 : 1)), 1, 99);
    s.stats.p = clamp(s.stats.p + randInt(1, 3), 1, 99);
    s.stats.m = clamp(s.stats.m + randInt(0, 2), 1, 99);
    s.stats.c = clamp(s.stats.c + randInt(0, 1), 1, 99);
    // Saison de percée : les trajectoires explosives peuvent brûler
    // les étapes — c'est ici que naissent les phénomènes à 85 avant 22 ans
    const explosive = (s.trajectory.id === "early" || s.trajectory.id === "flash") ||
      (s.trajectory.id === "surge" && s.age >= s.sparkAge);
    const prod = s.flags.prodigy && s.age <= 20; // un crack brûle vraiment les étapes
    if (explosive && devPt >= (prod ? 0.3 : 0.5) && rng() < (prod ? 0.9 : 0.6)) {
      s.stats.t = clamp(s.stats.t + randInt(prod ? 5 : 3, prod ? 9 : 6), 1, 99);
      s.stats.p = clamp(s.stats.p + randInt(prod ? 3 : 2, prod ? 5 : 4), 1, 99);
      s.stats.m = clamp(s.stats.m + randInt(prod ? 2 : 1, prod ? 4 : 3), 1, 99);
    }
    // Fenêtre 16-18 ans : un phénomène éclate MAINTENANT, pas à 20 ans.
    if (s.flags.prodigy && s.age <= 18) {
      s.stats.t = clamp(s.stats.t + randInt(2, 4), 1, 99);
      s.stats.p = clamp(s.stats.p + randInt(1, 3), 1, 99);
    }
  } else if (s.age <= 25) {
    s.stats.t = clamp(s.stats.t + Math.round(rand(1, 2.5) * pt * g), 1, 99);
    s.stats.p = clamp(s.stats.p + randInt(0, 2), 1, 99);
    s.stats.m = clamp(s.stats.m + randInt(0, 2), 1, 99);
    s.stats.c = clamp(s.stats.c + randInt(0, 1), 1, 99);
    if (s.trajectory.id === "surge" && s.age >= s.sparkAge && s.age <= s.sparkAge + 2 && rng() < 0.7) {
      s.stats.t = clamp(s.stats.t + randInt(2, 5), 1, 99);
      s.stats.p = clamp(s.stats.p + randInt(1, 3), 1, 99);
      s.stats.m = clamp(s.stats.m + randInt(1, 3), 1, 99);
    }
  } else if (s.age <= 29) {
    s.stats.t = clamp(s.stats.t + Math.round(rand(0, 1.5) * pt * (g > 1.3 ? g * 0.6 : 0)), 1, 99);
    s.stats.m = clamp(s.stats.m + randInt(0, 1), 1, 99);
    if (rng() < 0.4) s.stats.p = clamp(s.stats.p - 1, 1, 99);
  } else if (s.age <= 32) {
    s.stats.p = clamp(s.stats.p - randInt(1, 3), 1, 99);
    if (rng() < 0.4) s.stats.t = clamp(s.stats.t - 1, 1, 99);
    s.stats.m = clamp(s.stats.m + randInt(0, 1), 1, 99);
  } else if (s.age <= 36) {
    s.stats.p = clamp(s.stats.p - Math.round(randInt(2, 4) * (hasTrait(s, "ironman") ? 0.6 : 1)), 1, 99);
    s.stats.t = clamp(s.stats.t - randInt(0, 2), 1, 99);
  } else if (s.age <= 42) {
    // Crépuscule (37-42) : déclin physique plus marqué, adouci par la longévité
    // (Increvable, gardien, défenseur). Le physique baisse, mais la lecture du
    // jeu — le mental — peut encore progresser : c'est ce qui fait durer les vieux sages.
    const soft = hasTrait(s, "ironman") ? 0.55 : 1;
    const posSoft = s.position.id === "gk" ? 0.6 : s.position.id === "def" ? 0.8 : 1;
    s.stats.p = clamp(s.stats.p - Math.round(randInt(2, 5) * soft * posSoft), 1, 99);
    s.stats.t = clamp(s.stats.t - randInt(0, 2), 1, 99);
    if (rng() < 0.25) s.stats.m = clamp(s.stats.m + 1, 1, 99);
  } else {
    // Ultra-crépuscule (43+) : le corps lâche pour de bon. L'OVR chute vite —
    // seuls des clubs de D3/Régional signent encore un vétéran de cet âge ; un
    // gardien increvable peut, rarement, tenir plus haut. Le mental s'érode aussi.
    const soft = hasTrait(s, "ironman") ? 0.7 : 1;
    const posSoft = s.position.id === "gk" ? 0.5 : s.position.id === "def" ? 0.8 : 1;
    s.stats.p = clamp(s.stats.p - Math.round(randInt(4, 7) * soft * posSoft), 1, 99);
    s.stats.t = clamp(s.stats.t - randInt(1, 3), 1, 99);
    if (rng() < 0.5) s.stats.m = clamp(s.stats.m - 1, 1, 99);
  }
  // Trajectoires : usure spécifique
  if (s.trajectory.id === "flash" && s.age >= 28) {
    s.stats.p = clamp(s.stats.p - 1, 1, 99);
    if (rng() < 0.5) s.stats.t = clamp(s.stats.t - 1, 1, 99);
  }
  if (s.trajectory.id === "steady" && s.age >= 30 && rng() < 0.5) {
    s.stats.p = clamp(s.stats.p + 1, 1, 99); // vieillit mieux que les autres
  }
  if (hasTrait(s, "leader")) s.stats.m = clamp(s.stats.m + 1, 1, 99);
  if (s.archetype && s.archetype.mods.mGrowth) s.stats.m = clamp(s.stats.m + s.archetype.mods.mGrowth, 1, 99);
  if (hasTrait(s, "party")) { s.form = clamp(s.form - 4, 5, 100); s.stats.c = clamp(s.stats.c + 1, 1, 99); }
  if (s.discipline >= 72 && rng() < 0.5) s.stats.t = clamp(s.stats.t + 1, 1, 99);

  // Un phénomène est né ?
  if (!s.flags.wonderkid && s.age < 22 && ovr(s) >= 85) {
    s.flags.wonderkid = true;
    s.history.push({ age: s.age, text: tx(s, "prodigy"), impact: 15 });
  }
  if (s.age < 23 && ovr(s) >= 85) s.flags.high_early = true;

  // Vie du club : montée effective, relégation, changement de dimension.
  // IMPORTANT : le destin (montée/descente) s'applique au club où la
  // saison a été jouée — jamais au nouveau club si le joueur est parti
  // entre-temps. Chaque club garde sa propre division.
  const ls = s.lastSeason;
  if (ls) {
    const seasonClub = CLUBS.find((c) => c.id === ls.clubId);
    const stayed = seasonClub && s.club.id === ls.clubId && !s.loan;
    if (seasonClub) {
      const lvl = lvlOf(s, seasonClub);
      if (ls.promoted && (lvl === "regional" || lvl === "d4" || lvl === "d3" || lvl === "d2")) {
        const newLvl = shiftClubLevel(s, seasonClub, 1);
        if (stayed) s.history.push({ age: s.age, text: tx(s, "clubUp", { seasonClub: seasonClub.name, div: divShort(newLvl, seasonClub.countryId) }), impact: 6 });
      } else if (ls.relegated && (lvl === "d1" || lvl === "d2" || lvl === "d3" || lvl === "d4")) {
        shiftClubLevel(s, seasonClub, -1);
      } else if (stayed && lvl === "d1") {
        // Voie « le club change de dimension ». Exiger leaguePos <= 2 alors que le
        // classement était un randInt(2,12) rendait cette mécanique quasi morte
        // (~0,8 % par paire de saisons). Un podium OU un titre de D1 compte.
        const rose = ls.leaguePos <= 3 || !!ls.wonLeague;
        s.clubMomentum = rose ? s.clubMomentum + 1 : 0;
        if (s.clubMomentum >= BALANCE.clubRiseSeasons) {
          setClubLevel(s, seasonClub, "elite");
          s.clubMomentum = 0;
          s.history.push({ age: s.age, text: tx(s, "clubElite", { seasonClub: seasonClub.name }), impact: 8 });
        }
      } else if (stayed && lvl === "elite") {
        // Un cador peut décliner s'il enchaîne les saisons ratées
        s.clubFade = ls.leaguePos >= 7 ? s.clubFade + 1 : 0;
        if (s.clubFade >= BALANCE.clubFadeSeasons) {
          setClubLevel(s, seasonClub, "d1");
          s.clubFade = 0;
          s.history.push({ age: s.age, text: tx(s, "clubFade", { seasonClub: seasonClub.name }), impact: -5 });
        }
      }
    }
  }

  // Dérive des jauges
  const formTarget = 65 + (hasPurchase(s, "nutrition") ? SHOP_EFFECTS.nutritionForm : 0); // nutritionniste
  const moralTarget = (hasTrait(s, "zen") ? 70 : 60) + Math.round((s.teamRel - 55) / 8)
    + (hasPurchase(s, "mental") ? SHOP_EFFECTS.mentalMoral : 0) + (s.purchases && s.purchases.house ? SHOP_EFFECTS.houseMoral : 0); // coach mental, maison
  s.form = clamp(Math.round(s.form + (formTarget - s.form) * 0.35 + rand(-6, 6)), 5, 100);
  s.moral = clamp(Math.round(s.moral + (moralTarget - s.moral) * 0.25 + rand(-4, 4)), 5, 100);
  if (hasTrait(s, "leader")) s.moral = Math.max(s.moral, 40);
  s.discipline = clamp(Math.round(s.discipline + (50 - s.discipline) * 0.06), 5, 100);
  s.coachRel = clamp(Math.round(s.coachRel + (55 - s.coachRel) * 0.15), 5, 100);
  s.teamRel = clamp(Math.round(s.teamRel + (55 - s.teamRel) * 0.12 + rand(-3, 3)), 5, 100);

  // Retour de prêt : bilan sportif et conséquences réelles
  if (s.loan) {
    const parent = s.loan;
    const loanRating = parent.rating || 6.5;
    s.club = parent.parentClub;
    s.coach = parent.parentCoach;
    s.loan = null;
    // Un prêt réussi ouvre les portes des pros ; sinon retour à l'effectif d'origine.
    s.squad = (loanRating >= 7.2 || s.age >= BALANCE.squad.firstByAge) ? "first" : (parent.parentSquad === "youth" ? "reserve" : parent.parentSquad || "first");
    if (loanRating >= 7.2) {
      s.coachRel = 72;
      s.form = clamp(s.form + 6, 5, 100);
      s.history.push({ age: s.age, text: tx(s, "loanBackGood", { parentClub: parent.parentClub.name }), impact: 8 });
      if (rng() < 0.6) s.loanReturn = { clubId: parent.loanClubId, rating: loanRating };
    } else if (loanRating >= 6.3) {
      s.coachRel = 60;
      s.history.push({ age: s.age, text: tx(s, "loanBackOk", { parentClub: parent.parentClub.name }), impact: 3 });
    } else {
      s.coachRel = 46;
      s.rep = clamp(s.rep - 2, 0, 100);
      s.history.push({ age: s.age, text: tx(s, "loanBackBad", { parentClub: parent.parentClub.name }), impact: -6 });
    }
    s.transferHistory.push({ age: s.age + 1, toClubName: parent.parentClub.name, countryName: countryOf(parent.parentClub.countryId)!.name, fee: null, loanReturn: true, level: lvlOf(s, parent.parentClub) });
  } else if (rng() < BALANCE.coachChangeChance) {
    s.coach = pick(COACH_NAMES);
    s.coachRel = 48 + randInt(0, 14);
  }

  s.injuryWeeks = 0;
  s.seasonInjuryWeeks = 0; // la dette chronique (chronicWeeks) N'est PAS remise à 0 : elle déborde
  s.age += 1;
  s.year += 1;
  s.contract.years -= 1;
  // On sort de l'âge « Espoir » : le statut de pari sur l'avenir n'existe plus,
  // le plancher devient Sporadique (sans hasard consommé → PRNG intact).
  if (s.role === 0 && s.age > ROLE_ESPOIR_MAX_AGE) s.role = 1;

  // Sélection : possible dès 17 ans pour un crack, de plus en plus
  // accessible entre 21 et 23 ans ; la visibilité du niveau compte,
  // et un passage par les Espoirs ouvre des portes.
  // Double nationalité non tranchée : aucune convocation A tant que le joueur n'a
  // pas choisi (une première sélection verrouillerait son avenir international sans
  // qu'il ait décidé). Passé la fenêtre de l'événement, le silence vaut fidélité à
  // la nation de naissance et la porte se referme. Aucun rng consommé.
  if (s.dualNat && s.age > 23) { s.dualNatAlt = s.dualNat; s.dualNat = null; s.flags.natLocked = true; }
  // Une première sélection A ferme définitivement l'autre porte.
  if (s.dualNatAlt && (s.natTeam.active || s.natTeam.caps > 0)) s.dualNatAlt = null;
  if (!s.natTeam.active && !s.natTeam.retired && !s.dualNat && s.age >= 17 && seasonInj < 20 && natClubFloorOk(s)) {
    const curLvlId = lvlOf(s, s.club);
    let ovrNeed, repNeed;
    // FORCE DE LA NATION : la barre était la même pour la France et pour Saint-Marin,
    // alors qu'un international luxembourgeois n'a évidemment pas le niveau d'un
    // international brésilien. La barre d'OVR vient donc d'une table de paliers
    // (BALANCE.natCallBar), à laquelle s'ajoute un surcoût si l'on veut être appelé
    // plus jeune. Ça n'ouvre PAS la porte aux trophées : les tournois restent
    // filtrés par natW élevé à une puissance.
    const natW = s.nationality.weight;
    const natBar = natCallBarFor(s);
    const off = BALANCE.natCallAgeOffset;
    if (s.age <= 18) { ovrNeed = natBar + off.u19; repNeed = 58; }
    else if (s.age <= 20) { ovrNeed = natBar + off.u21; repNeed = 52; }
    else if (s.age <= 23) { ovrNeed = natBar + off.u24; repNeed = 50; }
    else { ovrNeed = natBar; repNeed = 48; }
    // Comparaison sur l'ID du niveau (pas le rang numérique) : le malus visé
    // reste celui de "d3" même si un palier "d4" existe désormais entre lui
    // et "regional" (cf. LEVELS) — un rang absolu aurait glissé de sens.
    if (curLvlId === "d3") { ovrNeed += 2; repNeed += 8; }
    else if (curLvlId === "d4") { ovrNeed += 3.5; repNeed += 12; }
    else if (curLvlId === "regional") { ovrNeed += 5; repNeed += 16; }
    if (s.flags.youth_int) repNeed -= 4;
    repNeed -= Math.round((1 - natW) * BALANCE.natCallWeightRep);
    if (s.rep >= repNeed && ovr(s) >= ovrNeed) {
      s.natTeam.active = true;
      if (s.age <= 18) s.flags.early_cap = true;
      if (s.age <= 20) s.flags.young_int = true;
      s.history.push({ age: s.age, text: tx(s, s.age <= 19 ? "firstCapYoung" : "firstCap"), impact: 8 });
    }
  }

  // Reconduction en sélection : un international vieillissant n'est rappelé QUE
  // s'il tient encore le niveau. La barre d'OVR monte avec l'âge (seuls les
  // meilleurs jouent à 37-40 ans) ; une note récente correcte et un vrai temps
  // de jeu sont aussi exigés. Sinon, la sélection tourne la page (retraite
  // internationale de fait, définitive). Aucun hasard : dépend des perfs réelles.
  // Guard caps>0 : on ne remercie pas un joueur tout juste convoqué le même tour.
  if (s.natTeam.active && !s.natTeam.retired && s.natTeam.caps > 0 && s.age >= BALANCE.intlRetainAge) {
    const last = s.seasons[s.seasons.length - 1];
    const recentRating = last ? last.rating : 7;
    const posBonus = BALANCE.intlRetainPos[s.position.id] || 0; // gardien/défenseur : barre abaissée, sélectionnés plus vieux
    // Même logique que pour la première convocation : une petite sélection garde
    // ses cadres bien plus longtemps, faute d'alternative.
    const natDrop = BALANCE.natCallBar[0].ovr - natCallBarFor(s);
    const ovrNeed = BALANCE.intlRetainOvr + (s.age - BALANCE.intlRetainAge) * BALANCE.intlRetainStep - posBonus - natDrop;
    const stillGood = ovr(s) >= ovrNeed && recentRating >= BALANCE.intlRetainRating && playingTimeFactor(s) >= 0.35;
    if (!stillGood) {
      s.natTeam.active = false;
      s.natTeam.retired = true;
      s.history.push({ age: s.age, text: tx(s, "natRetire"), impact: -4 });
    }
  }

  // Crépuscule : pression de retraite croissante. Le pivot recule avec la
  // longévité (un gardien Increvable discipliné est encore titulaire à 40 ans).
  // Quand elle déclenche, la décision « une saison de plus ? » s'impose à la
  // saison suivante (ev_retire_decision via pickEvent). Le joueur reste maître :
  // pousser jusqu'à 42 ans est possible, mais le corps et les clubs pèsent.
  if (s.age >= BALANCE.retireFloor && !s.retiring && !s.careerEnded && s.age < BALANCE.ageMax) {
    const pivot = BALANCE.retireBaseAge + longevityScore(s) * 0.6;
    let p = 0.10 + (s.age - pivot) * 0.18;
    const pt = playingTimeFactor(s);
    if (pt < 0.4) p += 0.20;          // relégué sur le banc : le signal de partir
    if (s.form < 45) p += 0.10;
    // Corps qui lâche : une saison très blessée OU une dette chronique en cours
    // pousse (doucement) vers la sortie. Lit seasonInj capturé AVANT le reset
    // (l'ancien test s.injuryWeeks>20 était mort : injuryWeeks vaut 0 ici).
    if (seasonInj > 20 || (s.chronicWeeks || 0) > 0) p += 0.10;
    if (s.moral > 70) p -= 0.08;      // l'envie, encore intacte, fait tenir
    if (hasTrait(s, "loyal")) p -= 0.05;
    if (rng() < clamp(p, 0, 0.95)) s.flags.retire_pending = true;
  }
}
