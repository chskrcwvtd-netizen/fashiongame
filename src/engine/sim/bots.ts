import { createNewGame } from '../newGame';
import { createDesign, fairPrice, unitCost } from '../design';
import { dateInfo } from '../calendar';
import { activeDrop, dropDemand, postTeaser, scheduleDrop } from '../drops';
import { freeCapacity, incomingUnits, placeOrder } from '../production';
import { availableUnits, expectedDailySales, setListing } from '../webshop';
import { upgradeCost, upgradeHQ } from '../hq';
import { advanceDay } from '../tick';
import type { DesignInput, DifficultyId, GameState } from '../types';

export type Strategy = 'smart' | 'sloppy' | 'reckless' | 'idle';

export interface BotResult {
  cash: number;
  followers: number;
  bankruptDay: number | null;
  hqLevel: number;
  studioDay: number | null;
  flagshipDay: number | null;
  unitsSold: number;
  revenue: number;
  dropsSoldOut: number;
  dropsTotal: number;
  state: GameState;
}

const base: Omit<DesignInput, 'garment' | 'name'> = {
  primary: 'black', secondary: 'lime', pattern: 'grid', graphic: 'emblem', text: '', font: 'chrome', emblem: 'skull', material: 'standard',
};

function smartDay(s: GameState) {
  if (s.designs.length === 0) {
    createDesign(s, { ...base, garment: 'hoodie', name: 'GRID HOODIE' });
    createDesign(s, { ...base, garment: 'tee', name: 'GRID TEE', primary: 'chrome', secondary: 'black' });
    createDesign(s, { ...base, garment: 'puffer', name: 'GRID PUFFER' });
  }
  const season = dateInfo(s.day).seasonIndex;
  const focus = season === 1 ? [s.designs[1]] : season === 3 ? [s.designs[0], s.designs[2]] : [s.designs[0], s.designs[1]];
  for (const d of s.designs) {
    const lot = s.inventory[d.id];
    const q = lot?.quality ?? 50;
    const price = Math.round(fairPrice(s, d, q) * 0.95);
    if (lot && lot.units > 0) setListing(s, d.id, price, true);
  }
  for (const d of focus) {
    const price = Math.round(fairPrice(s, d, 50) * 0.95);
    const daily = Math.max(1, expectedDailySales(s, d.id, price));
    const have = availableUnits(s, d.id) + incomingUnits(s, d.id);
    const target = Math.round(daily * 21) + 40;
    if (have < daily * 10) {
      const cost = unitCost(s, d, 'danube');
      const qty = Math.min(freeCapacity(s), Math.floor((s.cash * 0.5) / cost), target);
      if (qty >= 30) placeOrder(s, { designId: d.id, factoryId: 'danube', quantity: qty });
    }
  }
  const drop = activeDrop(s);
  if (!drop) {
    const d = focus[0];
    const avail = availableUnits(s, d.id);
    if (avail >= 40) {
      const lot = s.inventory[d.id];
      const price = Math.round(fairPrice(s, d, lot.quality) * 1.25);
      const est = dropDemand(s, { designId: d.id, price, hype: 55 });
      const units = Math.max(20, Math.min(Math.floor(avail * 0.6), Math.round(est * 0.8)));
      scheduleDrop(s, { designId: d.id, units, price, daysAhead: 7 });
    }
  } else if (s.cash > 1500) {
    postTeaser(s);
  }
  const up = upgradeCost(s);
  if (up !== null && s.cash > up * 1.8) upgradeHQ(s);
}

function recklessDay(s: GameState) {
  if (s.designs.length === 0) {
    createDesign(s, { ...base, garment: 'puffer', name: 'BAD PUFFER', primary: 'forest', secondary: 'orange', pattern: 'stripes', graphic: 'none', material: 'luxe' });
  }
  const d = s.designs[0];
  const cost = unitCost(s, d, 'fastloop');
  const qty = Math.min(freeCapacity(s), Math.floor((s.cash - 200) / cost));
  if (qty >= 50) placeOrder(s, { designId: d.id, factoryId: 'fastloop', quantity: qty });
  if (s.inventory[d.id]?.units) setListing(s, d.id, 450, true);
  const avail = availableUnits(s, d.id);
  if (!activeDrop(s) && avail > 20) scheduleDrop(s, { designId: d.id, units: avail, price: 600, daysAhead: 14 });
  postTeaser(s);
}

/** Plausible-but-bad player: overprices, overproduces at the cheap factory, never adapts. */
function sloppyDay(s: GameState) {
  if (s.designs.length === 0) {
    createDesign(s, { ...base, garment: 'hoodie', name: 'MID HOODIE', primary: 'orange', secondary: 'forest', pattern: 'stripes', material: 'basic' });
  }
  const d = s.designs[0];
  const lot = s.inventory[d.id];
  const fair = fairPrice(s, d, lot?.quality ?? 15);
  if (lot && lot.units > 0) setListing(s, d.id, Math.round(fair * 1.6), true);
  if ((lot?.units ?? 0) + incomingUnits(s, d.id) < 150) {
    const cost = unitCost(s, d, 'fastloop');
    const qty = Math.min(freeCapacity(s), Math.floor((s.cash * 0.7) / cost));
    if (qty >= 50) placeOrder(s, { designId: d.id, factoryId: 'fastloop', quantity: qty });
  }
  const avail = availableUnits(s, d.id);
  if (!activeDrop(s) && avail > 50) scheduleDrop(s, { designId: d.id, units: avail, price: Math.round(fair * 2), daysAhead: 14 });
}

export function runBot(difficulty: DifficultyId, strategy: Strategy, days: number, seed: number): BotResult {
  const s = createNewGame({ brandName: 'Bot Brand', logo: { glyph: 'star', color: 'lime' }, difficulty, seed });
  let studioDay: number | null = null;
  let flagshipDay: number | null = null;
  for (let i = 0; i < days && !s.gameOver; i++) {
    if (strategy === 'smart') smartDay(s);
    else if (strategy === 'reckless') recklessDay(s);
    else if (strategy === 'sloppy') sloppyDay(s);
    advanceDay(s);
    if (s.hqLevel >= 1 && studioDay === null) studioDay = s.day;
    if (s.hqLevel >= 2 && flagshipDay === null) flagshipDay = s.day;
  }
  return {
    cash: Math.round(s.cash),
    followers: s.followers,
    bankruptDay: s.gameOver ? s.gameOver.day : null,
    hqLevel: s.hqLevel,
    studioDay,
    flagshipDay,
    unitsSold: s.stats.unitsSold,
    revenue: Math.round(s.stats.revenue),
    dropsSoldOut: s.stats.dropsSoldOut,
    dropsTotal: s.stats.dropsTotal,
    state: s,
  };
}
