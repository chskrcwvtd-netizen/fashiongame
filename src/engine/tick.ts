import { ECON } from './content';
import { dateInfo } from './calendar';
import { processDrops } from './drops';
import { chargeWeeklyBills, updateSolvency } from './finance';
import { processProduction } from './production';
import { simulateWebshopDay } from './webshop';
import type { GameEvent, GameState } from './types';

/** Advance the simulation by one in-game day. Returns what happened. */
export function advanceDay(state: GameState): GameEvent[] {
  if (state.gameOver) return [];
  const events: GameEvent[] = [];
  state.day += 1;
  const date = dateInfo(state.day);
  const newWeek = date.dayOfWeek === 0;

  for (const l of Object.values(state.listings)) {
    l.history.push(l.soldToday);
    if (l.history.length > 14) l.history.shift();
    l.soldToday = 0;
    if (newWeek) l.soldWeek = 0;
  }
  if (newWeek) {
    events.push({ type: 'newWeek', week: date.week });
    if (date.weekOfSeason === 1) events.push({ type: 'newSeason', season: date.season });
  }

  processProduction(state, events);
  processDrops(state, events);
  simulateWebshopDay(state, events);
  if (newWeek) chargeWeeklyBills(state, events);
  updateSolvency(state, events);

  // Buzz cools off; the audience grows a little on its own.
  state.hype += (ECON.hypeBaseline - state.hype) * ECON.hypeDecay;
  state.followers += Math.round(state.followers * ECON.organicFollowerRate * (state.hype / 50));
  state.stats.peakCash = Math.max(state.stats.peakCash, state.cash);
  return events;
}
