import { CITIES, DIFFICULTIES, ECON, GARMENTS, HQ_LEVELS } from './content';
import { appeal, fairPrice, getDesign, priceFactor, seasonFactor } from './design';
import { poisson } from './rng';
import { visitorMult } from './marketing';
import { engagedFollowers, room } from './audience';
import { cityLevel, localBonus, worldVisitorMult, worldWalkIns } from './world';
import { holidayMult } from './extras';
import type { ActionResult, GameEvent, GameState } from './types';

/** 1 → 0 as followers approach the market ceiling (home market plus cities abroad). */
export function growthRoom(state: GameState): number {
  return room(state);
}

/** Units of this design reserved for a scheduled drop. */
export function reservedUnits(state: GameState, designId: string): number {
  return state.drops
    .filter((d) => d.status === 'scheduled' && d.designId === designId)
    .reduce((a, d) => a + d.units, 0);
}

export function availableUnits(state: GameState, designId: string): number {
  const lot = state.inventory[designId];
  if (!lot) return 0;
  return Math.max(0, lot.units - reservedUnits(state, designId));
}

export function setListing(state: GameState, designId: string, price: number, active: boolean): ActionResult {
  if (!getDesign(state, designId)) return { ok: false, reason: 'Unknown design.' };
  if (!Number.isFinite(price)) return { ok: false, reason: 'Price must be a number.' };
  const clean = Math.min(ECON.maxListingPrice, Math.max(1, Math.round(price)));
  const existing = state.listings[designId];
  if (existing) {
    existing.price = clean;
    existing.active = active;
  } else {
    state.listings[designId] = {
      designId,
      price: clean,
      active,
      soldToday: 0,
      soldWeek: 0,
      soldTotal: 0,
      history: [],
    };
  }
  return { ok: true };
}

export function dailyVisitors(state: GameState): number {
  const hq = HQ_LEVELS[state.hqLevel];
  return (ECON.baseVisitors + engagedFollowers(state.followers) * ECON.visitorsPerFollower + hq.walkIn + worldWalkIns(state)) * hq.visitorMult * (1 + state.hype / 100) * visitorMult(state) * worldVisitorMult(state);
}

function activeListings(state: GameState) {
  return Object.values(state.listings).filter((l) => l.active && availableUnits(state, l.designId) > 0);
}

/** Expected units/day for a listing, as if it were listed with stock. */
export function expectedDailySales(state: GameState, designId: string, priceOverride?: number): number {
  const design = getDesign(state, designId);
  const listing = state.listings[designId];
  const lot = state.inventory[designId];
  if (!design) return 0;
  const price = priceOverride ?? listing?.price ?? 0;
  if (price <= 0) return 0;
  const quality = lot?.quality ?? 50;
  const others = activeListings(state).filter((l) => l.designId !== designId).length;
  const n = others + 1;
  const share = Math.pow(n, -ECON.attentionExponent);
  const g = GARMENTS[design.garment];
  return (
    dailyVisitors(state) *
    share *
    ECON.conversion *
    appeal(state, design, quality) *
    priceFactor(fairPrice(state, design, quality), price, ECON.priceElasticity) *
    seasonFactor(state, design) *
    g.demand *
    DIFFICULTIES[state.difficulty].demandMult *
    localBonus(state, design) *
    holidayMult(state)
  );
}

export function recordSale(state: GameState, designId: string, units: number, grossRevenue: number, events: GameEvent[]) {
  // shipping abroad costs customs: +0.5% per city you only ship to
  const customs = CITIES.filter((c) => cityLevel(state, c.id) === 1).length * 0.005;
  const net = grossRevenue * (1 - ECON.platformCut - customs);
  state.cash += net;
  state.stats.revenue += net;
  state.stats.revenueThisWeek += net;
  state.stats.unitsSold += units;
  state.stats.soldByDesign = state.stats.soldByDesign ?? {};
  state.stats.soldByDesign[designId] = (state.stats.soldByDesign[designId] ?? 0) + units;
  if (!state.flags.firstSale) {
    state.flags.firstSale = true;
    events.push({ type: 'firstSale', designId });
  }
}

export function simulateWebshopDay(state: GameState, events: GameEvent[]): void {
  for (const l of activeListings(state)) {
    const design = getDesign(state, l.designId);
    const lot = state.inventory[l.designId];
    if (!design || !lot) continue;
    const lambda = expectedDailySales(state, l.designId);
    const sold = Math.min(poisson(state, lambda), availableUnits(state, l.designId));
    if (sold <= 0) continue;
    lot.units -= sold;
    l.soldToday += sold;
    l.soldWeek += sold;
    l.soldTotal += sold;
    // poor quality comes back: refunded and written off
    const returned = lot.quality < 35 ? Math.round((sold * (35 - lot.quality)) / 100) : 0;
    const revenue = (sold - returned) * l.price;
    if (returned) state.reputation = Math.max(0, state.reputation - Math.min(1, returned * 0.1));
    recordSale(state, l.designId, sold, revenue, events);
    const a = appeal(state, design, lot.quality);
    state.followers += Math.round(sold * ECON.followersPerSale * a * growthRoom(state));
    // Reputation drifts toward the quality customers receive.
    const target = lot.quality * 0.8;
    state.reputation += (target - state.reputation) * 0.004 * Math.sqrt(sold);
    state.reputation = Math.min(100, Math.max(0, state.reputation));
    events.push({ type: 'sale', designId: l.designId, units: sold, revenue: revenue * (1 - ECON.platformCut) });
  }
  const top = Object.values(state.listings).sort((a, b) => b.soldTotal - a.soldTotal)[0];
  if (top && top.soldTotal > 0) state.stats.bestSellerId = top.designId;
}

/** Turn auto-reorder on (factory + batch size) or off (null). Needs a manager on the team to run. */
export function setAutoRestock(state: GameState, designId: string, rule: { factoryId: import('./types').FactoryId; qty: number } | null): ActionResult {
  const l = state.listings[designId];
  if (!l) return { ok: false, reason: 'List the piece in the webshop first.' };
  if (rule && !state.employees.some((e) => e.role === 'manager')) return { ok: false, reason: 'Hire a manager to run auto-reorders.' };
  l.auto = rule ? { factoryId: rule.factoryId, qty: Math.max(1, Math.round(rule.qty)) } : null;
  return { ok: true };
}
