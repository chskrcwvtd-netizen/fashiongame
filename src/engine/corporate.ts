import { DIFFICULTIES, FUNDING_ROUNDS, PRODUCT_LINES, STAGE4 } from './content';
import { chance, randRange } from './rng';
import { brandValue, rivalValue } from './rivals';
import { room } from './audience';
import { addPress } from './extras';
import type { ActionResult, Corporate, GameEvent, GameState } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function corporateDefaults(): Corporate {
  return { ownership: 100, rounds: [], target: null, ipo: null, sentiment: 1, sharePrice: [], lastEarningsDay: 0, lastQuarterRevenue: 0, subsidiaries: [] };
}

// ---- product lines ----------------------------------------------------------
export function lineCost(state: GameState, id: string): number {
  const l = PRODUCT_LINES.find((x) => x.id === id);
  return l ? Math.round(l.cost * DIFFICULTIES[state.difficulty].costMult) : 0;
}

export function unlockLine(state: GameState, id: string): ActionResult {
  const l = PRODUCT_LINES.find((x) => x.id === id);
  if (!l) return { ok: false, reason: 'Unknown product line.' };
  if (state.unlocks.includes(id)) return { ok: false, reason: 'Already making these.' };
  if (state.hqLevel < 1) return { ok: false, reason: 'Move into the Studio first.' };
  const cost = lineCost(state, id);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  state.stats.spent += cost;
  state.unlocks.push(id);
  return { ok: true };
}

// ---- acquisitions -----------------------------------------------------------
export function acquirePrice(state: GameState, rivalId: string): number {
  const r = state.rivals.find((x) => x.id === rivalId);
  return r ? Math.round(rivalValue(r) * STAGE4.acquirePriceShare) : 0;
}

export function acquireBlocker(state: GameState, rivalId: string): string | null {
  const r = state.rivals.find((x) => x.id === rivalId);
  if (!r) return 'That brand is gone.';
  if (brandValue(state) < rivalValue(r) * STAGE4.acquireRatio) return `Your brand must be worth 1.5× ${r.name} first.`;
  if (state.cash < acquirePrice(state, rivalId)) return 'Not enough cash.';
  return null;
}

export function acquireRival(state: GameState, rivalId: string): ActionResult {
  const block = acquireBlocker(state, rivalId);
  if (block) return { ok: false, reason: block };
  const r = state.rivals.find((x) => x.id === rivalId)!;
  const price = acquirePrice(state, rivalId);
  state.cash -= price;
  state.stats.spent += price;
  state.followers += Math.round(r.followers * 0.5 * room(state));
  state.reputation = clamp(state.reputation + 3, 0, 100);
  state.corporate.subsidiaries.push({ rivalId: r.id, name: r.name, weeklyIncome: Math.round(r.weeklyRevenue * STAGE4.subsidiaryShare), day: state.day });
  state.rivals = state.rivals.filter((x) => x.id !== rivalId);
  addPress(state, `${state.brand.name} buys ${r.name}`);
  return { ok: true };
}

// ---- investors --------------------------------------------------------------
export function nextRound(state: GameState) {
  return FUNDING_ROUNDS.find((r) => !state.corporate.rounds.includes(r.id)) ?? null;
}

export function raiseRound(state: GameState): ActionResult {
  const r = nextRound(state);
  if (!r) return { ok: false, reason: 'No more private rounds. Next step: going public.' };
  if (state.corporate.ipo) return { ok: false, reason: 'You are already public.' };
  if (state.corporate.target) return { ok: false, reason: 'Hit your current investors’ target first.' };
  const v = brandValue(state);
  if (v < r.minValue) return { ok: false, reason: `Investors want a brand worth at least $${r.minValue.toLocaleString('en-US')}.` };
  state.cash += r.amount;
  state.corporate.ownership = Math.round(state.corporate.ownership * (1 - r.pct / 100) * 10) / 10;
  state.corporate.rounds.push(r.id);
  state.corporate.target = { value: Math.round(v * STAGE4.growthTarget), byDay: state.day + 364, round: r.name };
  return { ok: true };
}

export function canIpo(state: GameState): string | null {
  if (state.corporate.ipo) return 'Already public.';
  if (brandValue(state) < STAGE4.ipoMinValue) return `Go public once the brand is worth $${(STAGE4.ipoMinValue / 1e6).toFixed(0)}M.`;
  return null;
}

export function goPublic(state: GameState): ActionResult {
  const block = canIpo(state);
  if (block) return { ok: false, reason: block };
  const v = brandValue(state);
  state.cash += Math.round(v * STAGE4.ipoFloat);
  state.corporate.ownership = Math.round(state.corporate.ownership * (1 - STAGE4.ipoFloat) * 10) / 10;
  state.corporate.ipo = { day: state.day };
  state.corporate.sentiment = 1.1;
  state.corporate.sharePrice = [sharePriceNow(state)];
  state.corporate.lastEarningsDay = state.day;
  state.corporate.lastQuarterRevenue = state.stats.weeklyRevenue.slice(-13).reduce((a, x) => a + x, 0);
  state.hype = clamp(state.hype + 20, 0, 100);
  return { ok: true };
}

export function sharePriceNow(state: GameState): number {
  return Math.max(0.5, Math.round((brandValue(state) / STAGE4.shares) * state.corporate.sentiment * 100) / 100);
}

export function netWorth(state: GameState): number {
  return Math.round(state.cash + (brandValue(state) * state.corporate.ownership) / 100);
}

/** Weekly: subsidiary income, investor targets, share price, quarterly earnings. */
export function weeklyCorporate(state: GameState, events: GameEvent[]): void {
  const c = state.corporate;
  const income = c.subsidiaries.reduce((a, x) => a + x.weeklyIncome, 0);
  if (income > 0) {
    state.cash += income;
    state.stats.revenue += income;
    state.stats.revenueThisWeek += income;
    events.push({ type: 'subsidiaryIncome', amount: income });
  }
  if (c.target) {
    const v = brandValue(state);
    if (v >= c.target.value) {
      events.push({ type: 'investorTarget', met: true, round: c.target.round });
      state.reputation = clamp(state.reputation + 2, 0, 100);
      c.target = null;
    } else if (state.day >= c.target.byDay) {
      events.push({ type: 'investorTarget', met: false, round: c.target.round });
      state.scheduledEvents.push({ defId: 'board_pressure', day: state.day + 1, params: { round: c.target.round } });
      c.target = null;
    }
  }
  if (c.ipo) {
    c.sentiment += (1 - c.sentiment) * 0.08 + randRange(state, -0.03, 0.03);
    c.sentiment = clamp(c.sentiment, 0.4, 2);
    if (state.day - c.lastEarningsDay >= 91) {
      const quarter = state.stats.weeklyRevenue.slice(-13).reduce((a, x) => a + x, 0);
      const expected = c.lastQuarterRevenue * 1.05;
      const beat = quarter >= expected || (quarter >= expected * 0.97 && chance(state, 0.5));
      c.sentiment = clamp(c.sentiment * (beat ? 1.12 : 0.85), 0.4, 2);
      c.lastEarningsDay = state.day;
      c.lastQuarterRevenue = quarter;
      events.push({ type: 'earnings', beat, price: sharePriceNow(state) });
    }
    c.sharePrice.push(sharePriceNow(state));
    if (c.sharePrice.length > 260) c.sharePrice.shift();
  }
}
