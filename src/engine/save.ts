import type { GameState } from './types';

export const SAVE_VERSION = 1;

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Parse and validate a save. Throws a readable Error if it is not a valid save. */
export function deserialize(text: string): GameState {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Save file is damaged (not readable).');
  }
  if (!isObj(data)) throw new Error('Save file is damaged.');
  if (data.version !== SAVE_VERSION) throw new Error('This save comes from an unknown version of the game.');
  const numbers = ['seed', 'rngState', 'day', 'cash', 'followers', 'hype', 'reputation', 'hqLevel', 'nextId', 'lastTeaserDay'];
  for (const k of numbers) if (typeof data[k] !== 'number' || !Number.isFinite(data[k])) throw new Error(`Save file is damaged (${k}).`);
  if (!isObj(data.brand) || typeof data.brand.name !== 'string') throw new Error('Save file is damaged (brand).');
  for (const k of ['designs', 'orders', 'drops']) if (!Array.isArray(data[k])) throw new Error(`Save file is damaged (${k}).`);
  for (const k of ['inventory', 'listings', 'stats', 'flags']) if (!isObj(data[k])) throw new Error(`Save file is damaged (${k}).`);
  if (!['easy', 'normal', 'hard'].includes(data.difficulty as string)) throw new Error('Save file is damaged (difficulty).');
  return data as unknown as GameState;
}
