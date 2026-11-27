import { DIFFICULTIES, ECON, GARMENTS, HQ_LEVELS, STAGE3 } from './content';
import { appeal, fairPrice, getDesign, priceFactor, seasonFactor } from './design';
import { newId } from './newGame';
import { randRange } from './rng';
import { availableUnits, growthRoom, recordSale } from './webshop';
import { COLLAB_REVENUE_SHARE, collabDemand } from './marketing';
import { localBonus } from './world';
import { addPress, holidayMult } from './extras';
import { engagedFollowers } from './audience';
import type { ActionResult, Drop, DropItem, DropResult, GameEvent, GameState } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function activeDrop(state: GameState): Drop | null {
  return state.drops.find((d) => d.status === 'scheduled') ?? null;
}

interface DropOptions {
  daysAhead: number;
  /** "1/100" numbered pieces: max 100, collectors pay more */
  numbered?: boolean;
  /** take 20% up front; stock can still be produced before drop day */
  preorder?: boolean;
  raffle?: boolean;
  botShield?: boolean;
}

type DropInput = DropOptions & (DropItem | { name: string; items: DropItem[] });

export function botShieldCost(state: GameState, units: number): number {
  return Math.round((500 + units * 2) * DIFFICULTIES[state.difficulty].costMult);
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
  if (!Number.isInteger(input.daysAhead) || input.daysAhead < ECON.dropMinDays || input.daysAhead > ECON.dropMaxDays)
    return { ok: false, reason: `Drop date must be ${ECON.dropMinDays}–${ECON.dropMaxDays} days ahead.` };
  const dropDay = state.day + input.daysAhead;
  const collection = 'items' in input ? input : null;
  const name = collection?.name.trim();
  const requested = 'items' in input ? input.items : [input];
  if (collection && (!name || name.length > 40 || requested.length < 2)) {
    return { ok: false, reason: 'Name the collection (up to 40 characters) and choose at least two pieces.' };
  }
  if (new Set(requested.map((item) => item.designId)).size !== requested.length) {
    return { ok: false, reason: 'Each piece can only appear once in the collection.' };
  }
  const items: DropItem[] = [];
  for (const item of requested) {
    const design = getDesign(state, item.designId);
    if (!design) return { ok: false, reason: 'Unknown design.' };
    if (!Number.isSafeInteger(item.units) || item.units <= 0) return { ok: false, reason: 'Pick how many units to drop.' };
    if (!Number.isFinite(item.price) || item.price < 1) return { ok: false, reason: 'Set a drop price.' };
    const ready = unitsReadyBy(state, item.designId, dropDay);
    if (!input.preorder && item.units > ready) {
      return { ok: false, reason: `${design.name}: only ${ready} units will be ready by drop day. Turn on pre-orders to sell first and make later.` };
    }
    items.push({ designId: item.designId, units: item.units, price: Math.min(ECON.maxListingPrice, Math.round(item.price)) });
  }
  const units = items.reduce((sum, item) => sum + item.units, 0);
  if (units > Math.floor(Number.MAX_SAFE_INTEGER / ECON.maxListingPrice)) return { ok: false, reason: 'Enter a smaller quantity.' };
  if (collection && units > HQ_LEVELS[state.hqLevel].capacity) {
    return { ok: false, reason: 'This collection exceeds your warehouse capacity.' };
  }
  if (input.numbered && units > 100) return { ok: false, reason: 'Numbered drops are 100 pieces at most.' };
  const shield = input.botShield ? botShieldCost(state, units) : 0;
  if (state.cash < shield) return { ok: false, reason: 'Not enough cash for bot protection.' };
  state.cash -= shield;
  state.stats.spent += shield;
  const deposit = input.preorder ? Math.round(items.reduce((sum, item) => sum + item.units * item.price, 0) * 0.2 * (1 - ECON.platformCut)) : 0;
  state.cash += deposit;
  const id = newId(state, 'x');
  state.drops.push({
    id,
    ...items[0],
    units,
    ...(collection ? { name, items } : {}),
    announcedDay: state.day,
    dropDay,
    hype: clamp(state.hype * 0.6 + 5, 0, 100),
    status: 'scheduled',
    postponements: 0,
    result: null,
    restock: !collection && previouslySoldOut(state, items[0].designId),
    numbered: !!input.numbered,
    preorder: !!input.preorder,
    raffle: !!input.raffle,
    botShield: !!input.botShield,
    deposit,
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

function previouslySoldOut(state: GameState, designId: string) {
  return state.drops.some((drop) => drop.status === 'done' && (
    drop.result?.items
      ? drop.result.items.some((item) => item.designId === designId && item.sold === item.units)
      : drop.designId === designId && drop.result?.outcome === 'soldout'
  ));
}

/** Demand for a drop right now (expected value, no randomness). */
export function dropDemand(state: GameState, drop: Pick<Drop, 'designId' | 'price' | 'hype'> & Partial<Pick<Drop, 'restock' | 'clash' | 'numbered' | 'raffle'>>): number {
  const design = getDesign(state, drop.designId);
  if (!design) return 0;
  const lot = state.inventory[drop.designId];
  const quality = lot?.quality ?? 50;
  const h = drop.hype / 100;
  const fairDrop = fairPrice(state, design, quality) * (1 + 0.6 * h) * (drop.numbered ? 1.35 : 1);
  const pf = priceFactor(fairDrop, drop.price, ECON.priceElasticity);
  const ally = state.rivalCollab ? state.rivals.find((r) => r.id === state.rivalCollab) : undefined;
  const base = engagedFollowers(state.followers) * (0.05 + 0.25 * Math.pow(h, 1.2)) + 30 * h + 5 + collabDemand(state) + (ally ? engagedFollowers(ally.followers) * 0.01 : 0);
  return (
    base *
    appeal(state, design, quality) *
    pf *
    Math.sqrt(GARMENTS[design.garment].demand) *
    Math.pow(seasonFactor(state, design), 0.7) *
    DIFFICULTIES[state.difficulty].demandMult *
    (drop.restock ? STAGE3.restockDemandMult : 1) *
    (drop.clash ? 0.8 : 1) *
    (drop.raffle ? 1.15 : 1) *
    localBonus(state, design) *
    holidayMult(state)
  );
}

function resolveDrop(state: GameState, drop: Drop, events: GameEvent[]) {
  const items = drop.items ?? [drop];
  const sales = items.map((item) => {
    const expected = dropDemand(state, {
      ...drop,
      ...item,
      restock: drop.items ? previouslySoldOut(state, item.designId) : drop.restock,
    }) / Math.sqrt(items.length);
    const demand = Math.max(0, Math.round(expected * randRange(state, 0.75, 1.25)));
    return { designId: item.designId, units: item.units, price: item.price, demand, sold: Math.min(item.units, demand) };
  });
  const demand = sales.reduce((sum, item) => sum + item.demand, 0);
  const sold = sales.reduce((sum, item) => sum + item.sold, 0);
  const ratio = demand / drop.units;
  const outcome: DropResult['outcome'] = sold >= drop.units ? 'soldout' : sold / drop.units >= 0.5 ? 'solid' : 'flop';
  const beforeSales = state.stats.revenue;
  const gross = sales.reduce((sum, item) => {
    state.inventory[item.designId].units -= item.sold;
    const revenue = item.sold * item.price;
    if (item.sold > 0) recordSale(state, item.designId, item.sold, revenue, events);
    return sum + revenue;
  }, 0);
  // pre-order money was already in the bank
  if (drop.deposit) state.cash -= drop.deposit;
  const partner = state.rivals.find((rival) => rival.id === state.rivalCollab)?.name;
  if (state.rivalCollab) state.rivalCollab = null;
  // without protection, bots grab part of a hot drop
  const bots = (outcome === 'soldout') && ratio > 2 && !drop.botShield && !drop.raffle ? Math.round(drop.units * 0.3) : 0;
  let artistCut = 0;
  if (state.collab) {
    artistCut = gross * COLLAB_REVENUE_SHARE;
    state.cash -= artistCut;
    state.collab = null;
  }
  state.stats.dropsTotal += 1;
  if (outcome === 'soldout') {
    state.stats.dropsSoldOut += 1;
    const fans = (drop.units * 0.8 + state.followers * 0.012 * Math.min(ratio, 2.5)) * growthRoom(state);
    state.followers += Math.round(fans * (drop.raffle ? 1.5 : 1) * (bots ? 0.5 : 1));
    state.hype = clamp(state.hype + 15, 0, 100);
    state.reputation = clamp(state.reputation + (bots ? 1 : 3), 0, 100);
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
    ...(partner ? { partner } : {}),
    units: drop.units,
    sold,
    revenue: state.stats.revenue - beforeSales - artistCut,
    demand,
    minutes: outcome === 'soldout' ? clamp(Math.round(60 / Math.pow(Math.max(ratio, 1), 1.5)), 1, 59) : null,
    resalePrice: outcome === 'soldout' && !drop.items ? Math.round(drop.price * (1 + 0.4 * Math.min(ratio, 4)) * (drop.numbered ? 1.6 : 1)) : null,
    raffle: !!drop.raffle,
    bots,
    numbered: !!drop.numbered,
    ...(drop.items ? { items: sales.map(({ designId, units, price, sold }) => ({ designId, units, price, sold })) } : {}),
  };
  const name = drop.name ?? getDesign(state, drop.designId)?.name ?? 'the drop';
  if (outcome === 'soldout' && ratio > 2) addPress(state, `${name} by ${state.brand.name} sells out in ${result.minutes} minutes`);
  if (outcome === 'flop') addPress(state, `${state.brand.name}'s ${name} drop falls flat`);
  drop.status = 'done';
  drop.result = result;
  events.push({ type: 'dropResult', dropId: drop.id, designId: drop.designId, name: drop.name, result });
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
  const missing = (drop.items ?? [drop]).find((item) => (state.inventory[item.designId]?.units ?? 0) < item.units);
  if (missing) {
    drop.dropDay = state.day + ECON.dropPostponeDays;
    drop.hype = clamp(drop.hype * 0.7, 0, 100);
    drop.postponements += 1;
    state.reputation = clamp(state.reputation - 1, 0, 100);
    events.push({ type: 'dropPostponed', dropId: drop.id, designId: missing.designId, newDay: drop.dropDay });
    return;
  }
  resolveDrop(state, drop, events);
}
