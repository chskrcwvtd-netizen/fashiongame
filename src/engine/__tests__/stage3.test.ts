import { describe, expect, it } from 'vitest';
import { advanceDay } from '../tick';
import { brandValue, dissRival, leaderboard, playerRank, shoutOutRival, weeklyRivals, chasers } from '../rivals';
import { acceptOffer, declineOffer, processReceivables, weeklyWholesale } from '../wholesale';
import { checkMilestones, MILESTONES } from '../milestones';
import { customerComments } from '../comments';
import { designQuality, marketFit, unitCost, appeal } from '../design';
import { scheduleDrop, dropDemand } from '../drops';
import { setAutoRestock, setListing } from '../webshop';
import { hire, makeCandidate, weeklyTeam } from '../team';
import { currentEvent, processScheduledEvents, queueEvent, resolveEvent, scheduleEvent } from '../events';
import { deserialize, serialize } from '../save';
import type { GameEvent } from '../types';
import { giveStock, newGame, withDesign } from './helpers';

describe('rivals and leaderboard', () => {
  it('player starts at the bottom of the chart', () => {
    const s = newGame();
    expect(playerRank(s)).toBe(leaderboard(s).length);
    expect(leaderboard(s)).toHaveLength(7);
  });
  it('rivals grow, drop and chase trends every week', () => {
    const s = newGame('normal', 7);
    const before = s.rivals.map((r) => r.followers);
    const ev: GameEvent[] = [];
    for (let w = 0; w < 20; w++) weeklyRivals(s, ev);
    expect(s.rivals.some((r, i) => r.followers > before[i])).toBe(true);
    expect(ev.some((e) => e.type === 'rivalNews')).toBe(true);
    expect(s.rivals.every((r) => r.focus !== null)).toBe(true);
  });
  it('rivals chasing a trend eat into its value for you', () => {
    const s = newGame();
    const d = withDesign(s, { primary: 'purple' });
    s.rivals.forEach((r) => (r.focus = null));
    const free = marketFit(s, d);
    s.rivals.forEach((r) => (r.focus = { cat: 'color', id: 'purple' }));
    expect(chasers(s, 'color', 'purple')).toBe(6);
    expect(marketFit(s, d)).toBeLessThan(free);
  });
  it('diss starts beef and has a cooldown; shout-out improves relations', () => {
    const s = newGame();
    const r = dissRival(s, 'krush');
    expect(r.ok).toBe(true);
    expect(s.rivals.find((x) => x.id === 'krush')!.relation).toBeLessThan(0);
    expect(dissRival(s, 'krush').ok).toBe(false);
    expect(shoutOutRival(s, 'moss').ok).toBe(true);
    expect(s.rivals.find((x) => x.id === 'moss')!.relation).toBeGreaterThan(0);
  });
  it('brand value grows with revenue and followers', () => {
    const s = newGame();
    const v = brandValue(s);
    s.followers += 10000;
    s.stats.weeklyRevenue = [20000, 20000];
    expect(brandValue(s)).toBeGreaterThan(v);
  });
});

describe('wholesale', () => {
  function ready() {
    const s = newGame('easy', 5);
    s.unlocks.push('unlock_wholesale');
    s.reputation = 60;
    const d = withDesign(s);
    giveStock(s, d.id, 500);
    return { s, d };
  }
  it('offers appear only once unlocked and need stock', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 500);
    weeklyWholesale(s, []);
    expect(s.wholesale.offers).toHaveLength(0);
    const r = ready();
    for (let i = 0; i < 6; i++) weeklyWholesale(r.s, []);
    expect(r.s.wholesale.offers.length).toBeGreaterThan(0);
    expect(r.s.wholesale.offers.length).toBeLessThanOrEqual(4);
  });
  it('accepting ships stock now and pays later', () => {
    const { s, d } = ready();
    for (let i = 0; i < 6 && s.wholesale.offers.length === 0; i++) weeklyWholesale(s, []);
    const o = s.wholesale.offers[0];
    const units = s.inventory[d.id].units;
    const cash = s.cash;
    expect(acceptOffer(s, o.id).ok).toBe(true);
    expect(s.inventory[d.id].units).toBe(units - o.units);
    expect(s.cash).toBe(cash);
    s.wholesale.receivables[0].defaultRisk = 0;
    s.day = s.wholesale.receivables[0].dueDay;
    const ev: GameEvent[] = [];
    processReceivables(s, ev);
    expect(s.cash).toBe(cash + o.units * o.unitPrice);
    expect(ev[0].type).toBe('wholesalePaid');
  });
  it('declining removes the offer; accepting without stock is refused', () => {
    const { s, d } = ready();
    for (let i = 0; i < 6 && s.wholesale.offers.length < 2; i++) weeklyWholesale(s, []);
    expect(declineOffer(s, s.wholesale.offers[0].id).ok).toBe(true);
    s.inventory[d.id].units = 1;
    const left = s.wholesale.offers[0];
    if (left) expect(acceptOffer(s, left.id).ok).toBe(false);
  });
});

describe('milestones', () => {
  it('fire once with their rewards and unlocks', () => {
    const s = newGame();
    s.stats.unitsSold = 1000;
    s.stats.dropsSoldOut = 1;
    const cash = s.cash;
    const ev: GameEvent[] = [];
    checkMilestones(s, ev, false);
    expect(s.milestones.first_sale).toBeDefined();
    expect(s.unlocks).toContain('unlock_wholesale');
    expect(s.unlocks).toContain('unlock_track');
    expect(s.cash).toBe(cash + 300);
    const again: GameEvent[] = [];
    checkMilestones(s, again, false);
    expect(again).toHaveLength(0);
    expect(MILESTONES.length).toBeGreaterThanOrEqual(12);
  });
});

describe('design options', () => {
  it('embroidery costs more and raises quality; finishes match vibes', () => {
    const s = newGame();
    const print = withDesign(s, { vibe: 'luxury' });
    const emb = withDesign(s, { vibe: 'luxury', finish: 'embroidery' });
    expect(unitCost(s, emb, 'danube')).toBeGreaterThan(unitCost(s, print, 'danube'));
    expect(designQuality(emb, 'danube', s)).toBeGreaterThan(designQuality(print, 'danube', s));
    expect(marketFit(s, emb)).toBeGreaterThan(marketFit(s, print));
  });
  it('three live pieces with the same vibe form a collection', () => {
    const s = newGame();
    const a = withDesign(s, { vibe: 'skate' });
    const solo = appeal(s, a, 50);
    for (let i = 0; i < 3; i++) {
      const d = withDesign(s, { vibe: 'skate', name: `S${i}` });
      giveStock(s, d.id, 10);
      setListing(s, d.id, 60, true);
    }
    expect(appeal(s, a, 50)).toBeGreaterThan(solo);
  });
  it('restock drops of a sold-out piece draw fewer buyers', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 300);
    const base = dropDemand(s, { designId: d.id, price: 80, hype: 50 });
    expect(dropDemand(s, { designId: d.id, price: 80, hype: 50, restock: true })).toBeLessThan(base);
    s.drops.push({ id: 'old', designId: d.id, units: 10, price: 80, announcedDay: 0, dropDay: 0, hype: 50, status: 'done', postponements: 0, result: { outcome: 'soldout', units: 10, sold: 10, revenue: 800, demand: 30, minutes: 5, resalePrice: 120 } });
    scheduleDrop(s, { designId: d.id, units: 20, price: 80, daysAhead: 5 });
    expect(s.drops.find((x) => x.status === 'scheduled')!.restock).toBe(true);
  });
  it('comments are stable and react to price and outcome', () => {
    const s = newGame();
    const d = withDesign(s);
    const a = customerComments(d, { priceRatio: 1.6, quality: 50, fit: 0.6, seed: 'x' });
    const b = customerComments(d, { priceRatio: 1.6, quality: 50, fit: 0.6, seed: 'x' });
    expect(a).toEqual(b);
    expect(a.length).toBe(3);
    const flop = customerComments(d, { priceRatio: 1, quality: 50, fit: 0.4, outcome: 'flop', seed: 'y' });
    expect(flop.some((c) => c.mood === 'hate')).toBe(true);
  });
});

describe('team growth and automation', () => {
  it('staff level up over time', () => {
    const s = newGame('easy');
    s.candidates = [{ ...makeCandidate(s, 'designer'), skill: 3 }];
    hire(s, s.candidates[0].id);
    const e = s.employees[0];
    e.trait = 'chill';
    const ev: GameEvent[] = [];
    for (let w = 0; w < 30; w++) {
      e.mood = 90;
      weeklyTeam(s, ev);
    }
    expect(e.skill).toBeGreaterThan(3);
    expect(ev.some((x) => x.type === 'staffLevelUp')).toBe(true);
  });
  it('auto-reorder needs a manager and then orders when stock runs low', () => {
    const s = newGame('easy');
    const d = withDesign(s);
    giveStock(s, d.id, 5);
    setListing(s, d.id, 60, true);
    expect(setAutoRestock(s, d.id, { factoryId: 'danube', qty: 100 }).ok).toBe(false);
    s.candidates = [makeCandidate(s, 'manager')];
    hire(s, s.candidates[0].id);
    expect(setAutoRestock(s, d.id, { factoryId: 'danube', qty: 100 }).ok).toBe(true);
    const ev = advanceDay(s);
    expect(ev.some((e) => e.type === 'autoRestock')).toBe(true);
    expect(s.orders.some((o) => o.designId === d.id && o.quantity === 100)).toBe(true);
  });
});

describe('chained events', () => {
  it('a scheduled follow-up arrives on its day', () => {
    const s = newGame();
    scheduleEvent(s, 'magazine_call', 10);
    s.day += 9;
    processScheduledEvents(s, []);
    expect(currentEvent(s)).toBeNull();
    s.day += 1;
    processScheduledEvents(s, []);
    expect(currentEvent(s)?.defId).toBe('magazine_call');
  });
  it('ignoring counterfeits can come back later', () => {
    let followUps = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const s = newGame('normal', seed);
      const d = withDesign(s);
      queueEvent(s, 'counterfeits', { designId: d.id }, []);
      resolveEvent(s, 2);
      if (s.scheduledEvents.some((e) => e.defId === 'fakes_worse')) followUps++;
    }
    expect(followUps).toBeGreaterThan(2);
  });
});

describe('campaign and save v3', () => {
  it('reaching number one wins the campaign once', () => {
    const s = newGame();
    s.followers = 5_000_000;
    s.stats.weeklyRevenue = [5_000_000];
    const ev: GameEvent[] = [];
    for (let i = 0; i < 7; i++) ev.push(...advanceDay(s));
    expect(s.campaign.wonDay).not.toBeNull();
    expect(ev.filter((e) => e.type === 'campaignWon')).toHaveLength(1);
  });
  it('migrates a stage 2 save', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 30);
    const v2 = JSON.parse(serialize(s));
    v2.version = 2;
    for (const k of ['rivals', 'wholesale', 'milestones', 'unlocks', 'scheduledEvents', 'campaign', 'history']) delete v2[k];
    delete v2.designs[0].finish;
    delete v2.designs[0].back;
    delete v2.designs[0].backText;
    const m = deserialize(JSON.stringify(v2));
    expect(m.version).toBe(3);
    expect(m.rivals.length).toBe(6);
    expect(m.designs[0].finish).toBe('print');
    for (let i = 0; i < 14; i++) advanceDay(m);
    expect(m.history.rank.length).toBe(2);
  });
});
