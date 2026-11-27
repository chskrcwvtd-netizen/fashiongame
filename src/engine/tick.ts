import { ECON } from './content';
import { dateInfo } from './calendar';
import { processDrops } from './drops';
import { chargeWeeklyBills, updateSolvency } from './finance';
import { processProduction } from './production';
import { growthRoom, simulateWebshopDay } from './webshop';
import { maybeTriggerEvent } from './events';
import { processMarketing } from './marketing';
import { weeklyTeam } from './team';
import { weeklyTrendUpdate } from './trends';
import { processScheduledEvents } from './events';
import { checkMilestones } from './milestones';
import { brandValue, playerRank, weeklyRivals } from './rivals';
import { processReceivables, weeklyWholesale } from './wholesale';
import { placeOrder, incomingUnits } from './production';
import { availableUnits } from './webshop';
import { STAGE3 } from './content';
import { weeklyCorporate } from './corporate';
import { processShows } from './shows';
import { checkChallenge, holiday, yearlyShakeUp } from './extras';
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

  processMarketing(state, events);
  if (newWeek) {
    weeklyTrendUpdate(state, events);
    weeklyTeam(state, events);
    weeklyRivals(state, events);
    weeklyWholesale(state, events);
    weeklyCorporate(state, events);
    yearlyShakeUp(state, events);
    const hol = holiday(state);
    if (hol) events.push({ type: 'news', text: `${hol.name}: shoppers are out in force this week.` });
  }
  processShows(state, events);
  processReceivables(state, events);
  autoRestock(state, events);
  processProduction(state, events);
  processDrops(state, events);
  simulateWebshopDay(state, events);
  if (newWeek) chargeWeeklyBills(state, events);
  updateSolvency(state, events);
  if (!state.gameOver) {
    processScheduledEvents(state, events);
    maybeTriggerEvent(state, events);
    checkMilestones(state, events, newWeek);
    checkChallenge(state, events);
    if (newWeek) weeklyCampaign(state, events);
  }

  // Buzz cools off; the audience grows a little on its own.
  state.hype += (ECON.hypeBaseline - state.hype) * ECON.hypeDecay;
  state.followers += Math.round(state.followers * ECON.organicFollowerRate * (state.hype / 50) * growthRoom(state));
  state.stats.peakCash = Math.max(state.stats.peakCash, state.cash);
  return events;
}

/** Manager-run reorders for listings that have an auto rule. */
function autoRestock(state: GameState, events: GameEvent[]) {
  if (!state.employees.some((e) => e.role === 'manager')) return;
  for (const l of Object.values(state.listings)) {
    if (!l.auto || !l.active) continue;
    const have = availableUnits(state, l.designId) + incomingUnits(state, l.designId);
    if (have >= l.auto.qty * 0.3) continue;
    const r = placeOrder(state, { designId: l.designId, factoryId: l.auto.factoryId, quantity: l.auto.qty });
    if (r.ok) events.push({ type: 'autoRestock', designId: l.designId, units: l.auto.qty });
  }
}

/** Weekly history for charts + the 5-year goal. */
function weeklyCampaign(state: GameState, events: GameEvent[]) {
  const rank = playerRank(state);
  const h = state.history;
  if (state.flags.sandbox) state.campaign.endSeen = state.campaign.winSeen = true;
  h.followers.push(state.followers);
  h.value.push(brandValue(state));
  h.rank.push(rank);
  for (const k of ['followers', 'value', 'rank'] as const) if (h[k].length > 280) h[k].shift();
  const end = STAGE3.campaignYears * 364;
  if (rank === 1 && state.campaign.wonDay === null && state.day <= end + 1) {
    state.campaign.wonDay = state.day;
    events.push({ type: 'campaignWon' });
  }
  if (state.day > end && !state.flags.campaignEndFired) {
    state.flags.campaignEndFired = true;
    if (state.campaign.wonDay === null) events.push({ type: 'campaignEnded', rank });
  }
}
