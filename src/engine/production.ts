import { FACTORIES, HQ_LEVELS, DIFFICULTIES } from './content';
import { designQuality, getDesign, unitCost } from './design';
import { newId } from './newGame';
import { chance, randInt, randRange } from './rng';
import type { ActionResult, FactoryId, GameEvent, GameState } from './types';

export function capacity(state: GameState): number {
  return HQ_LEVELS[state.hqLevel].capacity;
}

export function stockUnits(state: GameState): number {
  return Object.values(state.inventory).reduce((a, l) => a + l.units, 0);
}

export function incomingUnits(state: GameState, designId?: string): number {
  return state.orders.filter((o) => !designId || o.designId === designId).reduce((a, o) => a + o.quantity, 0);
}

export function freeCapacity(state: GameState): number {
  return Math.max(0, capacity(state) - stockUnits(state) - incomingUnits(state));
}

export interface OrderInput {
  designId: string;
  factoryId: FactoryId;
  quantity: number;
}

export function orderCost(state: GameState, input: OrderInput): number {
  const d = getDesign(state, input.designId);
  if (!d) return 0;
  return Math.round(unitCost(state, d, input.factoryId) * input.quantity * 100) / 100;
}

export function placeOrder(state: GameState, input: OrderInput): ActionResult {
  if (state.gameOver) return { ok: false, reason: 'Game over.' };
  const design = getDesign(state, input.designId);
  if (!design) return { ok: false, reason: 'Unknown design.' };
  const f = FACTORIES[input.factoryId];
  if (!f) return { ok: false, reason: 'Unknown factory.' };
  const q = input.quantity;
  if (!Number.isInteger(q) || q <= 0) return { ok: false, reason: 'Quantity must be a whole number.' };
  if (q < f.minOrder) return { ok: false, reason: `${f.name} needs at least ${f.minOrder} units.` };
  if (q > freeCapacity(state)) return { ok: false, reason: `Not enough warehouse space (${freeCapacity(state)} free).` };
  const cost = orderCost(state, input);
  if (cost > state.cash) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  state.stats.spent += cost;
  const id = newId(state, 'o');
  state.orders.push({
    id,
    designId: design.id,
    factoryId: f.id,
    quantity: q,
    quality: designQuality(design, f.id),
    unitCost: unitCost(state, design, f.id),
    orderedDay: state.day,
    etaDay: state.day + f.leadDays,
    delayed: false,
  });
  return { ok: true, id };
}

/** Daily factory processing: delays, arrivals, defects, scandals. */
export function processProduction(state: GameState, events: GameEvent[]): void {
  const bad = DIFFICULTIES[state.difficulty].badEventMult;
  const remaining = [];
  for (const o of state.orders) {
    const f = FACTORIES[o.factoryId];
    // A delay can strike once, on the day before arrival.
    if (!o.delayed && state.day === o.etaDay - 1 && chance(state, f.delayChance * bad)) {
      const days = randInt(state, 2, 6);
      o.etaDay += days;
      o.delayed = true;
      events.push({ type: 'delay', orderId: o.id, designId: o.designId, days });
    }
    if (state.day < o.etaDay) {
      remaining.push(o);
      continue;
    }
    let units = o.quantity;
    if (chance(state, f.defectChance * bad)) {
      const lost = Math.max(1, Math.round(units * randRange(state, 0.15, 0.4)));
      units -= lost;
      events.push({ type: 'defect', orderId: o.id, designId: o.designId, lost });
      if (lost / o.quantity > 0.25) state.reputation = Math.max(0, state.reputation - 2);
    }
    if (f.scandalChance > 0 && chance(state, f.scandalChance * bad)) {
      const repLoss = 12;
      state.reputation = Math.max(0, state.reputation - repLoss);
      state.followers = Math.round(state.followers * 0.97);
      state.hype = Math.min(100, state.hype + 4);
      events.push({ type: 'scandal', factoryId: f.id, repLoss });
    }
    const lot = state.inventory[o.designId];
    if (lot && lot.units > 0) {
      const total = lot.units + units;
      lot.quality = Math.round((lot.quality * lot.units + o.quality * units) / total);
      lot.unitCost = (lot.unitCost * lot.units + o.unitCost * units) / total;
      lot.units = total;
    } else {
      state.inventory[o.designId] = { units, quality: o.quality, unitCost: o.unitCost };
    }
    events.push({ type: 'orderArrived', orderId: o.id, designId: o.designId, units });
  }
  state.orders = remaining;
}
