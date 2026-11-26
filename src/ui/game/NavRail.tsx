import type { Panel } from '../../store/gameStore';
import { useGame } from '../hooks';
import { sfx } from '../../audio/sfx';
import { activeDrop } from '../../engine';

const ITEMS: { id: Panel; label: string; icon: string }[] = [
  { id: 'hq', label: 'HQ', icon: 'M3 21V9l9-6 9 6v12h-6v-7H9v7z' },
  { id: 'lab', label: 'Design Lab', icon: 'M12 2l2.4 6.6L21 9l-5 4.3L17.6 21 12 17.3 6.4 21 8 13.3 3 9l6.6-.4z' },
  { id: 'production', label: 'Factories', icon: 'M2 21V10l6 4V10l6 4V4h4v17zM17 7h0' },
  { id: 'shop', label: 'Webshop', icon: 'M4 7h16l-1.5 12h-13zM8 7a4 4 0 0 1 8 0' },
  { id: 'drops', label: 'Drops', icon: 'M13 2L4 14h7l-1 8 9-12h-7z' },
];

const LOCKED = ['Marketing', 'Team', 'Trends'];

export function NavRail() {
  const { store, s } = useGame();
  const drop = activeDrop(s);
  const shipping = s.orders.length;
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
            <path d={it.icon} fill="currentColor" />
          </svg>
          <span>{it.label}</span>
          {it.id === 'drops' && drop && <i className="rail-badge">{Math.max(0, drop.dropDay - s.day)}d</i>}
          {it.id === 'production' && shipping > 0 && <i className="rail-badge">{shipping}</i>}
        </button>
      ))}
      <div className="rail-sep" />
      {LOCKED.map((l) => (
        <div key={l} className="rail-btn locked" title="Arrives in a future update">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M6 10V7a6 6 0 0 1 12 0v3h1v11H5V10zm2 0h8V7a4 4 0 0 0-8 0z" fill="currentColor" />
          </svg>
          <span>{l}</span>
        </div>
      ))}
    </nav>
  );
}
