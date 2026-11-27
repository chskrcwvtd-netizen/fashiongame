import { playerRank } from './rivals';
import { addPress } from './extras';
import type { GameEvent, GameState } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface MilestoneDef {
  id: string;
  title: string;
  desc: string;
  /** shown as the trophy's prize */
  reward: string;
  check: (s: GameState, rank: number) => boolean;
  grant: (s: GameState) => void;
}

function cash(amount: number) {
  return (s: GameState) => {
    s.cash += amount;
  };
}

function unlock(key: string) {
  return (s: GameState) => {
    if (!s.unlocks.includes(key)) s.unlocks.push(key);
  };
}

export const MILESTONES: MilestoneDef[] = [
  { id: 'first_sale', title: 'First sale', desc: 'Somebody paid for your clothes.', reward: '$300 bonus', check: (s) => s.stats.unitsSold >= 1, grant: cash(300) },
  { id: 'first_soldout', title: 'Sold out', desc: 'Your first drop sold out.', reward: 'Unlocks the Track Jacket', check: (s) => s.stats.dropsSoldOut >= 1, grant: unlock('unlock_track') },
  { id: 'first_hire', title: 'Not alone anymore', desc: 'Hired your first employee.', reward: '+10 hype', check: (s) => s.employees.length >= 1, grant: (s) => (s.hype = clamp(s.hype + 10, 0, 100)) },
  { id: 'studio', title: 'Out of the basement', desc: 'Moved into the Studio.', reward: '$1,000 housewarming', check: (s) => s.hqLevel >= 1, grant: cash(1000) },
  { id: 'units_1k', title: '1,000 pieces', desc: 'A thousand pieces out in the wild.', reward: 'Unlocks Wholesale', check: (s) => s.stats.unitsSold >= 1000, grant: unlock('unlock_wholesale') },
  { id: 'first_viral', title: 'Viral', desc: 'One of your posts blew up.', reward: '$500 bonus', check: (s) => !!s.flags.firstViral, grant: cash(500) },
  { id: 'first_collab', title: 'Feat.', desc: 'Signed your first artist collab.', reward: '+5 reputation', check: (s) => !!s.flags.firstCollab, grant: (s) => (s.reputation = clamp(s.reputation + 5, 0, 100)) },
  { id: 'followers_10k', title: '10k followers', desc: 'Ten thousand people follow the brand.', reward: 'Unlocks Vela Craftworks', check: (s) => s.followers >= 10000, grant: unlock('unlock_vela') },
  { id: 'revenue_100k', title: '$100k club', desc: '$100,000 in total revenue.', reward: '$2,000 bonus', check: (s) => s.stats.revenue >= 100000, grant: cash(2000) },
  { id: 'top3', title: 'Top 3', desc: 'One of the three biggest brands on the chart.', reward: '+15 hype', check: (_s, rank) => rank > 0 && rank <= 3, grant: (s) => (s.hype = clamp(s.hype + 15, 0, 100)) },
  { id: 'flagship', title: 'Flagship', desc: 'Opened your own store.', reward: '+5 reputation', check: (s) => s.hqLevel >= 2, grant: (s) => (s.reputation = clamp(s.reputation + 5, 0, 100)) },
  { id: 'units_10k', title: '10,000 pieces', desc: 'Ten thousand pieces sold.', reward: '$5,000 bonus', check: (s) => s.stats.unitsSold >= 10000, grant: cash(5000) },
  { id: 'revenue_1m', title: 'First million', desc: '$1,000,000 in total revenue.', reward: 'Gold plaque in the HQ', check: (s) => s.stats.revenue >= 1_000_000, grant: () => {} },
  { id: 'followers_100k', title: '100k followers', desc: 'A hundred thousand followers.', reward: '+10 reputation', check: (s) => s.followers >= 100000, grant: (s) => (s.reputation = clamp(s.reputation + 10, 0, 100)) },
  { id: 'first_city', title: 'Passport', desc: 'Started shipping abroad.', reward: '+10 hype', check: (s) => Object.keys(s.cities ?? {}).length > 0, grant: (s) => (s.hype = clamp(s.hype + 10, 0, 100)) },
  { id: 'first_acquisition', title: 'Takeover', desc: 'Bought a rival brand.', reward: '+5 reputation', check: (s) => (s.corporate?.subsidiaries.length ?? 0) > 0, grant: (s) => (s.reputation = clamp(s.reputation + 5, 0, 100)) },
  { id: 'tower', title: 'Glass Tower', desc: 'Moved into the Glass Tower.', reward: '+10 reputation', check: (s) => s.hqLevel >= 3, grant: (s) => (s.reputation = clamp(s.reputation + 10, 0, 100)) },
  { id: 'ipo', title: 'Ring the bell', desc: 'Went public.', reward: '+20 hype', check: (s) => !!s.corporate?.ipo, grant: (s) => (s.hype = clamp(s.hype + 20, 0, 100)) },
  { id: 'ovation', title: 'Standing ovation', desc: 'A show got a standing ovation.', reward: '$10,000 bonus', check: (s) => !!s.shows?.history.some((h) => h.outcome === 'ovation'), grant: cash(10000) },
  { id: 'number_one', title: 'Number one', desc: 'The biggest brand on the chart.', reward: 'The crown', check: (_s, rank) => rank === 1, grant: () => {} },
];

/** Check milestones; rank-based ones only when `withRank` (weekly, it is costlier). */
export function checkMilestones(state: GameState, events: GameEvent[], withRank: boolean): void {
  const rank = withRank ? playerRank(state) : 0;
  for (const m of MILESTONES) {
    if (state.milestones[m.id]) continue;
    if (!m.check(state, rank)) continue;
    state.milestones[m.id] = state.day;
    m.grant(state);
    addPress(state, `${state.brand.name}: ${m.title}. ${m.desc}`);
    events.push({ type: 'milestone', id: m.id, title: m.title, reward: m.reward });
  }
}
