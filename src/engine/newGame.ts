import { DIFFICULTIES, ECON } from './content';
import { seedFromString } from './rng';
import { initTrends } from './trends';
import { refreshCandidates } from './team';
import { initRivals } from './rivals';
import { corporateDefaults } from './corporate';
import { CHALLENGES } from './extras';
import type { DifficultyId, GameState, LogoChoice } from './types';

export interface NewGameOptions {
  brandName: string;
  logo: LogoChoice;
  difficulty: DifficultyId;
  seed?: number;
  /** 'campaign' (default), 'sandbox', or a challenge id */
  mode?: string;
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
  const state: GameState = {
    version: 4,
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
    ...stage2Defaults(),
    ...stage3Defaults(),
    ...stage4Defaults(),
  };
  state.trends = initTrends(state);
  refreshCandidates(state);
  if (opts.mode === 'sandbox') {
    state.flags.sandbox = true;
    state.cash = 1_000_000_000;
  } else if (opts.mode && opts.mode !== 'campaign') {
    const ch = CHALLENGES.find((c) => c.id === opts.mode);
    if (ch) {
      ch.setup(state);
      state.challenge = { id: ch.id, done: null };
    }
  }
  return state;
}

/** Fresh stage 4 fields. */
export function stage4Defaults(): Pick<GameState, 'cities' | 'corporate' | 'shows'> {
  return { cities: {}, corporate: corporateDefaults(), shows: { applied: [], lastRunwayDay: -999, history: [] } };
}

/** Fresh stage 3 fields. */
export function stage3Defaults(): Pick<GameState, 'rivals' | 'wholesale' | 'milestones' | 'unlocks' | 'scheduledEvents' | 'campaign' | 'history'> {
  return {
    rivals: initRivals(),
    wholesale: { offers: [], receivables: [] },
    milestones: {},
    unlocks: [],
    scheduledEvents: [],
    campaign: { wonDay: null, endSeen: false, winSeen: false },
    history: { followers: [], value: [], rank: [] },
  };
}

/** Fresh stage 2 fields (trends/candidates are filled in by the caller). */
export function stage2Defaults(): Pick<
  GameState,
  'trends' | 'employees' | 'candidates' | 'posts' | 'boosts' | 'influencerCampaign' | 'collab' | 'pendingEvents' | 'lastEventDay' | 'lastTeamNight' | 'supplierDiscountUntil'
> {
  return {
    trends: { values: { color: {}, pattern: {}, garment: {}, vibe: {} }, upcoming: [], last: { color: {}, pattern: {}, garment: {}, vibe: {} }, reportUntilDay: 0 },
    employees: [],
    candidates: [],
    posts: { day: 0, count: 0 },
    boosts: [],
    influencerCampaign: null,
    collab: null,
    pendingEvents: [],
    lastEventDay: 0,
    lastTeamNight: -999,
    supplierDiscountUntil: 0,
  };
}

export function newId(state: GameState, prefix: string): string {
  return `${prefix}${state.nextId++}`;
}
