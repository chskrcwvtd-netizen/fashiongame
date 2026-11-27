import { useEffect, useState } from 'react';
import {
  ECON,
  activeDrop,
  botShieldCost,
  freeCapacity,
  dropDemand,
  fairPrice,
  getDesign,
  postTeaser,
  scheduleDrop,
  teaserCost,
  unitsReadyBy,
  type Design,
  type DropItem,
} from '../../engine';
import { GarmentPreview } from '../components/GarmentPreview';
import { NumberField } from '../components/NumberField';
import { money, useGame } from '../hooks';

function Outlook({ demand, units, collection }: { demand: number; units: number; collection?: boolean }) {
  const r = demand / Math.max(1, units);
  const [label, tone] = r > 1.6 ? ['Sell-out written all over it', 'good'] : (collection ? r >= 1 : r > 1.05) ? ['Could sell out', 'good'] : r > 0.6 ? ['Risky, might not clear', 'warn'] : ['Likely flop at this price', 'bad'];
  return <span className={`outlook tone-${tone}`} data-testid="drop-outlook">{label}</span>;
}

function ActiveDrop() {
  const { store, s } = useGame();
  const drop = activeDrop(s)!;
  const d = getDesign(s, drop.designId)!;
  const partner = s.rivals.find((rival) => rival.id === s.rivalCollab);
  const name = drop.name ?? d.name;
  const left = Math.max(0, drop.dropDay - s.day);
  const items = drop.items;
  const projected = items
    ? items.reduce((sum, item) => sum + Math.min(item.units, dropDemand(s, { ...drop, ...item }) / Math.sqrt(items.length)), 0)
    : dropDemand(s, drop);
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
        <h3>{name}</h3>
        {partner && <p className="drop-partner">In collaboration with {partner.name}</p>}
        <p className="muted">
          {drop.units} units {drop.items ? `across ${drop.items.length} pieces` : `at ${money(drop.price)}`}
          {drop.postponements ? `, postponed ${drop.postponements}×` : ''}
        </p>
        {drop.items && <ul className="collection-summary">
          {drop.items.map((item) => (
            <li key={item.designId}>{getDesign(s, item.designId)?.name} · {item.units} × {money(item.price)}</li>
          ))}
        </ul>}
        <div className="hype-big">
          <span className="hype-label">Drop hype</span>
          <span className="hype-track">
            <span style={{ width: `${drop.hype}%` }} />
          </span>
          <strong>{Math.round(drop.hype)}</strong>
        </div>
        <Outlook demand={projected} units={drop.units} collection={!!items} />
        <p className="muted small">Hype builds by itself for about a week, then starts to cool. Teasers push it up faster.</p>
        <button
          className="btn btn-primary"
          disabled={teasedToday || s.cash < cost}
          onClick={() => store.act(postTeaser, { sound: 'dropAnnounce', feed: `Teaser posted for ${name}.` })}
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
  const [opts, setOpts] = useState({ numbered: false, preorder: false, raffle: false, botShield: false });
  const candidates = s.designs;
  const stocked = candidates.filter((piece) => unitsReadyBy(s, piece.id, s.day + ECON.dropMaxDays) > 0);
  const groups = new Map<string, Design[]>();
  for (const piece of candidates) {
    if (!piece.collection) continue;
    const group = groups.get(piece.collection) ?? [];
    group.push(piece);
    groups.set(piece.collection, group);
  }
  const collections = [...groups].filter(([, pieces]) => pieces.length > 1).map(([name]) => name);
  const [name, setName] = useState('');
  const [extras, setExtras] = useState<DropItem[]>([]);
  const [adding, setAdding] = useState('');
  const [savedCollection, setSavedCollection] = useState('');
  const preferred = store.selectedDesignId && candidates.some((c) => c.id === store.selectedDesignId) ? store.selectedDesignId : (stocked.at(-1) ?? candidates.at(-1))?.id;
  const [designId, setDesignId] = useState<string | undefined>(preferred);
  const [days, setDays] = useState(7);
  const design = candidates.find((piece) => piece.id === designId) ?? candidates.find((piece) => piece.id === preferred);
  const ready = design ? unitsReadyBy(s, design.id, s.day + days) : 0;
  const maxUnits = Math.max(1, Math.min(opts.numbered ? 100 : Infinity, opts.preorder ? ready + freeCapacity(s) : ready));
  const quality = design ? s.inventory[design.id]?.quality ?? 50 : 50;
  const fair = design ? fairPrice(s, design, quality) : 50;
  const [units, setUnits] = useState(Math.min(50, ready));
  const [price, setPrice] = useState(Math.round(fair * 1.2));
  useEffect(() => {
    if (!designId && preferred) setDesignId(preferred);
  }, [designId, preferred]);
  useEffect(() => setUnits((u) => Math.max(1, Math.min(u || Math.min(50, ready), maxUnits))), [ready, maxUnits]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setPrice(Math.round(fair * 1.2)), [designId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!design) {
    return (
      <div className="empty card">
        <p>Save a design first. A collection drop releases two or more designs together.</p>
        <button className="btn btn-primary" onClick={() => store.setPanel('lab')}>
          Open Design Lab
        </button>
      </div>
    );
  }
  // Rough projection: assume hype grows to what a week of buzz gives.
  const expectHype = Math.min(85, s.hype * 0.6 + 5 + Math.min(days, 8) * 4);
  const primary = { designId: design.id, units, price };
  const items = [primary, ...extras];
  const total = items.reduce((sum, item) => sum + item.units, 0);
  const projected = items.reduce((sum, item) => {
    const demand = dropDemand(s, { ...item, hype: expectHype, ...opts }) / Math.sqrt(items.length);
    return sum + (extras.length ? Math.min(item.units, demand) : demand);
  }, 0);
  const remaining = candidates.filter((piece) => items.every((item) => item.designId !== piece.id));
  const nextPiece = remaining.find((piece) => piece.id === adding) ?? remaining[0];

  function defaultItem(piece: Design): DropItem {
    return {
      designId: piece.id,
      units: Math.max(1, Math.min(25, unitsReadyBy(s, piece.id, s.day + days))),
      price: Math.round(fairPrice(s, piece, s.inventory[piece.id]?.quality ?? 50) * 1.2),
    };
  }

  function loadCollection(group: string) {
    const [lead, ...pieces] = (groups.get(group) ?? []).map(defaultItem);
    if (!lead || !pieces.length) return;
    setName(group);
    setDesignId(lead.designId);
    setUnits(lead.units);
    setPrice(lead.price);
    setExtras(pieces);
  }

  function editPiece(id: string, change: Partial<DropItem>) {
    setExtras(extras.map((item) => item.designId === id ? { ...item, ...change } : item));
  }

  return (
    <div className="drop-plan card" data-testid="drop-plan">
      <div className="drop-plan-art">
        <GarmentPreview design={design} logo={s.brand.logo} size={220} />
      </div>
      <div className="drop-plan-form">
        {collections.length > 0 && (
          <div className="field">
            <label htmlFor="saved-collection">From Design Lab</label>
            <div className="row collection-add">
              <select id="saved-collection" className="input" value={savedCollection || collections[0]} onChange={(e) => setSavedCollection(e.target.value)}>
                {collections.map((group) => <option value={group} key={group}>{group}</option>)}
              </select>
              <button className="btn" onClick={() => loadCollection(savedCollection || collections[0])} data-testid="load-drop-collection">
                Load collection
              </button>
            </div>
          </div>
        )}
        <div className="field">
          <label>Lead piece</label>
          <select className="input" value={design.id} onChange={(e) => setDesignId(e.target.value)} aria-label="Lead piece" data-testid="drop-design">
            {candidates.filter((piece) => extras.every((item) => item.designId !== piece.id)).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>
            Units for the drop: {units} ({ready} ready{opts.preorder ? ', the rest made after pre-orders' : ''})
          </label>
          <input type="range" min={1} max={maxUnits} value={units} onChange={(e) => setUnits(Number(e.target.value))} data-testid="drop-units" />
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
        <fieldset className="drop-collection">
          <legend>Collection drop</legend>
          {extras.length === 0 && <p className="muted small">Add another design to release all pieces on the same date.</p>}
          {!nextPiece && extras.length === 0 && (
            <button className="link" onClick={() => store.setPanel('lab')}>Design another piece</button>
          )}
          {extras.length > 0 && (
            <label className="field">
              Collection name
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} data-testid="collection-name" />
            </label>
          )}
          {extras.map((item) => {
            const piece = getDesign(s, item.designId)!;
            const ready = unitsReadyBy(s, item.designId, s.day + days);
            return (
              <div className="collection-piece" key={item.designId}>
                <GarmentPreview design={piece} logo={s.brand.logo} size={72} />
                <div>
                  <strong>{piece.name}</strong>
                  <p className="muted small">{ready} ready by drop day</p>
                </div>
                <label className="field">Units
                  <NumberField value={item.units} min={1} max={Math.max(1, opts.preorder ? ready + freeCapacity(s) : ready)} onCommit={(units) => editPiece(item.designId, { units })} label={`Units for ${piece.name}`} />
                </label>
                <label className="field">Price
                  <NumberField value={item.price} min={1} max={ECON.maxListingPrice} onCommit={(price) => editPiece(item.designId, { price })} label={`Price for ${piece.name}`} />
                </label>
                <button className="btn btn-ghost" aria-label={`Remove ${piece.name}`} onClick={() => setExtras(extras.filter((other) => other.designId !== item.designId))}>Remove</button>
              </div>
            );
          })}
          {nextPiece && <div className="row collection-add">
            <select className="input" value={nextPiece.id} onChange={(e) => setAdding(e.target.value)} aria-label="Piece to add">
              {remaining.map((piece) => <option value={piece.id} key={piece.id}>{piece.name}</option>)}
            </select>
            <button className="btn" onClick={() => setExtras([...extras, defaultItem(nextPiece)])} data-testid="add-drop-piece">Add piece</button>
          </div>}
        </fieldset>
        <div className="drop-opts">
          {(
            [
              ['numbered', 'Numbered 1/100', 'Max 100 pieces, collectors pay about 35% more'],
              ['preorder', 'Pre-orders', 'Take 20% up front and make the rest before drop day'],
              ['raffle', 'Raffle', 'Fairer for fans: more buzz, no bots'],
              ['botShield', `Bot protection (${money(botShieldCost(s, total))})`, 'Stops bots grabbing a hot drop'],
            ] as const
          ).map(([k, label, hint]) => (
            <label key={k} className="check" title={hint}>
              <input type="checkbox" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} data-testid={`opt-${k}`} />
              {label}
              <span className="muted small">{hint}</span>
            </label>
          ))}
        </div>
        {!opts.preorder && items.some((item) => unitsReadyBy(s, item.designId, s.day + days) < item.units) && (
          <p className="muted small">Some pieces are short on stock. Order a batch, pick a later date, lower the quantity, or turn on pre-orders.</p>
        )}
        <div className="row spread">
          <Outlook demand={projected} units={total} collection={extras.length > 0} />
          <button
            className="btn btn-primary btn-big"
            data-testid="announce-drop"
            onClick={() => {
              const release = extras.length ? { name, items } : primary;
              store.act((st) => scheduleDrop(st, { ...release, daysAhead: days, ...opts }), {
                sound: 'dropAnnounce',
                feed: `Drop announced: ${name.trim() && extras.length ? name.trim() : design.name}, ${total} units in ${days} days.`,
                toast: 'Drop announced. Build the hype.',
              });
            }}
          >
            {extras.length ? `Announce collection · ${total} units` : 'Announce drop'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DropsPanel() {
  const { s } = useGame();
  const drop = activeDrop(s);
  const partner = s.rivals.find((rival) => rival.id === s.rivalCollab);
  const past = s.drops.filter((d) => d.status === 'done').slice(-8).reverse();
  return (
    <div className="panel drops" data-testid="panel-drops">
      <h2 className="display">drops</h2>
      {!drop && partner && <p className="drop-partner">Your next drop is in collaboration with {partner.name}.</p>}
      {drop ? <ActiveDrop /> : <PlanDrop />}
      {past.length > 0 && (
        <section className="card">
          <h3>Past drops</h3>
          <ul className="past-drops">
            {past.map((p) => (
              <li key={p.id} className={`tone-${p.result?.outcome === 'flop' ? 'bad' : 'good'}`}>
                <strong>{p.name ?? getDesign(s, p.designId)?.name}{p.result?.partner && <small className="drop-partner"> × {p.result.partner}</small>}</strong>
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
