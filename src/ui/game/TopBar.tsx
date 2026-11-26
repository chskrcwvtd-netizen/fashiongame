import { COLORS, dateInfo, graceDaysLeft, type Speed } from '../../engine';
import { EmblemIcon } from '../components/Emblem';
import { Wordmark } from '../components/Logo';
import { count, money, useGame } from '../hooks';
import { sfx } from '../../audio/sfx';

const SPEEDS: { s: Speed; label: string; title: string }[] = [
  { s: 0, label: '❚❚', title: 'Pause (Space)' },
  { s: 1, label: '1x', title: 'Normal speed (1)' },
  { s: 2, label: '2x', title: 'Fast (2)' },
  { s: 4, label: '4x', title: 'Fastest (3)' },
];

function Meter({ value, tone, label, testid }: { value: number; tone: 'pink' | 'cyan'; label: string; testid: string }) {
  return (
    <div className="meter" title={`${label}: ${Math.round(value)}/100`} data-testid={testid}>
      <span className="meter-label">{label}</span>
      <span className={`meter-track meter-${tone}`}>
        <span className="meter-fill" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </span>
      <span className="meter-num">{Math.round(value)}</span>
    </div>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { store, s } = useGame();
  const d = dateInfo(s.day);
  const grace = graceDaysLeft(s);
  return (
    <header className="topbar">
      <div className="brandmark">
        <EmblemIcon id={s.brand.logo.glyph} color={COLORS[s.brand.logo.color]?.hex ?? '#fff'} size={34} badge={s.brand.logo.badge} />
        <Wordmark name={s.brand.name} logo={s.brand.logo} className="brandmark-name" />
      </div>

      <div className="cash-wrap">
        <div className={`cash ${s.cash < 0 ? 'cash-neg' : ''}`} data-testid="cash" title="Cash">
          {money(s.cash, true)}
        </div>
        {store.floaters.map((f) => (
          <span key={f.id} className="floater" aria-hidden="true">
            +{money(f.amount, true)}
          </span>
        ))}
      </div>

      {grace !== null && (
        <div className="overdrawn" data-testid="overdrawn">
          Overdrawn: {grace} {grace === 1 ? 'day' : 'days'} to recover
        </div>
      )}

      <div className="clock" data-testid="date">
        <span className="clock-season">
          {d.season}, year {d.year}
        </span>
        <span className="clock-day">
          Week {d.weekOfSeason}, {d.dayName}
        </span>
        <span className="clock-progress" style={{ width: `${store.dayProgress * 100}%` }} />
      </div>

      <div className="speed" role="group" aria-label="Game speed">
        {SPEEDS.map(({ s: sp, label, title }) => (
          <button
            key={sp}
            className={`speed-btn ${store.speed === sp ? 'on' : ''}`}
            title={title}
            data-testid={`speed-${sp}`}
            onClick={() => {
              sfx.play('click');
              store.setSpeed(sp);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="stats">
        <div className="stat" title="Followers">
          <span className="stat-num" data-testid="followers">{count(s.followers)}</span>
          <span className="stat-label">followers</span>
        </div>
        <Meter value={s.hype} tone="pink" label="Hype" testid="hype" />
        <Meter value={s.reputation} tone="cyan" label="Rep" testid="rep" />
      </div>

      <button className="menu-btn" onClick={onMenu} data-testid="open-menu" title="Menu (Esc)">
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}
