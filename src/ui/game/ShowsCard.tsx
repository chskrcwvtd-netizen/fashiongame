import { useState } from 'react';
import { FASHION_WEEKS, SHOW_BUDGETS, collectionStrength, dateInfo, fashionWeekBlocker, nextWeekDay, runwayBlocker, showCost, bookFashionWeek, bookRunway, type ShowBudget } from '../../engine';
import { money, useGame } from '../hooks';

export function ShowsCard() {
  const { store, s } = useGame();
  const [budget, setBudget] = useState<ShowBudget>('medium');
  const strength = collectionStrength(s);
  return (
    <section className="card shows-card" data-testid="shows-card">
      <h3>Runway and fashion weeks</h3>
      <p className="muted small">
        A show puts your best three designs on the runway. Strong collection plus a big budget means a standing ovation; a weak one gets panned. Your collection looks {strength > 0.7 ? 'strong' : strength > 0.55 ? 'decent' : 'weak'} right now.
      </p>
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
                  disabled={!!block || s.cash < showCost(s, budget)}
                  onClick={() => store.act((st) => bookFashionWeek(st, w.id, budget), { sound: 'dropAnnounce', toast: `Booked for ${w.name}.`, feed: `${s.brand.name} will show at ${w.name}.` })}
                  data-testid={`book-${w.id}`}
                >
                  Book
                </button>
              )}
            </li>
          );
        })}
        <li className={runwayBlocker(s) ? 'locked' : ''}>
          <span>
            <strong>Your own runway</strong>
            <span className="muted small"> {runwayBlocker(s) ?? 'At your Flagship, a week from now.'}</span>
          </span>
          <button
            className="btn"
            disabled={!!runwayBlocker(s) || s.cash < showCost(s, budget)}
            onClick={() => store.act((st) => bookRunway(st, budget), { sound: 'dropAnnounce', toast: 'Runway show in a week.', feed: 'Runway show announced.' })}
            data-testid="book-runway"
          >
            Book
          </button>
        </li>
      </ul>
    </section>
  );
}
