import { useEffect, useState } from 'react';
import {
  FACTORIES,
  FACTORY_IDS,
  LOCKED_FACTORIES,
  designQuality,
  freeCapacity,
  getDesign,
  orderCost,
  placeOrder,
  unitCost,
  type FactoryId,
} from '../../engine';
import { GarmentPreview } from '../components/GarmentPreview';
import { NumberField } from '../components/NumberField';
import { money, useGame } from '../hooks';
import { sfx } from '../../audio/sfx';

function Dots({ n, of = 5, tone }: { n: number; of?: number; tone: string }) {
  return (
    <span className={`dots dots-${tone}`} aria-label={`${n} of ${of}`}>
      {Array.from({ length: of }).map((_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}

const RATINGS: Record<FactoryId, { price: number; quality: number; speed: number; risk: number }> = {
  fastloop: { price: 5, quality: 1, speed: 5, risk: 4 },
  danube: { price: 3, quality: 3, speed: 3, risk: 1 },
  nord: { price: 1, quality: 5, speed: 1, risk: 0 },
  vela: { price: 1, quality: 4, speed: 4, risk: 1 },
  own: { price: 4, quality: 4, speed: 4, risk: 0 },
};

export function ProductionPanel() {
  const { store, s } = useGame();
  const designId = store.selectedDesignId && getDesign(s, store.selectedDesignId) ? store.selectedDesignId : s.designs[s.designs.length - 1]?.id ?? null;
  const design = designId ? getDesign(s, designId) : undefined;
  const [factory, setFactory] = useState<FactoryId>('danube');
  const f = FACTORIES[factory];
  const space = freeCapacity(s);
  const maxByCash = design ? Math.floor(s.cash / unitCost(s, design, factory)) : 0;
  const max = Math.max(0, Math.min(space, maxByCash, 5000));
  const [qty, setQty] = useState(100);
  useEffect(() => {
    setQty((q) => Math.max(f.minOrder, Math.min(q, Math.max(f.minOrder, max))));
  }, [factory, max, f.minOrder]);

  if (!design) {
    return (
      <div className="panel empty" data-testid="panel-production">
        <h2 className="display">factories</h2>
        <p>Nothing to produce yet. Create a design in the Design Lab first.</p>
        <button className="btn btn-primary" onClick={() => store.setPanel('lab')}>
          Open the Design Lab
        </button>
      </div>
    );
  }

  const cost = orderCost(s, { designId: design.id, factoryId: factory, quantity: qty });
  const canOrder = qty >= f.minOrder && qty <= max;

  return (
    <div className="panel production" data-testid="panel-production">
      <div className="prod-left">
        <h2 className="display">factories</h2>
        <div className="field">
          <label>What to make</label>
          <select className="input" value={design.id} onChange={(e) => store.setPanel('production', e.target.value)} data-testid="production-design">
            {[...s.designs].reverse().map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="prod-preview">
          <GarmentPreview design={design} logo={s.brand.logo} size={200} />
        </div>
      </div>

      <div className="prod-main">
        <div className="factories">
          {FACTORY_IDS.filter((id) => !LOCKED_FACTORIES[id] || s.unlocks.includes(LOCKED_FACTORIES[id]!)).map((id) => {
            const fd = FACTORIES[id];
            const r = RATINGS[id];
            return (
              <button
                key={id}
                className={`factory ${factory === id ? 'on' : ''}`}
                onClick={() => {
                  sfx.play('click');
                  setFactory(id);
                }}
                data-testid={`factory-${id}`}
                aria-pressed={factory === id}
              >
                <strong className="factory-name">{fd.name}</strong>
                <em>{fd.tagline}</em>
                <span className="factory-row">
                  Cheap <Dots n={r.price} tone="acid" />
                </span>
                <span className="factory-row">
                  Quality <Dots n={r.quality} tone="cyan" />
                </span>
                <span className="factory-row">
                  Speed <Dots n={r.speed} tone="cyan" />
                </span>
                <span className="factory-row">
                  Risk <Dots n={r.risk} tone="red" />
                </span>
                <span className="factory-foot">
                  {money(unitCost(s, design, id))} each, quality {designQuality(design, id, s)}, {fd.leadDays} days, min {fd.minOrder}
                </span>
              </button>
            );
          })}
        </div>

        <div className="order-box card">
          <div className="qty">
            <label htmlFor="qty">How many</label>
            <input
              id="qty"
              type="range"
              min={f.minOrder}
              max={Math.max(f.minOrder, max)}
              step={5}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              disabled={max < f.minOrder}
              data-testid="qty-slider"
            />
            <NumberField className="qty-num" value={qty} min={f.minOrder} max={Math.max(f.minOrder, max)} onCommit={setQty} testid="qty-input" label="Quantity" />
          </div>
          <p className="muted small">
            {space} free warehouse spaces. {max < f.minOrder ? (space < f.minOrder ? 'Sell some stock or upgrade your HQ.' : 'Not enough cash for the minimum order.') : `You can afford up to ${maxByCash}.`}
          </p>
          <div className="order-total">
            <span>
              Total <strong>{money(cost)}</strong>
            </span>
            <span className="muted">Arrives in about {f.leadDays} days</span>
          </div>
          <button
            className="btn btn-primary btn-big"
            disabled={!canOrder}
            data-testid="place-order"
            onClick={() =>
              store.act((st) => placeOrder(st, { designId: design.id, factoryId: factory, quantity: qty }), {
                sound: 'arrived',
                feed: `Ordered ${qty}× ${design.name} from ${f.name}.`,
                toast: `Order placed with ${f.name}.`,
              })
            }
          >
            Place order
          </button>
        </div>

        <section className="card">
          <h3>On the way</h3>
          {s.orders.length === 0 ? (
            <p className="muted">No orders in production.</p>
          ) : (
            <ul className="shipments" data-testid="shipments">
              {s.orders.map((o) => {
                const d = getDesign(s, o.designId);
                const total = o.etaDay - o.orderedDay;
                const done = Math.min(1, (s.day - o.orderedDay) / Math.max(1, total));
                return (
                  <li key={o.id}>
                    <span>
                      {o.quantity}× {d?.name} <em className="muted">{FACTORIES[o.factoryId].name}</em>
                    </span>
                    <span className={`bar ${o.delayed ? 'late' : ''}`}>
                      <span style={{ width: `${done * 100}%` }} />
                    </span>
                    <span className="eta">{o.etaDay - s.day <= 0 ? 'today' : `${o.etaDay - s.day}d`}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
