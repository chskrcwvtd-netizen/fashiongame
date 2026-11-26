import { useEffect, useState } from 'react';
import {
  ECON,
  activeDrop,
  dropDemand,
  fairPrice,
  getDesign,
  postTeaser,
  scheduleDrop,
  teaserCost,
  unitsReadyBy,
} from '../../engine';
import { GarmentPreview } from '../components/GarmentPreview';
import { NumberField } from '../components/NumberField';
import { money, useGame } from '../hooks';

function Outlook({ demand, units }: { demand: number; units: number }) {
  const r = demand / Math.max(1, units);
  const [label, tone] = r > 1.6 ? ['Sell-out written all over it', 'good'] : r > 1.05 ? ['Could sell out', 'good'] : r > 0.6 ? ['Risky, might not clear', 'warn'] : ['Likely flop at this price', 'bad'];
  return <span className={`outlook tone-${tone}`} data-testid="drop-outlook">{label}</span>;
}

function ActiveDrop() {
  const { store, s } = useGame();
  const drop = activeDrop(s)!;
  const d = getDesign(s, drop.designId)!;
  const left = Math.max(0, drop.dropDay - s.day);
  const projected = dropDemand(s, drop);
  const cost = teaserCost(s);
  const teasedToday = s.lastTeaserDay === s.day;
  return (
    <div className="drop-live card" data-testid="drop-live">
      <div className="drop-live-art">
        <GarmentPreview design={d} logo={s.brand.logo} size={220} />
      </div>
      <div className="drop-live-info">
        <p className="countdown" data-testid="drop-countdown">
          {left === 0 ? 'Dropping today' : `${left} ${left === 1 ? 'day' : 'days'} to go`}
        </p>
        <h3>{d.name}</h3>
        <p className="muted">
          {drop.units} units at {money(drop.price)}
          {drop.postponements ? `, postponed ${drop.postponements}×` : ''}
        </p>
        <div className="hype-big">
          <span className="hype-label">Drop hype</span>
          <span className="hype-track">
            <span style={{ width: `${drop.hype}%` }} />
          </span>
          <strong>{Math.round(drop.hype)}</strong>
        </div>
        <Outlook demand={projected} units={drop.units} />
        <p className="muted small">Hype builds by itself for about a week, then starts to cool. Teasers push it up faster.</p>
        <button
          className="btn btn-primary"
          disabled={teasedToday || s.cash < cost}
          onClick={() => store.act(postTeaser, { sound: 'dropAnnounce', feed: `Teaser posted for ${d.name}.` })}
          data-testid="post-teaser"
        >
          {teasedToday ? 'Teased today, back tomorrow' : `Post a teaser for ${money(cost)}`}
        </button>
      </div>
    </div>
  );
}

function PlanDrop() {
  const { store, s } = useGame();
  const candidates = s.designs.filter((d) => unitsReadyBy(s, d.id, s.day + ECON.dropMaxDays) > 0);
  const preferred = store.selectedDesignId && candidates.some((c) => c.id === store.selectedDesignId) ? store.selectedDesignId : candidates[candidates.length - 1]?.id;
  const [designId, setDesignId] = useState<string | undefined>(preferred);
  const [days, setDays] = useState(7);
  const design = designId ? getDesign(s, designId) : undefined;
  const ready = design ? unitsReadyBy(s, design.id, s.day + days) : 0;
  const quality = design ? s.inventory[design.id]?.quality ?? 50 : 50;
  const fair = design ? fairPrice(s, design, quality) : 50;
  const [units, setUnits] = useState(Math.min(50, ready));
  const [price, setPrice] = useState(Math.round(fair * 1.2));
  useEffect(() => {
    if (!designId && preferred) setDesignId(preferred);
  }, [designId, preferred]);
  useEffect(() => setUnits((u) => Math.max(1, Math.min(u || Math.min(50, ready), ready))), [ready]);
  useEffect(() => setPrice(Math.round(fair * 1.2)), [designId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!design) {
    return (
      <div className="empty card">
        <p>You need stock for a drop. Order a batch first; stock that lands before drop day counts.</p>
        <button className="btn btn-primary" onClick={() => store.setPanel('production')}>
          Go to factories
        </button>
      </div>
    );
  }
  // Rough projection: assume hype grows to what a week of buzz gives.
  const expectHype = Math.min(85, s.hype * 0.6 + 5 + Math.min(days, 8) * 4);
  const projected = dropDemand(s, { designId: design.id, price, hype: expectHype });

  return (
    <div className="drop-plan card" data-testid="drop-plan">
      <div className="drop-plan-art">
        <GarmentPreview design={design} logo={s.brand.logo} size={220} />
      </div>
      <div className="drop-plan-form">
        <div className="field">
          <label>Piece</label>
          <select className="input" value={design.id} onChange={(e) => setDesignId(e.target.value)} data-testid="drop-design">
            {candidates.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Units for the drop: {units} of {ready} ready</label>
          <input type="range" min={1} max={Math.max(1, ready)} value={units} onChange={(e) => setUnits(Number(e.target.value))} data-testid="drop-units" />
        </div>
        <div className="field">
          <label>Drop price</label>
          <div className="row">
            <NumberField className="price-input" value={price} min={1} max={ECON.maxListingPrice} onCommit={setPrice} testid="drop-price" label="Drop price" />
            <span className="muted small">Webshop fair price is about {money(fair)}. Scarcity lets drops charge more.</span>
          </div>
        </div>
        <div className="field">
          <label>Drops in {days} days</label>
          <input type="range" min={ECON.dropMinDays} max={ECON.dropMaxDays} value={days} onChange={(e) => setDays(Number(e.target.value))} data-testid="drop-days" />
          <span className="muted small">About a week is the sweet spot. Longer and people lose interest.</span>
        </div>
        <div className="row spread">
          <Outlook demand={projected} units={units} />
          <button
            className="btn btn-primary btn-big"
            data-testid="announce-drop"
            onClick={() => {
              const r = store.act((st) => scheduleDrop(st, { designId: design.id, units, price, daysAhead: days }), {
                sound: 'dropAnnounce',
                feed: `Drop announced: ${units}× ${design.name} at ${money(price)} in ${days} days.`,
                toast: 'Drop announced. Build the hype.',
              });
              void r;
            }}
          >
            Announce drop
          </button>
        </div>
      </div>
    </div>
  );
}

export function DropsPanel() {
  const { s } = useGame();
  const drop = activeDrop(s);
  const past = s.drops.filter((d) => d.status === 'done').slice(-8).reverse();
  return (
    <div className="panel drops" data-testid="panel-drops">
      <h2 className="display">drops</h2>
      {drop ? <ActiveDrop /> : <PlanDrop />}
      {past.length > 0 && (
        <section className="card">
          <h3>Past drops</h3>
          <ul className="past-drops">
            {past.map((p) => (
              <li key={p.id} className={`tone-${p.result?.outcome === 'flop' ? 'bad' : 'good'}`}>
                <strong>{getDesign(s, p.designId)?.name}</strong>
                <span>{p.result?.outcome === 'soldout' ? `Sold out in ${p.result.minutes} min` : p.result?.outcome === 'solid' ? 'Solid' : 'Flop'}</span>
                <span>
                  {p.result?.sold}/{p.units} sold
                </span>
                <span className="money">{money(p.result?.revenue ?? 0)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
