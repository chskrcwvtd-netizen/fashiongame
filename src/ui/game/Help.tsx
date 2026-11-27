import { useState } from 'react';
import type { Panel } from '../../store/gameStore';

const HELP: Record<Panel, string> = {
  hq: 'Your headquarters at a glance: money this week, the warehouse, bills and the goal. Upgrade the building for more space, visitors and desks.',
  lab: 'Create pieces. Colours, patterns, vibes and finishes that are hot right now (red outline) sell better. Save the design, then produce it.',
  production: 'Pick a factory and a quantity. Cheap factories are fast but risky; premium ones are slow but good. You pay when you order.',
  shop: 'Everything you list sells every day. Price near the fair price. Clearance marks a piece down to clear old stock.',
  drops: 'Limited releases. Announce about a week ahead, tease it, and watch it sell out (or flop). Options: numbered, pre-orders, raffle, bot protection.',
  trends: 'What people want right now, and with research, what they will want next. Rivals chasing the same trend eat into it.',
  marketing: 'Daily posts, paid influencers, artist collabs and runway shows. They bring followers and hype.',
  team: 'Hire people who make everything better. Keep them happy with fair pay, or they quit. Interns are cheap and learn fast.',
  rivals: 'The chart of the biggest brands. Diss them for hype, shout them out for friendship, and team up with allies for joint drops.',
  wholesale: 'Shops buy in bulk at half price and pay later. Big volume, smaller margin.',
  stats: 'Your numbers over time, the press, best sellers and the trophy wall.',
  world: 'Ship to cities abroad, then open stores. Every city raises how many followers you can reach.',
  empire: 'Product lines, buying rivals, investors, the stock market, loans, your own factory and sustainability.',
  lookbook: 'Studio shots of every piece on a model. Pick one and save it as an image.',
};

export const HOTKEYS: Record<string, Panel> = { h: 'hq', l: 'lab', f: 'production', w: 'shop', d: 'drops', t: 'trends', m: 'marketing', e: 'team', c: 'rivals', o: 'wholesale', n: 'stats', g: 'world', x: 'empire', k: 'lookbook' };

export function HelpButton({ panel }: { panel: Panel }) {
  const [open, setOpen] = useState(false);
  const key = Object.entries(HOTKEYS).find(([, p]) => p === panel)?.[0];
  return (
    <div className="help-wrap">
      <button className="help-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="What is this screen?" data-testid="help-btn">
        ?
      </button>
      {open && (
        <div className="help-pop" role="note" data-testid="help-pop">
          <p>{HELP[panel]}</p>
          <p className="muted small">
            Shortcut: {key?.toUpperCase()}. Space pauses, 1/2/3 set speed, Ctrl+Z undoes the last action for 5 seconds.
          </p>
        </div>
      )}
    </div>
  );
}
