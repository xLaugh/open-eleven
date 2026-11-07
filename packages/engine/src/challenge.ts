// Défi du jour et duels : dérivation déterministe et rejeu serveur.

import { rng, setSeed } from "./rng";
import { rollPotential } from "./potential";
import { academyOffers } from "./academy";
import { newCareer } from "./career";
import { pickEvent, resolveOption } from "./events";
import { resolveWcFinal } from "./international";
import { playSeason, resolveSeasonMoment } from "./season";
import { advanceYear } from "./offseason";
import { offersFor, loanOffersFor, applyLoan, transferWindow, applyTransfer, renewContract } from "./transfers";
import { computeCareerScore } from "./ending";
import { shopOffersFor, buyItem } from "./shop";
import { sponsorDealDue, sponsorOffersFor, applySponsorDeal } from "./sponsors";
import type { Profile, SeasonReport } from "./types";
import { BALANCE, ENTOURAGES, LIFESTYLES, NATIONALITIES, ORIGINS, POSITIONS } from "@open-eleven/content";

// --- Défi du jour : dérivation déterministe (PARTAGÉE client ↔ serveur) -------
// hashInt DOIT rester identique à celui de game.ts : la graine du jour ne doit
// jamais diverger entre l'affichage (client) et la vérification (serveur).
export function hashInt(n: number) {
  let h = (n >>> 0);
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  return h >>> 0;
}
// Profil imposé du jour (nationalité/poste/origine), dérivé de la date.
export function dailyChallenge(dateKey: string) {
  const seed = Number(String(dateKey).replace(/-/g, ""));
  return {
    id: dateKey,
    nationality: NATIONALITIES[hashInt(seed * 5 + 1) % NATIONALITIES.length],
    position: POSITIONS[hashInt(seed * 5 + 2) % POSITIONS.length],
    origin: ORIGINS[hashInt(seed * 5 + 3) % ORIGINS.length],
  };
}
// Graine MOTEUR du run de défi : mêmes événements pour tous, à choix égaux.
export function dailySeedFor(dateKey: string) { return hashInt(Number(String(dateKey).replace(/-/g, "")) + 777); }

// Profil imposé d'un duel : même dérivation que le Défi, mais depuis la graine.
export function duelChallenge(seed: number) {
  return {
    nationality: NATIONALITIES[hashInt(seed * 5 + 1) % NATIONALITIES.length],
    position: POSITIONS[hashInt(seed * 5 + 2) % POSITIONS.length],
    origin: ORIGINS[hashInt(seed * 5 + 3) % ORIGINS.length],
  };
}

// Rejeu HEADLESS d'un run à partir du SEUL journal de choix, sous (graine, profil).
// Cœur de l'anti-triche : le serveur charge ce même moteur, rejoue et RECALCULE
// le score. Le client ne peut donc pas mentir sur son score — seuls ses CHOIX
// comptent. Miroir EXACT du chemin interactif (Défi du jour ET duel).
export function replayRun(seed: number, prof: Profile, choices: number[]) {
  const log = choices || [];
  let i = 0;
  const next = () => (i < log.length ? log[i++] : 0);
  setSeed(seed);
  const lifestyle = LIFESTYLES[next()] || LIFESTYLES[0];
  const entourage = ENTOURAGES[next()] || ENTOURAGES[0];
  const potCap = rollPotential(prof.origin, lifestyle, entourage);
  const offers = academyOffers({ nationality: prof.nationality, origin: prof.origin, lifestyle, entourage, potCap });
  const club = (offers[next()] || offers[0]).club;
  const s = newCareer({ nationality: prof.nationality, origin: prof.origin, position: prof.position, lifestyle, entourage, potCap, club });
  let guard = 0;
  while (!s.careerEnded && !s.retiring && s.age <= BALANCE.ageMax && guard++ < 40) {
    const ev = pickEvent(s);
    if (ev) {
      const res = resolveOption(s, ev.options[next()] || ev.options[0]);
      if (s.careerEnded) break;
      if (res.outcome.fx && res.outcome.fx.transfer && !res.outcome.fx.transfer.direct) {
        const t = offersFor(s, res.outcome.fx.transfer);
        const ch = next();
        if (t.length && ch >= 0) applyTransfer(s, t[ch] || t[0]);
      } else if (res.outcome.fx && res.outcome.fx.loan) {
        const l = loanOffersFor(s);
        const ch = next();
        if (l.length) applyLoan(s, l[ch] || l[0]);
      }
    }
    if (s.age <= 18 && rng() < BALANCE.earlyEndChance) { s.careerEnded = true; s.careerEndReason = "injury"; break; }
    const report: SeasonReport = playSeason(s);
    while (report.pendingMoments.length) {
      const entry = report.pendingMoments.shift();
      const opt = entry.moment.options[next()];
      resolveSeasonMoment(s, report, entry, opt ? opt.id : null);
    }
    if (report.wc && report.wc.finalPending) {
      const opt = report.wc.moment.options[next()];
      resolveWcFinal(s, report, opt ? opt.id : null);
    }
    if (s.careerEnded) break;
    if (s.retiring || s.age >= BALANCE.ageMax) break;
    // Dépenses (panneau facultatif du bilan de saison) : une entrée de journal dès qu'un
    // achat était possible, −1 si le joueur n'a rien acheté.
    const shop = shopOffersFor(s);
    if (shop.length) {
      const ch = next();
      if (ch >= 0 && shop[ch]) buyItem(s, shop[ch]);
    }
    // Miroir EXACT de offseason()/offseasonTransfer() côté game.ts : même
    // ordre de vérification, même consommation de choiceLog (une entrée
    // SEULEMENT si un écran a réellement été montré côté joueur).
    if (s.forcedLoanNext) {
      s.forcedLoanNext = false;
      const l = loanOffersFor(s);
      if (l.length) {
        const ch = next();
        applyLoan(s, l[ch] || l[0]);
        advanceYear(s);
        continue;
      }
    }
    if (sponsorDealDue(s)) {
      const offers = sponsorOffersFor(s);
      const ch = next();
      applySponsorDeal(s, offers[ch] || offers[0]);
    }
    const window = transferWindow(s, report);
    // Vétéran sans club : côté joueur, un simple écran d'adieu sans choix,
    // puis la fiche finale — aucune entrée de journal consommée.
    if (window && window.retire) break;
    if (window) {
      const ch = next();
      if (window.offers.length && ch >= 0) applyTransfer(s, window.offers[ch] || window.offers[0]);
      else if (window.contractUp) renewContract(s, window);
    }
    advanceYear(s);
  }
  return s;
}

export function replayDaily(dateKey: string, choices: number[]) { return replayRun(dailySeedFor(dateKey), dailyChallenge(dateKey), choices); }
export function replayDuel(seed: number, choices: number[]) { return replayRun((seed | 0) || 1, duelChallenge((seed | 0) || 1), choices); }
// Scores officiels d'un run rejoué (ce que le serveur inscrit / compare).
export function scoreDaily(dateKey: string, choices: number[]) { return computeCareerScore(replayDaily(dateKey, choices)); }
export function scoreDuel(seed: number, choices: number[]) { return computeCareerScore(replayDuel(seed, choices)); }
