import { DIFFICULTIES, ECON } from './content';
import { seedFromString } from './rng';
import type { DifficultyId, GameState, LogoChoice } from './types';

export interface NewGameOptions {
  brandName: string;
  logo: LogoChoice;
  difficulty: DifficultyId;
  seed?: number;
}

export function validateBrandName(name: string): string | null {
  const t = name.trim();
  if (t.length < 2) return 'Brand name needs at least 2 characters.';
  if (t.length > 18) return 'Brand name can be at most 18 characters.';
  return null;
}

export function createNewGame(opts: NewGameOptions): GameState {
  const err = validateBrandName(opts.brandName);
  if (err) throw new Error(err);
  const diff = DIFFICULTIES[opts.difficulty];
  if (!diff) throw new Error('Unknown difficulty');
  const name = opts.brandName.trim();
  const seed = (opts.seed ?? seedFromString(name + ':' + Date.now())) >>> 0;
  return {
    version: 1,
    seed,
    rngState: seedFromString(`rng:${seed}`),
    day: 1,
    brand: { name, logo: { ...opts.logo } },
    difficulty: opts.difficulty,
    cash: diff.startCash,
    followers: ECON.startFollowers,
    hype: ECON.startHype,
    reputation: ECON.startReputation,
    hqLevel: 0,
    designs: [],
    inventory: {},
    listings: {},
    orders: [],
    drops: [],
    overdrawnSince: null,
    gameOver: null,
    lastTeaserDay: 0,
    stats: {
      unitsSold: 0,
      revenue: 0,
      spent: 0,
      dropsTotal: 0,
      dropsSoldOut: 0,
      revenueThisWeek: 0,
      weeklyRevenue: [],
      peakCash: diff.startCash,
      bestSellerId: null,
    },
    flags: {},
    nextId: 1,
  };
}

export function newId(state: GameState, prefix: string): string {
  return `${prefix}${state.nextId++}`;
}
