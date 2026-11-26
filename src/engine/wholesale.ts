import { DIFFICULTIES, STAGE3, STORES } from './content';
import { fairPrice, getDesign } from './design';
import { newId } from './newGame';
import { chance, pick, randInt, randRange } from './rng';
import { availableUnits } from './webshop';
import type { ActionResult, GameEvent, GameState } from './types';

export function wholesaleUnlocked(state: GameState): boolean {
  return state.unlocks.includes('unlock_wholesale');
}

export function eligibleStores(state: GameState) {
  return STORES.filter((s) => state.reputation >= s.minRep);
}

export function weeklyWholesale(state: GameState, events: GameEvent[]): void {
  if (!wholesaleUnlocked(state)) return;
  state.wholesale.offers = state.wholesale.offers.filter((o) => o.expiresDay > state.day);
  const stocked = state.designs.filter((d) => availableUnits(state, d.id) >= 30);
  if (stocked.length === 0) return;
  for (const store of eligibleStores(state)) {
    if (state.wholesale.offers.length >= 4) break;
    if (state.wholesale.offers.some((o) => o.storeId === store.id)) continue;
    if (!chance(state, STAGE3.wholesaleOfferChance / 2)) continue;
    const d = pick(state, stocked);
    const lot = state.inventory[d.id];
    const units = Math.max(20, Math.min(Math.round(randInt(state, 30, 120) * store.size), Math.floor(availableUnits(state, d.id) * 0.8)));
    const unitPrice = Math.max(1, Math.round(fairPrice(state, d, lot.quality) * STAGE3.wholesalePriceShare * randRange(state, 0.9, 1.1)));
    state.wholesale.offers.push({
      id: newId(state, 'w'),
      storeId: store.id,
      designId: d.id,
      units,
      unitPrice,
      payDays: randInt(state, 28, 42),
      expiresDay: state.day + STAGE3.offerDays,
    });
    events.push({ type: 'wholesaleOffer', storeId: store.id });
  }
}

export function acceptOffer(state: GameState, offerId: string): ActionResult {
  const o = state.wholesale.offers.find((x) => x.id === offerId);
  if (!o) return { ok: false, reason: 'That offer is gone.' };
  if (o.expiresDay <= state.day) return { ok: false, reason: 'That offer expired.' };
  const d = getDesign(state, o.designId);
  if (!d) return { ok: false, reason: 'Unknown design.' };
  if (availableUnits(state, o.designId) < o.units) return { ok: false, reason: `You need ${o.units} pieces in stock (not held for a drop).` };
  const store = STORES.find((s) => s.id === o.storeId)!;
  state.inventory[o.designId].units -= o.units;
  state.stats.unitsSold += o.units;
  state.stats.soldByDesign = state.stats.soldByDesign ?? {};
  state.stats.soldByDesign[o.designId] = (state.stats.soldByDesign[o.designId] ?? 0) + o.units;
  state.wholesale.offers = state.wholesale.offers.filter((x) => x.id !== offerId);
  state.wholesale.receivables.push({
    id: newId(state, 'r'),
    storeId: o.storeId,
    amount: o.units * o.unitPrice,
    dueDay: state.day + o.payDays,
    defaultRisk: store.risk * DIFFICULTIES[state.difficulty].badEventMult,
  });
  state.followers += Math.round(o.units * 0.3 * Math.max(0.02, 1 - state.followers / 120000));
  return { ok: true };
}

export function declineOffer(state: GameState, offerId: string): ActionResult {
  const before = state.wholesale.offers.length;
  state.wholesale.offers = state.wholesale.offers.filter((x) => x.id !== offerId);
  return before === state.wholesale.offers.length ? { ok: false, reason: 'That offer is gone.' } : { ok: true };
}

export function processReceivables(state: GameState, events: GameEvent[]): void {
  const due = state.wholesale.receivables.filter((r) => r.dueDay <= state.day);
  if (!due.length) return;
  state.wholesale.receivables = state.wholesale.receivables.filter((r) => r.dueDay > state.day);
  for (const r of due) {
    if (chance(state, r.defaultRisk)) {
      events.push({ type: 'wholesaleDefault', storeId: r.storeId, amount: r.amount });
      continue;
    }
    state.cash += r.amount;
    state.stats.revenue += r.amount;
    state.stats.revenueThisWeek += r.amount;
    events.push({ type: 'wholesalePaid', storeId: r.storeId, amount: r.amount });
  }
}

export function storeName(id: string): string {
  const s = STORES.find((x) => x.id === id);
  return s ? `${s.name} (${s.city})` : id;
}
