import { ARTISTS, DIFFICULTIES, FACTORIES, INFLUENCERS, STAGE2 } from './content';
import { dateInfo } from './calendar';
import { fairPrice, getDesign } from './design';
import { newId } from './newGame';
import { chance, pick, randInt, randRange } from './rng';
import { bonusCost } from './team';
import { recordSale } from './webshop';
import type { FactoryId, GameEvent, GameState, PendingEvent } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const room = (s: GameState) => Math.max(0.02, 1 - s.followers / 120000);
const cm = (s: GameState) => DIFFICULTIES[s.difficulty].costMult;
const stock = (s: GameState) => Object.values(s.inventory).reduce((a, l) => a + l.units, 0);
type P = PendingEvent['params'];

export interface EventOption {
  label: string;
  hint: string;
  /** null = available; string = why not */
  blocked?: (s: GameState, p: P) => string | null;
  apply: (s: GameState, p: P) => string;
}

export interface EventDef {
  id: string;
  tone: 'good' | 'bad' | 'neutral';
  /** only raised by other systems (factory problems), never drawn at random */
  internal?: boolean;
  weight: (s: GameState) => number;
  params?: (s: GameState) => P | null;
  title: (s: GameState, p: P) => string;
  body: (s: GameState, p: P) => string;
  options: (s: GameState, p: P) => EventOption[];
}

function pay(s: GameState, amount: number) {
  s.cash -= amount;
  s.stats.spent += amount;
}

function needCash(amount: (s: GameState, p: P) => number) {
  return (s: GameState, p: P) => (s.cash < amount(s, p) ? 'Not enough cash.' : null);
}

function bestStockedDesign(s: GameState): string | null {
  let best: string | null = null;
  let units = 0;
  for (const [id, lot] of Object.entries(s.inventory)) {
    if (lot.units > units) {
      units = lot.units;
      best = id;
    }
  }
  return best;
}

function designLabel(s: GameState, id: string | number | undefined) {
  return (id && getDesign(s, String(id))?.name) || 'your piece';
}

export const EVENTS: EventDef[] = [
  {
    id: 'viral_moment',
    tone: 'good',
    weight: (s) => (s.designs.length > 0 && s.followers > 200 ? 1 : 0),
    params: (s) => ({ designId: pick(s, s.designs).id }),
    title: () => 'You are going viral',
    body: (s, p) => `A stranger's fit pic in ${designLabel(s, p.designId)} is blowing up on Loopz. Thousands of people are asking where it's from.`,
    options: () => [
      {
        label: 'Boost it with paid ads',
        hint: `Costs ${money(600)}, big follower gain`,
        blocked: needCash((s) => 600 * cm(s)),
        apply: (s) => {
          pay(s, 600 * cm(s));
          const g = Math.round((s.followers * 0.15 + 150) * room(s));
          s.followers += g;
          s.hype = clamp(s.hype + 15, 0, 100);
          return `The ads hit. +${g.toLocaleString('en-US')} followers.`;
        },
      },
      {
        label: 'Tease a restock',
        hint: 'Hype for your next drop',
        apply: (s) => {
          s.hype = clamp(s.hype + 12, 0, 100);
          const d = s.drops.find((x) => x.status === 'scheduled');
          if (d) d.hype = clamp(d.hype + 15, 0, 100);
          return d ? 'The comments are begging for the drop. Hype climbing.' : 'People are waiting for your next move. Hype up.';
        },
      },
      {
        label: 'Stay humble',
        hint: 'Small reputation gain',
        apply: (s) => {
          s.reputation = clamp(s.reputation + 3, 0, 100);
          const g = Math.round(s.followers * 0.05 * room(s));
          s.followers += g;
          return `A thank-you repost. Classy. +${g} followers.`;
        },
      },
    ],
  },
  {
    id: 'rapper_spotted',
    tone: 'good',
    weight: (s) => (s.followers > 500 && s.designs.length > 0 ? 0.8 : 0),
    params: (s) => ({ artistId: pick(s, ARTISTS).id, designId: pick(s, s.designs).id }),
    title: (_s, p) => `${ARTISTS.find((a) => a.id === p.artistId)?.name} is wearing you`,
    body: (s, p) => {
      const a = ARTISTS.find((x) => x.id === p.artistId)!;
      return `${a.name} (${a.genre}) showed up to a show in ${designLabel(s, p.designId)}. Nobody paid for that. The clip is everywhere.`;
    },
    options: (_s, p) => [
      {
        label: 'Send a free pack',
        hint: `Costs ${money(400)}, makes a future collab cheaper`,
        blocked: needCash((s) => 400 * cm(s)),
        apply: (s) => {
          pay(s, 400 * cm(s));
          s.hype = clamp(s.hype + 18, 0, 100);
          s.flags[`favor_${p.artistId}`] = true;
          return 'They posted the unboxing. A collab with them is now 40% cheaper.';
        },
      },
      {
        label: 'Repost it',
        hint: 'Quick hype',
        apply: (s) => {
          s.hype = clamp(s.hype + 8, 0, 100);
          const g = Math.round(s.followers * 0.02 * room(s) + 40);
          s.followers += g;
          return `Easy win. +${g} followers.`;
        },
      },
      {
        label: 'Say nothing',
        hint: 'Stay mysterious',
        apply: (s) => {
          s.reputation = clamp(s.reputation + 1, 0, 100);
          return 'The mystery works on some people.';
        },
      },
    ],
  },
  {
    id: 'factory_defect',
    tone: 'bad',
    internal: true,
    weight: () => 0,
    title: (_s, p) => `${FACTORIES[p.factoryId as FactoryId]?.name ?? 'The factory'} botched a batch`,
    body: (s, p) => `${p.lost} pieces of ${designLabel(s, p.designId)} came back with crooked prints and loose seams.`,
    options: (_s, p) => [
      {
        label: 'Write them off',
        hint: 'Lose the units, keep your name clean',
        apply: () => 'Into the bin. Painful but clean.',
      },
      {
        label: 'Sell them as seconds',
        hint: 'Units back in stock, reputation risk',
        apply: (s) => {
          const lot = s.inventory[String(p.designId)];
          const lost = Number(p.lost);
          if (lot) {
            const total = lot.units + lost;
            lot.quality = Math.round((lot.quality * lot.units + Math.max(5, Number(p.quality) - 25) * lost) / Math.max(1, total));
            lot.units = total;
          } else {
            s.inventory[String(p.designId)] = { units: lost, quality: Math.max(5, Number(p.quality) - 25), unitCost: Number(p.unitCost) };
          }
          s.reputation = clamp(s.reputation - 3, 0, 100);
          return 'Back on the shelf. Some customers will notice.';
        },
      },
      {
        label: 'Demand a refund',
        hint: 'About 60% chance they pay',
        apply: (s) => {
          if (chance(s, 0.6)) {
            const back = Number(p.lost) * Number(p.unitCost);
            s.cash += back;
            return `They paid up: ${money(back)} back.`;
          }
          return 'They ghosted you. Nothing back.';
        },
      },
    ],
  },
  {
    id: 'factory_scandal',
    tone: 'bad',
    internal: true,
    weight: () => 0,
    title: () => 'Sweatshop exposé',
    body: (_s, p) => `A blog post about working conditions at ${FACTORIES[p.factoryId as FactoryId]?.name} is going around, and your brand is tagged in it.`,
    options: () => [
      {
        label: 'Cut ties publicly',
        hint: `Costs ${money(1000)}, small reputation hit`,
        blocked: needCash((s) => 1000 * cm(s)),
        apply: (s) => {
          pay(s, 1000 * cm(s));
          s.reputation = clamp(s.reputation - 4, 0, 100);
          s.hype = clamp(s.hype + 6, 0, 100);
          return 'You took a stand. Most people respect it.';
        },
      },
      {
        label: 'Stay quiet',
        hint: 'Big reputation hit',
        apply: (s) => {
          s.reputation = clamp(s.reputation - 12, 0, 100);
          s.followers = Math.round(s.followers * 0.97);
          return 'The silence was loud. Reputation took a hit.';
        },
      },
      {
        label: 'Deny everything',
        hint: 'Risky: could blow over, could blow up',
        apply: (s) => {
          if (chance(s, 0.5)) {
            s.reputation = clamp(s.reputation - 2, 0, 100);
            return 'The story died in a day. Lucky.';
          }
          s.reputation = clamp(s.reputation - 20, 0, 100);
          s.followers = Math.round(s.followers * 0.94);
          return 'Receipts came out. This is bad.';
        },
      },
    ],
  },
  {
    id: 'influencer_drama',
    tone: 'bad',
    weight: (s) => {
      const c = s.influencerCampaign;
      if (!c || c.untilDay <= s.day) return 0;
      return (INFLUENCERS.find((i) => i.id === c.influencerId)?.risk ?? 0) * 25;
    },
    params: (s) => ({ influencerId: s.influencerCampaign!.influencerId }),
    title: (_s, p) => `${INFLUENCERS.find((i) => i.id === p.influencerId)?.name} is in trouble`,
    body: (_s, p) => `Your paid influencer ${INFLUENCERS.find((i) => i.id === p.influencerId)?.handle} got caught in some online drama. Your logo is in every screenshot.`,
    options: (_s, p) => [
      {
        label: 'Drop them now',
        hint: 'Ends the campaign',
        apply: (s) => {
          const name = INFLUENCERS.find((i) => i.id === p.influencerId)?.name;
          s.influencerCampaign = null;
          s.boosts = s.boosts.filter((b) => b.source !== name);
          s.reputation = clamp(s.reputation + 1, 0, 100);
          return 'Campaign over. People noticed you moved fast.';
        },
      },
      {
        label: 'Stand by them',
        hint: 'Risky',
        apply: (s) => {
          if (chance(s, 0.5)) {
            s.hype = clamp(s.hype + 10, 0, 100);
            s.followers += Math.round(s.followers * 0.03 * room(s));
            return 'It blew over and the loyalty played well.';
          }
          s.reputation = clamp(s.reputation - 10, 0, 100);
          return 'It got worse. You are part of the story now.';
        },
      },
      {
        label: 'Say nothing',
        hint: 'Small reputation hit',
        apply: (s) => {
          s.reputation = clamp(s.reputation - 4, 0, 100);
          return 'You waited it out. A few people unfollowed.';
        },
      },
    ],
  },
  {
    id: 'basement_leak',
    tone: 'bad',
    weight: (s) => (s.hqLevel === 0 && stock(s) > 60 ? 0.7 : 0),
    params: (s) => {
      const id = bestStockedDesign(s);
      if (!id) return null;
      return { designId: id, lost: Math.max(5, Math.round(s.inventory[id].units * randRange(s, 0.15, 0.3))) };
    },
    title: () => 'Pipe burst in the basement',
    body: (s, p) => `Water is creeping toward the boxes of ${designLabel(s, p.designId)}. About ${p.lost} pieces are at risk.`,
    options: (_s, p) => [
      {
        label: 'Call an emergency plumber',
        hint: `Costs ${money(450)}, nothing lost`,
        blocked: needCash((s) => 450 * cm(s)),
        apply: (s) => {
          pay(s, 450 * cm(s));
          return 'Fixed in an hour. Everything is dry.';
        },
      },
      {
        label: 'Save what you can',
        hint: 'Lose about half of it',
        apply: (s) => {
          const lot = s.inventory[String(p.designId)];
          const lost = Math.min(lot?.units ?? 0, Math.round(Number(p.lost) / 2));
          if (lot) lot.units -= lost;
          return `You lost ${lost} pieces to the flood.`;
        },
      },
    ],
  },
  {
    id: 'tax_audit',
    tone: 'bad',
    weight: (s) => (s.day > 60 && s.stats.revenue > 5000 ? 0.6 : 0),
    params: (s) => ({ fine: Math.round(clamp(s.stats.revenue * 0.03, 500, 25000)) }),
    title: () => 'The tax office wants a word',
    body: (_s, p) => `An audit found sloppy paperwork. They want ${money(Number(p.fine))}.`,
    options: (_s, p) => [
      {
        label: 'Pay the fine',
        hint: money(Number(p.fine)),
        apply: (s) => {
          pay(s, Number(p.fine));
          return 'Paid. Lesson learned.';
        },
      },
      {
        label: 'Hire an accountant',
        hint: `${money(Number(p.fine) * 0.4)}, the team gets stressed`,
        apply: (s) => {
          pay(s, Number(p.fine) * 0.4);
          for (const e of s.employees) e.mood = clamp(e.mood - 5, 0, 100);
          return 'The accountant found loopholes. Cheaper, but a stressful week.';
        },
      },
      {
        label: 'Fight it',
        hint: '50/50: pay nothing or pay double',
        apply: (s) => {
          if (chance(s, 0.5)) return 'You won. Not a cent paid.';
          pay(s, Number(p.fine) * 2);
          return `You lost. ${money(Number(p.fine) * 2)} gone.`;
        },
      },
    ],
  },
  {
    id: 'counterfeits',
    tone: 'bad',
    weight: (s) => (s.stats.unitsSold > 300 && s.stats.bestSellerId ? 0.6 : 0),
    params: (s) => ({ designId: s.stats.bestSellerId! }),
    title: () => 'Fakes everywhere',
    body: (s, p) => `Knock-offs of ${designLabel(s, p.designId)} are all over the flea markets for a fraction of your price.`,
    options: () => [
      {
        label: 'Send the lawyers',
        hint: `Costs ${money(2000)}`,
        blocked: needCash((s) => 2000 * cm(s)),
        apply: (s) => {
          pay(s, 2000 * cm(s));
          s.reputation = clamp(s.reputation + 2, 0, 100);
          return 'Cease and desist sent. The fakes vanished.';
        },
      },
      {
        label: 'Fakes mean clout',
        hint: 'Hype up, reputation down',
        apply: (s) => {
          s.hype = clamp(s.hype + 10, 0, 100);
          s.reputation = clamp(s.reputation - 4, 0, 100);
          return 'Getting faked means you made it. Some buyers are confused though.';
        },
      },
      {
        label: 'Ignore it',
        hint: 'Webshop traffic dips for two weeks',
        apply: (s) => {
          s.boosts.push({ kind: 'visitors', mult: 0.85, untilDay: s.day + 14, source: 'Counterfeits' });
          return 'The fakes are eating some of your sales.';
        },
      },
    ],
  },
  {
    id: 'staff_poached',
    tone: 'bad',
    weight: (s) => (s.employees.length > 0 ? 0.6 : 0),
    params: (s) => ({ employeeId: [...s.employees].sort((a, b) => b.skill - a.skill)[0].id }),
    title: (s, p) => `Someone wants ${s.employees.find((e) => e.id === p.employeeId)?.name.split(' ')[0] ?? 'your best person'}`,
    body: (s, p) => {
      const e = s.employees.find((x) => x.id === p.employeeId);
      return `Another brand offered ${e?.name ?? 'them'} more money. They are thinking about it.`;
    },
    options: (_s, p) => [
      {
        label: 'Match the offer',
        hint: '+25% salary',
        apply: (s) => {
          const e = s.employees.find((x) => x.id === p.employeeId);
          if (!e) return 'They already left.';
          e.salary = Math.round(e.salary * 1.25);
          e.mood = clamp(e.mood + 15, 0, 100);
          return `${e.name.split(' ')[0]} stays, and is happier for it.`;
        },
      },
      {
        label: 'Let them go',
        hint: 'You lose them',
        apply: (s) => {
          const e = s.employees.find((x) => x.id === p.employeeId);
          s.employees = s.employees.filter((x) => x.id !== p.employeeId);
          return `${e?.name ?? 'They'} cleared their desk.`;
        },
      },
      {
        label: 'Talk them round',
        hint: 'Works if they like it here',
        apply: (s) => {
          const e = s.employees.find((x) => x.id === p.employeeId);
          if (!e) return 'They already left.';
          if (chance(s, e.mood / 100)) {
            e.mood = clamp(e.mood + 5, 0, 100);
            return `${e.name.split(' ')[0]} is staying. Loyalty wins.`;
          }
          s.employees = s.employees.filter((x) => x.id !== e.id);
          return `${e.name.split(' ')[0]} left anyway.`;
        },
      },
    ],
  },
  {
    id: 'blog_feature',
    tone: 'good',
    weight: (s) => (s.followers > 400 ? 0.8 : 0),
    title: () => 'A fashion blog wants you',
    body: () => 'An underground fashion blog wants to feature your brand. They offer a paid cover story or a quick free interview.',
    options: () => [
      {
        label: 'Pay for the cover',
        hint: `Costs ${money(1200)}`,
        blocked: needCash((s) => 1200 * cm(s)),
        apply: (s) => {
          pay(s, 1200 * cm(s));
          const g = Math.round((s.followers * 0.06 + 300) * room(s));
          s.followers += g;
          s.reputation = clamp(s.reputation + 2, 0, 100);
          return `Cover story. +${g} followers.`;
        },
      },
      {
        label: 'Do the interview',
        hint: 'Free, smaller gain',
        apply: (s) => {
          s.reputation = clamp(s.reputation + 3, 0, 100);
          const g = Math.round(s.followers * 0.02 * room(s) + 50);
          s.followers += g;
          return `Nice piece. +${g} followers.`;
        },
      },
      {
        label: 'Decline',
        hint: 'Stay underground',
        apply: (s) => {
          s.hype = clamp(s.hype + 2, 0, 100);
          return 'Too cool for blogs. Some people love that.';
        },
      },
    ],
  },
  {
    id: 'club_popup',
    tone: 'good',
    weight: (s) => (stock(s) > 30 ? 0.7 : 0),
    params: (s) => ({ designId: bestStockedDesign(s)! }),
    title: () => 'Pop-up at a club night',
    body: (s, p) => `A techno club wants a merch corner for Saturday night. You would bring ${designLabel(s, p.designId)}.`,
    options: (_s, p) => [
      {
        label: 'Do it',
        hint: `Costs ${money(800)} to set up`,
        blocked: needCash((s) => 800 * cm(s)),
        apply: (s) => {
          pay(s, 800 * cm(s));
          const id = String(p.designId);
          const lot = s.inventory[id];
          const d = getDesign(s, id);
          if (!lot || !d) return 'The stock was gone by Saturday.';
          const sold = Math.min(lot.units, randInt(s, 20, 60));
          const price = s.listings[id]?.price ?? Math.round(fairPrice(s, d, lot.quality));
          lot.units -= sold;
          const events: GameEvent[] = [];
          recordSale(s, id, sold, sold * price, events);
          s.followers += Math.round(100 * room(s));
          return `Sold ${sold} pieces at ${money(price)} in one night. +100 followers.`;
        },
      },
      { label: 'Pass', hint: 'Nothing happens', apply: () => 'Maybe next time.' },
    ],
  },
  {
    id: 'fabric_deal',
    tone: 'good',
    weight: (s) => (s.designs.length > 0 && s.supplierDiscountUntil < s.day ? 0.6 : 0),
    title: () => 'Fabric surplus deal',
    body: () => 'A fabric supplier has too much stock. Pay a small deposit and every factory order is 30% cheaper for the next two weeks.',
    options: () => [
      {
        label: 'Lock in the deal',
        hint: `Costs ${money(500)}`,
        blocked: needCash((s) => 500 * cm(s)),
        apply: (s) => {
          pay(s, 500 * cm(s));
          s.supplierDiscountUntil = s.day + 14;
          return 'Deal locked: 30% off production for 14 days.';
        },
      },
      { label: 'Pass', hint: 'Nothing happens', apply: () => 'You passed.' },
    ],
  },
  {
    id: 'staff_burnout',
    tone: 'bad',
    weight: (s) => (s.employees.some((e) => e.mood < 45) ? 0.9 : 0),
    params: (s) => ({ employeeId: [...s.employees].sort((a, b) => a.mood - b.mood)[0].id }),
    title: (s, p) => `${s.employees.find((e) => e.id === p.employeeId)?.name.split(' ')[0] ?? 'Someone'} is burning out`,
    body: (s, p) => `${s.employees.find((e) => e.id === p.employeeId)?.name ?? 'Someone'} has been snapping at everyone and staying late every night.`,
    options: (_s, p) => [
      {
        label: 'Give them a week off',
        hint: 'Mood up a lot',
        apply: (s) => {
          const e = s.employees.find((x) => x.id === p.employeeId);
          if (!e) return 'Too late, they are gone.';
          e.mood = clamp(e.mood + 30, 0, 100);
          return `${e.name.split(' ')[0]} came back rested.`;
        },
      },
      {
        label: 'Pay a bonus',
        hint: 'Two weeks of salary',
        blocked: (s, pp) => {
          const e = s.employees.find((x) => x.id === pp.employeeId);
          return e && s.cash < bonusCost(e) ? 'Not enough cash.' : null;
        },
        apply: (s) => {
          const e = s.employees.find((x) => x.id === p.employeeId);
          if (!e) return 'Too late, they are gone.';
          pay(s, bonusCost(e));
          e.mood = clamp(e.mood + 20, 0, 100);
          return 'Money talks. They are feeling better.';
        },
      },
      {
        label: 'Push through',
        hint: 'They might quit',
        apply: (s) => {
          const e = s.employees.find((x) => x.id === p.employeeId);
          if (!e) return 'Too late, they are gone.';
          if (chance(s, 0.3)) {
            s.employees = s.employees.filter((x) => x.id !== e.id);
            return `${e.name.split(' ')[0]} quit on the spot.`;
          }
          e.mood = clamp(e.mood - 10, 0, 100);
          return 'They kept going. Barely.';
        },
      },
    ],
  },
  {
    id: 'weather_swing',
    tone: 'neutral',
    weight: (s) => (stock(s) > 40 ? 0.6 : 0),
    params: (s) => ({ hot: dateInfo(s.day).seasonIndex <= 1 ? 1 : 0 }),
    title: (_s, p) => (p.hot ? 'Heat wave' : 'Cold snap'),
    body: (_s, p) => (p.hot ? 'Budapest is melting. Nobody wants anything warm right now.' : 'It is freezing out there. Nobody is buying anything light.'),
    options: (_s, p) => [
      {
        label: 'Post a weather meme',
        hint: 'Small hype',
        apply: (s) => {
          s.hype = clamp(s.hype + 6, 0, 100);
          return 'The meme landed.';
        },
      },
      {
        label: 'Run a season sale',
        hint: 'Clear off-season stock at 40% off',
        apply: (s) => {
          const offSeason = p.hot ? ['puffer', 'beanie', 'hoodie'] : ['tee', 'cap'];
          let units = 0;
          let revenue = 0;
          const events: GameEvent[] = [];
          for (const d of s.designs) {
            if (!offSeason.includes(d.garment)) continue;
            const lot = s.inventory[d.id];
            if (!lot || lot.units <= 0) continue;
            const sold = Math.round(lot.units * 0.3);
            if (sold <= 0) continue;
            const price = Math.max(1, Math.round(fairPrice(s, d, lot.quality) * 0.6));
            lot.units -= sold;
            units += sold;
            revenue += sold * price;
            recordSale(s, d.id, sold, sold * price, events);
          }
          return units ? `Cleared ${units} off-season pieces for ${money(revenue * 0.95)}.` : 'No off-season stock to clear.';
        },
      },
    ],
  },
];

export function eventDef(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}

export function queueEvent(state: GameState, defId: string, params: P, events: GameEvent[]): void {
  state.pendingEvents.push({ id: newId(state, 'v'), defId, day: state.day, params });
  state.lastEventDay = state.day;
  events.push({ type: 'eventStarted', defId });
}

/** Roll for a random event today. */
export function maybeTriggerEvent(state: GameState, events: GameEvent[]): void {
  if (state.pendingEvents.length > 0) return;
  if (state.day - state.lastEventDay < STAGE2.eventMinGapDays) return;
  if (!chance(state, STAGE2.eventChancePerDay)) return;
  const bad = DIFFICULTIES[state.difficulty].badEventMult;
  const pool = EVENTS.filter((e) => !e.internal)
    .map((e) => ({ e, w: e.weight(state) * (e.tone === 'bad' ? bad : 1 / Math.sqrt(bad)) }))
    .filter((x) => x.w > 0);
  if (pool.length === 0) return;
  const total = pool.reduce((a, x) => a + x.w, 0);
  let r = randRange(state, 0, total);
  let chosen = pool[pool.length - 1].e;
  for (const x of pool) {
    r -= x.w;
    if (r <= 0) {
      chosen = x.e;
      break;
    }
  }
  const params = chosen.params ? chosen.params(state) : {};
  if (params === null) return;
  queueEvent(state, chosen.id, params, events);
}

export function currentEvent(state: GameState): PendingEvent | null {
  return state.pendingEvents[0] ?? null;
}

export function eventOptions(state: GameState, pe: PendingEvent) {
  const def = eventDef(pe.defId);
  if (!def) return [];
  return def.options(state, pe.params).map((o) => ({ label: o.label, hint: o.hint, blocked: o.blocked ? o.blocked(state, pe.params) : null }));
}

export function resolveEvent(state: GameState, optionIndex: number): { ok: true; text: string } | { ok: false; reason: string } {
  const pe = currentEvent(state);
  if (!pe) return { ok: false, reason: 'Nothing to decide.' };
  const def = eventDef(pe.defId);
  if (!def) {
    state.pendingEvents.shift();
    return { ok: false, reason: 'Unknown event.' };
  }
  const opts = def.options(state, pe.params);
  const opt = opts[optionIndex];
  if (!opt) return { ok: false, reason: 'No such choice.' };
  const blocked = opt.blocked ? opt.blocked(state, pe.params) : null;
  if (blocked) return { ok: false, reason: blocked };
  const text = opt.apply(state, pe.params);
  state.pendingEvents.shift();
  return { ok: true, text };
}

/** First option that is not blocked (used by bots and as a safe default). */
export function defaultOption(state: GameState): number {
  const pe = currentEvent(state);
  if (!pe) return 0;
  const opts = eventOptions(state, pe);
  const i = opts.findIndex((o) => !o.blocked);
  return i < 0 ? 0 : i;
}
