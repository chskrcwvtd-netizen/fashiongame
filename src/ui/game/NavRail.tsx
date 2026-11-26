import type { Panel } from '../../store/gameStore';
import { useGame } from '../hooks';
import { sfx } from '../../audio/sfx';
import { activeDrop, playerRank } from '../../engine';
import { coachStep } from './Moments';

const ITEMS: { id: Panel; label: string; icon: string }[] = [
  { id: 'hq', label: 'HQ', icon: 'M3 21V9l9-6 9 6v12h-6v-7H9v7z' },
  { id: 'lab', label: 'Design Lab', icon: 'M12 2l2.4 6.6L21 9l-5 4.3L17.6 21 12 17.3 6.4 21 8 13.3 3 9l6.6-.4z' },
  { id: 'production', label: 'Factories', icon: 'M2 21V10l6 4V10l6 4V4h4v17zM17 7h0' },
  { id: 'shop', label: 'Webshop', icon: 'M4 7h16l-1.5 12h-13zM8 7a4 4 0 0 1 8 0' },
  { id: 'drops', label: 'Drops', icon: 'M13 2L4 14h7l-1 8 9-12h-7z' },
  { id: 'trends', label: 'Trends', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
  { id: 'marketing', label: 'Marketing', icon: 'M3 10v4h3l6 5V5L6 10zM16 8a5 5 0 0 1 0 8M18.5 5a9 9 0 0 1 0 14' },
  { id: 'team', label: 'Team', icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 21c0-4 4-7 8-7s8 3 8 7zM17 11a3 3 0 1 0 0-6M19 14c2 1 4 3 4 7h-4' },
  { id: 'rivals', label: 'The Chart', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { id: 'wholesale', label: 'Wholesale', icon: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10' },
  { id: 'stats', label: 'Numbers', icon: 'M3 3v18h18M7 14l4-4 3 3 6-6' },
];

const LOCKED = ['World'];
const STROKE = new Set<Panel>(['trends', 'marketing', 'team', 'rivals', 'wholesale', 'stats']);

export function NavRail() {
  const { store, s } = useGame();
  const drop = activeDrop(s);
  const shipping = s.orders.length;
  const rank = playerRank(s);
  const coachPanel = store.tutorial ? (['lab', 'production', 'shop', 'drops', 'hq'] as Panel[])[coachStep(s)] : null;
  return (
    <nav className="rail" aria-label="Screens">
      {ITEMS.map((it) => (
        <button
          key={it.id}
          className={`rail-btn ${store.panel === it.id ? 'on' : ''}`}
          onClick={() => {
            sfx.play('click');
            store.setPanel(it.id);
          }}
          onMouseEnter={() => sfx.play('hover')}
          data-testid={`nav-${it.id}`}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            {STROKE.has(it.id) ? (
              <path d={it.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d={it.icon} fill="currentColor" />
            )}
          </svg>
          <span>{it.label}</span>
          {it.id === 'drops' && drop && <i className="rail-badge">{Math.max(0, drop.dropDay - s.day)}d</i>}
          {it.id === 'production' && shipping > 0 && <i className="rail-badge">{shipping}</i>}
          {it.id === 'team' && s.employees.some((e) => e.mood < 35) && <i className="rail-badge warn">!</i>}
          {it.id === 'wholesale' && s.wholesale.offers.length > 0 && <i className="rail-badge">{s.wholesale.offers.length}</i>}
          {it.id === 'rivals' && <i className="rail-badge rank">#{rank}</i>}
          {store.tutorial && coachPanel === it.id && <i className="coach-ring" aria-hidden="true" />}
        </button>
      ))}
      <div className="rail-sep" />
      {LOCKED.map((l) => (
        <div key={l} className="rail-btn locked" title="Coming in the next update: open shops in London, Paris, Tokyo, LA and Seoul">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M6 10V7a6 6 0 0 1 12 0v3h1v11H5V10zm2 0h8V7a4 4 0 0 0-8 0z" fill="currentColor" />
          </svg>
          <span>{l}</span>
        </div>
      ))}
    </nav>
  );
}
