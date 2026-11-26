import { DIFFICULTIES, ECON, GARMENTS } from './content';
import { appeal, fairPrice, getDesign, priceFactor, seasonFactor } from './design';
import { newId } from './newGame';
import { randRange } from './rng';
import { availableUnits, growthRoom, recordSale } from './webshop';
import type { ActionResult, Drop, DropResult, GameEvent, GameState } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function activeDrop(state: GameState): Drop | null {
  return state.drops.find((d) => d.status === 'scheduled') ?? null;
}

export interface DropInput {
  designId: string;
  units: number;
  price: number;
  daysAhead: number;
}

/** Units that could be ready for a drop on dropDay (free stock + orders landing by then). */
export function unitsReadyBy(state: GameState, designId: string, dropDay: number): number {
  const incoming = state.orders
    .filter((o) => o.designId === designId && o.etaDay <= dropDay)
    .reduce((a, o) => a + o.quantity, 0);
  return availableUnits(state, designId) + incoming;
}

export function scheduleDrop(state: GameState, input: DropInput): ActionResult {
  if (state.gameOver) return { ok: false, reason: 'Game over.' };
  if (activeDrop(state)) return { ok: false, reason: 'You already have a drop coming up.' };
  if (!getDesign(state, input.designId)) return { ok: false, reason: 'Unknown design.' };
  if (!Number.isInteger(input.daysAhead) || input.daysAhead < ECON.dropMinDays || input.daysAhead > ECON.dropMaxDays)
    return { ok: false, reason: `Drop date must be ${ECON.dropMinDays}–${ECON.dropMaxDays} days ahead.` };
  if (!Number.isInteger(input.units) || input.units <= 0) return { ok: false, reason: 'Pick how many units to drop.' };
  if (!Number.isFinite(input.price) || input.price < 1) return { ok: false, reason: 'Set a drop price.' };
  const dropDay = state.day + input.daysAhead;
  const ready = unitsReadyBy(state, input.designId, dropDay);
  if (input.units > ready) return { ok: false, reason: `Only ${ready} units will be ready by drop day.` };
  const id = newId(state, 'x');
  state.drops.push({
    id,
    designId: input.designId,
    units: input.units,
    price: Math.min(ECON.maxListingPrice, Math.round(input.price)),
    announcedDay: state.day,
    dropDay,
    hype: clamp(state.hype * 0.6 + 5, 0, 100),
    status: 'scheduled',
    postponements: 0,
    result: null,
  });
  state.hype = clamp(state.hype + 3, 0, 100);
  // keep history short
  const done = state.drops.filter((d) => d.status === 'done');
  if (done.length > 20) state.drops = state.drops.filter((d) => d.status === 'scheduled' || done.slice(-20).includes(d));
  return { ok: true, id };
}

export function teaserCost(state: GameState): number {
  return Math.round(ECON.teaserCost * DIFFICULTIES[state.difficulty].costMult);
}

export function postTeaser(state: GameState): ActionResult {
  const drop = activeDrop(state);
  if (!drop) return { ok: false, reason: 'No drop to tease.' };
  if (state.lastTeaserDay === state.day) return { ok: false, reason: 'Already teased today. Come back tomorrow.' };
  const cost = teaserCost(state);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  state.stats.spent += cost;
  state.lastTeaserDay = state.day;
  drop.hype = clamp(drop.hype + 12 * (1 - drop.hype / 100), 0, 100);
  state.hype = clamp(state.hype + 2, 0, 100);
  return { ok: true };
}

/** Demand for a drop right now (expected value, no randomness). */
export function dropDemand(state: GameState, drop: Pick<Drop, 'designId' | 'price' | 'hype'>): number {
  const design = getDesign(state, drop.designId);
  if (!design) return 0;
  const lot = state.inventory[drop.designId];
  const quality = lot?.quality ?? 50;
  const h = drop.hype / 100;
  const fairDrop = fairPrice(state, design, quality) * (1 + 0.6 * h);
  const pf = priceFactor(fairDrop, drop.price, ECON.priceElasticity);
  const base = state.followers * (0.05 + 0.25 * Math.pow(h, 1.2)) + 30 * h + 5;
  return (
    base *
    appeal(state, design, quality) *
    pf *
    Math.sqrt(GARMENTS[design.garment].demand) *
    Math.pow(seasonFactor(state, design), 0.7) *
    DIFFICULTIES[state.difficulty].demandMult
  );
}

function resolveDrop(state: GameState, drop: Drop, events: GameEvent[]) {
  const lot = state.inventory[drop.designId];
  const demand = Math.max(0, Math.round(dropDemand(state, drop) * randRange(state, 0.75, 1.25)));
  const sold = Math.min(drop.units, demand);
  const ratio = demand / Math.max(1, drop.units);
  const outcome: DropResult['outcome'] = sold >= drop.units ? 'soldout' : sold / drop.units >= 0.5 ? 'solid' : 'flop';
  lot.units -= sold;
  const gross = sold * drop.price;
  if (sold > 0) recordSale(state, drop.designId, sold, gross, events);
  state.stats.dropsTotal += 1;
  if (outcome === 'soldout') {
    state.stats.dropsSoldOut += 1;
    state.followers += Math.round((drop.units * 0.8 + state.followers * 0.012 * Math.min(ratio, 2.5)) * growthRoom(state));
    state.hype = clamp(state.hype + 15, 0, 100);
    state.reputation = clamp(state.reputation + 3, 0, 100);
  } else if (outcome === 'solid') {
    state.followers += Math.round(sold * 0.4 * growthRoom(state));
    state.hype = clamp(state.hype + 5, 0, 100);
    state.reputation = clamp(state.reputation + 1, 0, 100);
  } else {
    state.followers = Math.round(state.followers * 0.98);
    state.hype = clamp(state.hype - 15, 0, 100);
    state.reputation = clamp(state.reputation - 4, 0, 100);
  }
  const result: DropResult = {
    outcome,
    units: drop.units,
    sold,
    revenue: gross * (1 - ECON.platformCut),
    demand,
    minutes: outcome === 'soldout' ? clamp(Math.round(60 / Math.pow(Math.max(ratio, 1), 1.5)), 1, 59) : null,
    resalePrice: outcome === 'soldout' ? Math.round(drop.price * (1 + 0.4 * Math.min(ratio, 4))) : null,
  };
  drop.status = 'done';
  drop.result = result;
  events.push({ type: 'dropResult', dropId: drop.id, designId: drop.designId, result });
}

export function processDrops(state: GameState, events: GameEvent[]): void {
  const drop = activeDrop(state);
  if (!drop) return;
  if (state.day < drop.dropDay) {
    const elapsed = state.day - drop.announcedDay;
    if (elapsed <= 8) {
      const reach = 3 + 4 * Math.min(1, Math.sqrt(state.followers / 20000));
      drop.hype = clamp(drop.hype + reach * (1 - drop.hype / 100), 0, 100);
    } else {
      drop.hype = clamp(drop.hype - 3, 0, 100);
    }
    return;
  }
  const lot = state.inventory[drop.designId];
  if (!lot || lot.units < drop.units) {
    drop.dropDay = state.day + ECON.dropPostponeDays;
    drop.hype = clamp(drop.hype * 0.7, 0, 100);
    drop.postponements += 1;
    state.reputation = clamp(state.reputation - 1, 0, 100);
    events.push({ type: 'dropPostponed', dropId: drop.id, designId: drop.designId, newDay: drop.dropDay });
    return;
  }
  resolveDrop(state, drop, events);
}
