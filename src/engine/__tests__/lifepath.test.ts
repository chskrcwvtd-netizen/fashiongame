import { describe, expect, it } from 'vitest';
import { activeDrop, processDrops, scheduleDrop } from '../drops';
import { currentEvent, resolveEvent } from '../events';
import { HAND_TO_HAND, processLifePaths } from '../lifepath';
import { advanceDay } from '../tick';
import { deserialize, serialize } from '../save';
import { freeCapacity } from '../production';
import type { GameEvent, GameState } from '../types';
import { giveStock, newGame, withDesign } from './helpers';

/** Drop `units` tees at a price so low they surely sell (or 0 demand via a huge price). */
function dropTee(s: GameState, price = 1, extra?: string) {
  const tee = withDesign(s, { name: 'FIRST TEE', garment: 'tee', back: 'text', backText: 'PINCE' });
  giveStock(s, tee.id, 30);
  const r = extra
    ? scheduleDrop(s, { name: 'Basement Set', items: [{ designId: extra, units: 5, price: 1 }, { designId: tee.id, units: 10, price }], daysAhead: 3 })
    : scheduleDrop(s, { designId: tee.id, units: 10, price, daysAhead: 3 });
  expect(r.ok).toBe(true);
  s.day = activeDrop(s)!.dropDay;
  const ev: GameEvent[] = [];
  processDrops(s, ev);
  return { tee, ev };
}

/** Jump to the photo's day and run that day's check (no other systems). */
function reachPhoto(s: GameState) {
  s.day = s.lifePaths![0].dueDay;
  const ev: GameEvent[] = [];
  processLifePaths(s, ev);
  return ev;
}

describe('hand to hand', () => {
  it('starts only from a real sale, once per game, and needs no RNG', () => {
    const zero = newGame();
    dropTee(zero, 100000);
    expect(zero.lifePaths ?? []).toHaveLength(0);

    const s = newGame();
    const { tee } = dropTee(s);
    expect(s.lifePaths).toHaveLength(1);
    expect(s.lifePaths![0]).toMatchObject({ designId: tee.id, status: 'out', price: 1, dueDay: s.day + HAND_TO_HAND.returnDays });
    // the wearer pick adds no random draws: same RNG position as a run where no story starts
    const control = newGame();
    control.lifePaths = [{ ...s.lifePaths![0] }];
    dropTee(control);
    expect(control.rngState).toBe(s.rngState);
    dropTee(s); // a second drop never starts another
    expect(s.lifePaths).toHaveLength(1);
  });

  it('follows the tee in a multi-piece drop and leaves the drop accounting alone', () => {
    const s = newGame();
    const bag = withDesign(s, { name: 'BAG', garment: 'bag' });
    giveStock(s, bag.id, 10);
    const { tee, ev } = dropTee(s, 1, bag.id);
    expect(s.lifePaths![0].designId).toBe(tee.id);
    const res = ev.find((e) => e.type === 'dropResult');
    expect(res).toMatchObject({ result: { units: 15, sold: 15 } });
    expect(s.stats.unitsSold).toBe(15);
  });

  it('the photo comes back once, even across save and reload', () => {
    const s = newGame();
    dropTee(s);
    const ev = reachPhoto(s);
    expect(ev.filter((e) => e.type === 'eventStarted')).toHaveLength(1);
    const again = deserialize(serialize(s));
    processLifePaths(again, []);
    again.day += 30;
    processLifePaths(again, []);
    expect(again.pendingEvents.filter((p) => p.defId === 'hand_to_hand')).toHaveLength(1);
  });

  it('accepting makes a real small run, credited and cut, paid once on delivery', () => {
    const s = newGame();
    dropTee(s);
    reachPhoto(s);
    const cash = s.cash;
    const revenue = s.stats.revenue;
    const sold = s.stats.unitsSold;
    const free = freeCapacity(s);
    expect(currentEvent(s)?.defId).toBe('hand_to_hand');
    const r = resolveEvent(s, 0);
    expect(r.ok).toBe(true);
    const lp = s.lifePaths![0];
    expect(lp.status).toBe('accepted');
    const variant = s.designs.find((d) => d.id === lp.variantId)!;
    expect(variant).toMatchObject({ cut: true, credit: 'IDEA: ' + (lp.wearer === 'mira' ? 'MIRA' : 'BENCE'), backText: 'PINCE' });
    expect(s.orders.filter((o) => o.designId === variant.id)).toHaveLength(1);
    expect(s.cash).toBeLessThan(cash);
    expect(freeCapacity(s)).toBe(free - HAND_TO_HAND.units);
    // passing the garment around earns nothing; only the club's delivery does
    expect(s.stats.revenue).toBe(revenue);
    const saved = serialize(s);
    for (let i = 0; i < 20; i++) advanceDay(s);
    expect(s.lifePaths![0].status).toBe('delivered');
    // nothing is listed in the webshop, so the club run is the only sale
    expect(s.lifePaths![0].delivered).toBeGreaterThanOrEqual(1);
    expect(s.stats.unitsSold - sold).toBe(s.lifePaths![0].delivered);
    expect(s.inventory[variant.id].units).toBe(0);
    // reloading the pre-delivery save delivers exactly once too
    const r2 = deserialize(saved);
    for (let i = 0; i < 20; i++) advanceDay(r2);
    expect(r2.lifePaths![0].status).toBe('delivered');
    expect(r2.stats.soldByDesign![variant.id]).toBe(r2.lifePaths![0].delivered);
  });

  it('saying no costs nothing and ends the story', () => {
    const s = newGame();
    dropTee(s);
    reachPhoto(s);
    const cash = s.cash;
    expect(resolveEvent(s, 1).ok).toBe(true);
    expect(s.lifePaths![0].status).toBe('declined');
    expect(s.cash).toBe(cash);
    expect(s.orders).toHaveLength(0);
  });

  it('the club order is refused without cash or warehouse space', () => {
    const s = newGame();
    dropTee(s);
    reachPhoto(s);
    s.cash = 0;
    expect(resolveEvent(s, 0)).toMatchObject({ ok: false, reason: 'Not enough cash.' });
    expect(s.lifePaths![0].status).toBe('spotted');
  });

  it('old saves load with an empty life-path log', () => {
    const s = newGame();
    const old = JSON.parse(serialize(s));
    delete old.lifePaths;
    const loaded = deserialize(JSON.stringify(old));
    expect(loaded.lifePaths ?? []).toHaveLength(0);
    advanceDay(loaded);
  });
});
