import { useEffect, useRef, useState } from 'react';
import { COLORS, customerComments, fairPrice, marketFit } from '../../engine';
import type { Panel } from '../../store/gameStore';
import { EmblemIcon } from '../components/Emblem';
import { count, money, useGame } from '../hooks';
import { sfx } from '../../audio/sfx';
import { music } from '../../audio/music';

/** Drop day, live: the counter runs, then the verdict lands. */
export function LiveDrop() {
  const { store, s } = useGame();
  const sp = store.splash;
  const [shown, setShown] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const key = sp ? `${sp.designName}-${sp.result.sold}-${sp.result.units}` : '';
  useEffect(() => {
    if (!sp) return;
    music.setScene('drop');
    setShown(0);
    setRevealed(false);
    const target = sp.result.sold;
    const duration = 2400;
    const start = Date.now();
    let lastTick = 0;
    const t = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - k, 2.2);
      setShown(Math.round(target * eased));
      if (Date.now() - lastTick > 110 && k < 1) {
        lastTick = Date.now();
        sfx.play('tick', 1);
      }
      if (k >= 1) {
        clearInterval(t);
        setRevealed(true);
        sfx.play(sp.result.outcome === 'soldout' ? 'soldout' : sp.result.outcome === 'flop' ? 'flop' : 'notify', 1);
      }
    }, 40);
    return () => {
      clearInterval(t);
      music.setScene('game');
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!sp) return null;
  const r = sp.result;
  const design = s.designs.find((d) => d.name === sp.designName);
  const comments = design
    ? customerComments(design, {
        priceRatio: (s.drops.find((d) => d.designId === design.id && d.result === r)?.price ?? fairPrice(s, design, 50)) / fairPrice(s, design, s.inventory[design.id]?.quality ?? 50),
        quality: s.inventory[design.id]?.quality ?? 50,
        fit: marketFit(s, design),
        outcome: r.outcome,
        seed: `drop-${s.day}`,
      })
    : [];
  const skip = () => {
    if (!revealed) {
      setShown(r.sold);
      setRevealed(true);
      sfx.play(r.outcome === 'soldout' ? 'soldout' : r.outcome === 'flop' ? 'flop' : 'notify', 1);
    }
  };
  return (
    <div className={`splash splash-${revealed ? r.outcome : 'live'}`} role="dialog" aria-modal="true" data-testid="drop-splash" onClick={skip}>
      <div className="splash-inner">
        <p className="splash-kicker">{sp.designName}</p>
        {!revealed ? (
          <div className="live-count" data-testid="drop-live-count">
            <p className="live-label">Drop is live</p>
            <p className="live-num">
              {shown} <span>/ {r.units}</span>
            </p>
            <div className="live-bar">
              <span style={{ width: `${(shown / Math.max(1, r.units)) * 100}%` }} />
            </div>
            <p className="muted small">Click to skip</p>
          </div>
        ) : (
          <>
            {r.outcome === 'soldout' ? (
              <>
                <h1 className="splash-title chrome-text">sold out</h1>
                <p className="splash-sub">
                  in {r.minutes} {r.minutes === 1 ? 'minute' : 'minutes'}
                </p>
              </>
            ) : r.outcome === 'solid' ? (
              <>
                <h1 className="splash-title chrome-text">solid drop</h1>
                <p className="splash-sub">
                  {r.sold} of {r.units} sold
                </p>
              </>
            ) : (
              <>
                <h1 className="splash-title flop-text">flop</h1>
                <p className="splash-sub">
                  Only {r.sold} of {r.units} sold. Leftovers went back to the warehouse.
                </p>
              </>
            )}
            <div className="splash-stats">
              <span>
                <strong className="money">{money(r.revenue)}</strong> earned
              </span>
              <span>
                <strong>{count(r.demand)}</strong> people tried to cop
              </span>
              {r.resalePrice && (
                <span>
                  <strong>{money(r.resalePrice)}</strong> resale price already
                </span>
              )}
            </div>
            {!!r.bots && <p className="splash-note">Bots grabbed about {r.bots} pieces. Real fans are angry. Bot protection next time?</p>}
            {r.raffle && <p className="splash-note">Raffle drop: winners were drawn fairly. The fans love you for it.</p>}
            {r.numbered && <p className="splash-note">Numbered pieces: collectors are already trading them.</p>}
            {comments.length > 0 && (
              <ul className="comments splash-comments">
                {comments.map((c, i) => (
                  <li key={i} className={`c-${c.mood}`}>
                    <strong>{c.handle}</strong> {c.text}
                  </li>
                ))}
              </ul>
            )}
            <div className="row center">
              <button className="btn btn-primary btn-big" onClick={() => store.dismissSplash()} data-testid="splash-continue" autoFocus>
                Back to work
              </button>
              {r.outcome === 'soldout' && design && (
                <button
                  className="btn"
                  onClick={() => {
                    store.dismissSplash();
                    store.setPanel('drops', design.id);
                  }}
                >
                  Plan a restock
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** First-session coach: points at the next screen to open. */
const COACH: { panel: Panel; text: string }[] = [
  { panel: 'lab', text: 'Open the Design Lab. Pick a piece, colours and a graphic, then hit Save design.' },
  { panel: 'production', text: 'Go to Factories. Danube Works is a safe first pick. Order around 100 pieces.' },
  { panel: 'shop', text: 'When the shipment lands (try 4x speed), list it in the Webshop at a fair price.' },
  { panel: 'drops', text: 'Now the fun part: announce a limited drop about a week out and post teasers.' },
  { panel: 'hq', text: 'Watch the drop land. That is the loop: design, produce, sell, grow. The chart is waiting.' },
];

export function coachStep(s: { designs: unknown[]; orders: unknown[]; inventory: Record<string, unknown>; listings: Record<string, { active: boolean }>; drops: { status: string }[] }): number {
  if (s.designs.length === 0) return 0;
  if (s.orders.length === 0 && Object.keys(s.inventory).length === 0) return 1;
  if (!Object.values(s.listings).some((l) => l.active)) return 2;
  if (s.drops.length === 0) return 3;
  if (!s.drops.some((d) => d.status === 'done')) return 4;
  return 5;
}

export function Coach() {
  const { store, s } = useGame();
  const step = coachStep(s);
  useEffect(() => {
    if (store.tutorial && step >= 5) store.endTutorial();
  }, [step, store]);
  if (!store.tutorial || step >= 5) return null;
  const c = COACH[step];
  return (
    <div className="coach" data-testid="coach" data-target={c.panel}>
      <span className="coach-step">
        Step {step + 1} of {COACH.length}
      </span>
      <p>{c.text}</p>
      <div className="row">
        {store.panel !== c.panel && (
          <button className="btn btn-primary" onClick={() => store.setPanel(c.panel)} data-testid="coach-go">
            Take me there
          </button>
        )}
        <button className="link" onClick={() => store.endTutorial()} data-testid="coach-skip">
          Skip the tutorial
        </button>
      </div>
    </div>
  );
}

/** 5-year goal result. */
export function CampaignSplash() {
  const { store, s } = useGame();
  const c = store.campaignSplash;
  if (!c) return null;
  const color = COLORS[s.brand.logo.color]?.hex ?? '#fff';
  return (
    <div className={`splash ${c.kind === 'won' ? 'splash-soldout' : 'splash-solid'}`} role="dialog" aria-modal="true" data-testid="campaign-splash">
      <div className="splash-inner">
        <EmblemIcon id={s.brand.logo.glyph} color={color} size={90} badge={s.brand.logo.badge} />
        {c.kind === 'won' ? (
          <>
            <h1 className="splash-title chrome-text">number one</h1>
            <p className="splash-sub">{s.brand.name} is the biggest brand on the chart. From a Budapest basement. Keep the crown.</p>
          </>
        ) : (
          <>
            <h1 className="splash-title chrome-text">year five</h1>
            <p className="splash-sub">
              Time is up on the five-year goal. You finished #{c.rank}. The chart goes on: take the top spot whenever you can.
            </p>
          </>
        )}
        <button className="btn btn-primary btn-big" onClick={() => store.dismissCampaign()} data-testid="campaign-continue" autoFocus>
          Keep playing
        </button>
      </div>
    </div>
  );
}

/** Animated logo intro with its own sound, once per launch. */
export function Intro({ onDone }: { onDone: () => void }) {
  const done = useRef(false);
  useEffect(() => {
    sfx.play('intro', 1);
    const t = setTimeout(() => finish(), 2600);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  return (
    <div className="intro" onClick={finish} onKeyDown={finish} role="presentation" data-testid="intro">
      <div className="intro-star">
        <svg viewBox="0 0 24 24" width="140" height="140" aria-hidden="true">
          <defs>
            <linearGradient id="intro-chrome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" />
              <stop offset=".45" stopColor="#b8bfcc" />
              <stop offset=".52" stopColor="#3d4250" />
              <stop offset="1" stopColor="#f2f4f8" />
            </linearGradient>
          </defs>
          <path d="M12 0C12.9 7.6 16.4 11.1 24 12 16.4 12.9 12.9 16.4 12 24 11.1 16.4 7.6 12.9 0 12 7.6 11.1 11.1 7.6 12 0Z" fill="url(#intro-chrome)" stroke="#ff3ec8" strokeWidth=".3" />
        </svg>
      </div>
      <h1 className="intro-title chrome-text">
        streetwear
        <br />
        tycoon
      </h1>
    </div>
  );
}
