import { DIFFICULTIES } from './content';
import { chance } from './rng';
import { room } from './audience';
import type { EventDef } from './events';
import type { GameState } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const cm = (s: GameState) => DIFFICULTIES[s.difficulty].costMult;
const stock = (s: GameState) => Object.values(s.inventory).reduce((a, l) => a + l.units, 0);
const hype = (s: GameState, n: number) => (s.hype = clamp(s.hype + n, 0, 100));
const rep = (s: GameState, n: number) => (s.reputation = clamp(s.reputation + n, 0, 100));
const fans = (s: GameState, share: number, flat: number) => {
  const g = Math.round((s.followers * share + flat) * room(s));
  s.followers += g;
  return g;
};
const pay = (s: GameState, n: number) => {
  s.cash -= n;
  s.stats.spent += n;
};
/** A simple paid option. */
const paid = (label: string, base: number, hint: string, apply: (s: GameState) => string) => ({
  label,
  hint: `Costs ${money(base)}, ${hint}`,
  blocked: (s: GameState) => (s.cash < base * cm(s) ? 'Not enough cash.' : null),
  apply: (s: GameState) => {
    pay(s, base * cm(s));
    return apply(s);
  },
});
const free = (label: string, hint: string, apply: (s: GameState) => string) => ({ label, hint, apply });
const always = (w: number) => () => w;

export const EXTRA_EVENTS: EventDef[] = [
  // ---- story: three chapters, in order
  {
    id: 'story_friend',
    tone: 'neutral',
    weight: (s) => (s.milestones.first_sale && !s.flags.story1 ? 3 : 0),
    title: () => 'An old friend from Csepel',
    body: () => 'Dani, who you used to print shirts with in a garage, shows up at the basement. He is broke but has a notebook full of wild graphic ideas.',
    options: () => [
      free('Give him a shot', 'He works for free for now', (s) => {
        s.flags.story1 = true;
        rep(s, 2);
        hype(s, 5);
        return 'Dani moves into the corner with his notebook. His first sketch is actually fire.';
      }),
      free('Lend him some cash', `Costs ${money(500)}`, (s) => {
        s.flags.story1 = true;
        pay(s, 500);
        return 'He promises to pay you back. He says he will introduce you to "someone important" one day.';
      }),
    ],
  },
  {
    id: 'story_investor',
    tone: 'neutral',
    weight: (s) => (s.hqLevel >= 1 && s.flags.story1 && !s.flags.story2 ? 3 : 0),
    title: () => 'A letter signed only "M."',
    body: () => 'An envelope slides under the studio door. Inside: a cheque and a note. "I have been watching. Keep going. M."',
    options: () => [
      free('Cash the cheque', `+${money(5000)}`, (s) => {
        s.flags.story2 = true;
        s.cash += 5000;
        return 'Money in. But who is M.?';
      }),
      free('Frame it, do not cash it', '+3 reputation', (s) => {
        s.flags.story2 = true;
        s.flags.storyProud = true;
        rep(s, 3);
        return 'It hangs above your desk. A reminder that someone believes in you.';
      }),
    ],
  },
  {
    id: 'story_reveal',
    tone: 'good',
    weight: (s) => (s.hqLevel >= 2 && s.flags.story2 && !s.flags.story3 ? 3 : 0),
    title: () => 'M. reveals themselves',
    body: (s) =>
      `At the Flagship opening, an older woman introduces herself: Margit, the seamstress who taught Dani to sew decades ago. ${s.flags.storyProud ? 'She noticed you never cashed her cheque.' : 'She is glad the money helped.'} She wants to pass on her workshop.`,
    options: () => [
      free('Accept her workshop', 'Better quality, +8 reputation', (s) => {
        s.flags.story3 = true;
        rep(s, 8);
        s.unlocks.includes('unlock_vela') || s.unlocks.push('unlock_vela');
        return 'Margit hands you the keys. Vela Craftworks, her old partners, will now work with you.';
      }),
      free('Ask her to mentor you instead', '+10 hype, the press loves it', (s) => {
        s.flags.story3 = true;
        hype(s, 10);
        fans(s, 0.03, 500);
        return 'The story of Margit, Dani and the basement goes viral.';
      }),
    ],
  },
  // ---- team conflict
  {
    id: 'staff_feud',
    tone: 'bad',
    weight: (s) => (s.employees.length >= 2 ? 0.6 : 0),
    params: (s) => (s.employees.length >= 2 ? { a: s.employees[0].id, b: s.employees[1].id } : null),
    title: () => 'Two of your people are fighting',
    body: (s, p) => {
      const a = s.employees.find((e) => e.id === p.a)?.name ?? 'Someone';
      const b = s.employees.find((e) => e.id === p.b)?.name ?? 'someone else';
      return `${a} and ${b} had a screaming match about whose idea the last drop was. The office is tense.`;
    },
    options: (s, p) => {
      const a = s.employees.find((e) => e.id === p.a);
      const b = s.employees.find((e) => e.id === p.b);
      const side = (win?: typeof a, lose?: typeof a) => () => {
        if (win) win.mood = clamp(win.mood + 10, 0, 100);
        if (lose) lose.mood = clamp(lose.mood - 20, 0, 100);
        return `${win?.name.split(' ')[0] ?? 'They'} is happy. ${lose?.name.split(' ')[0] ?? 'The other'} is sulking.`;
      };
      return [
        free(`Side with ${a?.name.split(' ')[0] ?? 'the first'}`, 'One happy, one upset', side(a, b)),
        free(`Side with ${b?.name.split(' ')[0] ?? 'the second'}`, 'One happy, one upset', side(b, a)),
        paid('Take everyone out', 300, 'everyone calms down', (st) => {
          for (const e of st.employees) e.mood = clamp(e.mood + 5, 0, 100);
          return 'Karaoke fixed it. Mostly.';
        }),
      ];
    },
  },
  // ---- twenty more
  {
    id: 'photographer',
    tone: 'good',
    weight: always(0.5),
    title: () => 'A street photographer wants your pieces',
    body: () => 'A well-known street photographer wants to shoot your clothes for their new zine.',
    options: () => [paid('Pay for a proper shoot', 800, 'more followers', (s) => `Beautiful shots. +${fans(s, 0.02, 120)} followers.`), free('Let them borrow pieces', '+2 reputation', (s) => (rep(s, 2), 'A couple of nice photos. Respect from the scene.'))],
  },
  {
    id: 'sample_leak',
    tone: 'neutral',
    weight: (s) => (s.designs.length > 1 ? 0.5 : 0),
    title: () => 'An unreleased sample leaked',
    body: () => 'Someone posted a blurry photo of a piece you have not released yet.',
    options: () => [free('Lean into it', '+10 hype', (s) => (hype(s, 10), 'You reposted it with "soon". The comments exploded.')), paid('Find the leaker', 1000, '+1 reputation', (s) => (rep(s, 1), 'It was a factory worker. It will not happen again.'))],
  },
  {
    id: 'youth_centre',
    tone: 'neutral',
    weight: always(0.4),
    title: () => 'The local youth centre asks for help',
    body: () => 'A youth centre in your district needs money for a screen-printing workshop.',
    options: () => [paid('Donate', 1500, '+5 reputation', (s) => (rep(s, 5), 'The kids made their own tees. One of them looks like a future designer.')), free('Not right now', 'Nothing happens', () => 'Maybe next year.')],
  },
  {
    id: 'vintage_find',
    tone: 'good',
    weight: always(0.4),
    title: () => 'A crate of vintage fabric',
    body: () => 'A closing factory is selling a crate of 90s deadstock fabric.',
    options: () => [paid('Buy it for a special run', 300, 'hype and reputation', (s) => (hype(s, 3), rep(s, 2), 'The deadstock pieces have collectors talking.')), free('Flip it to a reseller', `+${money(600)}`, (s) => ((s.cash += 600), 'Quick money.'))],
  },
  {
    id: 'typo_print',
    tone: 'bad',
    weight: (s) => (stock(s) > 50 ? 0.4 : 0),
    title: () => 'There is a typo on a batch',
    body: () => 'One batch went out with a spelling mistake in the print.',
    options: () => [
      free('Call it a feature', 'Risky: could become a meme', (s) => (chance(s, 0.5) ? (hype(s, 8), '"Error edition" is now a collectors item.') : (rep(s, -3), 'People are laughing at you, not with you.'))),
      paid('Reprint it properly', 1200, 'safe', () => 'Fixed quietly. Nobody noticed.'),
    ],
  },
  {
    id: 'actor_dm',
    tone: 'good',
    weight: (s) => (s.followers > 2000 ? 0.4 : 0),
    title: () => 'An actor slid into your DMs',
    body: () => 'A TV actor wants free clothes for a premiere red carpet.',
    options: () => [paid('Send a full fit', 500, 'red carpet exposure', (s) => (hype(s, 8), `Red carpet photos everywhere. +${fans(s, 0.03, 200)} followers.`)), free('Ignore it', 'Stay underground', (s) => (rep(s, 1), 'Underground stays underground.'))],
  },
  {
    id: 'reseller_bulk',
    tone: 'neutral',
    weight: (s) => (stock(s) > 120 && s.stats.bestSellerId ? 0.4 : 0),
    params: (s) => {
      const top = Object.entries(s.inventory).sort((a, b) => b[1].units - a[1].units)[0];
      return top ? { designId: top[0] } : null;
    },
    title: () => 'A reseller wants 100 pieces',
    body: () => 'A big reseller offers to buy 100 pieces of your fullest stock at 80% of the price, cash today.',
    options: (_s, p) => [
      free('Take the cash', 'Money now, fans feel cheated', (s) => {
        const lot = s.inventory[String(p.designId)];
        const n = Math.min(100, lot?.units ?? 0);
        if (lot) lot.units -= n;
        const cash = Math.round(n * (s.listings[String(p.designId)]?.price ?? 50) * 0.8);
        s.cash += cash;
        s.stats.revenue += cash;
        rep(s, -2);
        return `Sold ${n} pieces for ${money(cash)}. Fans are grumbling about resellers.`;
      }),
      free('Refuse', '+1 reputation', (s) => (rep(s, 1), 'Real fans first. People noticed.')),
    ],
  },
  {
    id: 'site_crash',
    tone: 'bad',
    weight: (s) => (s.stats.unitsSold > 200 ? 0.4 : 0),
    title: () => 'The webshop crashed',
    body: () => 'Too many visitors at once and the shop went down.',
    options: () => [paid('Pay for an emergency fix', 1200, 'back online now', () => 'Back up within the hour.'), free('Wait it out', 'Fewer visitors for 3 days', (s) => (s.boosts.push({ kind: 'visitors', mult: 0.7, untilDay: s.day + 3, source: 'Site crash' }), 'The shop limps along for a few days.'))],
  },
  {
    id: 'award',
    tone: 'good',
    weight: (s) => (s.reputation > 35 ? 0.35 : 0),
    title: () => 'Nominated: Best Newcomer',
    body: () => 'A fashion award show nominated you for Best Newcomer.',
    options: () => [paid('Go to the ceremony', 2000, 'reputation and hype', (s) => (rep(s, 4), hype(s, 8), chance(s, 0.4) ? 'You WON. The trophy is on the shelf.' : 'You did not win, but the photos went everywhere.')), free('Skip it', 'Nothing happens', () => 'Award shows are for posers anyway.')],
  },
  {
    id: 'music_video',
    tone: 'good',
    weight: always(0.4),
    title: () => 'A band wants your clothes in a music video',
    body: () => 'An up-and-coming band wants to wear your pieces in their next video.',
    options: () => [free('Yes, for free', '+6 hype', (s) => (hype(s, 6), 'The video drops next week. Your hoodie is front and centre.')), free('Charge them', `+${money(1000)}`, (s) => ((s.cash += 1000), 'Paid placement. Fine.'))],
  },
  {
    id: 'mural',
    tone: 'good',
    weight: always(0.3),
    title: () => 'A painter offers a mural',
    body: () => 'A graffiti artist wants to paint your logo across the wall of your building.',
    options: () => [paid('Do it', 1000, 'followers and reputation', (s) => (rep(s, 3), `Tourists take photos of it now. +${fans(s, 0.01, 100)} followers.`)), free('No thanks', 'Nothing happens', () => 'The wall stays grey.')],
  },
  {
    id: 'podcast',
    tone: 'good',
    weight: always(0.4),
    title: () => 'Podcast invite',
    body: () => 'A fashion podcast wants you on to talk about building a brand from a basement.',
    options: () => [free('Go on the show', 'Reputation and followers', (s) => (rep(s, 2), `Good chat. +${fans(s, 0.01, 80)} followers.`)), free('Decline', 'Nothing happens', () => 'Too busy designing.')],
  },
  {
    id: 'students',
    tone: 'neutral',
    weight: always(0.3),
    title: () => 'Design students copy your style',
    body: () => 'A fashion school class is copying your style for a project.',
    options: () => [paid('Sponsor the class', 500, '+3 reputation', (s) => (rep(s, 3), 'They now credit you in their final show.')), free('Ignore it', 'Nothing happens', () => 'Flattering, really.')],
  },
  {
    id: 'bad_review',
    tone: 'bad',
    weight: (s) => (s.stats.unitsSold > 100 ? 0.4 : 0),
    title: () => 'A brutal review',
    body: () => 'A big blog called your latest pieces "basement-grade".',
    options: () => [free('Clap back publicly', '50/50', (s) => (chance(s, 0.5) ? (hype(s, 8), 'Your reply was better than their review.') : (rep(s, -4), 'You looked thin-skinned.'))), free('Take it on the chin', '+1 reputation', (s) => (rep(s, 1), 'You used the notes. Quietly.'))],
  },
  {
    id: 'lost_package',
    tone: 'bad',
    weight: (s) => (s.stats.unitsSold > 50 ? 0.4 : 0),
    title: () => 'A batch of orders got lost',
    body: () => 'The courier lost a bag of customer orders.',
    options: () => [paid('Reship at your cost', 600, '+1 reputation', (s) => (rep(s, 1), 'Customers got their stuff, plus stickers.')), free('Refund and move on', '-1 reputation', (s) => (rep(s, -1), 'Some customers are annoyed.'))],
  },
  {
    id: 'dance_challenge',
    tone: 'good',
    weight: (s) => (s.followers > 1000 ? 0.4 : 0),
    title: () => 'A dance challenge uses your piece',
    body: () => 'A Loopz dance challenge has everyone wearing something that looks like yours.',
    options: () => [paid('Fuel it with ads', 700, 'big follower gain', (s) => `It took off. +${fans(s, 0.04, 200)} followers.`), free('Let it ride', 'small gain', (s) => `+${fans(s, 0.01, 50)} followers.`)],
  },
  {
    id: 'protest',
    tone: 'bad',
    weight: (s) => (s.hqLevel >= 1 ? 0.3 : 0),
    title: () => 'Protest outside your door',
    body: () => 'Activists are protesting fast fashion outside your building.',
    options: () => [free('Go out and talk to them', '+3 reputation', (s) => (rep(s, 3), 'You listened. They left with a better opinion of you.')), free('Ignore them', '-3 reputation', (s) => (rep(s, -3), 'The photos of your closed door did not look great.'))],
  },
  {
    id: 'intern_idea',
    tone: 'neutral',
    weight: (s) => (s.employees.some((e) => e.trait === 'intern') ? 0.6 : 0),
    title: () => 'The intern has a wild idea',
    body: () => 'Your intern wants to hide golden tickets in random orders.',
    options: () => [paid('Try it', 500, 'could go big', (s) => (chance(s, 0.6) ? (hype(s, 12), 'Golden ticket hunters are buying everything.') : 'Nobody found the tickets. Oh well.')), free('Pass', 'Nothing happens', () => 'The intern looks a little sad.')],
  },
  {
    id: 'museum',
    tone: 'good',
    weight: (s) => (s.reputation > 45 ? 0.3 : 0),
    title: () => 'A design museum calls',
    body: () => 'A design museum wants one of your pieces for an exhibition about Budapest streetwear.',
    options: () => [free('Donate a piece', '+5 reputation', (s) => (rep(s, 5), 'Your hoodie is behind glass now.')), free('Decline', 'Nothing happens', () => 'Museums are for dead brands.')],
  },
  {
    id: 'tax_refund',
    tone: 'good',
    weight: (s) => (s.stats.revenue > 20000 ? 0.3 : 0),
    title: () => 'Tax refund',
    body: () => 'You overpaid tax last year. The office is sending money back.',
    options: () => [free('Keep it', `+${money(2000)}`, (s) => ((s.cash += 2000), 'Nice surprise.')), free('Give it to the youth centre', '+4 reputation', (s) => (rep(s, 4), 'Good karma.'))],
  },
];
