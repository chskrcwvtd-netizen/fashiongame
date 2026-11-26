import { COLORS, GARMENTS, VIBES } from './content';
import type { DesignInput } from './types';

/** Simple stable hash so the same piece gets the same comments on the same day. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

const HANDLES = ['@fitcheck.bp', '@danube.drip', '@lowkey.zsofi', '@tram4.archive', '@m4ll.rat', '@vintage.kofi', '@grailhunter', '@nyolcker', '@ruinbar.fits', '@csepel.crew', '@pixel.pleb', '@bottle.green'];

export interface Comment {
  handle: string;
  text: string;
  mood: 'love' | 'meh' | 'hate';
}

export interface CommentContext {
  /** price / fair price */
  priceRatio: number;
  quality: number;
  /** 0..1 */
  fit: number;
  outcome?: 'soldout' | 'solid' | 'flop';
  seed: string;
}

export function customerComments(design: DesignInput, c: CommentContext, count = 3): Comment[] {
  const color = COLORS[design.primary]?.name ?? 'this';
  const piece = GARMENTS[design.garment]?.name.toLowerCase() ?? 'piece';
  const vibe = VIBES[design.vibe]?.name ?? '';
  const love = [
    `the ${color.toLowerCase()} colorway is crazy`,
    `W fit. copped two`,
    `need this ${piece} in every color`,
    `${vibe} done right for once`,
    `this goes with literally everything`,
    `my whole group chat has this now`,
  ];
  const hype = ['sold out before I could blink', 'resellers already listing it at double', 'bots ate this drop alive', 'refreshing like a maniac and still took an L'];
  const pricey = [`$${'X'} for a ${piece}?? nah`, 'price is wild for an underground brand', 'love it but my wallet said no', 'waiting for the sale'];
  const cheap = ['how is this so cheap', 'underpriced fr, buy before they notice', 'steal of the year'];
  const lowQ = ['print cracked after one wash', 'seams gave up in a week', 'fit is weird, sizing all over the place'];
  const highQ = ['fabric feels expensive', 'stitching is clean, quality is there', 'heavyweight and soft, no notes'];
  const meh = ['mid', 'kinda basic ngl', 'who asked for this', `${vibe} is so last season`, 'seen this a thousand times'];

  const pool: Comment[] = [];
  const add = (arr: string[], mood: Comment['mood']) => arr.forEach((text) => pool.push({ handle: '', text, mood }));
  if (c.outcome === 'soldout') add(hype, 'love');
  if (c.outcome === 'flop') add(meh, 'hate');
  if (c.fit > 0.62) add(love, 'love');
  else if (c.fit < 0.5) add(meh, 'hate');
  if (c.priceRatio > 1.15) add(pricey, 'meh');
  if (c.priceRatio < 0.8) add(cheap, 'love');
  if (c.quality < 35) add(lowQ, 'hate');
  if (c.quality > 70) add(highQ, 'love');
  if (pool.length === 0) add(['solid piece', 'clean', 'would wear', 'not bad at all'], 'meh');

  const h = hash(`${design.name}:${c.seed}`);
  const out: Comment[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = (h >>> (i * 5)) % pool.length;
    const pickC = pool.splice(idx, 1)[0];
    out.push({ ...pickC, text: pickC.text.replace('$X', `$${Math.round(c.priceRatio * GARMENTS[design.garment].refPrice)}`), handle: HANDLES[(h >>> (i * 3 + 1)) % HANDLES.length] });
  }
  return out;
}
