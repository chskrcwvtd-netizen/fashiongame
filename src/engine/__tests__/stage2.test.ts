import { describe, expect, it } from 'vitest';
import { advanceDay } from '../tick';
import { forecast, buyTrendReport, trendPop, weeklyTrendUpdate, TREND_CATEGORIES, categoryIds } from '../trends';
import { marketFit, unitCost, designQuality } from '../design';
import { fire, giveRaise, hire, makeCandidate, marketRate, staffSlots, teamNight, weeklyTeam, designerQualityBonus, sourcerCostMult } from '../team';
import { hireInfluencer, postSocial, postsLeft, signCollab, visitorMult } from '../marketing';
import { EVENTS, currentEvent, eventOptions, maybeTriggerEvent, queueEvent, resolveEvent } from '../events';
import { chargeWeeklyBills } from '../finance';
import { deserialize, serialize } from '../save';
import { scheduleDrop } from '../drops';
import { dateInfo } from '../calendar';
import type { GameEvent, GameState } from '../types';
import { giveStock, newGame, withDesign } from './helpers';

function runWeeks(s: GameState, weeks: number) {
  const ev: GameEvent[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    ev.push(...advanceDay(s));
    while (currentEvent(s)) resolveEvent(s, eventOptions(s, currentEvent(s)!).findIndex((o) => !o.blocked));
  }
  return ev;
}

describe('trends', () => {
  it('popularity always stays between 0 and 1', () => {
    const s = newGame('normal', 3);
    for (let w = 0; w < 80; w++) {
      s.day += 7;
      weeklyTrendUpdate(s, []);
      for (const cat of TREND_CATEGORIES) for (const id of categoryIds(cat)) {
        const p = trendPop(s, cat, id);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });
  it('a hot trend eventually fades', () => {
    const s = newGame('normal', 4);
    const hot = categoryIds('color').find((id) => trendPop(s, 'color', id) >= 0.85)!;
    let min = 1;
    for (let w = 0; w < 30; w++) {
      s.day += 7;
      weeklyTrendUpdate(s, []);
      min = Math.min(min, trendPop(s, 'color', hot));
    }
    expect(min).toBeLessThan(0.5);
  });
  it('upcoming trends show in the forecast before they start', () => {
    const s = newGame('normal', 5);
    const week = dateInfo(s.day).week;
    const ign = s.trends.upcoming.find((u) => u.week - week <= 6)!;
    const before = trendPop(s, ign.cat, ign.id);
    const f = forecast(s, 8)[ign.cat][ign.id];
    expect(Math.max(...f)).toBeGreaterThan(before + 0.1);
  });
  it('trend report charges cash and opens the forecast', () => {
    const s = newGame();
    const cash = s.cash;
    expect(buyTrendReport(s).ok).toBe(true);
    expect(s.cash).toBe(cash - 1500);
    expect(s.trends.reportUntilDay).toBeGreaterThan(s.day + 30);
    expect(buyTrendReport(s).ok).toBe(false);
  });
  it('market fit follows trends', () => {
    const s = newGame();
    const d = withDesign(s, { primary: 'purple' });
    s.trends.values.color.purple.pop = 0.1;
    const cold = marketFit(s, d);
    s.trends.values.color.purple.pop = 1;
    expect(marketFit(s, d)).toBeGreaterThan(cold + 0.1);
  });
});

describe('team', () => {
  it('respects desk limits per HQ level', () => {
    const s = newGame('easy');
    expect(staffSlots(s)).toBe(2);
    s.candidates = [makeCandidate(s), makeCandidate(s), makeCandidate(s)];
    expect(hire(s, s.candidates[0].id).ok).toBe(true);
    expect(hire(s, s.candidates[0].id).ok).toBe(true);
    const r = hire(s, s.candidates[0].id);
    expect(r.ok).toBe(false);
    expect(s.employees).toHaveLength(2);
  });
  it('salaries are part of weekly bills', () => {
    const s = newGame();
    s.candidates = [makeCandidate(s, 'designer')];
    hire(s, s.candidates[0].id);
    const ev: GameEvent[] = [];
    const cash = s.cash;
    chargeWeeklyBills(s, ev);
    const bill = ev[0];
    expect(bill.type === 'bills' && bill.salaries).toBe(s.employees[0].salary);
    expect(s.cash).toBeCloseTo(cash - (bill.type === 'bills' ? bill.total : 0), 5);
  });
  it('underpaid staff get unhappy and quit', () => {
    const s = newGame('normal', 9);
    s.candidates = [makeCandidate(s, 'marketer')];
    hire(s, s.candidates[0].id);
    const e = s.employees[0];
    e.trait = 'diva';
    e.salary = Math.round(marketRate(s, e.role, e.skill) * 0.5);
    const ev: GameEvent[] = [];
    for (let w = 0; w < 10 && s.employees.length; w++) weeklyTeam(s, ev);
    expect(ev.some((x) => x.type === 'staffWarning')).toBe(true);
    expect(ev.some((x) => x.type === 'staffQuit')).toBe(true);
    expect(s.employees).toHaveLength(0);
  });
  it('a raise lifts mood and has a cooldown', () => {
    const s = newGame();
    s.candidates = [makeCandidate(s)];
    hire(s, s.candidates[0].id);
    const e = s.employees[0];
    e.mood = 40;
    expect(giveRaise(s, e.id).ok).toBe(true);
    expect(e.mood).toBe(55);
    expect(giveRaise(s, e.id).ok).toBe(false);
  });
  it('staff effects apply and vanish when they leave (quitting removes effects)', () => {
    const s = newGame('easy');
    const d = withDesign(s);
    const baseCost = unitCost(s, d, 'danube');
    const baseQ = designQuality(d, 'danube', s);
    s.candidates = [{ ...makeCandidate(s, 'designer'), skill: 8 }, { ...makeCandidate(s, 'sourcer'), skill: 8 }];
    hire(s, s.candidates[0].id);
    hire(s, s.candidates[0].id);
    expect(designerQualityBonus(s)).toBeGreaterThan(0);
    expect(designQuality(d, 'danube', s)).toBeGreaterThan(baseQ);
    expect(sourcerCostMult(s)).toBeLessThan(1);
    expect(unitCost(s, d, 'danube')).toBeLessThan(baseCost);
    for (const e of [...s.employees]) fire(s, e.id);
    expect(unitCost(s, d, 'danube')).toBeCloseTo(baseCost, 5);
    expect(designQuality(d, 'danube', s)).toBe(baseQ);
  });
  it('team night costs per head and lifts everyone', () => {
    const s = newGame('easy');
    s.candidates = [makeCandidate(s), makeCandidate(s)];
    hire(s, s.candidates[0].id);
    hire(s, s.candidates[0].id);
    s.employees.forEach((e) => (e.mood = 50));
    expect(teamNight(s).ok).toBe(true);
    expect(s.employees.every((e) => e.mood === 62)).toBe(true);
    expect(teamNight(s).ok).toBe(false);
  });
});

describe('marketing', () => {
  it('limits posts per day; marketers add more', () => {
    const s = newGame();
    const d = withDesign(s);
    expect(postsLeft(s)).toBe(1);
    expect(postSocial(s, { platform: 'glint', kind: 'fit', designId: d.id }).ok).toBe(true);
    expect(postSocial(s, { platform: 'glint', kind: 'fit', designId: d.id }).ok).toBe(false);
    s.day += 1;
    s.candidates = [makeCandidate(s, 'marketer')];
    hire(s, s.candidates[0].id);
    expect(postsLeft(s)).toBe(2);
  });
  it('posts grow followers and some go viral', () => {
    let viral = 0;
    let gained = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = newGame('normal', seed);
      const d = withDesign(s);
      for (let day = 0; day < 10; day++) {
        const r = postSocial(s, { platform: 'loopz', kind: 'meme' });
        if (r.ok) {
          gained += r.followers;
          if (r.viral) viral++;
        }
        s.day += 1;
      }
      void d;
    }
    expect(gained).toBeGreaterThan(400);
    expect(viral).toBeGreaterThan(0);
  });
  it('teaser post needs a drop', () => {
    const s = newGame();
    expect(postSocial(s, { platform: 'loopz', kind: 'teaser' }).ok).toBe(false);
  });
  it('influencer adds followers and visitors for a week, and refuses double campaign', () => {
    const s = newGame();
    const f = s.followers;
    const r = hireInfluencer(s, 'zsofi');
    expect(r.ok).toBe(true);
    expect(s.followers).toBeGreaterThan(f);
    expect(visitorMult(s)).toBeGreaterThan(1);
    expect(hireInfluencer(s, 'zsofi').ok).toBe(false);
    expect(hireInfluencer(s, 'marcus').ok).toBe(false); // too small for them anyway
    for (let i = 0; i < 8; i++) advanceDay(s);
    expect(visitorMult(s)).toBeLessThanOrEqual(1);
    expect(s.influencerCampaign).toBeNull();
  });
  it('collab boosts the next drop and then ends', () => {
    const s = newGame('easy');
    s.followers = 2000;
    const d = withDesign(s);
    giveStock(s, d.id, 300);
    expect(signCollab(s, 'halogen').ok).toBe(true);
    expect(signCollab(s, 'halogen').ok).toBe(false);
    scheduleDrop(s, { designId: d.id, units: 250, price: 80, daysAhead: 5 });
    let result;
    for (let i = 0; i < 8; i++) for (const e of advanceDay(s)) if (e.type === 'dropResult') result = e.result;
    expect(result).toBeDefined();
    expect(s.collab).toBeNull();
  });
});

describe('events', () => {
  it('every event and every option resolves on a busy game', () => {
    for (const def of EVENTS) {
      const options = def.options(newGame(), {}).length;
      for (let i = 0; i < options; i++) {
        const s = newGame('easy', 11);
        s.followers = 5000;
        s.day = 120;
        s.stats.revenue = 50000;
        s.stats.unitsSold = 1000;
        const d = withDesign(s);
        s.stats.bestSellerId = d.id;
        giveStock(s, d.id, 300);
        s.candidates = [makeCandidate(s, 'designer')];
        hire(s, s.candidates[0].id);
        s.employees[0].mood = 30;
        hireInfluencer(s, 'zsofi');
        const params = def.params ? def.params(s) : { designId: d.id, lost: 20, factoryId: 'fastloop', unitCost: 10, quality: 40 };
        queueEvent(s, def.id, params ?? {}, []);
        const r = resolveEvent(s, i);
        if (!r.ok) expect(r.reason).toMatch(/cash/i);
        else expect(r.text.length).toBeGreaterThan(3);
        expect(Number.isFinite(s.cash)).toBe(true);
      }
    }
  });
  it('random events respect the minimum gap and never stack', () => {
    const s = newGame('normal', 2);
    const d = withDesign(s);
    giveStock(s, d.id, 200);
    s.followers = 3000;
    const ev: GameEvent[] = [];
    let started = 0;
    for (let day = 0; day < 400; day++) {
      s.day += 1;
      const before = s.pendingEvents.length;
      maybeTriggerEvent(s, ev);
      if (s.pendingEvents.length > before) started++;
      expect(s.pendingEvents.length).toBeLessThanOrEqual(1);
      if (currentEvent(s) && day % 3 === 0) resolveEvent(s, 0);
    }
    expect(started).toBeGreaterThan(5);
  });
  it('queues events while one is pending', () => {
    const s = newGame();
    queueEvent(s, 'blog_feature', {}, []);
    queueEvent(s, 'fabric_deal', {}, []);
    expect(s.pendingEvents).toHaveLength(2);
    expect(currentEvent(s)?.defId).toBe('blog_feature');
    resolveEvent(s, 2);
    expect(currentEvent(s)?.defId).toBe('fabric_deal');
  });
  it('blocked options are refused', () => {
    const s = newGame();
    s.cash = 10;
    queueEvent(s, 'blog_feature', {}, []);
    const r = resolveEvent(s, 0);
    expect(r.ok).toBe(false);
    expect(currentEvent(s)).not.toBeNull();
  });
  it('defective batch can be sold as seconds', () => {
    const s = newGame();
    const d = withDesign(s);
    giveStock(s, d.id, 50, 50);
    queueEvent(s, 'factory_defect', { designId: d.id, lost: 20, factoryId: 'fastloop', unitCost: 10, quality: 50 }, []);
    const rep = s.reputation;
    expect(resolveEvent(s, 1).ok).toBe(true);
    expect(s.inventory[d.id].units).toBe(70);
    expect(s.inventory[d.id].quality).toBeLessThan(50);
    expect(s.reputation).toBeLessThan(rep);
  });
});

describe('save v2', () => {
  it('migrates v1 save', () => {
    const s = newGame();
    const d = withDesign(s, { pattern: 'camo' });
    giveStock(s, d.id, 40);
    const v1 = JSON.parse(serialize(s));
    v1.version = 1;
    for (const k of ['trends', 'employees', 'candidates', 'posts', 'boosts', 'influencerCampaign', 'collab', 'pendingEvents', 'lastEventDay', 'lastTeamNight', 'supplierDiscountUntil']) delete v1[k];
    delete v1.designs[0].vibe;
    const m = deserialize(JSON.stringify(v1));
    expect(m.version).toBe(2);
    expect(m.cash).toBe(s.cash);
    expect(m.designs[0].vibe).toBe('gorpcore');
    expect(m.candidates.length).toBe(4);
    expect(Object.keys(m.trends.values.color).length).toBeGreaterThan(5);
    runWeeks(m, 3);
    expect(m.day).toBe(s.day + 21);
  });
  it('roundtrip with team, trends and events stays identical', () => {
    const s = newGame('easy');
    s.candidates = [makeCandidate(s)];
    hire(s, s.candidates[0].id);
    queueEvent(s, 'blog_feature', {}, []);
    runWeeks(s, 4);
    const copy = deserialize(serialize(s));
    expect(copy).toEqual(s);
  });
});
