import type { GameState } from './types';

import { PATTERN_VIBE } from './content';
import { stage2Defaults, stage3Defaults } from './newGame';
import { refreshCandidates } from './team';
import { initTrends } from './trends';

export const SAVE_VERSION = 3;

/** Bring a Stage 1 save up to date. */
function migrateV1(data: Record<string, unknown>): Record<string, unknown> {
  const s = { ...data, ...stage2Defaults(), version: 2 } as unknown as GameState;
  for (const d of s.designs) {
    d.finish = d.finish ?? 'print';
    d.back = d.back ?? 'none';
    d.backText = d.backText ?? '';
  }
  for (const d of s.designs) if (!d.vibe) d.vibe = PATTERN_VIBE[d.pattern] ?? 'y2k';
  s.trends = initTrends(s);
  refreshCandidates(s);
  return s as unknown as Record<string, unknown>;
}

/** Bring a Stage 2 save up to date. */
function migrateV2(data: Record<string, unknown>): Record<string, unknown> {
  const s = { ...stage3Defaults(), ...data, version: 3 } as unknown as GameState;
  for (const d of s.designs) {
    d.finish = d.finish ?? 'print';
    d.back = d.back ?? 'none';
    d.backText = d.backText ?? '';
  }
  return s as unknown as Record<string, unknown>;
}

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
  if (data.version === 1 && Array.isArray(data.designs)) data = migrateV1(data);
  if (isObj(data) && data.version === 2 && Array.isArray(data.designs)) data = migrateV2(data);
  if (!isObj(data)) throw new Error('Save file is damaged.');
  if (data.version !== SAVE_VERSION) throw new Error('This save comes from an unknown version of the game.');
  const numbers = ['seed', 'rngState', 'day', 'cash', 'followers', 'hype', 'reputation', 'hqLevel', 'nextId', 'lastTeaserDay'];
  for (const k of numbers) if (typeof data[k] !== 'number' || !Number.isFinite(data[k])) throw new Error(`Save file is damaged (${k}).`);
  if (!isObj(data.brand) || typeof data.brand.name !== 'string') throw new Error('Save file is damaged (brand).');
  for (const k of ['designs', 'orders', 'drops', 'employees', 'candidates', 'boosts', 'pendingEvents']) if (!Array.isArray(data[k])) throw new Error(`Save file is damaged (${k}).`);
  for (const k of ['rivals', 'unlocks', 'scheduledEvents']) if (!Array.isArray(data[k])) throw new Error(`Save file is damaged (${k}).`);
  for (const k of ['inventory', 'listings', 'stats', 'flags', 'trends', 'posts', 'wholesale', 'milestones', 'campaign', 'history']) if (!isObj(data[k])) throw new Error(`Save file is damaged (${k}).`);
  if (!['easy', 'normal', 'hard'].includes(data.difficulty as string)) throw new Error('Save file is damaged (difficulty).');
  return data as unknown as GameState;
}
