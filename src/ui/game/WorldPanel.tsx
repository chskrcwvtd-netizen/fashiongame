import { BUDAPEST, CITIES, VIBES, audienceCap, cityCost, cityLevel, cityRequirement, expandCity, marketsWeekly, trendPop } from '../../engine';
import { count, money, useGame } from '../hooks';

/** Very rough continent blobs on a 1000×500 board (decorative). */
const LAND = [
  'M110 90 Q180 60 270 90 Q320 120 300 170 Q260 200 230 250 Q200 260 170 230 Q120 200 100 150 Z',
  'M250 270 Q300 260 320 300 Q330 360 300 430 Q270 450 260 400 Q240 340 250 270 Z',
  'M440 100 Q500 80 560 100 Q580 130 560 160 Q520 175 480 165 Q450 150 440 100 Z',
  'M470 190 Q540 180 580 220 Q590 300 550 360 Q520 380 500 330 Q470 270 470 190 Z',
  'M560 80 Q700 60 860 90 Q920 120 880 180 Q820 230 720 220 Q640 210 590 170 Q560 130 560 80 Z',
  'M800 330 Q860 320 900 350 Q900 390 850 400 Q810 390 800 330 Z',
];

export function WorldPanel() {
  const { store, s } = useGame();
  const cap = audienceCap(s);
  return (
    <div className="panel world" data-testid="panel-world">
      <div className="world-head">
        <h2 className="display">the world</h2>
        <p className="muted">
          Your audience can grow to about <strong>{count(cap)}</strong> followers. Every city you ship to or open a store in raises that ceiling, brings visitors, and buys more of the vibes it loves. Cities cost {money(marketsWeekly(s))} a week right now.
        </p>
      </div>
      <div className="map card">
        <svg viewBox="0 0 1000 500" className="map-svg" role="img" aria-label="World map">
          <defs>
            <pattern id="map-grid" width="25" height="25" patternUnits="userSpaceOnUse">
              <path d="M25 0H0V25" fill="none" stroke="rgba(108,242,255,.07)" />
            </pattern>
            <filter id="pin-glow">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <rect width="1000" height="500" fill="url(#map-grid)" />
          {LAND.map((d, i) => (
            <path key={i} d={d} fill="rgba(233,237,245,.06)" stroke="rgba(233,237,245,.18)" />
          ))}
          {CITIES.filter((c) => cityLevel(s, c.id) > 0).map((c) => (
            <path key={`r${c.id}`} d={`M${BUDAPEST.x} ${BUDAPEST.y} Q${(BUDAPEST.x + c.x) / 2} ${Math.min(BUDAPEST.y, c.y) - 60} ${c.x} ${c.y}`} fill="none" stroke="#ff3ec8" strokeWidth="2" strokeDasharray="6 6" className="route" />
          ))}
          <g>
            <circle cx={BUDAPEST.x} cy={BUDAPEST.y} r="14" fill="#d4ff3a" filter="url(#pin-glow)" />
            <circle cx={BUDAPEST.x} cy={BUDAPEST.y} r="6" fill="#d4ff3a" />
            <text x={BUDAPEST.x + 12} y={BUDAPEST.y + 22} className="map-label">
              Budapest
            </text>
          </g>
          {CITIES.map((c) => {
            const lvl = cityLevel(s, c.id);
            const col = lvl === 2 ? '#ff3ec8' : lvl === 1 ? '#6cf2ff' : 'rgba(233,237,245,.5)';
            return (
              <g key={c.id}>
                {lvl > 0 && <circle cx={c.x} cy={c.y} r="16" fill={col} filter="url(#pin-glow)" />}
                <circle cx={c.x} cy={c.y} r={lvl === 2 ? 8 : 6} fill={col} />
                <text x={c.x + 12} y={c.y - 10} className="map-label">
                  {c.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="city-grid">
        {CITIES.map((c) => {
          const lvl = cityLevel(s, c.id);
          const req = cityRequirement(s, c);
          const cost = cityCost(s, c);
          return (
            <section key={c.id} className={`card city lvl-${lvl}`} data-testid={`city-${c.id}`}>
              <h3>{c.name}</h3>
              <p className="muted small">{c.blurb}</p>
              <p className="small">
                Loves{' '}
                {c.vibes.map((v, i) => (
                  <span key={v}>
                    <strong className={trendPop(s, 'vibe', v) > 0.7 ? 'hot-word' : ''}>{VIBES[v].name}</strong>
                    {i < c.vibes.length - 1 ? ' and ' : ''}
                  </span>
                ))}
              </p>
              {lvl === 2 && (
                <svg viewBox="0 0 200 90" className="storefront" aria-hidden="true">
                  <rect width="200" height="90" fill="#141221" />
                  <rect x="10" y="30" width="180" height="60" fill="#0b1426" stroke="#c4cad6" strokeWidth="3" />
                  <rect x="80" y="45" width="40" height="45" fill="#1c1829" stroke="#c4cad6" strokeWidth="2" />
                  <text x="100" y="22" textAnchor="middle" fontFamily="'Unbounded', sans-serif" fontWeight={800} fontSize="15" fill="none" stroke="#ff3ec8" strokeWidth="1">
                    {s.brand.name}
                  </text>
                  <text x="100" y="84" textAnchor="middle" fontFamily="'Chakra Petch', sans-serif" fontSize="9" fill="#6cf2ff">
                    {c.name.toUpperCase()}
                  </text>
                </svg>
              )}
              <p className="city-status">{lvl === 2 ? 'Your store is open' : lvl === 1 ? 'Shipping here' : 'Not here yet'}</p>
              {lvl < 2 && (
                <>
                  <button
                    className="btn btn-primary"
                    disabled={!!req || s.cash < cost}
                    onClick={() =>
                      store.act((st) => expandCity(st, c.id), {
                        sound: 'upgrade',
                        toast: lvl === 0 ? `Now shipping to ${c.name}.` : `Store open in ${c.name}.`,
                        feed: lvl === 0 ? `${s.brand.name} now ships to ${c.name}.` : `${s.brand.name} opened a store in ${c.name}.`,
                      })
                    }
                    data-testid={`expand-${c.id}`}
                  >
                    {lvl === 0 ? `Ship there for ${money(cost)}` : `Open a store for ${money(cost)}`}
                  </button>
                  <span className="muted small">
                    {req ?? `Then ${money(lvl === 0 ? c.shipWeekly : c.storeRent)} a week. Adds room for ${count(lvl === 0 ? c.capShip : c.capStore)} followers.`}
                  </span>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
