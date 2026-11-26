import { SEASONS } from './content';
import type { Season } from './types';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface DateInfo {
  day: number;
  dayOfWeek: number;
  dayName: string;
  week: number;
  weekOfSeason: number;
  season: Season;
  seasonIndex: number;
  year: number;
  label: string;
}

/** day is 1-based (day 1 = Monday, week 1, Spring, Year 1). */
export function dateInfo(day: number): DateInfo {
  const idx = Math.max(0, day - 1);
  const dayOfWeek = idx % 7;
  const week = Math.floor(idx / 7) + 1;
  const seasonIndex = Math.floor(idx / 91) % 4;
  const year = Math.floor(idx / 364) + 1;
  const weekOfSeason = Math.floor((idx % 91) / 7) + 1;
  const season = SEASONS[seasonIndex];
  return {
    day,
    dayOfWeek,
    dayName: DAY_NAMES[dayOfWeek],
    week,
    weekOfSeason,
    season,
    seasonIndex,
    year,
    label: `Y${year} · ${season} · W${weekOfSeason} · ${DAY_NAMES[dayOfWeek]}`,
  };
}
