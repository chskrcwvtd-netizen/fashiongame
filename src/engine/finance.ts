import { DIFFICULTIES, ECON, HQ_LEVELS, OWN_FACTORY } from './content';
import { stockUnits } from './production';
import { managerBillMult, weeklySalaries } from './team';
import { marketsWeekly } from './world';
import { loanPayments, processLoans, sustainabilityCost, tryBailout } from './extras';
import type { GameEvent, GameState } from './types';

export function weeklyBillEstimate(state: GameState) {
  const mult = DIFFICULTIES[state.difficulty].costMult;
  const mgr = managerBillMult(state);
  const rent = HQ_LEVELS[state.hqLevel].rent * mult * mgr;
  const platform = ECON.platformFeeWeekly * mult * mgr;
  const storage = stockUnits(state) * ECON.storagePerUnitWeekly * mult;
  const salaries = weeklySalaries(state);
  const markets = marketsWeekly(state) * mgr;
  const loans = loanPayments(state);
  const extras = (state.unlocks.includes('own_factory') ? OWN_FACTORY.weekly * mult : 0) + (state.sustainability ? sustainabilityCost(state) : 0);
  return { rent, platform, storage, salaries, markets, loans, extras, total: rent + platform + storage + salaries + markets + loans + extras };
}

export function chargeWeeklyBills(state: GameState, events: GameEvent[]): void {
  const b = weeklyBillEstimate(state);
  state.cash -= b.total;
  state.stats.spent += b.total;
  state.stats.weeklyRevenue.push(Math.round(state.stats.revenueThisWeek));
  if (state.stats.weeklyRevenue.length > 26) state.stats.weeklyRevenue.shift();
  state.stats.revenueThisWeek = 0;
  processLoans(state);
  if (state.sustainability) state.reputation = Math.min(100, state.reputation + 0.3);
  events.push({ type: 'bills', total: b.total, rent: b.rent, platform: b.platform, storage: b.storage, salaries: b.salaries, markets: b.markets });
}

export function updateSolvency(state: GameState, events: GameEvent[]): void {
  const grace = DIFFICULTIES[state.difficulty].graceDays;
  if (state.flags.sandbox) return;
  if (state.cash < 0 && state.overdrawnSince === null) {
    state.overdrawnSince = state.day;
    events.push({ type: 'overdrawn', graceDays: grace });
  } else if (state.cash >= 0 && state.overdrawnSince !== null) {
    state.overdrawnSince = null;
    events.push({ type: 'recovered' });
  }
  if (state.overdrawnSince !== null && state.day - state.overdrawnSince >= grace) {
    if (tryBailout(state, events)) return;
    state.gameOver = { reason: 'bankrupt', day: state.day };
    events.push({ type: 'bankrupt' });
  }
}

export function graceDaysLeft(state: GameState): number | null {
  if (state.overdrawnSince === null) return null;
  return Math.max(0, DIFFICULTIES[state.difficulty].graceDays - (state.day - state.overdrawnSince));
}
