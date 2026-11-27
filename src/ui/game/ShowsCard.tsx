import { useState } from 'react';
import { FASHION_WEEKS, SHOW_BUDGETS, bestShowLooks, collectionStrength, dateInfo, fashionWeekBlocker, nextWeekDay, runwayBlocker, showCost, bookFashionWeek, bookRunway, type ShowBudget, type ShowHistoryEntry } from '../../engine';
import { money, useGame } from '../hooks';
import { RunwayReplay, runwayVerdict } from './RunwayReplay';

export function ShowsCard() {
  const { store, s } = useGame();
  const [budget, setBudget] = useState<ShowBudget>('medium');
  const [lineup, setLineup] = useState<string[]>();
  const [replay, setReplay] = useState<ShowHistoryEntry>();
  const looks = lineup ? s.designs.filter((design) => lineup.includes(design.id)) : bestShowLooks(s);
  const lookIds = lineup ?? looks.map((design) => design.id);
  const strength = collectionStrength(s, looks);
  const ownBlock = runwayBlocker(s);
  const ownBooking = s.shows.applied.find((show) => show.weekId === 'runway');
  const canPay = s.cash >= showCost(s, budget);

  function chooseLook(index: number, id: string) {
    const next = [...lookIds];
    const swap = next.indexOf(id);
    if (swap >= 0) next[swap] = next[index];
    next[index] = id;
    setLineup(next);
  }

  return (
    <section className="card shows-card" id="runway" data-testid="shows-card">
      <h3>Runway and fashion weeks</h3>
      {s.designs.length < 3 ? (
        <p className="muted small">Save three designs to put together a runway lineup. An own-brand show also requires the Flagship Store.</p>
      ) : (
        <>
          <p className="muted small">Set the order for your three looks. Your lineup looks {strength > 0.7 ? 'strong' : strength > 0.55 ? 'decent' : 'weak'} right now.</p>
          <div className="runway-lineup">
            {lookIds.map((id, index) => (
              <label key={index}>
                Look {index + 1}
                <select className="input" value={id} onChange={(event) => chooseLook(index, event.target.value)} data-testid={`runway-look-${index + 1}`}>
                  {s.designs.map((design) => <option key={design.id} value={design.id}>{design.name}</option>)}
                </select>
              </label>
            ))}
          </div>
        </>
      )}
      <div className="chips">
        {(Object.keys(SHOW_BUDGETS) as ShowBudget[]).map((b) => (
          <button key={b} className={`chip ${budget === b ? 'on' : ''}`} onClick={() => setBudget(b)} data-testid={`budget-${b}`}>
            {SHOW_BUDGETS[b].name}: {money(showCost(s, b))}
          </button>
        ))}
      </div>
      <ul className="deal-list">
        {FASHION_WEEKS.map((w) => {
          const block = fashionWeekBlocker(s, w.id);
          const booked = s.shows.applied.find((a) => a.weekId === w.id);
          const day = nextWeekDay(s, w.weekOfYear);
          return (
            <li key={w.id} className={block && !booked ? 'locked' : ''}>
              <span>
                <strong>{w.name}</strong>
                <span className="muted small">
                  {' '}
                  {dateInfo(day).season}, week {dateInfo(day).weekOfSeason}. {booked ? `Booked (${SHOW_BUDGETS[booked.budget].name}).` : block ?? `Reputation ${w.minRep}+.`}
                </span>
              </span>
              {!booked && (
                <button
                  className="btn"
                  disabled={!!block || !canPay}
                  onClick={() => store.act((st) => bookFashionWeek(st, w.id, budget, lookIds), { sound: 'dropAnnounce', toast: `Booked for ${w.name}.`, feed: `${s.brand.name} will show at ${w.name}.` })}
                  data-testid={`book-${w.id}`}
                >
                  Book
                </button>
              )}
            </li>
          );
        })}
        <li className={ownBlock && !ownBooking ? 'locked' : ''}>
          <span>
            <strong>Your own runway</strong>
            <span className="muted small"> {ownBooking ? `Booked for day ${ownBooking.day}.` : ownBlock ?? 'At your Flagship, a week from now.'}</span>
          </span>
          <button
            className="btn"
            disabled={!!ownBlock || !canPay}
            onClick={() => store.act((st) => bookRunway(st, budget, lookIds), { sound: 'dropAnnounce', toast: 'Runway show in a week.', feed: 'Runway show announced.' })}
            data-testid="book-runway"
          >
            Book
          </button>
        </li>
      </ul>
      {s.shows.applied.length > 0 && (
        <div className="runway-bookings" data-testid="runway-bookings">
          <h4>Booked shows</h4>
          <ul className="deal-list">
            {s.shows.applied.map((show) => (
              <li key={show.id}>
                <div>
                  <strong>{show.name}</strong> <span className="muted small">Day {show.day}</span>
                  {show.lookIds && (
                    <ol className="runway-booked-looks">
                      {show.lookIds.map((id) => <li key={id}>{s.designs.find((design) => design.id === id)?.name ?? 'Unavailable look'}</li>)}
                    </ol>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {replay && <RunwayReplay key={replay.id} show={replay} onClose={() => setReplay(undefined)} />}
      {s.shows.history.length > 0 && (
        <div className="runway-history">
          <h4>Show history</h4>
          <ul className="deal-list">
            {[...s.shows.history].reverse().map((show, index) => (
              <li key={show.id ?? `${show.name}-${show.day}-${index}`}>
                <span><strong>{show.name}</strong> <span className="muted small">Day {show.day} · {runwayVerdict[show.outcome]}</span></span>
                {!!show.looks?.length && <button className="btn" onClick={() => setReplay(show)} data-testid="watch-runway">Watch runway</button>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
