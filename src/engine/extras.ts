import { ALL_RIVALS, DIFFICULTIES, LOAN_INTEREST, LOAN_SIZES, LOAN_WEEKS, MAGAZINES, OWN_FACTORY, STAGE3 } from './content';
import { dateInfo } from './calendar';
import { newId } from './newGame';
import { pick } from './rng';
import { brandValue, playerRank } from './rivals';
import type { ActionResult, GameEvent, GameState } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---- press -----------------------------------------------------------------------
export function addPress(state: GameState, headline: string): void {
  const press = state.press ?? (state.press = []);
  press.unshift({ day: state.day, mag: pick(state, MAGAZINES), headline });
  if (press.length > 40) press.length = 40;
}

// ---- holidays --------------------------------------------------------------------
/** Shopping peaks: name and demand multiplier for the current week, if any. */
export function holiday(state: GameState): { name: string; mult: number } | null {
  const d = dateInfo(state.day);
  if (d.season === 'Fall' && d.weekOfSeason === 12) return { name: 'Black Friday', mult: 1.6 };
  if (d.season === 'Winter' && d.weekOfSeason <= 2) return { name: 'Holiday season', mult: 1.5 };
  if (d.season === 'Winter' && d.weekOfSeason === 7) return { name: "Valentine's week", mult: 1.2 };
  if (d.season === 'Summer' && d.weekOfSeason === 7) return { name: 'Summer sale week', mult: 1.3 };
  return null;
}

export function holidayMult(state: GameState): number {
  return holiday(state)?.mult ?? 1;
}

// ---- loans -----------------------------------------------------------------------
export function maxLoan(state: GameState): number {
  return Math.max(10000, Math.round(brandValue(state) * 0.3));
}

export function takeLoan(state: GameState, amount: number): ActionResult {
  if (!LOAN_SIZES.includes(amount)) return { ok: false, reason: 'Pick one of the loan sizes.' };
  if (amount > maxLoan(state)) return { ok: false, reason: 'The bank will not lend that much to a brand your size.' };
  if ((state.loans ?? []).length >= 3) return { ok: false, reason: 'Pay off a loan before taking another.' };
  const loans = state.loans ?? (state.loans = []);
  loans.push({ id: newId(state, 'l'), principal: amount, weekly: Math.round((amount * (1 + LOAN_INTEREST)) / LOAN_WEEKS), weeksLeft: LOAN_WEEKS });
  state.cash += amount;
  return { ok: true };
}

export function loanPayments(state: GameState): number {
  return (state.loans ?? []).reduce((a, l) => a + l.weekly, 0);
}

/** After the weekly bills: count down loans. */
export function processLoans(state: GameState): void {
  if (!state.loans?.length) return;
  for (const l of state.loans) l.weeksLeft -= 1;
  state.loans = state.loans.filter((l) => l.weeksLeft > 0);
}

/** Easy/Normal get one emergency loan instead of going bankrupt. */
export function tryBailout(state: GameState, events: GameEvent[]): boolean {
  if (state.difficulty === 'hard' || state.flags.bailoutUsed) return false;
  state.flags.bailoutUsed = true;
  const amount = Math.max(5000, Math.round(-state.cash + 5000));
  const loans = state.loans ?? (state.loans = []);
  loans.push({ id: newId(state, 'l'), principal: amount, weekly: Math.round((amount * 1.4) / LOAN_WEEKS), weeksLeft: LOAN_WEEKS, emergency: true });
  state.cash += amount;
  state.overdrawnSince = null;
  events.push({ type: 'bailout', amount });
  return true;
}

// ---- own factory, shares, sustainability ------------------------------------------------
export function ownFactoryCost(state: GameState): number {
  return Math.round(OWN_FACTORY.cost * DIFFICULTIES[state.difficulty].costMult);
}

export function buildOwnFactory(state: GameState): ActionResult {
  if (state.unlocks.includes('own_factory')) return { ok: false, reason: 'You already own a factory.' };
  if (state.hqLevel < 2) return { ok: false, reason: 'Open the Flagship first.' };
  const cost = ownFactoryCost(state);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  state.stats.spent += cost;
  state.unlocks.push('own_factory');
  addPress(state, `${state.brand.name} opens its own factory`);
  return { ok: true };
}

export function sharePrice1pct(state: GameState): number {
  return Math.round(brandValue(state) * 0.01 * (state.corporate.sentiment || 1));
}

export function tradeShares(state: GameState, buy: boolean): ActionResult {
  if (!state.corporate.ipo) return { ok: false, reason: 'Only after going public.' };
  const price = sharePrice1pct(state);
  if (buy) {
    if (state.corporate.ownership >= 95) return { ok: false, reason: 'The market needs some shares to trade.' };
    if (state.cash < price) return { ok: false, reason: 'Not enough cash.' };
    state.cash -= price;
    state.corporate.ownership = Math.round((state.corporate.ownership + 1) * 10) / 10;
  } else {
    if (state.corporate.ownership <= 10) return { ok: false, reason: 'Keep at least 10% or you lose control.' };
    state.cash += price;
    state.corporate.ownership = Math.round((state.corporate.ownership - 1) * 10) / 10;
  }
  return { ok: true };
}

export function sustainabilityCost(state: GameState): number {
  const w = state.stats.weeklyRevenue[state.stats.weeklyRevenue.length - 1] ?? 0;
  return Math.max(500, Math.round(w * 0.01));
}

export function toggleSustainability(state: GameState): ActionResult {
  state.sustainability = !state.sustainability;
  if (state.sustainability) addPress(state, `${state.brand.name} launches a sustainability programme`);
  return { ok: true };
}

// ---- rivals: joint drops, newcomers, new seasons -----------------------------------------
export function rivalCollabCost(state: GameState): number {
  return Math.round(20000 * DIFFICULTIES[state.difficulty].costMult);
}

export function collabWithRival(state: GameState, rivalId: string): ActionResult {
  const r = state.rivals.find((x) => x.id === rivalId);
  if (!r) return { ok: false, reason: 'That brand is gone.' };
  if (r.relation < 50) return { ok: false, reason: `${r.name} is not close enough to you yet (needs Allies).` };
  if (state.rivalCollab) return { ok: false, reason: 'You already have a joint drop lined up.' };
  const cost = rivalCollabCost(state);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  state.stats.spent += cost;
  state.rivalCollab = r.id;
  r.relation = clamp(r.relation - 20, -100, 100);
  addPress(state, `${state.brand.name} × ${r.name}: a joint drop is coming`);
  return { ok: true };
}

/** Week 1 of each year from year 2: a newcomer joins; after the campaign, the giants reload. */
export function yearlyShakeUp(state: GameState, events: GameEvent[]): void {
  const d = dateInfo(state.day);
  if (d.week % 52 !== 1 || d.year < 2) return;
  const fresh = ALL_RIVALS.filter((r) => !state.rivals.some((x) => x.id === r.id) && !state.corporate.subsidiaries.some((x) => x.rivalId === r.id) && !(state.flags[`spawned_${r.id}`]));
  const next = fresh.find((r) => !['krush', 'velour', 'hexpark', 'moss', 'pylon', 'faithful'].includes(r.id));
  if (next && state.rivals.length < 8) {
    state.flags[`spawned_${next.id}`] = true;
    state.rivals.push({ id: next.id, name: next.name, personality: next.personality, vibe: next.vibe, color: next.color, glyph: next.glyph, followers: next.followers, weeklyRevenue: next.weeklyRevenue, hype: 50, reputation: 40, relation: 0, focus: null, lastDropDay: 0, prevRank: 0, lastActionDay: -999 });
    events.push({ type: 'news', text: `New brand on the scene: ${next.name}. ${next.bio}` });
    addPress(state, `Who is ${next.name}? The newcomer everyone is talking about`);
  }
  if (d.year > STAGE3.campaignYears && !state.flags.sandbox) {
    for (const r of state.rivals) {
      r.followers = Math.round(r.followers * 1.25);
      r.weeklyRevenue = Math.round(r.weeklyRevenue * 1.25);
    }
    events.push({ type: 'news', text: `New season, year ${d.year}: the big brands reloaded. Defend your spot.` });
  }
}

// ---- challenges ------------------------------------------------------------------
export interface ChallengeDef {
  id: string;
  name: string;
  desc: string;
  setup: (s: GameState) => void;
  check: (s: GameState) => 'won' | 'lost' | null;
}

const soldOf = (s: GameState, garment: string) => s.designs.filter((d) => d.garment === garment).reduce((a, d) => a + (s.stats.soldByDesign?.[d.id] ?? 0), 0);

export const CHALLENGES: ChallengeDef[] = [
  { id: 'shoestring', name: 'Shoestring', desc: 'Start with $2,000. Reach the Studio.', setup: (s) => (s.cash = 2000), check: (s) => (s.hqLevel >= 1 ? 'won' : null) },
  { id: 'sprint', name: 'Sprint', desc: '$100,000 in revenue within one year.', setup: () => {}, check: (s) => (s.stats.revenue >= 100000 ? 'won' : s.day > 364 ? 'lost' : null) },
  { id: 'bigdrop', name: 'One big drop', desc: 'Sell out a drop of 500 pieces or more.', setup: () => {}, check: (s) => (s.drops.some((d) => d.result?.outcome === 'soldout' && d.units >= 500) ? 'won' : null) },
  {
    id: 'sneakerhead',
    name: 'Sneakerhead',
    desc: 'Sneakers from day one and $40,000. Sell 2,000 pairs.',
    setup: (s) => {
      s.cash = 40000;
      s.unlocks.push('line_sneakers');
    },
    check: (s) => (soldOf(s, 'sneakers') >= 2000 ? 'won' : null),
  },
  {
    id: 'underdog',
    name: 'Underdog',
    desc: 'Every rival starts twice as big. Be number one within three years.',
    setup: (s) => {
      for (const r of s.rivals) {
        r.followers *= 2;
        r.weeklyRevenue *= 2;
      }
    },
    check: (s) => (s.day % 7 === 1 && playerRank(s) === 1 ? 'won' : s.day > 3 * 364 ? 'lost' : null),
  },
];

export function checkChallenge(state: GameState, events: GameEvent[]): void {
  const c = state.challenge;
  if (!c || c.done) return;
  const def = CHALLENGES.find((x) => x.id === c.id);
  if (!def) return;
  const r = def.check(state);
  if (!r) return;
  c.done = r;
  events.push({ type: 'challengeResult', won: r === 'won', title: def.name, text: r === 'won' ? `Challenge complete: ${def.desc}` : `Challenge failed: ${def.desc} Keep playing freely.` });
}
