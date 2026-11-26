import { useEffect, useState } from 'react';
import { DIFFICULTIES, dateInfo } from '../../engine';
import { SLOTS, type SaveMeta, type SlotId } from '../../platform/storage';
import { count, money, useGame, useStore } from '../hooks';
import { sfx } from '../../audio/sfx';
import { SettingsBlock } from '../screens/Settings';

export function DropSplash() {
  const { store } = useGame();
  const sp = store.splash;
  if (!sp) return null;
  const r = sp.result;
  return (
    <div className={`splash splash-${r.outcome}`} role="dialog" aria-modal="true" data-testid="drop-splash">
      <div className="splash-inner">
        {r.outcome === 'soldout' ? (
          <>
            <p className="splash-kicker">{sp.designName}</p>
            <h1 className="splash-title chrome-text">sold out</h1>
            <p className="splash-sub">in {r.minutes} {r.minutes === 1 ? 'minute' : 'minutes'}</p>
          </>
        ) : r.outcome === 'solid' ? (
          <>
            <p className="splash-kicker">{sp.designName}</p>
            <h1 className="splash-title chrome-text">solid drop</h1>
            <p className="splash-sub">
              {r.sold} of {r.units} sold
            </p>
          </>
        ) : (
          <>
            <p className="splash-kicker">{sp.designName}</p>
            <h1 className="splash-title flop-text">flop</h1>
            <p className="splash-sub">
              Only {r.sold} of {r.units} sold. Leftovers went back to the warehouse.
            </p>
          </>
        )}
        <div className="splash-stats">
          <span>
            <strong className="money">{money(r.revenue)}</strong> earned
          </span>
          <span>
            <strong>{count(r.demand)}</strong> people tried to cop
          </span>
          {r.resalePrice && (
            <span>
              <strong>{money(r.resalePrice)}</strong> resale price already
            </span>
          )}
        </div>
        <button className="btn btn-primary btn-big" onClick={() => store.dismissSplash()} data-testid="splash-continue" autoFocus>
          Back to work
        </button>
      </div>
    </div>
  );
}

export function SaveSlots({ mode, onDone }: { mode: 'save' | 'load'; onDone?: () => void }) {
  const store = useStore();
  const [metas, setMetas] = useState<SaveMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => void store.listSaves().then(setMetas);
  useEffect(refresh, [store]);
  const slots: SlotId[] = mode === 'save' ? SLOTS.filter((s) => s !== 'auto') : SLOTS;
  return (
    <div className="slots" data-testid={`slots-${mode}`}>
      {slots.map((slot) => {
        const m = metas?.find((x) => x.slot === slot);
        return (
          <button
            key={slot}
            className="slot"
            data-testid={`${mode}-${slot}`}
            disabled={mode === 'load' && !m}
            onClick={async () => {
              sfx.play('click');
              if (mode === 'save') {
                await store.save(slot);
                refresh();
                onDone?.();
              } else {
                const r = await store.load(slot);
                if (!r.ok) {
                  sfx.play('error');
                  setError(r.reason);
                } else onDone?.();
              }
            }}
          >
            <strong>{slot === 'auto' ? 'Autosave' : `Slot ${slot.slice(-1)}`}</strong>
            {m ? (
              <span className="muted small">
                {m.brand}, {dateInfo(m.day).season} year {dateInfo(m.day).year}, {money(m.cash, true)}
                {m.gameOver ? ', bankrupt' : ''}
                <br />
                saved {new Date(m.savedAt).toLocaleString()}
              </span>
            ) : (
              <span className="muted small">Empty</span>
            )}
          </button>
        );
      })}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function GameMenu({ onClose }: { onClose: () => void }) {
  const { store } = useGame();
  const [tab, setTab] = useState<'main' | 'save' | 'load' | 'settings'>('main');
  const desktop = typeof window !== 'undefined' && !!window.streetwear;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()} data-testid="game-menu">
        {tab === 'main' && (
          <div className="menu-list">
            <h2 className="display">paused</h2>
            <button className="btn btn-primary" onClick={onClose} data-testid="menu-resume" autoFocus>
              Resume
            </button>
            <button className="btn" onClick={() => setTab('save')} data-testid="menu-save">
              Save game
            </button>
            <button className="btn" onClick={() => setTab('load')}>
              Load game
            </button>
            <button className="btn" onClick={() => setTab('settings')}>
              Settings
            </button>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                await store.save('auto');
                store.toMenu();
              }}
              data-testid="menu-main"
            >
              Save and exit to main menu
            </button>
            {desktop && (
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  await store.save('auto');
                  window.streetwear!.quit();
                }}
              >
                Save and quit
              </button>
            )}
          </div>
        )}
        {tab !== 'main' && (
          <div className="menu-sub">
            <button className="link back" onClick={() => setTab('main')}>
              Back
            </button>
            {tab === 'save' && (
              <>
                <h2 className="display">save</h2>
                <SaveSlots mode="save" onDone={() => setTab('main')} />
              </>
            )}
            {tab === 'load' && (
              <>
                <h2 className="display">load</h2>
                <SaveSlots mode="load" onDone={onClose} />
              </>
            )}
            {tab === 'settings' && (
              <>
                <h2 className="display">settings</h2>
                <SettingsBlock />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function GameOver() {
  const { store, s } = useGame();
  const [loading, setLoading] = useState(false);
  if (!s.gameOver) return null;
  const d = dateInfo(s.day);
  return (
    <div className="splash splash-bankrupt" role="dialog" aria-modal="true" data-testid="game-over">
      <div className="splash-inner">
        <p className="splash-kicker">{s.brand.name}</p>
        <h1 className="splash-title flop-text">bankrupt</h1>
        <p className="splash-sub">
          The bills won. You lasted until {d.season}, year {d.year}, on {DIFFICULTIES[s.difficulty].name}.
        </p>
        <div className="splash-stats">
          <span>
            <strong>{count(s.stats.unitsSold)}</strong> pieces sold
          </span>
          <span>
            <strong className="money">{money(s.stats.revenue, true)}</strong> total revenue
          </span>
          <span>
            <strong>{count(s.followers)}</strong> followers
          </span>
        </div>
        {loading ? (
          <SaveSlots mode="load" />
        ) : (
          <div className="row center">
            <button className="btn btn-primary" onClick={() => setLoading(true)}>
              Load a save
            </button>
            <button className="btn" onClick={() => store.toMenu()} data-testid="gameover-menu">
              Main menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
