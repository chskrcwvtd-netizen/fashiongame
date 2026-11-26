import { describe, expect, it } from 'vitest';
import { freeCapacity, placeOrder } from '../production';
import { advanceDay } from '../tick';
import { unitCost } from '../design';
import { giveStock, newGame, withDesign } from './helpers';

describe('production', () => {
  it('charges cash on order', () => {
    const s = newGame();
    const d = withDesign(s);
    const before = s.cash;
    const r = placeOrder(s, { designId: d.id, factoryId: 'danube', quantity: 100 });
    expect(r.ok).toBe(true);
    expect(s.cash).toBeCloseTo(before - 100 * unitCost(s, d, 'danube'), 5);
    expect(s.orders).toHaveLength(1);
    expect(s.orders[0].etaDay).toBe(s.day + 7);
  });
  it('refuses order beyond capacity', () => {
    const s = newGame('easy');
    const d = withDesign(s, { garment: 'cap' });
    giveStock(s, d.id, 300);
    expect(freeCapacity(s)).toBe(200);
    const r = placeOrder(s, { designId: d.id, factoryId: 'danube', quantity: 201 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/space/i);
    expect(placeOrder(s, { designId: d.id, factoryId: 'danube', quantity: 150 }).ok).toBe(true);
    expect(freeCapacity(s)).toBe(50);
  });
  it('refuses below minimum order', () => {
    const s = newGame();
    const d = withDesign(s);
    const r = placeOrder(s, { designId: d.id, factoryId: 'fastloop', quantity: 49 });
    expect(r.ok).toBe(false);
  });
  it('refuses without cash', () => {
    const s = newGame('hard');
    const d = withDesign(s, { garment: 'puffer', material: 'luxe' });
    const before = s.cash;
    const r = placeOrder(s, { designId: d.id, factoryId: 'nord', quantity: 400 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/cash/i);
    expect(s.cash).toBe(before);
  });
  it('refuses unknown design and non-integer quantity', () => {
    const s = newGame();
    expect(placeOrder(s, { designId: 'nope', factoryId: 'danube', quantity: 50 }).ok).toBe(false);
    const d = withDesign(s);
    expect(placeOrder(s, { designId: d.id, factoryId: 'danube', quantity: 50.5 }).ok).toBe(false);
  });
  it('order arrives at eta', () => {
    const s = newGame('normal', 1);
    const d = withDesign(s);
    placeOrder(s, { designId: d.id, factoryId: 'nord', quantity: 50 });
    const eta = s.orders[0].etaDay;
    let arrived = false;
    let lost = 0;
    for (let i = 0; i < 30 && !arrived; i++) {
      const ev = advanceDay(s);
      for (const e of ev) if (e.type === 'defect') lost += e.lost;
      if (ev.some((e) => e.type === 'orderArrived')) {
        arrived = true;
        expect(s.day).toBeGreaterThanOrEqual(eta);
      }
    }
    expect(arrived).toBe(true);
    expect(s.orders).toHaveLength(0);
    expect(s.inventory[d.id].units + lost).toBe(50);
    expect(s.inventory[d.id].quality).toBe(65);
  });
  it('cheap factory produces defects over many orders (seeded)', () => {
    let defects = 0;
    let premiumDefects = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const [factory, counter] of [['fastloop', 0], ['nord', 1]] as const) {
        const s = newGame('easy', seed);
        const d = withDesign(s, { garment: 'cap' });
        placeOrder(s, { designId: d.id, factoryId: factory, quantity: 60 });
        for (let i = 0; i < 25; i++) {
          if (advanceDay(s).some((e) => e.type === 'defect')) {
            if (counter === 0) defects++;
            else premiumDefects++;
          }
        }
      }
    }
    expect(defects).toBeGreaterThan(3);
    expect(defects).toBeGreaterThan(premiumDefects);
  });
});
