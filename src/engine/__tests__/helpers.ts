import { createNewGame } from '../newGame';
import { createDesign } from '../design';
import type { DesignInput, DifficultyId, GameState } from '../types';

export function newGame(difficulty: DifficultyId = 'normal', seed = 42): GameState {
  return createNewGame({ brandName: 'Test Brand', logo: { glyph: 'star', color: 'lime' }, difficulty, seed });
}

export const HOODIE: DesignInput = {
  name: 'VOID HOODIE',
  garment: 'hoodie',
  primary: 'black',
  secondary: 'lime',
  pattern: 'grid',
  graphic: 'emblem',
  text: '',
  font: 'chrome',
  emblem: 'skull',
  material: 'standard',
};

export function withDesign(state: GameState, input: Partial<DesignInput> = {}) {
  return createDesign(state, { ...HOODIE, ...input });
}

/** Put stock directly into the warehouse (test shortcut). */
export function giveStock(state: GameState, designId: string, units: number, quality = 50, unitCost = 14) {
  state.inventory[designId] = { units, quality, unitCost };
}
