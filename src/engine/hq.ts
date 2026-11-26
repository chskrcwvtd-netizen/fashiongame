import { DIFFICULTIES, HQ_LEVELS } from './content';
import type { ActionResult, GameState } from './types';

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
  if (cost === null) return { ok: false, reason: 'Already at the top level for now.' };
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  state.stats.spent += cost;
  state.hqLevel += 1;
  return { ok: true };
}
