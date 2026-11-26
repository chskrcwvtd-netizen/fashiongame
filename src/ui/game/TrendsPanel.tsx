import {
  COLORS,
  analystHorizon,
  buyTrendReport,
  categoryIds,
  dateInfo,
  displayName,
  forecast,
  trendDelta,
  trendPop,
  trendReportCost,
  upcomingWithin,
  type TrendCategory,
} from '../../engine';
import { money, useGame } from '../hooks';

const CATS: { cat: TrendCategory; label: string }[] = [
  { cat: 'color', label: 'Colours' },
  { cat: 'pattern', label: 'Patterns' },
  { cat: 'garment', label: 'Pieces' },
  { cat: 'vibe', label: 'Vibes' },
];

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 60},${22 - v * 20}`).join(' ');
  return (
    <svg viewBox="0 0 60 24" className="trend-spark" aria-label="Forecast">
      <polyline points={pts} fill="none" stroke="#6cf2ff" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function TrendsPanel() {
  const { store, s } = useGame();
  const reportWeeks = s.trends.reportUntilDay > s.day ? 6 : 0;
  const horizon = Math.max(reportWeeks, analystHorizon(s));
  const fc = horizon > 0 ? forecast(s, horizon) : null;
  const week = dateInfo(s.day).week;
  const coming = horizon > 0 ? upcomingWithin(s, horizon) : [];
  const cost = trendReportCost(s);

  return (
    <div className="panel trends" data-testid="panel-trends">
      <div className="trends-head">
        <h2 className="display">trends</h2>
        <div className="intel card">
          {horizon > 0 ? (
            <p>
              You can see <strong>{horizon} weeks</strong> ahead
              {reportWeeks ? ` (report valid until week ${dateInfo(s.trends.reportUntilDay).weekOfSeason} of ${dateInfo(s.trends.reportUntilDay).season})` : ''}
              {analystHorizon(s) ? `. Your trend analyst keeps watch.` : '.'}
            </p>
          ) : (
            <p className="muted">Everyone can see what is hot now. Only research shows what comes next.</p>
          )}
          <button className="btn btn-primary" onClick={() => store.act(buyTrendReport, { sound: 'notify', toast: 'Trend report in. Six weeks of the future.' })} disabled={s.cash < cost || s.trends.reportUntilDay > s.day + 7} data-testid="buy-report">
            Buy a trend report for {money(cost)}
          </button>
        </div>
      </div>

      {coming.length > 0 && (
        <section className="card coming" data-testid="coming-trends">
          <h3>Coming up</h3>
          <ul>
            {coming.map((c) => (
              <li key={`${c.cat}-${c.id}`}>
                <strong>{displayName(c.cat, c.id)}</strong> <span className="muted">({CATS.find((x) => x.cat === c.cat)?.label.toLowerCase()})</span> starts catching on in about{' '}
                {Math.max(1, c.week - week)} {c.week - week === 1 ? 'week' : 'weeks'}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="trend-grid">
        {CATS.map(({ cat, label }) => {
          const ids = [...categoryIds(cat)].sort((a, b) => trendPop(s, cat, b) - trendPop(s, cat, a));
          return (
            <section key={cat} className="card trend-col">
              <h3>{label}</h3>
              <ul>
                {ids.map((id) => {
                  const pop = trendPop(s, cat, id);
                  const d = trendDelta(s, cat, id);
                  const dir = d > 0.02 ? 'up' : d < -0.02 ? 'down' : 'flat';
                  return (
                    <li key={id} className={`trend-row ${pop > 0.75 ? 'hot' : ''}`}>
                      <span className="trend-name">
                        {cat === 'color' && <i className="dot" style={{ background: COLORS[id].hex }} />}
                        {displayName(cat, id)}
                      </span>
                      <span className="trend-bar">
                        <span style={{ width: `${pop * 100}%` }} />
                      </span>
                      <span className={`trend-dir ${dir}`} title={dir === 'up' ? 'Rising' : dir === 'down' ? 'Fading' : 'Steady'}>
                        {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'}
                      </span>
                      {fc && <Spark values={[pop, ...fc[cat][id]]} />}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
