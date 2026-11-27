import { currentEvent, eventDef, eventOptions, getDesign } from '../../engine';
import { WornPhoto } from '../components/WornPhoto';
import { useGame } from '../hooks';

export function EventModal() {
  const { store, s } = useGame();
  if (s.gameOver) return null;
  const outcome = store.eventOutcome;
  const pe = currentEvent(s);
  if (!outcome && !pe) return null;

  if (outcome) {
    return (
      <div className="modal-back event-back">
        <div className="modal event-modal" role="dialog" aria-modal="true" data-testid="event-outcome">
          <p className="event-kicker">What happened</p>
          <h2 className="event-title">{outcome.title}</h2>
          <p className="event-body">{outcome.text}</p>
          <button className="btn btn-primary btn-big" onClick={() => store.dismissEventOutcome()} data-testid="event-ok" autoFocus>
            Got it
          </button>
        </div>
      </div>
    );
  }

  const def = eventDef(pe!.defId);
  if (!def) return null;
  const opts = eventOptions(s, pe!);
  return (
    <div className="modal-back event-back">
      <div className={`modal event-modal tone-${def.tone}`} role="dialog" aria-modal="true" aria-labelledby="event-title" data-testid="event-modal">
        <p className="event-kicker">{def.tone === 'bad' ? 'Problem' : def.tone === 'good' ? 'Opportunity' : 'Heads up'}. Time is paused.</p>
        <h2 className="event-title" id="event-title">
          {def.title(s, pe!.params)}
        </h2>
        {pe!.defId === 'hand_to_hand' && s.lifePaths?.[0] && getDesign(s, s.lifePaths[0].designId) && (
          <WornPhoto design={getDesign(s, s.lifePaths[0].designId)!} logo={s.brand.logo} lp={s.lifePaths[0]} width={220} />
        )}
        <p className="event-body">{def.body(s, pe!.params)}</p>
        <div className="event-options">
          {opts.map((o, i) => (
            <button key={i} className="event-option" disabled={!!o.blocked} onClick={() => store.chooseEventOption(i)} data-testid={`event-option-${i}`}>
              <strong>{o.label}</strong>
              <span>{o.blocked ? o.blocked : o.hint}</span>
            </button>
          ))}
        </div>
        {s.pendingEvents.length > 1 && <p className="muted small">{s.pendingEvents.length - 1} more waiting after this.</p>}
      </div>
    </div>
  );
}
