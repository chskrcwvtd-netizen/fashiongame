import {
  ECON,
  availableUnits,
  dailyVisitors,
  expectedDailySales,
  fairPrice,
  getDesign,
  reservedUnits,
  setListing,
  type Design,
} from '../../engine';
import { GarmentPreview } from '../components/GarmentPreview';
import { NumberField } from '../components/NumberField';
import { count, money, useGame } from '../hooks';

function MiniBars({ values }: { values: number[] }) {
  const v = values.slice(-14);
  const max = Math.max(1, ...v);
  return (
    <svg viewBox="0 0 70 24" className="minibars" aria-label="Sales over the last two weeks">
      {v.map((x, i) => (
        <rect key={i} x={i * 5} y={24 - (x / max) * 22} width="3.5" height={(x / max) * 22 + 0.5} fill="#d4ff3a" opacity={0.4 + (i / v.length) * 0.6} />
      ))}
    </svg>
  );
}

function Row({ d }: { d: Design }) {
  const { store, s } = useGame();
  const lot = s.inventory[d.id];
  const listing = s.listings[d.id];
  const quality = lot?.quality ?? 50;
  const fair = fairPrice(s, d, quality);
  const price = listing?.price ?? Math.round(fair * 0.95);
  const avail = availableUnits(s, d.id);
  const reserved = Math.min(lot?.units ?? 0, reservedUnits(s, d.id));
  const exp = expectedDailySales(s, d.id, price);
  const active = !!listing?.active;
  const setPrice = (p: number) => store.act((st) => setListing(st, d.id, p, active));
  const ratio = price / fair;
  const hint = ratio > 1.3 ? 'Way too pricey' : ratio > 1.08 ? 'A bit pricey' : ratio < 0.75 ? 'Giving it away' : 'Fair price';

  return (
    <li className={`shop-row ${active ? 'live' : ''}`} data-testid={`shop-row-${d.id}`}>
      <GarmentPreview design={d} logo={s.brand.logo} size={70} />
      <div className="shop-name">
        <strong>{d.name}</strong>
        <span className="muted small">
          {avail} in stock{reserved ? `, ${reserved} held for a drop` : ''}, quality {quality}
        </span>
      </div>
      <div className="shop-price">
        <button className="step" onClick={() => setPrice(price - 5)} aria-label="Lower price by 5">
          −
        </button>
        <NumberField className="price-input" value={price} min={1} max={ECON.maxListingPrice} onCommit={setPrice} testid={`price-${d.id}`} label="Price" />
        <button className="step" onClick={() => setPrice(price + 5)} aria-label="Raise price by 5">
          +
        </button>
        <span className={`hint ${ratio > 1.08 ? 'warn' : ''}`}>
          {hint}. Customers expect about {money(fair)}.
        </span>
      </div>
      <div className="shop-sales">
        <span>
          {active && avail > 0 ? `≈ ${exp < 10 ? exp.toFixed(1) : Math.round(exp)} a day` : active ? 'Sold out' : 'Not listed'}
        </span>
        <span className="muted small">{listing?.soldWeek ?? 0} sold this week</span>
        {listing && <MiniBars values={listing.history} />}
      </div>
      <button
        className={`btn ${active ? 'btn-ghost' : 'btn-primary'}`}
        data-testid={`list-${d.id}`}
        onClick={() =>
          store.act((st) => setListing(st, d.id, price, !active), {
            feed: active ? `${d.name} pulled from the webshop.` : `${d.name} is live in the webshop at ${money(price)}.`,
          })
        }
        disabled={!active && (lot?.units ?? 0) === 0}
      >
        {active ? 'Unlist' : 'List it'}
      </button>
    </li>
  );
}

export function ShopPanel() {
  const { store, s } = useGame();
  const rows = s.designs.filter((d) => (s.inventory[d.id]?.units ?? 0) > 0 || s.listings[d.id]);
  const sorted = [...rows].sort((a, b) => (getDesign(s, b.id)?.createdDay ?? 0) - (getDesign(s, a.id)?.createdDay ?? 0));
  return (
    <div className="panel shop" data-testid="panel-shop">
      <div className="shop-head">
        <h2 className="display">webshop</h2>
        <p className="muted">
          About {count(dailyVisitors(s))} visitors a day. More followers and hype bring more. The shop keeps {Math.round(ECON.platformCut * 100)}% of each sale plus {money(ECON.platformFeeWeekly)} a week.
        </p>
      </div>
      {sorted.length === 0 ? (
        <div className="empty card">
          <p>Nothing in stock yet. Order a batch from a factory and it shows up here when it arrives.</p>
          <button className="btn btn-primary" onClick={() => store.setPanel('production')}>
            Go to factories
          </button>
        </div>
      ) : (
        <ul className="shop-list">
          {sorted.map((d) => (
            <Row key={d.id} d={d} />
          ))}
        </ul>
      )}
    </div>
  );
}
