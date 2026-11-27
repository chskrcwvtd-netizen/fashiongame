import { useState } from 'react';
import { useGame } from '../hooks';
import type { Panel } from '../../store/gameStore';
import { Coach } from './Moments';

interface Step {
  done: boolean;
  text: string;
  panel: Panel;
}

export function FirstSteps() {
  const { store, s } = useGame();
  const steps: Step[] = [
    { done: s.designs.length > 0, text: 'Design your first piece', panel: 'lab' },
    { done: s.orders.length > 0 || Object.keys(s.inventory).length > 0, text: 'Order a batch from a factory', panel: 'production' },
    { done: Object.values(s.listings).some((l) => l.active), text: 'List it in the webshop', panel: 'shop' },
    { done: s.drops.length > 0, text: 'Announce a limited drop', panel: 'drops' },
    { done: s.hqLevel >= 1, text: 'Move out of the basement', panel: 'hq' },
  ];
  if (steps.every((x) => x.done)) return null;
  const next = steps.findIndex((x) => !x.done);
  return (
    <section className="steps" data-testid="first-steps">
      <h3>First steps</h3>
      <ol>
        {steps.map((st, i) => (
          <li key={i} className={st.done ? 'done' : i === next ? 'next' : ''}>
            <button onClick={() => store.setPanel(st.panel)} disabled={st.done}>
              {st.text}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Feed() {
  const { store } = useGame();
  // Only the phone layout uses this: there the feed is a strip that opens with a tap.
  const [open, setOpen] = useState(false);
  return (
    <aside className={`feed ${open ? 'open' : ''}`}>
      {store.tutorial ? <Coach /> : <FirstSteps />}
      <h3 className="feed-title" onClick={() => setOpen(!open)} data-testid="feed-toggle">
        Live feed
      </h3>
      <ul className="feed-list" data-testid="feed">
        {store.feed.map((f) => (
          <li key={f.id} className={`feed-item tone-${f.tone}`}>
            <span className="feed-day">D{f.day}</span>
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function Toasts() {
  const { store } = useGame();
  return (
    <div className="toasts" aria-live="polite">
      {store.toasts.map((t) => (
        <div key={t.id} className={`toast tone-${t.tone}`} onClick={() => store.dismissToast(t.id)} data-testid="toast">
          <strong>{t.title}</strong>
          {t.body && <span>{t.body}</span>}
        </div>
      ))}
    </div>
  );
}
