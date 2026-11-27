import { describe, expect, it } from 'vitest';
import { advanceDay } from '../tick';
import { buildOwnFactory, collabWithRival, holiday, maxLoan, takeLoan, tradeShares, toggleSustainability, yearlyShakeUp, CHALLENGES } from '../extras';
import { createNewGame } from '../newGame';
import { scheduleDrop, botShieldCost } from '../drops';
import { setListing, simulateWebshopDay, expectedDailySales } from '../webshop';
import { appeal, createDesign, designQuality } from '../design';
import { weeklyBillEstimate } from '../finance';
import { goPublic } from '../corporate';
import { refreshCandidates, hire, makeCandidate } from '../team';
import type { GameEvent } from '../types';
import { HOODIE, giveStock, newGame, withDesign } from './helpers';

const logo = { glyph: 'star', color: 'lime' };

describe('money tools', () => {
  it('loans add cash now and cost every week until paid', () => {
    const s = newGame();
    expect(takeLoan(s, 250000).ok).toBe(false); // too big for a tiny brand
    expect(maxLoan(s)).toBeGreaterThanOrEqual(10000);
    const cash = s.cash;
    expect(takeLoan(s, 10000).ok).toBe(true);
    expect(s.cash).toBe(cash + 10000);
    expect(weeklyBillEstimate(s).loans).toBeGreaterThan(0);
    for (let i = 0; i < 26 * 7; i++) advanceDay(s);
    expect(s.loans).toHaveLength(0);
  });
  it('sandbox never goes bankrupt', () => {
    const s = createNewGame({ brandName: 'SANDBOX', logo, difficulty: 'hard', mode: 'sandbox', seed: 1 });
    s.cash = -1e6;
    for (let i = 0; i < 60; i++) advanceDay(s);
    expect(s.gameOver).toBeNull();
  });
  it('own factory, shares and sustainability', () => {
    const s = newGame();
    s.cash = 5e6;
    s.hqLevel = 2;
    expect(buildOwnFactory(s).ok).toBe(true);
    expect(buildOwnFactory(s).ok).toBe(false);
    const d = withDesign(s);
    expect(designQuality(d, 'own', s)).toBeGreaterThan(designQuality(d, 'danube', s));
    expect(weeklyBillEstimate(s).extras).toBeGreaterThan(0);
    expect(tradeShares(s, true).ok).toBe(false); // not public
    s.followers = 3e6;
    s.stats.weeklyRevenue = [900000];
    goPublic(s);
    const own = s.corporate.ownership;
    expect(tradeShares(s, false).ok).toBe(true);
    expect(s.corporate.ownership).toBe(own - 1);
    toggleSustainability(s);
    expect(s.sustainability).toBe(true);
    expect(s.press!.length).toBeGreaterThan(0);
  });
});

describe('challenges', () => {
  it('shoestring starts poor and is won by reaching the Studio', () => {
    const s = createNewGame({ brandName: 'SHOE', logo, difficulty: 'normal', mode: 'shoestring', seed: 1 });
    expect(s.cash).toBe(2000);
    s.hqLevel = 1;
    const ev = advanceDay(s);
    expect(ev.some((e) => e.type === 'challengeResult' && e.won)).toBe(true);
    expect(s.challenge?.done).toBe('won');
  });
  it('sprint is lost after a year', () => {
    const s = createNewGame({ brandName: 'SPRINT', logo, difficulty: 'normal', mode: 'sprint', seed: 1 });
    s.day = 365;
    s.cash = 1e6;
    const ev = advanceDay(s);
    expect(ev.some((e) => e.type === 'challengeResult' && !e.won)).toBe(true);
    expect(CHALLENGES).toHaveLength(5);
  });
});

describe('drop options', () => {
  it('numbered drops cap at 100; pre-orders sell before stock exists', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 20);
    expect(scheduleDrop(s, { designId: d.id, units: 150, price: 80, daysAhead: 7, numbered: true }).ok).toBe(false);
    expect(scheduleDrop(s, { designId: d.id, units: 80, price: 80, daysAhead: 7 }).ok).toBe(false);
    const cash = s.cash;
    expect(scheduleDrop(s, { designId: d.id, units: 80, price: 80, daysAhead: 7, preorder: true }).ok).toBe(true);
    expect(s.cash).toBeGreaterThan(cash);
  });
  it('bots grab a hot drop without protection', () => {
    const run = (shield: boolean) => {
      const s = newGame('easy', 3);
      s.followers = 20000;
      const d = withDesign(s);
      giveStock(s, d.id, 50);
      scheduleDrop(s, { designId: d.id, units: 30, price: 40, daysAhead: 3, botShield: shield });
      let bots = -1;
      for (let i = 0; i < 6; i++) for (const e of advanceDay(s)) if (e.type === 'dropResult') bots = e.result.bots ?? 0;
      return bots;
    };
    expect(run(false)).toBeGreaterThan(0);
    expect(run(true)).toBe(0);
    expect(botShieldCost(newGame(), 100)).toBe(700);
  });
});

describe('selling details', () => {
  it('low quality comes back as returns', () => {
    const s = newGame();
    s.followers = 50000;
    const d = withDesign(s);
    giveStock(s, d.id, 500, 10, 5);
    setListing(s, d.id, 20, true);
    const ev: GameEvent[] = [];
    const rep = s.reputation;
    for (let i = 0; i < 5; i++) simulateWebshopDay(s, ev);
    expect(s.reputation).toBeLessThan(rep);
  });
  it('Black Friday week boosts demand', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 100);
    setListing(s, d.id, 60, true);
    s.day = 2 * 91 + 11 * 7 + 1; // Fall, week 12
    expect(holiday(s)?.name).toBe('Black Friday');
    const bf = expectedDailySales(s, d.id);
    s.day -= 14;
    expect(bf).toBeGreaterThan(expectedDailySales(s, d.id) * 1.3);
  });
  it('named collections, pixel art, jeans', () => {
    const s = newGame();
    const a = createDesign(s, { ...HOODIE, garment: 'jeans', collection: 'NIGHT', graphic: 'pixel', pixels: '1'.repeat(64) });
    expect(a.pixels).toBe('1'.repeat(64));
    expect(createDesign(s, { ...HOODIE, pixels: 'nope' }).pixels).toBe('0'.repeat(64));
    const solo = appeal(s, a, 50);
    for (let i = 0; i < 3; i++) {
      const d = createDesign(s, { ...HOODIE, name: `N${i}`, collection: 'NIGHT', vibe: ['y2k', 'grunge', 'skate'][i] as 'y2k' });
      giveStock(s, d.id, 10);
      setListing(s, d.id, 60, true);
    }
    expect(appeal(s, a, 50)).toBeGreaterThan(solo);
  });
});

describe('team and rivals', () => {
  it('an intern is on offer every week; a creative director lifts quality', () => {
    const s = newGame('easy');
    refreshCandidates(s);
    expect(s.candidates.some((c) => c.trait === 'intern')).toBe(true);
    const d = withDesign(s);
    const q = designQuality(d, 'danube', s);
    s.candidates = [{ ...makeCandidate(s, 'director'), skill: 8 }];
    hire(s, s.candidates[0].id);
    expect(designQuality(d, 'danube', s)).toBeGreaterThan(q);
  });
  it('joint drops need allies; newcomers arrive in year 2', () => {
    const s = newGame();
    s.cash = 1e6;
    expect(collabWithRival(s, 'moss').ok).toBe(false);
    s.rivals.find((r) => r.id === 'moss')!.relation = 60;
    expect(collabWithRival(s, 'moss').ok).toBe(true);
    s.day = 365;
    const ev: GameEvent[] = [];
    yearlyShakeUp(s, ev);
    expect(s.rivals.length).toBe(7);
    expect(ev.some((e) => e.type === 'news')).toBe(true);
  });
});
