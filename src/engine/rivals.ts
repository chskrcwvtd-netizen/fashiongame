import { RIVALS } from './content';
import { chance, pick, randRange } from './rng';
import { categoryIds, trendPop, displayName } from './trends';
import type { GameEvent, GameState, Rival, TrendCategory } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Audience ceiling per rival (their growth slows toward it). */
const RIVAL_CAP: Record<string, number> = { krush: 60000, velour: 320000, hexpark: 80000, moss: 90000, pylon: 260000, faithful: 520000 };

export function initRivals(): Rival[] {
  return RIVALS.map((d) => ({
    id: d.id,
    name: d.name,
    personality: d.personality,
    vibe: d.vibe,
    color: d.color,
    glyph: d.glyph,
    followers: d.followers,
    weeklyRevenue: d.weeklyRevenue,
    hype: d.personality === 'hype' ? 55 : 30,
    reputation: d.personality === 'heritage' ? 70 : d.personality === 'snob' ? 65 : d.personality === 'copycat' ? 25 : 45,
    relation: 0,
    focus: null,
    lastDropDay: 0,
    prevRank: 0,
    lastActionDay: -999,
  }));
}

// ---- value & leaderboard --------------------------------------------------------

export function playerAnnualRevenue(state: GameState): number {
  const w = state.stats.weeklyRevenue.slice(-13);
  if (w.length === 0) return state.stats.revenueThisWeek * 52;
  return (w.reduce((a, x) => a + x, 0) / w.length) * 52;
}

export function brandValue(state: GameState): number {
  return Math.round(playerAnnualRevenue(state) * 1.5 + state.followers * 4 + Math.max(0, state.cash) * 0.15 + state.reputation * 800);
}

export function rivalValue(r: Rival): number {
  return Math.round(r.weeklyRevenue * 52 * 1.5 + r.followers * 4 + r.weeklyRevenue * 3 + r.reputation * 800);
}

export interface BoardRow {
  id: string;
  name: string;
  value: number;
  followers: number;
  isPlayer: boolean;
  color: string;
  glyph: string;
}

export function leaderboard(state: GameState): BoardRow[] {
  const rows: BoardRow[] = state.rivals.map((r) => ({ id: r.id, name: r.name, value: rivalValue(r), followers: r.followers, isPlayer: false, color: r.color, glyph: r.glyph }));
  rows.push({ id: 'you', name: state.brand.name, value: brandValue(state), followers: state.followers, isPlayer: true, color: '', glyph: state.brand.logo.glyph });
  return rows.sort((a, b) => b.value - a.value);
}

export function playerRank(state: GameState): number {
  return leaderboard(state).findIndex((r) => r.isPlayer) + 1;
}

/** How many rivals are currently chasing this trend (they eat into it). */
export function chasers(state: GameState, cat: TrendCategory, id: string): number {
  return state.rivals.filter((r) => r.focus && r.focus.cat === cat && r.focus.id === id).length;
}

// ---- weekly simulation ------------------------------------------------------------

const DROP_CHANCE: Record<string, number> = { hype: 0.35, chaos: 0.3, copycat: 0.25, snob: 0.12, eco: 0.15, heritage: 0.1 };

function hottest(state: GameState, cat: TrendCategory): string {
  return [...categoryIds(cat)].sort((a, b) => trendPop(state, cat, b) - trendPop(state, cat, a))[0];
}

export function weeklyRivals(state: GameState, events: GameEvent[]): void {
  const ranks = leaderboard(state);
  for (const r of state.rivals) {
    r.prevRank = ranks.findIndex((x) => x.id === r.id) + 1;
    // pick what to chase this week
    if (r.personality === 'hype' || r.personality === 'chaos') r.focus = { cat: 'color', id: hottest(state, 'color') };
    else if (r.personality === 'copycat') r.focus = { cat: 'pattern', id: hottest(state, 'pattern') };
    else r.focus = { cat: 'vibe', id: r.vibe };

    const vibeHeat = trendPop(state, 'vibe', r.vibe);
    const focusHeat = r.focus ? trendPop(state, r.focus.cat, r.focus.id) : 0.5;
    const def = RIVALS.find((d) => d.id === r.id)!;
    const room = Math.max(0.03, 1 - r.followers / (RIVAL_CAP[r.id] ?? 100000));
    const g = def.growth * (0.6 + vibeHeat * 0.5 + focusHeat * 0.3) * (0.7 + r.hype / 120) * room + randRange(state, -0.004, 0.004);
    r.followers = Math.max(100, Math.round(r.followers * (1 + g)));
    r.hype += (30 - r.hype) * 0.15;

    if (chance(state, DROP_CHANCE[r.personality] ?? 0.15)) {
      r.lastDropDay = state.day;
      const flop = r.personality === 'chaos' ? chance(state, 0.35) : chance(state, 0.12);
      if (flop) {
        r.hype = clamp(r.hype - 10, 0, 100);
        r.reputation = clamp(r.reputation - 2, 0, 100);
        events.push({ type: 'rivalNews', rivalId: r.id, text: `${r.name} dropped a ${displayName('vibe', r.vibe)} capsule. It flopped. The comments are brutal.` });
      } else {
        r.hype = clamp(r.hype + 15, 0, 100);
        r.reputation = clamp(r.reputation + 1, 0, 100);
        const focus = r.focus ? displayName(r.focus.cat, r.focus.id) : 'new';
        events.push({ type: 'rivalNews', rivalId: r.id, text: `${r.name} dropped a ${focus} piece. Sold out in ${Math.round(randRange(state, 3, 40))} minutes.` });
      }
    }
    const revPerFollower = def.weeklyRevenue / def.followers;
    r.weeklyRevenue = Math.round(r.followers * revPerFollower * (0.8 + r.hype / 250));
    r.relation += (0 - r.relation) * 0.05;
  }
  // beef keeps everyone talking
  const beefs = state.rivals.filter((r) => r.relation <= -50).length;
  if (beefs) state.hype = clamp(state.hype + 2 * beefs, 0, 100);
}

// ---- player actions ---------------------------------------------------------------

const ACTION_COOLDOWN = 14;

export function rivalCooldown(state: GameState, r: Rival): number {
  return Math.max(0, r.lastActionDay + ACTION_COOLDOWN - state.day);
}

export function dissRival(state: GameState, rivalId: string): { ok: true; text: string } | { ok: false; reason: string } {
  const r = state.rivals.find((x) => x.id === rivalId);
  if (!r) return { ok: false, reason: 'Unknown brand.' };
  if (rivalCooldown(state, r) > 0) return { ok: false, reason: `Wait ${rivalCooldown(state, r)} more days before the next move on ${r.name}.` };
  r.lastActionDay = state.day;
  r.relation = clamp(r.relation - 30, -100, 100);
  if (chance(state, 0.25)) {
    state.reputation = clamp(state.reputation - 3, 0, 100);
    return { ok: true, text: `The diss fell flat. People think you are jealous of ${r.name}.` };
  }
  state.hype = clamp(state.hype + 8, 0, 100);
  r.hype = clamp(r.hype + 4, 0, 100);
  if (chance(state, 0.6)) {
    state.scheduledEvents.push({ defId: 'rival_diss', day: state.day + 3 + Math.floor(randRange(state, 0, 7)), params: { rivalId: r.id } });
  }
  return { ok: true, text: `Shots fired at ${r.name}. Everyone is watching.` };
}

export function shoutOutRival(state: GameState, rivalId: string): { ok: true; text: string } | { ok: false; reason: string } {
  const r = state.rivals.find((x) => x.id === rivalId);
  if (!r) return { ok: false, reason: 'Unknown brand.' };
  if (rivalCooldown(state, r) > 0) return { ok: false, reason: `Wait ${rivalCooldown(state, r)} more days before the next move on ${r.name}.` };
  r.lastActionDay = state.day;
  r.relation = clamp(r.relation + 25, -100, 100);
  state.reputation = clamp(state.reputation + 1, 0, 100);
  const gained = Math.round(r.followers * 0.003 * Math.max(0.02, 1 - state.followers / 120000));
  state.followers += gained;
  return { ok: true, text: `${r.name} returned the love. +${gained} followers from their crowd.` };
}

export function relationWord(rel: number): string {
  if (rel <= -50) return 'Beef';
  if (rel <= -15) return 'Tension';
  if (rel >= 50) return 'Allies';
  if (rel >= 15) return 'Friendly';
  return 'Neutral';
}

export function randomRival(state: GameState): Rival {
  return pick(state, state.rivals);
}
