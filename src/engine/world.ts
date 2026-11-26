import { CITIES, DIFFICULTIES, STAGE4, type CityDef } from './content';
import type { ActionResult, DesignInput, GameState, CityId } from './types';
import { audienceCap } from './audience';

export function cityLevel(state: GameState, id: CityId): 0 | 1 | 2 {
  return state.cities[id] ?? 0;
}

export function citiesOpen(state: GameState): number {
  return CITIES.filter((c) => cityLevel(state, c.id) > 0).length;
}

export function cityCost(state: GameState, c: CityDef): number {
  const lvl = cityLevel(state, c.id);
  const base = lvl === 0 ? c.shipCost : c.storeCost;
  return Math.round(base * DIFFICULTIES[state.difficulty].costMult);
}

/** Minimum HQ level for each step abroad. */
export function cityRequirement(state: GameState, c: CityDef): string | null {
  const lvl = cityLevel(state, c.id);
  if (lvl >= 2) return 'You already have a store here.';
  if (lvl === 0 && state.hqLevel < 2) return 'Open your Flagship at home before going abroad.';
  if (lvl === 0 && state.reputation < 35) return 'Needs reputation 35: nobody abroad knows you yet.';
  if (lvl === 1 && state.reputation < 50) return 'Needs reputation 50 to open a store here.';
  return null;
}

export function expandCity(state: GameState, id: CityId): ActionResult {
  const c = CITIES.find((x) => x.id === id);
  if (!c) return { ok: false, reason: 'Unknown city.' };
  const req = cityRequirement(state, c);
  if (req) return { ok: false, reason: req };
  const cost = cityCost(state, c);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  state.stats.spent += cost;
  state.cities[id] = (cityLevel(state, id) + 1) as 1 | 2;
  state.hype = Math.min(100, state.hype + 6);
  return { ok: true };
}

export function marketsWeekly(state: GameState): number {
  const mult = DIFFICULTIES[state.difficulty].costMult;
  let total = 0;
  for (const c of CITIES) {
    const lvl = cityLevel(state, c.id);
    if (lvl >= 1) total += c.shipWeekly * mult;
    if (lvl === 2) total += c.storeRent * mult;
  }
  return total;
}

/** Extra webshop visitors from abroad (multiplier) and walk-ins from stores. */
export function worldVisitorMult(state: GameState): number {
  let m = 1;
  for (const c of CITIES) {
    const lvl = cityLevel(state, c.id);
    if (lvl === 1) m += 0.05;
    if (lvl === 2) m += 0.12;
  }
  return m;
}

export function worldWalkIns(state: GameState): number {
  return CITIES.filter((c) => cityLevel(state, c.id) === 2).length * 30;
}

/** Pieces in a vibe a city loves sell better there (weighted by that city's share of your audience). */
export function localBonus(state: GameState, design: Pick<DesignInput, 'vibe'>): number {
  const cap = audienceCap(state);
  let b = 1;
  for (const c of CITIES) {
    const lvl = cityLevel(state, c.id);
    if (!lvl || !c.vibes.includes(design.vibe)) continue;
    const share = (lvl === 2 ? c.capShip + c.capStore : c.capShip) / cap;
    b += share * 0.6;
  }
  return Math.min(1.3, b);
}

export function towerAllowed(state: GameState): boolean {
  return citiesOpen(state) >= STAGE4.towerCities;
}
