import { describe, expect, it } from 'vitest';
import { expectedDailySales, setListing, simulateWebshopDay } from '../webshop';
import { activeDrop, postTeaser, scheduleDrop } from '../drops';
import { placeOrder } from '../production';
import { advanceDay } from '../tick';
import { fairPrice } from '../design';
import type { GameEvent, GameState } from '../types';
import { giveStock, newGame, withDesign } from './helpers';

function runUntilDrop(s: GameState, limit = 30): GameEvent | undefined {
  for (let i = 0; i < limit; i++) {
    const found = advanceDay(s).find((e) => e.type === 'dropResult');
    if (found) return found;
  }
  return undefined;
}

describe('webshop', () => {
  it('clamps listing price', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 10);
    expect(setListing(s, d.id, 0, true).ok).toBe(true);
    expect(s.listings[d.id].price).toBe(1);
    setListing(s, d.id, 99999999, true);
    expect(s.listings[d.id].price).toBe(10000);
    setListing(s, d.id, 64.7, true);
    expect(s.listings[d.id].price).toBe(65);
    expect(setListing(s, d.id, Number.NaN, true).ok).toBe(false);
    expect(setListing(s, 'missing', 50, true).ok).toBe(false);
  });
  it('cheaper price sells more on average', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 400);
    setListing(s, d.id, 50, true);
    const cheap = expectedDailySales(s, d.id);
    setListing(s, d.id, 120, true);
    const dear = expectedDailySales(s, d.id);
    expect(cheap).toBeGreaterThan(dear * 2);
    expect(cheap).toBeGreaterThan(0.8);
  });
  it('no sales without listing', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 100);
    const ev: GameEvent[] = [];
    for (let i = 0; i < 20; i++) simulateWebshopDay(s, ev);
    expect(ev.filter((e) => e.type === 'sale')).toHaveLength(0);
    expect(s.inventory[d.id].units).toBe(100);
  });
  it('listed stock sells and earns cash', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 100);
    setListing(s, d.id, 60, true);
    const cash = s.cash;
    const ev: GameEvent[] = [];
    for (let i = 0; i < 20; i++) simulateWebshopDay(s, ev);
    expect(s.inventory[d.id].units).toBeLessThan(100);
    expect(s.cash).toBeGreaterThan(cash);
    expect(s.stats.unitsSold).toBe(100 - s.inventory[d.id].units);
    expect(ev.some((e) => e.type === 'firstSale')).toBe(true);
  });
  it('never sells more than stock', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 3);
    setListing(s, d.id, 5, true);
    s.followers = 100000;
    const ev: GameEvent[] = [];
    simulateWebshopDay(s, ev);
    expect(s.inventory[d.id].units).toBe(0);
    expect(s.stats.unitsSold).toBe(3);
  });
});

describe('drops', () => {
  it('validates drop window and stock', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 50);
    expect(scheduleDrop(s, { designId: d.id, units: 40, price: 80, daysAhead: 2 }).ok).toBe(false);
    expect(scheduleDrop(s, { designId: d.id, units: 40, price: 80, daysAhead: 15 }).ok).toBe(false);
    expect(scheduleDrop(s, { designId: d.id, units: 60, price: 80, daysAhead: 7 }).ok).toBe(false);
    expect(scheduleDrop(s, { designId: d.id, units: 40, price: 80, daysAhead: 7 }).ok).toBe(true);
    expect(scheduleDrop(s, { designId: d.id, units: 5, price: 80, daysAhead: 7 }).ok).toBe(false); // one at a time
  });
  it('reserved drop units are not sold in the webshop', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 50);
    scheduleDrop(s, { designId: d.id, units: 50, price: 80, daysAhead: 7 });
    setListing(s, d.id, 10, true);
    s.followers = 50000;
    const ev: GameEvent[] = [];
    simulateWebshopDay(s, ev);
    expect(s.inventory[d.id].units).toBe(50);
  });
  it('hyped drop sells out', () => {
    let soldOut = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const s = newGame('normal', seed);
      const d = withDesign(s);
      giveStock(s, d.id, 50);
      const fair = fairPrice(s, d, 50);
      scheduleDrop(s, { designId: d.id, units: 40, price: Math.round(fair), daysAhead: 6 });
      for (let i = 0; i < 5; i++) {
        postTeaser(s);
        advanceDay(s);
      }
      const ev = runUntilDrop(s);
      if (ev && ev.type === 'dropResult' && ev.result.outcome === 'soldout') soldOut++;
    }
    expect(soldOut).toBeGreaterThanOrEqual(8);
  });
  it('overpriced drop flops', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 200);
    scheduleDrop(s, { designId: d.id, units: 200, price: 900, daysAhead: 4 });
    const ev = runUntilDrop(s);
    expect(ev?.type).toBe('dropResult');
    if (ev?.type === 'dropResult') {
      expect(ev.result.outcome).toBe('flop');
      expect(s.inventory[d.id].units).toBe(200 - ev.result.sold);
    }
    expect(activeDrop(s)).toBeNull();
  });
  it('postpones drop when stock is late', () => {
    const s = newGame();
    const d = withDesign(s);
    placeOrder(s, { designId: d.id, factoryId: 'danube', quantity: 60 });
    expect(scheduleDrop(s, { designId: d.id, units: 50, price: 80, daysAhead: 8 }).ok).toBe(true);
    s.orders[0].etaDay = s.day + 20; // simulate a long factory delay
    s.orders[0].delayed = true;
    let postponed = false;
    for (let i = 0; i < 9; i++) {
      if (advanceDay(s).some((e) => e.type === 'dropPostponed')) postponed = true;
    }
    expect(postponed).toBe(true);
    expect(activeDrop(s)?.status).toBe('scheduled');
    expect(s.stats.unitsSold).toBe(0);
  });
  it('teaser once per day', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 50);
    expect(postTeaser(s).ok).toBe(false); // no drop yet
    scheduleDrop(s, { designId: d.id, units: 40, price: 80, daysAhead: 7 });
    const h0 = activeDrop(s)!.hype;
    expect(postTeaser(s).ok).toBe(true);
    expect(activeDrop(s)!.hype).toBeGreaterThan(h0);
    expect(postTeaser(s).ok).toBe(false);
    advanceDay(s);
    expect(postTeaser(s).ok).toBe(true);
  });
});
