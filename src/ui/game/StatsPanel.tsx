import { MILESTONES, dateInfo, getDesign, netWorth } from '../../engine';
import { GarmentPreview } from '../components/GarmentPreview';
import { count, money, useGame } from '../hooks';

function LineChart({ series, color, label, format }: { series: number[]; color: string; label: string; format: (n: number) => string }) {
  const v = series.slice(-52);
  if (v.length < 2) return <p className="muted small">{label}: the chart fills in after a couple of weeks.</p>;
  const max = Math.max(1, ...v);
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * 400},${110 - (x / max) * 100}`).join(' ');
  return (
    <div className="linechart">
      <div className="row spread">
        <span className="muted small">{label}</span>
        <strong>{format(v[v.length - 1])}</strong>
      </div>
      <svg viewBox="0 0 400 114" preserveAspectRatio="none">
        <polyline points={`0,114 ${pts} 400,114`} fill={color} opacity=".12" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export function StatsPanel() {
  const { s } = useGame();
  const sold = s.stats.soldByDesign ?? {};
  const top = Object.entries(sold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const drops = s.drops.filter((d) => d.status === 'done');
  const earned = MILESTONES.filter((m) => s.milestones[m.id]);
  return (
    <div className="panel numbers-panel" data-testid="panel-stats">
      <h2 className="display">numbers</h2>
      <div className="stat-cards">
        <div className="kpi">
          <span className="kpi-num money">{money(s.stats.revenue, true)}</span>
          <span className="kpi-label">total revenue</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{count(s.stats.unitsSold)}</span>
          <span className="kpi-label">pieces sold</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">
            {s.stats.dropsSoldOut} / {s.stats.dropsTotal}
          </span>
          <span className="kpi-label">drops sold out</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{money(netWorth(s), true)}</span>
          <span className="kpi-label">your net worth ({s.corporate.ownership}% owned)</span>
        </div>
      </div>

      <div className="charts">
        <section className="card">
          <LineChart series={s.stats.weeklyRevenue} color="#d4ff3a" label="Revenue per week" format={(n) => money(n, true)} />
        </section>
        <section className="card">
          <LineChart series={s.history.followers} color="#ff3ec8" label="Followers" format={count} />
        </section>
        <section className="card">
          <LineChart series={s.history.value} color="#6cf2ff" label="Brand value" format={(n) => money(n, true)} />
        </section>
      </div>

      <div className="stats-bottom">
        <section className="card">
          <h3>Best sellers</h3>
          {top.length === 0 ? (
            <p className="muted">Nothing sold yet.</p>
          ) : (
            <ol className="best">
              {top.map(([id, n]) => {
                const d = getDesign(s, id);
                return d ? (
                  <li key={id}>
                    <GarmentPreview design={d} logo={s.brand.logo} size={46} />
                    <span>{d.name}</span>
                    <strong>{count(n)}</strong>
                  </li>
                ) : null;
              })}
            </ol>
          )}
          {drops.length > 0 && (
            <p className="muted small">
              Best drop: {(() => {
                const b = [...drops].sort((a, z) => (z.result?.revenue ?? 0) - (a.result?.revenue ?? 0))[0];
                return `${getDesign(s, b.designId)?.name ?? ''}, ${money(b.result?.revenue ?? 0)}`;
              })()}
            </p>
          )}
        </section>
        <section className="card trophies" data-testid="trophies">
          <h3>
            Trophy wall: {earned.length} / {MILESTONES.length}
          </h3>
          <ul>
            {MILESTONES.map((m) => {
              const day = s.milestones[m.id];
              return (
                <li key={m.id} className={day ? 'won' : ''} title={m.desc}>
                  <span className="trophy" aria-hidden="true">
                    {day ? '★' : '☆'}
                  </span>
                  <span>
                    <strong>{m.title}</strong>
                    <span className="muted small">
                      {day ? `${dateInfo(day).season}, year ${dateInfo(day).year}. ${m.reward}` : `${m.desc} Prize: ${m.reward}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
