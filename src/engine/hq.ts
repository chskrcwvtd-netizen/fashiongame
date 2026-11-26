import { DIFFICULTIES, HQ_LEVELS } from './content';
import type { ActionResult, GameState } from './types';
import { towerAllowed } from './world';

export function nextHqLevel(state: GameState) {
  return HQ_LEVELS[state.hqLevel + 1] ?? null;
}

export function upgradeCost(state: GameState): number | null {
  const next = nextHqLevel(state);
  if (!next) return null;
  return Math.round(next.upgradeCost * DIFFICULTIES[state.difficulty].costMult);
}

export function upgradeHQ(state: GameState): ActionResult {
  if (state.gameOver) return { ok: false, reason: 'Game over.' };
  const cost = upgradeCost(state);
  if (cost === null) return { ok: false, reason: 'You are already in the tallest building in town.' };
  if (state.hqLevel + 1 === 3 && !towerAllowed(state)) return { ok: false, reason: 'Open in at least two cities abroad before the Glass Tower.' };
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  state.stats.spent += cost;
  state.hqLevel += 1;
  return { ok: true };
}
