import { describe, expect, it } from 'vitest';
import { advanceDay } from '../tick';
import { upgradeHQ } from '../hq';
import { deserialize, serialize } from '../save';
import { setListing } from '../webshop';
import { giveStock, newGame, withDesign } from './helpers';

function runDays(s: ReturnType<typeof newGame>, n: number) {
  const all = [];
  for (let i = 0; i < n; i++) all.push(...advanceDay(s));
  return all;
}

describe('finance', () => {
  it('bills on week start', () => {
    const s = newGame();
    const cash = s.cash;
    const ev = runDays(s, 7); // reaches day 8 (Monday of week 2)
    const bills = ev.filter((e) => e.type === 'bills');
    expect(bills).toHaveLength(1);
    expect(s.day).toBe(8);
    expect(s.cash).toBeCloseTo(cash - 240, 5); // rent 200 + platform 40, no stock
  });
  it('storage costs money', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 400);
    const ev = runDays(s, 7);
    const bill = ev.find((e) => e.type === 'bills');
    expect(bill && bill.type === 'bills' && bill.storage).toBeCloseTo(60, 5);
  });
  it('overdrawn then bankrupt after grace (Normal gets one emergency loan first)', () => {
    const s = newGame();
    s.cash = 100;
    const ev = runDays(s, 7);
    expect(ev.some((e) => e.type === 'overdrawn')).toBe(true);
    expect(s.overdrawnSince).toBe(8);
    const ev2 = runDays(s, 14);
    expect(ev2.some((e) => e.type === 'bailout')).toBe(true);
    expect(s.gameOver).toBeNull();
    s.cash = -1;
    const ev3 = runDays(s, 21);
    expect(ev3.some((e) => e.type === 'bankrupt')).toBe(true);
    expect(s.gameOver?.reason).toBe('bankrupt');
  });
  it('hard has a shorter grace than easy', () => {
    const hard = newGame('hard');
    hard.cash = 10;
    runDays(hard, 7 + 7);
    expect(hard.gameOver).not.toBeNull();
    const easy = newGame('easy');
    easy.cash = 10;
    runDays(easy, 7 + 14);
    expect(easy.gameOver).toBeNull();
  });
  it('recovering clears overdrawn', () => {
    const s = newGame();
    s.cash = 100;
    runDays(s, 7);
    expect(s.overdrawnSince).not.toBeNull();
    s.cash += 5000;
    const ev = runDays(s, 1);
    expect(ev.some((e) => e.type === 'recovered')).toBe(true);
    expect(s.overdrawnSince).toBeNull();
  });
  it('advanceDay does nothing after game over', () => {
    const s = newGame();
    s.gameOver = { reason: 'bankrupt', day: s.day };
    const day = s.day;
    expect(advanceDay(s)).toEqual([]);
    expect(s.day).toBe(day);
  });
});

describe('hq', () => {
  it('upgrade needs cash', () => {
    const s = newGame();
    s.cash = 7999;
    expect(upgradeHQ(s).ok).toBe(false);
    s.cash = 9000;
    expect(upgradeHQ(s).ok).toBe(true);
    expect(s.hqLevel).toBe(1);
    expect(s.cash).toBe(1000);
  });
  it('cannot upgrade past the last level', () => {
    const s = newGame();
    s.cash = 1e7;
    upgradeHQ(s);
    upgradeHQ(s);
    expect(s.hqLevel).toBe(2);
    expect(upgradeHQ(s).ok).toBe(false);
  });
});

describe('save', () => {
  it('save roundtrip equals state', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 80);
    setListing(s, d.id, 60, true);
    runDays(s, 30);
    const copy = deserialize(serialize(s));
    expect(copy).toEqual(s);
    // continuing both gives identical results (determinism)
    runDays(s, 10);
    runDays(copy, 10);
    expect(copy).toEqual(s);
  });
  it('rejects corrupt save', () => {
    expect(() => deserialize('not json')).toThrow();
    expect(() => deserialize('{"hello":1}')).toThrow();
    const s = newGame();
    const bad = JSON.parse(serialize(s));
    bad.version = 99;
    expect(() => deserialize(JSON.stringify(bad))).toThrow();
  });
});
