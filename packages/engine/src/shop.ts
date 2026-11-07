// Achats de carrière (écran « Dépenses » de l'intersaison). La liste proposée ne tire
// AUCUN hasard : l'interface et le rejeu serveur (replayRun) y référencent le choix
// par son INDEX. Seul l'investissement tire son issue, au moment de l'achat.

import { rng } from "./rng";
import { clamp } from "./utils";
import { tx } from "./text";
import { fmtMoney } from "./utils";
import type { CareerState } from "./types";
import { SHOP_EFFECTS, SHOP_ITEMS } from "@open-eleven/content";

export interface ShopOffer { id: string; icon: string; name: string; desc: string; price: number; seasons: number | null; renew: boolean }

const round2 = (n: number) => Math.round(n * 100) / 100;
type Item = (typeof SHOP_ITEMS)[number] & { seasons?: number; every?: number; minAge?: number; minRep?: number; minMoney?: number; min?: number; salary?: number };

/** L'achat `id` est-il actif (abonnement en cours, ou achat définitif fait) ? */
export function hasPurchase(s: CareerState, id: string): boolean {
  const p = s.purchases && s.purchases[id];
  if (p == null) return false;
  return p === true || (typeof p === "number" && p >= s.year);
}

function priceOf(s: CareerState, it: Item): number {
  if (it.kind === "invest") return round2(s.money * SHOP_EFFECTS.investShare);
  const salary = (s.contract && s.contract.salary) || 0;
  return round2(Math.max(it.min || 0, (it.salary || 0) * salary));
}

/** Achats proposés cette intersaison (ordre stable du catalogue), abordables seulement. */
export function shopOffersFor(s: CareerState): ShopOffer[] {
  const out: ShopOffer[] = [];
  for (const raw of SHOP_ITEMS as Item[]) {
    const it = raw;
    if (it.minAge && s.age < it.minAge) continue;
    if (it.minRep && s.rep < it.minRep) continue;
    if (it.kind === "once" && s.purchases && s.purchases[it.id] != null) continue;
    if (it.kind === "duration" && hasPurchase(s, it.id)) continue;
    if (it.kind === "invest") {
      if (s.money < (it.minMoney || 0)) continue;
      const last = s.purchases && (s.purchases[it.id] as number);
      if (typeof last === "number" && s.year - last < (it.every || 1)) continue;
    }
    const price = priceOf(s, it);
    if (price <= 0 || price > s.money) continue;
    out.push({
      id: it.id, icon: it.icon, name: it.name, desc: it.desc, price,
      seasons: it.kind === "duration" ? it.seasons || 1 : null,
      renew: it.kind === "duration" && !!(s.purchases && s.purchases[it.id] != null),
    });
  }
  return out;
}

/** Applique un achat. Renvoie la ligne d'historique écrite (pour l'affichage). */
export function buyItem(s: CareerState, offer: ShopOffer): string {
  const E = SHOP_EFFECTS;
  s.purchases = s.purchases || {};
  s.money = round2(s.money - offer.price);
  s.spent = round2((s.spent || 0) + offer.price);
  let text: string;
  if (offer.id === "invest") {
    s.purchases.invest = s.year;
    let r = rng() * E.investOutcomes.reduce((t, o) => t + o[0], 0);
    let mult = E.investOutcomes[E.investOutcomes.length - 1][1];
    for (const [w, m] of E.investOutcomes) { if (r < w) { mult = m; break; } r -= w; }
    const back = round2(offer.price * mult);
    s.money = round2(s.money + back);
    const key = mult > 1.2 ? "shopInvestWin" : mult >= 1 ? "shopInvestFlat" : "shopInvestLoss";
    text = tx(s, key, { stake: fmtMoney(offer.price), back: fmtMoney(back) });
    s.history.push({ age: s.age, text, impact: mult > 1.2 ? 4 : mult >= 1 ? 0 : -4 });
    return text;
  }
  if (offer.seasons) s.purchases[offer.id] = s.year + offer.seasons; // actif jusqu'à cette année incluse
  else s.purchases[offer.id] = true;
  if (offer.id === "house") s.moral = clamp(s.moral + E.houseMoralNow, 5, 100);
  if (offer.id === "car") { s.rep = clamp(s.rep + E.carRep, 0, 100); s.discipline = clamp(s.discipline + E.carDiscipline, 5, 100); }
  if (offer.id === "charity") s.rep = clamp(s.rep + E.charityRep, 0, 100);
  if (offer.id === "academy") s.rep = clamp(s.rep + E.academyRep, 0, 100);
  text = tx(s, "shopBought", { item: offer.icon + " " + offer.name, price: fmtMoney(offer.price) });
  s.history.push({ age: s.age, text, impact: 2 });
  return text;
}

/** Bonus de score de fin de carrière venu des achats « héritage ». */
export function shopScore(s: CareerState): number {
  const p = s.purchases || {};
  return (p.charity != null ? SHOP_EFFECTS.charityScore : 0) + (p.academy != null ? SHOP_EFFECTS.academyScore : 0);
}
