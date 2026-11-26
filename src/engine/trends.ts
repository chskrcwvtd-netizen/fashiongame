import { COLORS, COLOR_IDS, DIFFICULTIES, GARMENTS, GARMENT_IDS, PATTERNS, PATTERN_IDS, STAGE2, VIBES, VIBE_IDS } from './content';
import { dateInfo } from './calendar';
import { chance, pick, randInt, randRange, type RngHolder } from './rng';
import type { ActionResult, GameEvent, GameState, Ignition, TrendCategory, TrendState, TrendValue } from './types';

export const TREND_CATEGORIES: TrendCategory[] = ['color', 'pattern', 'garment', 'vibe'];

export function categoryIds(cat: TrendCategory): string[] {
  switch (cat) {
    case 'color':
      return COLOR_IDS;
    case 'pattern':
      return PATTERN_IDS;
    case 'garment':
      return GARMENT_IDS;
    case 'vibe':
      return VIBE_IDS;
  }
}

export function baseTaste(cat: TrendCategory, id: string): number {
  switch (cat) {
    case 'color':
      return COLORS[id]?.taste ?? 0.4;
    case 'pattern':
      return PATTERNS[id as keyof typeof PATTERNS]?.taste ?? 0.4;
    case 'garment':
      return GARMENTS[id as keyof typeof GARMENTS]?.taste ?? 0.4;
    case 'vibe':
      return VIBES[id as keyof typeof VIBES]?.taste ?? 0.4;
  }
}

export function displayName(cat: TrendCategory, id: string): string {
  switch (cat) {
    case 'color':
      return COLORS[id]?.name ?? id;
    case 'pattern':
      return PATTERNS[id as keyof typeof PATTERNS]?.name ?? id;
    case 'garment':
      return GARMENTS[id as keyof typeof GARMENTS]?.name ?? id;
    case 'vibe':
      return VIBES[id as keyof typeof VIBES]?.name ?? id;
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const PEAK = 0.88;
const FLOOR = 0.06;

function scheduleIgnition(h: RngHolder, t: TrendState, cat: TrendCategory, week: number) {
  const taken = new Set(t.upcoming.filter((u) => u.cat === cat).map((u) => u.id));
  const cold = categoryIds(cat).filter((id) => t.values[cat][id] && t.values[cat][id].pop < 0.45 && t.values[cat][id].vel <= 0.01 && !taken.has(id));
  if (cold.length === 0) return;
  t.upcoming.push({ cat, id: pick(h, cold), week, vel: randRange(h, 0.07, 0.13) });
}

export function initTrends(h: RngHolder): TrendState {
  const values = {} as TrendState['values'];
  const last = {} as TrendState['last'];
  for (const cat of TREND_CATEGORIES) {
    values[cat] = {};
    last[cat] = {};
    const ids = categoryIds(cat);
    for (const id of ids) {
      const pop = clamp(baseTaste(cat, id) * 0.55 + randRange(h, 0, 0.25), FLOOR, 0.8);
      values[cat][id] = { pop, vel: randRange(h, -0.03, 0.02), peakWeeks: 0 };
    }
    // one thing is already hot when you start
    const hot = pick(h, ids);
    values[cat][hot] = { pop: 0.85, vel: 0.01, peakWeeks: 0 };
    for (const id of ids) last[cat][id] = values[cat][id].pop;
  }
  const t: TrendState = { values, upcoming: [], last, reportUntilDay: 0 };
  for (const cat of TREND_CATEGORIES) {
    scheduleIgnition(h, t, cat, randInt(h, 2, 4));
    scheduleIgnition(h, t, cat, randInt(h, 5, 8));
  }
  return t;
}

/** One week of trend movement (deterministic apart from noise and new ignitions). */
function stepValue(v: TrendValue, h: RngHolder | null, taste: number) {
  v.pop += v.vel + (h ? randRange(h, -0.012, 0.012) : 0);
  if (v.pop >= PEAK) {
    v.peakWeeks += 1;
    if (v.vel > 0) v.vel = 0.005;
    if (v.peakWeeks >= 3) v.vel = -(h ? randRange(h, 0.05, 0.09) : 0.07);
  }
  if (v.vel < 0 && v.pop <= 0.14) {
    v.vel = 0;
    v.peakWeeks = 0;
  }
  if (v.vel === 0) v.pop += (taste * 0.45 - v.pop) * 0.1;
  v.pop = clamp(v.pop, FLOOR, 1);
}

/** Make sure every value has trend data (new pieces arrive in later versions). */
export function ensureTrendValues(h: RngHolder, t: TrendState): void {
  for (const cat of TREND_CATEGORIES) {
    t.values[cat] = t.values[cat] ?? {};
    t.last[cat] = t.last[cat] ?? {};
    for (const id of categoryIds(cat)) {
      if (!t.values[cat][id]) {
        t.values[cat][id] = { pop: clamp(baseTaste(cat, id) * 0.55 + randRange(h, 0, 0.2), FLOOR, 0.8), vel: 0, peakWeeks: 0 };
        t.last[cat][id] = t.values[cat][id].pop;
      }
    }
  }
}

export function weeklyTrendUpdate(state: GameState, events: GameEvent[]): void {
  const t = state.trends;
  ensureTrendValues(state, t);
  const week = dateInfo(state.day).week;
  for (const cat of TREND_CATEGORIES) for (const id of categoryIds(cat)) t.last[cat][id] = t.values[cat][id]?.pop ?? 0.3;
  const due = t.upcoming.filter((u) => u.week <= week);
  t.upcoming = t.upcoming.filter((u) => u.week > week);
  for (const ign of due) {
    const v = t.values[ign.cat][ign.id];
    v.vel = ign.vel;
    v.peakWeeks = 0;
    events.push({ type: 'trendShift', text: `Word on the street: ${displayName(ign.cat, ign.id)} is starting to catch on.` });
  }
  for (const cat of TREND_CATEGORIES) {
    for (const id of categoryIds(cat)) {
      const v = t.values[cat][id];
      const wasPeak = v.pop >= PEAK;
      stepValue(v, state, baseTaste(cat, id));
      if (!wasPeak && v.pop >= PEAK) events.push({ type: 'trendShift', text: `${displayName(cat, id)} is peaking right now.` });
    }
    // keep about 8 weeks of future trend starts queued
    const ahead = t.upcoming.filter((u) => u.cat === cat).length;
    if (ahead < 2 || (ahead < 3 && chance(state, 0.35))) scheduleIgnition(state, t, cat, week + randInt(state, 5, 8));
  }
}

export function trendPop(state: GameState, cat: TrendCategory, id: string): number {
  return state.trends.values[cat]?.[id]?.pop ?? 0.3;
}

/** Change since last week (public: anyone can see what's moving). */
export function trendDelta(state: GameState, cat: TrendCategory, id: string): number {
  return trendPop(state, cat, id) - (state.trends.last[cat]?.[id] ?? trendPop(state, cat, id));
}

/** Predicted popularity for the next `weeks` weeks, per value (no noise). */
export function forecast(state: GameState, weeks: number): Record<TrendCategory, Record<string, number[]>> {
  const week = dateInfo(state.day).week;
  const out = {} as Record<TrendCategory, Record<string, number[]>>;
  for (const cat of TREND_CATEGORIES) {
    out[cat] = {};
    for (const id of categoryIds(cat)) {
      const v = { ...(state.trends.values[cat][id] ?? { pop: 0.3, vel: 0, peakWeeks: 0 }) };
      const series: number[] = [];
      for (let k = 1; k <= weeks; k++) {
        const ign = state.trends.upcoming.find((u) => u.cat === cat && u.id === id && u.week === week + k);
        if (ign) {
          v.vel = ign.vel;
          v.peakWeeks = 0;
        }
        stepValue(v, null, baseTaste(cat, id));
        series.push(v.pop);
      }
      out[cat][id] = series;
    }
  }
  return out;
}

export function upcomingWithin(state: GameState, weeks: number): Ignition[] {
  const week = dateInfo(state.day).week;
  return state.trends.upcoming.filter((u) => u.week - week <= weeks).sort((a, b) => a.week - b.week);
}

export function trendReportCost(state: GameState): number {
  return Math.round(STAGE2.trendReportCost * DIFFICULTIES[state.difficulty].costMult);
}

export function buyTrendReport(state: GameState): ActionResult {
  const cost = trendReportCost(state);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash for a trend report.' };
  if (state.trends.reportUntilDay > state.day + 7) return { ok: false, reason: 'Your current report is still fresh.' };
  state.cash -= cost;
  state.stats.spent += cost;
  state.trends.reportUntilDay = state.day + STAGE2.trendReportDays;
  return { ok: true };
}
