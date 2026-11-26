import { CITIES, ECON } from './content';
import type { GameState } from './types';

/** How many followers your markets can hold: Budapest plus every city you are in. */
export function audienceCap(state: GameState): number {
  let cap = ECON.homeMarketCap;
  for (const c of CITIES) {
    const lvl = state.cities?.[c.id];
    if (lvl === 1) cap += c.capShip;
    if (lvl === 2) cap += c.capShip + c.capStore;
  }
  return cap;
}

/** 1 → 0.02 as followers approach the ceiling. */
export function room(state: GameState): number {
  return Math.max(0.02, 1 - state.followers / audienceCap(state));
}

/** Big audiences are less engaged per head: above 30k followers, reach grows more slowly. */
export function engagedFollowers(followers: number): number {
  const ref = 30000;
  return followers <= ref ? followers : ref * Math.pow(followers / ref, 0.75);
}
