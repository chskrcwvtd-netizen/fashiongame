import { describe, expect, it } from 'vitest';
import { advanceDay } from '../tick';
import { audienceCap, room } from '../audience';
import { cityRequirement, expandCity, localBonus, marketsWeekly } from '../world';
import { acquireRival, acquireBlocker, goPublic, raiseRound, sharePriceNow, unlockLine, weeklyCorporate, netWorth } from '../corporate';
import { bookFashionWeek, bookRunway, fashionWeekBlocker, processShows } from '../shows';
import { upgradeHQ } from '../hq';
import { CITIES } from '../content';
import { deserialize, serialize } from '../save';
import { trendPop } from '../trends';
import type { GameEvent } from '../types';
import { newGame, withDesign } from './helpers';

function richFlagship() {
  const s = newGame('normal', 3);
  s.cash = 5_000_000;
  s.hqLevel = 2;
  s.reputation = 60;
  return s;
}

describe('world', () => {
  it('enter city needs cash, flagship and reputation', () => {
    const s = newGame();
    expect(expandCity(s, 'london').ok).toBe(false);
    s.hqLevel = 2;
    s.reputation = 40;
    s.cash = 100;
    const before = JSON.stringify(s.cities);
    expect(expandCity(s, 'london').ok).toBe(false);
    expect(JSON.stringify(s.cities)).toBe(before);
    s.cash = 1_000_000;
    expect(expandCity(s, 'london').ok).toBe(true);
    expect(s.cities.london).toBe(1);
    expect(cityRequirement(s, CITIES[0])).toMatch(/reputation 50/);
  });
  it('cities raise the follower ceiling and cost money every week', () => {
    const s = richFlagship();
    const cap = audienceCap(s);
    expandCity(s, 'tokyo');
    expandCity(s, 'tokyo');
    expect(s.cities.tokyo).toBe(2);
    expect(audienceCap(s)).toBe(cap + CITIES.find((c) => c.id === 'tokyo')!.capShip + CITIES.find((c) => c.id === 'tokyo')!.capStore);
    expect(marketsWeekly(s)).toBeGreaterThan(0);
    s.followers = 150000;
    expect(room(s)).toBeGreaterThan(0.5);
  });
  it('pieces in a city-loved vibe sell better there', () => {
    const s = richFlagship();
    const d = withDesign(s, { vibe: 'techwear' });
    expect(localBonus(s, d)).toBe(1);
    expandCity(s, 'tokyo');
    expect(localBonus(s, d)).toBeGreaterThan(1);
    expect(localBonus(s, withDesign(s, { vibe: 'grunge' }))).toBe(1);
  });
  it('the Glass Tower needs two cities', () => {
    const s = richFlagship();
    expect(upgradeHQ(s).ok).toBe(false);
    expandCity(s, 'london');
    expandCity(s, 'paris');
    expect(upgradeHQ(s).ok).toBe(true);
    expect(s.hqLevel).toBe(3);
  });
});

describe('empire', () => {
  it('product lines unlock new pieces once', () => {
    const s = richFlagship();
    expect(unlockLine(s, 'line_sneakers').ok).toBe(true);
    expect(s.unlocks).toContain('line_sneakers');
    expect(unlockLine(s, 'line_sneakers').ok).toBe(false);
  });
  it('cannot buy twice; buying absorbs followers and adds income', () => {
    expect(acquireBlocker(newGame(), 'krush')).toMatch(/1.5/);
    const s = richFlagship();
    s.followers = 200000;
    s.stats.weeklyRevenue = [400000];
    expect(acquireRival(s, 'krush').ok).toBe(true);
    expect(s.rivals.find((r) => r.id === 'krush')).toBeUndefined();
    expect(acquireRival(s, 'krush').ok).toBe(false);
    const cash = s.cash;
    const ev: GameEvent[] = [];
    weeklyCorporate(s, ev);
    expect(s.cash).toBeGreaterThan(cash);
  });
  it('funding rounds trade ownership for cash and set a target', () => {
    const s = richFlagship();
    s.followers = 300000;
    const cash = s.cash;
    expect(raiseRound(s).ok).toBe(true);
    expect(s.cash).toBe(cash + 250000);
    expect(s.corporate.ownership).toBe(90);
    expect(s.corporate.target).not.toBeNull();
    expect(raiseRound(s).ok).toBe(false);
  });
  it('ipo once, price positive', () => {
    const s = richFlagship();
    expect(goPublic(s).ok).toBe(false);
    s.stats.weeklyRevenue = [600000];
    s.followers = 2_000_000;
    expect(goPublic(s).ok).toBe(true);
    expect(goPublic(s).ok).toBe(false);
    for (let w = 0; w < 30; w++) {
      s.day += 7;
      weeklyCorporate(s, []);
    }
    expect(s.corporate.sharePrice.every((p) => p > 0)).toBe(true);
    expect(sharePriceNow(s)).toBeGreaterThan(0);
    expect(netWorth(s)).toBeGreaterThan(0);
  });
  it('missing an investor target brings the board', () => {
    const s = richFlagship();
    s.followers = 300000;
    raiseRound(s);
    s.day = s.corporate.target!.byDay;
    s.followers = 1000;
    const ev: GameEvent[] = [];
    weeklyCorporate(s, ev);
    expect(ev.some((e) => e.type === 'investorTarget' && !e.met)).toBe(true);
    expect(s.scheduledEvents.some((e) => e.defId === 'board_pressure')).toBe(true);
  });
});

describe('shows', () => {
  it('fashion week resolves once', () => {
    const s = richFlagship();
    for (let i = 0; i < 3; i++) withDesign(s, { name: `D${i}` });
    expect(fashionWeekBlocker(s, 'paris')).toMatch(/Ship/);
    expect(bookFashionWeek(s, 'danube', 'medium').ok).toBe(true);
    expect(bookFashionWeek(s, 'danube', 'medium').ok).toBe(false);
    const day = s.shows.applied[0].day;
    s.day = day;
    const ev: GameEvent[] = [];
    processShows(s, ev);
    processShows(s, ev);
    expect(ev.filter((e) => e.type === 'showResult')).toHaveLength(1);
    expect(s.shows.history).toHaveLength(1);
  });
  it('runway needs the flagship and has a cooldown', () => {
    const s = newGame();
    for (let i = 0; i < 3; i++) withDesign(s, { name: `D${i}` });
    s.cash = 1e6;
    expect(bookRunway(s, 'small').ok).toBe(false);
    s.hqLevel = 2;
    expect(bookRunway(s, 'small').ok).toBe(true);
    expect(bookRunway(s, 'small').ok).toBe(false);
    for (let i = 0; i < 8; i++) advanceDay(s);
    expect(s.shows.history.length).toBe(1);
  });
});

describe('save v4', () => {
  it('fills missing trend values for old saves', () => {
    const s = newGame();
    const v3 = JSON.parse(serialize(s));
    v3.version = 3;
    for (const k of ['cities', 'corporate', 'shows']) delete v3[k];
    for (const g of ['sneakers', 'bag', 'jewelry', 'perfume']) delete v3.trends.values.garment[g];
    const m = deserialize(JSON.stringify(v3));
    expect(m.version).toBe(4);
    expect(trendPop(m, 'garment', 'perfume')).toBeGreaterThan(0);
    expect(m.corporate.ownership).toBe(100);
    for (let i = 0; i < 14; i++) advanceDay(m);
    expect(m.day).toBe(s.day + 14);
  });
});
