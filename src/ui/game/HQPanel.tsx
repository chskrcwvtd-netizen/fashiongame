import { HQ_LEVELS, activeDrop, capacity, getDesign, nextHqLevel, stockUnits, incomingUnits, upgradeCost, upgradeHQ, weeklyBillEstimate } from '../../engine';
import { HQScene } from '../components/HQScene';
import { count, money, useGame } from '../hooks';

function Sparkline({ values }: { values: number[] }) {
  const v = values.slice(-12);
  if (v.length < 2) return <p className="muted small">Your weekly revenue chart appears after two weeks.</p>;
  const max = Math.max(1, ...v);
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * 300},${70 - (x / max) * 62}`).join(' ');
  return (
    <svg viewBox="0 0 300 74" preserveAspectRatio="none" className="spark" aria-label="Weekly revenue">
      <polyline points={`0,74 ${pts} 300,74`} fill="rgba(212,255,58,.12)" stroke="none" />
      <polyline points={pts} fill="none" stroke="#d4ff3a" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function HQPanel() {
  const { store, s } = useGame();
  const hq = HQ_LEVELS[s.hqLevel];
  const next = nextHqLevel(s);
  const cost = upgradeCost(s);
  const drop = activeDrop(s);
  const queue = drop && drop.dropDay - s.day <= 1 ? Math.min(12, 3 + Math.round(drop.hype / 10)) : 0;
  const bills = weeklyBillEstimate(s);
  const best = s.stats.bestSellerId ? getDesign(s, s.stats.bestSellerId) : null;
  const lastWeek = s.stats.weeklyRevenue[s.stats.weeklyRevenue.length - 1] ?? 0;
  const used = stockUnits(s) + incomingUnits(s);

  return (
    <div className="panel hq-panel" data-testid="panel-hq">
      <div className="hq-stage">
        <HQScene state={s} queue={queue} />
        <div className="hq-caption">
          <h2 className="display">{hq.name.toLowerCase()}</h2>
          {drop && (
            <p className="hq-drop">
              Drop in {Math.max(0, drop.dropDay - s.day)} {drop.dropDay - s.day === 1 ? 'day' : 'days'}
            </p>
          )}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-num money">{money(s.stats.revenueThisWeek, true)}</span>
          <span className="kpi-label">earned this week</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{money(lastWeek, true)}</span>
          <span className="kpi-label">last week</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{count(s.stats.unitsSold)}</span>
          <span className="kpi-label">pieces sold</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">
            {count(used)} / {count(capacity(s))}
          </span>
          <span className="kpi-label">warehouse</span>
        </div>
        <div className="kpi">
          <span className="kpi-num neg">−{money(bills.total)}</span>
          <span className="kpi-label">bills every Monday</span>
        </div>
        <div className="kpi wide">
          <span className="kpi-num small-num">{best ? best.name : 'Nothing sold yet'}</span>
          <span className="kpi-label">best seller</span>
        </div>
      </div>

      <div className="hq-bottom">
        <section className="card">
          <h3>Weekly revenue</h3>
          <Sparkline values={s.stats.weeklyRevenue} />
        </section>
        <section className="card upgrade" data-testid="upgrade-card">
          {next && cost !== null ? (
            <>
              <h3>Move to the {next.name}</h3>
              <ul className="facts">
                <li>Warehouse {count(next.capacity)} units (now {count(hq.capacity)})</li>
                <li>+{Math.round((next.visitorMult - 1) * 100)}% webshop visitors{next.walkIn ? ', plus walk-in shoppers' : ''}</li>
                <li>Rent {money(next.rent)} per week (now {money(hq.rent)})</li>
              </ul>
              <button
                className="btn btn-primary"
                disabled={s.cash < cost}
                data-testid="upgrade-hq"
                onClick={() => store.act(upgradeHQ, { sound: 'upgrade', toast: `Welcome to the ${next.name}.`, feed: `${s.brand.name} moved into the ${next.name}.` })}
              >
                Upgrade for {money(cost)}
              </button>
            </>
          ) : (
            <>
              <h3>Top floor, for now</h3>
              <p className="muted">The Flagship is the biggest HQ in this version. A Glass Tower is coming.</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
