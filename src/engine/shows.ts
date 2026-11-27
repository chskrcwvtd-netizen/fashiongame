import { DIFFICULTIES, FASHION_WEEKS, SHOW_BUDGETS, STAGE4 } from './content';
import { dateInfo } from './calendar';
import { marketFit } from './design';
import { newId } from './newGame';
import { randRange } from './rng';
import { room } from './audience';
import { cityLevel } from './world';
import { addPress } from './extras';
import type { ActionResult, GameEvent, GameState, ShowBudget } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Day of the next occurrence of a fashion week (always in the future). */
export function nextWeekDay(state: GameState, weekOfYear: number): number {
  const d = dateInfo(state.day);
  const yearStart = (d.year - 1) * 364 + 1;
  let day = yearStart + (weekOfYear - 1) * 7;
  if (day <= state.day) day += 364;
  return day;
}

export function showCost(state: GameState, budget: ShowBudget): number {
  return Math.round(SHOW_BUDGETS[budget].cost * DIFFICULTIES[state.difficulty].costMult);
}

export function fashionWeekBlocker(state: GameState, weekId: string): string | null {
  const w = FASHION_WEEKS.find((x) => x.id === weekId);
  if (!w) return 'Unknown fashion week.';
  if (state.reputation < w.minRep) return `Needs reputation ${w.minRep}.`;
  if (w.city && cityLevel(state, w.city) === 0) return 'Ship to that city first.';
  if (state.shows.applied.some((a) => a.weekId === weekId)) return 'You are already booked.';
  if (nextWeekDay(state, w.weekOfYear) - state.day < 7) return 'Too late for this year. Book at least a week ahead.';
  if (state.designs.length < 3) return 'You need at least three designs to fill a runway.';
  return null;
}

export function bookFashionWeek(state: GameState, weekId: string, budget: ShowBudget): ActionResult {
  const block = fashionWeekBlocker(state, weekId);
  if (block) return { ok: false, reason: block };
  const cost = showCost(state, budget);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash for that show.' };
  const w = FASHION_WEEKS.find((x) => x.id === weekId)!;
  state.cash -= cost;
  state.stats.spent += cost;
  state.shows.applied.push({ id: newId(state, 's'), name: w.name, weekId, budget, day: nextWeekDay(state, w.weekOfYear) });
  return { ok: true };
}

export function runwayBlocker(state: GameState): string | null {
  if (state.hqLevel < 2) return 'You need the Flagship Store for your own runway.';
  if (state.day - state.shows.lastRunwayDay < STAGE4.runwayCooldown) return 'Your last show was too recent.';
  if (state.shows.applied.some((a) => a.weekId === 'runway')) return 'A show is already planned.';
  if (state.designs.length < 3) return 'You need at least three designs to fill a runway.';
  return null;
}

export function bookRunway(state: GameState, budget: ShowBudget): ActionResult {
  const block = runwayBlocker(state);
  if (block) return { ok: false, reason: block };
  const cost = showCost(state, budget);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash for that show.' };
  state.cash -= cost;
  state.stats.spent += cost;
  state.shows.lastRunwayDay = state.day;
  state.shows.applied.push({ id: newId(state, 's'), name: `${state.brand.name} runway`, weekId: 'runway', budget, day: state.day + 7 });
  return { ok: true };
}

/** How strong your best three designs are right now (0..1). */
export function collectionStrength(state: GameState): number {
  const scores = state.designs.map((d) => marketFit(state, d) * 0.7 + ((state.inventory[d.id]?.quality ?? 50) / 100) * 0.3).sort((a, b) => b - a);
  const top = scores.slice(0, 3);
  return top.length ? top.reduce((a, x) => a + x, 0) / top.length : 0;
}

export function processShows(state: GameState, events: GameEvent[]): void {
  const due = state.shows.applied.filter((a) => a.day <= state.day);
  if (!due.length) return;
  state.shows.applied = state.shows.applied.filter((a) => a.day > state.day);
  for (const b of due) {
    const big = b.weekId === 'runway' ? 0.8 : 1.15;
    const score = collectionStrength(state) * SHOW_BUDGETS[b.budget].mult * big * (0.8 + state.reputation / 250) * randRange(state, 0.75, 1.25);
    const outcome = score > 0.85 ? 'ovation' : score > 0.6 ? 'good' : 'panned';
    let text: string;
    if (outcome === 'ovation') {
      state.reputation = clamp(state.reputation + 8, 0, 100);
      state.hype = clamp(state.hype + 25, 0, 100);
      const g = Math.round((state.followers * 0.08 + 2000 * SHOW_BUDGETS[b.budget].mult) * room(state));
      state.followers += g;
      text = `Standing ovation. The front row was filming everything. +${g.toLocaleString('en-US')} followers.`;
    } else if (outcome === 'good') {
      state.reputation = clamp(state.reputation + 4, 0, 100);
      state.hype = clamp(state.hype + 12, 0, 100);
      const g = Math.round((state.followers * 0.03 + 800) * room(state));
      state.followers += g;
      text = `A solid show. Good reviews, decent buzz. +${g.toLocaleString('en-US')} followers.`;
    } else {
      state.reputation = clamp(state.reputation - 5, 0, 100);
      state.hype = clamp(state.hype - 5, 0, 100);
      text = 'The critics were brutal. "Underground should have stayed underground."';
    }
    state.shows.history.push({ name: b.name, day: state.day, outcome });
    if (state.shows.history.length > 20) state.shows.history.shift();
    events.push({ type: 'showResult', name: b.name, outcome, text });
    addPress(state, outcome === 'ovation' ? `${b.name}: ${state.brand.name} brings the house down` : outcome === 'good' ? `${b.name}: ${state.brand.name} delivers` : `${b.name}: critics pan ${state.brand.name}`);
  }
}
