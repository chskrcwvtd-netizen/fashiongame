import { STORES, acceptOffer, availableUnits, declineOffer, eligibleStores, fairPrice, getDesign, storeName, wholesaleUnlocked } from '../../engine';
import { GarmentPreview } from '../components/GarmentPreview';
import { money, useGame } from '../hooks';

export function WholesalePanel() {
  const { store, s } = useGame();
  if (!wholesaleUnlocked(s)) {
    return (
      <div className="panel empty" data-testid="panel-wholesale">
        <h2 className="display">wholesale</h2>
        <p>Shops will want to stock your pieces once you have sold 1,000 of them. Keep going.</p>
        <p className="muted">{s.stats.unitsSold.toLocaleString('en-US')} / 1,000 sold so far.</p>
      </div>
    );
  }
  const owed = s.wholesale.receivables.reduce((a, r) => a + r.amount, 0);
  return (
    <div className="panel wholesale" data-testid="panel-wholesale">
      <div className="ws-head">
        <h2 className="display">wholesale</h2>
        <p className="muted">
          Shops buy in bulk at about half your price and pay a month or so later. Big volume, smaller margin, and sometimes a shop goes bust before paying.
        </p>
      </div>

      <section className="card">
        <h3>Offers on the table</h3>
        {s.wholesale.offers.length === 0 ? (
          <p className="muted">No offers right now. New ones come in on Mondays, if you have stock. {eligibleStores(s).length} of {STORES.length} shops will talk to you at your reputation.</p>
        ) : (
          <ul className="offers">
            {s.wholesale.offers.map((o) => {
              const d = getDesign(s, o.designId);
              if (!d) return null;
              const lot = s.inventory[d.id];
              const enough = availableUnits(s, d.id) >= o.units;
              const unitCost = lot?.unitCost ?? 0;
              const fair = fairPrice(s, d, lot?.quality ?? 50);
              return (
                <li key={o.id} className="offer" data-testid={`offer-${o.id}`}>
                  <GarmentPreview design={d} logo={s.brand.logo} size={64} />
                  <div className="offer-main">
                    <strong>{storeName(o.storeId)}</strong>
                    <span>
                      wants {o.units}× {d.name} at {money(o.unitPrice)} each <span className="muted">(webshop fair price {money(fair)})</span>
                    </span>
                    <span className="muted small">
                      Pays {money(o.units * o.unitPrice)} in {o.payDays} days. Profit about {money(o.units * (o.unitPrice - unitCost))}. Offer ends in {o.expiresDay - s.day} days.
                    </span>
                  </div>
                  <div className="row">
                    <button className="btn btn-primary" disabled={!enough} onClick={() => store.act((st) => acceptOffer(st, o.id), { sound: 'arrived', feed: `Shipped ${o.units}× ${d.name} to ${storeName(o.storeId)}.`, toast: 'Deal. The boxes are on their way.' })} data-testid={`accept-${o.id}`}>
                      {enough ? 'Accept' : 'Not enough stock'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => store.act((st) => declineOffer(st, o.id))}>
                      Decline
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>Waiting to be paid: {money(owed)}</h3>
        {s.wholesale.receivables.length === 0 ? (
          <p className="muted">Nothing owed to you.</p>
        ) : (
          <ul className="receivables">
            {s.wholesale.receivables.map((r) => (
              <li key={r.id}>
                <span>{storeName(r.storeId)}</span>
                <strong>{money(r.amount)}</strong>
                <span className="muted">in {Math.max(0, r.dueDay - s.day)} days</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
