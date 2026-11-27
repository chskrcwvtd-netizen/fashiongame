import {
  FUNDING_ROUNDS,
  PRODUCT_LINES,
  STAGE4,
  acquireBlocker,
  acquireRival,
  acquirePrice,
  brandValue,
  canIpo,
  dateInfo,
  goPublic,
  lineCost,
  netWorth,
  nextRound,
  raiseRound,
  rivalValue,
  sharePriceNow,
  unlockLine,
  LOAN_SIZES,
  OWN_FACTORY,
  buildOwnFactory,
  maxLoan,
  ownFactoryCost,
  sharePrice1pct,
  sustainabilityCost,
  takeLoan,
  toggleSustainability,
  tradeShares,
} from '../../engine';
import { EmblemIcon } from '../components/Emblem';
import { GarmentPreview } from '../components/GarmentPreview';
import { money, useGame } from '../hooks';

function PriceChart({ series }: { series: number[] }) {
  const v = series.slice(-52);
  if (v.length < 2) return <p className="muted small">The share price chart fills in week by week.</p>;
  const max = Math.max(...v);
  const min = Math.min(...v);
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * 400},${110 - ((x - min) / Math.max(0.01, max - min)) * 100}`).join(' ');
  const up = v[v.length - 1] >= v[0];
  return (
    <svg viewBox="0 0 400 114" preserveAspectRatio="none" className="price-chart">
      <polyline points={pts} fill="none" stroke={up ? '#d4ff3a' : '#ff4057'} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function EmpirePanel() {
  const { store, s } = useGame();
  const value = brandValue(s);
  const round = nextRound(s);
  const c = s.corporate;
  const ipoBlock = canIpo(s);
  return (
    <div className="panel empire" data-testid="panel-empire">
      <div className="empire-head">
        <h2 className="display">empire</h2>
        <div className="empire-kpis">
          <div className="kpi">
            <span className="kpi-num">{money(value, true)}</span>
            <span className="kpi-label">brand value</span>
          </div>
          <div className="kpi">
            <span className="kpi-num">{c.ownership}%</span>
            <span className="kpi-label">you own</span>
          </div>
          <div className="kpi">
            <span className="kpi-num money">{money(netWorth(s), true)}</span>
            <span className="kpi-label">your net worth</span>
          </div>
        </div>
      </div>

      <section className="card">
        <h3>New product lines</h3>
        <div className="lines">
          {PRODUCT_LINES.map((l) => {
            const owned = s.unlocks.includes(l.id);
            const cost = lineCost(s, l.id);
            return (
              <div key={l.id} className={`line ${owned ? 'owned' : ''}`} data-testid={`line-${l.id}`}>
                <GarmentPreview
                  design={{ name: l.name, garment: l.garment, primary: 'black', secondary: 'pink', pattern: 'solid', graphic: 'emblem', emblem: 'logo', text: '', font: 'chrome', material: 'standard', vibe: 'y2k', finish: 'print', back: 'none', backText: '' }}
                  logo={s.brand.logo}
                  size={90}
                />
                <strong>{l.name}</strong>
                <span className="muted small">{l.blurb}</span>
                {owned ? (
                  <span className="owned-tag">In the Design Lab</span>
                ) : (
                  <button className="btn" disabled={s.cash < cost || s.hqLevel < 1} onClick={() => store.act((st) => unlockLine(st, l.id), { sound: 'upgrade', toast: `${l.name} unlocked. Find them in the Design Lab.`, feed: `${s.brand.name} now makes ${l.name.toLowerCase()}.` })} data-testid={`unlock-${l.id}`}>
                    Start for {money(cost)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="empire-grid">
        <section className="card">
          <h3>Buy a rival</h3>
          <p className="muted small">Once you are worth 1.5× a brand, you can buy it for 60% of its value. You get half its followers and 30% of its sales every week.</p>
          <ul className="deal-list">
            {s.rivals.map((r) => {
              const block = acquireBlocker(s, r.id);
              return (
                <li key={r.id} className={block ? 'locked' : ''}>
                  <span className="row">
                    <EmblemIcon id={r.glyph} color={r.color} size={24} />
                    <span>
                      <strong>{r.name}</strong>
                      <span className="muted small"> worth {money(rivalValue(r), true)}</span>
                    </span>
                  </span>
                  <button className="btn" disabled={!!block} title={block ?? ''} onClick={() => store.act((st) => acquireRival(st, r.id), { sound: 'milestone', toast: `${r.name} is yours.`, feed: `${s.brand.name} bought ${r.name}.` })} data-testid={`buy-${r.id}`}>
                    Buy for {money(acquirePrice(s, r.id), true)}
                  </button>
                </li>
              );
            })}
          </ul>
          {c.subsidiaries.length > 0 && (
            <p className="small">
              You own: {c.subsidiaries.map((x) => x.name).join(', ')}. They bring in {money(c.subsidiaries.reduce((a, x) => a + x.weeklyIncome, 0), true)} a week.
            </p>
          )}
        </section>

        <section className="card">
          <h3>Investors</h3>
          {c.ipo ? (
            <p className="muted small">You are public now. Private rounds are over.</p>
          ) : round ? (
            <>
              <p>
                <strong>{round.name}:</strong> {money(round.amount, true)} for {round.pct}% of the company. Needs a brand worth {money(round.minValue, true)}.
              </p>
              <p className="muted small">Investors expect your value to grow 60% within a year. Miss it and the board gets loud.</p>
              <button className="btn btn-primary" disabled={value < round.minValue || !!c.target} onClick={() => store.act(raiseRound, { sound: 'cash', toast: `${round.name} closed.`, feed: `${s.brand.name} raised ${money(round.amount, true)}.` })} data-testid="raise-round">
                Take the money
              </button>
            </>
          ) : (
            <p className="muted small">All private rounds done.</p>
          )}
          {c.target && (
            <p className="small target">
              Target: {money(c.target.value, true)} by {dateInfo(c.target.byDay).season}, year {dateInfo(c.target.byDay).year}. Now {Math.round((value / c.target.value) * 100)}% there.
            </p>
          )}
          <p className="muted small">Rounds taken: {c.rounds.length ? c.rounds.map((id) => FUNDING_ROUNDS.find((r) => r.id === id)?.name).join(', ') : 'none'}.</p>
        </section>

        <section className="card">
          <h3>Stock market</h3>
          {c.ipo ? (
            <>
              <p className="big-num">${sharePriceNow(s).toFixed(2)}</p>
              <p className="muted small">Share price. It follows your brand value and how investors feel after each quarterly report.</p>
              <PriceChart series={c.sharePrice} />
              <div className="row">
                <button className="btn" onClick={() => store.act((st) => tradeShares(st, true), { toast: 'Bought back 1%.' })} data-testid="buy-shares">
                  Buy 1% for {money(sharePrice1pct(s), true)}
                </button>
                <button className="btn btn-ghost" onClick={() => store.act((st) => tradeShares(st, false), { sound: 'cash', toast: 'Sold 1%.' })} data-testid="sell-shares">
                  Sell 1%
                </button>
              </div>
            </>
          ) : (
            <>
              <p>Go public: sell {Math.round(STAGE4.ipoFloat * 100)}% of the company on the stock market for about {money(value * STAGE4.ipoFloat, true)}.</p>
              <button className="btn btn-primary" disabled={!!ipoBlock} title={ipoBlock ?? ''} onClick={() => store.act(goPublic, { sound: 'milestone', toast: 'You rang the bell. The brand is public.', feed: `${s.brand.name} went public.` })} data-testid="go-public">
                Ring the bell
              </button>
              {ipoBlock && <p className="muted small">{ipoBlock}</p>}
            </>
          )}
        </section>
      </div>

      <div className="empire-grid">
        <section className="card" data-testid="loans-card">
          <h3>Bank loans</h3>
          <p className="muted small">Cash now, paid back over 26 weeks with 25% interest. The bank lends up to {money(maxLoan(s), true)} to a brand your size.</p>
          <div className="row">
            {LOAN_SIZES.map((a) => (
              <button key={a} className="btn" disabled={a > maxLoan(s) || (s.loans ?? []).length >= 3} onClick={() => store.act((st) => takeLoan(st, a), { sound: 'cash', toast: `Loan of ${money(a, true)} in the bank.` })} data-testid={`loan-${a}`}>
                {money(a, true)}
              </button>
            ))}
          </div>
          {(s.loans ?? []).map((l) => (
            <p key={l.id} className="small">
              {l.emergency ? 'Emergency loan' : 'Loan'} of {money(l.principal, true)}: {money(l.weekly)} a week, {l.weeksLeft} weeks left.
            </p>
          ))}
        </section>
        <section className="card">
          <h3>Your own factory</h3>
          {s.unlocks.includes('own_factory') ? (
            <p className="small">Built. Pick "Your Own Factory" in Factories: cheaper, better and never late.</p>
          ) : (
            <>
              <p className="muted small">Cheaper and better than anyone else, never late, no scandals. Costs {money(OWN_FACTORY.weekly)} a week to run.</p>
              <button className="btn" disabled={s.cash < ownFactoryCost(s) || s.hqLevel < 2} onClick={() => store.act(buildOwnFactory, { sound: 'upgrade', toast: 'Your factory is open.' })} data-testid="build-factory">
                Build for {money(ownFactoryCost(s), true)}
              </button>
            </>
          )}
        </section>
        <section className="card">
          <h3>Sustainability programme</h3>
          <p className="muted small">Recycled packaging and fair wages. Costs about {money(sustainabilityCost(s))} a week, slowly builds reputation.</p>
          <label className="check">
            <input type="checkbox" checked={!!s.sustainability} onChange={() => store.act(toggleSustainability)} data-testid="sustainability" />
            Running
          </label>
        </section>
      </div>
    </div>
  );
}
