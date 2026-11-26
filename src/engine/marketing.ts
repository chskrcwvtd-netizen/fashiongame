import { ARTISTS, DIFFICULTIES, INFLUENCERS, PLATFORMS, STAGE2, type ArtistDef, type InfluencerDef } from './content';
import { getDesign, marketFit } from './design';
import { chance, randRange } from './rng';
import { marketerInfluenceMult, marketerViralBonus, postsPerDay } from './team';
import { trendPop } from './trends';
import type { GameEvent, GameState, PlatformId, PostKind } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 1 → 0 as followers approach the home market ceiling (kept here to avoid an import cycle). */
function room(state: GameState): number {
  return Math.max(0.02, 1 - state.followers / 120000);
}

export function postsLeft(state: GameState): number {
  const used = state.posts.day === state.day ? state.posts.count : 0;
  return Math.max(0, postsPerDay(state) - used);
}

export interface PostInput {
  platform: PlatformId;
  kind: PostKind;
  designId?: string;
}

export type PostResult = { ok: true; viral: boolean; backfired: boolean; followers: number; text: string } | { ok: false; reason: string };

export function viralChance(state: GameState, input: PostInput): number {
  let p = 0.008 + state.hype / 4000 + marketerViralBonus(state);
  if (input.kind === 'fit' && input.designId) {
    const d = getDesign(state, input.designId);
    if (d) p += (marketFit(state, d) - 0.5) * 0.025;
  }
  if (input.kind === 'meme') p *= 1.8;
  if (input.kind === 'bts') p *= 0.5;
  return clamp(p * PLATFORMS[input.platform].viral, 0.005, 0.5);
}

export function postSocial(state: GameState, input: PostInput): PostResult {
  if (state.gameOver) return { ok: false, reason: 'Game over.' };
  if (!PLATFORMS[input.platform]) return { ok: false, reason: 'Unknown platform.' };
  if (postsLeft(state) <= 0) return { ok: false, reason: 'No posts left today. Marketers give you more.' };
  const drop = state.drops.find((d) => d.status === 'scheduled');
  if (input.kind === 'teaser' && !drop) return { ok: false, reason: 'Announce a drop before teasing it.' };
  if (input.kind === 'fit' && (!input.designId || !getDesign(state, input.designId))) return { ok: false, reason: 'Pick a piece to show off.' };

  state.posts = { day: state.day, count: (state.posts.day === state.day ? state.posts.count : 0) + 1 };
  const platform = PLATFORMS[input.platform];
  let mult = platform.reach;
  if (input.kind === 'fit') mult *= 0.6 + marketFit(state, getDesign(state, input.designId!)!) * 0.9;
  if (input.kind === 'meme') mult *= 0.7;
  if (input.kind === 'bts') mult *= 0.6;
  if (input.kind === 'teaser') mult *= 0.5;
  let gained = Math.round((1 + Math.sqrt(state.followers) * 0.1) * mult * room(state));
  let viral = false;
  let backfired = false;
  let text: string;

  if (input.kind === 'meme' && chance(state, 0.08)) {
    backfired = true;
    gained = 0;
    state.reputation = clamp(state.reputation - 2, 0, 100);
    state.hype = clamp(state.hype - 3, 0, 100);
    text = 'The meme aged badly in about four minutes. People are dunking on you.';
  } else if (chance(state, viralChance(state, input))) {
    viral = true;
    gained += Math.round((state.followers * randRange(state, 0.02, 0.06) + 80) * room(state));
    state.hype = clamp(state.hype + 12, 0, 100);
    text = `It went viral on ${platform.name}. Your phone will not stop buzzing.`;
  } else {
    text = `Posted on ${platform.name}. Solid engagement.`;
  }
  if (input.kind === 'bts') state.reputation = clamp(state.reputation + 0.5, 0, 100);
  if (input.kind === 'teaser' && drop) drop.hype = clamp(drop.hype + 8 * (1 - drop.hype / 100), 0, 100);
  state.hype = clamp(state.hype + (backfired ? 0 : 0.4), 0, 100);
  state.followers += gained;
  return { ok: true, viral, backfired, followers: gained, text };
}

// ---- influencers --------------------------------------------------------------

export function influencerFee(state: GameState, inf: InfluencerDef): number {
  return Math.round(inf.fee * DIFFICULTIES[state.difficulty].costMult);
}

export function influencerAvailable(state: GameState, inf: InfluencerDef): string | null {
  if (state.followers < inf.minFollowers) return `Needs ${inf.minFollowers.toLocaleString('en-US')} followers to take your call.`;
  return null;
}

export function hireInfluencer(state: GameState, id: string): { ok: true; followers: number } | { ok: false; reason: string } {
  const inf = INFLUENCERS.find((i) => i.id === id);
  if (!inf) return { ok: false, reason: 'Unknown influencer.' };
  if (state.influencerCampaign && state.influencerCampaign.untilDay > state.day) return { ok: false, reason: 'You already have a campaign running.' };
  const blocked = influencerAvailable(state, inf);
  if (blocked) return { ok: false, reason: blocked };
  const fee = influencerFee(state, inf);
  if (state.cash < fee) return { ok: false, reason: 'Not enough cash for that fee.' };
  state.cash -= fee;
  state.stats.spent += fee;
  const fit = 0.6 + trendPop(state, 'vibe', inf.vibe);
  const gained = Math.round(inf.audience * 0.012 * fit * marketerInfluenceMult(state) * room(state));
  state.followers += gained;
  state.hype = clamp(state.hype + 12, 0, 100);
  const until = state.day + STAGE2.influencerDays;
  state.influencerCampaign = { influencerId: inf.id, untilDay: until };
  state.boosts.push({ kind: 'visitors', mult: 1 + Math.min(0.6, inf.audience / 400000 + 0.15) * fit, untilDay: until, source: inf.name });
  return { ok: true, followers: gained };
}

// ---- artist collabs ----------------------------------------------------------

export function collabFee(state: GameState, a: ArtistDef): number {
  const favor = state.flags[`favor_${a.id}`] ? 0.6 : 1;
  return Math.round(a.fee * favor * DIFFICULTIES[state.difficulty].costMult);
}

export function signCollab(state: GameState, artistId: string): { ok: true } | { ok: false; reason: string } {
  const a = ARTISTS.find((x) => x.id === artistId);
  if (!a) return { ok: false, reason: 'Unknown artist.' };
  if (state.collab) return { ok: false, reason: 'You already have a collab lined up. Drop it first.' };
  if (state.followers < a.minFollowers) return { ok: false, reason: `${a.name} wants a brand with at least ${a.minFollowers.toLocaleString('en-US')} followers.` };
  const fee = collabFee(state, a);
  if (state.cash < fee) return { ok: false, reason: 'Not enough cash for the advance.' };
  state.cash -= fee;
  state.stats.spent += fee;
  state.collab = { artistId: a.id, signedDay: state.day, used: false };
  state.hype = clamp(state.hype + 15, 0, 100);
  const drop = state.drops.find((d) => d.status === 'scheduled');
  if (drop) drop.hype = clamp(drop.hype + 25, 0, 100);
  return { ok: true };
}

export const COLLAB_REVENUE_SHARE = 0.15;

/** Extra drop demand from a signed collab (0 when none). */
export function collabDemand(state: GameState): number {
  if (!state.collab) return 0;
  const a = ARTISTS.find((x) => x.id === state.collab!.artistId);
  if (!a) return 0;
  return a.fans * 0.004 * (0.7 + trendPop(state, 'vibe', a.vibe) * 0.6);
}

export function collabArtist(state: GameState): ArtistDef | null {
  return state.collab ? ARTISTS.find((x) => x.id === state.collab!.artistId) ?? null : null;
}

// ---- boosts -------------------------------------------------------------------

export function visitorMult(state: GameState): number {
  return state.boosts.filter((b) => b.kind === 'visitors' && b.untilDay > state.day).reduce((m, b) => m * b.mult, 1);
}

export function processMarketing(state: GameState, events: GameEvent[]): void {
  const ended = state.boosts.filter((b) => b.untilDay <= state.day);
  state.boosts = state.boosts.filter((b) => b.untilDay > state.day);
  for (const b of ended) events.push({ type: 'boostEnded', source: b.source });
  if (state.influencerCampaign && state.influencerCampaign.untilDay <= state.day) state.influencerCampaign = null;
}
