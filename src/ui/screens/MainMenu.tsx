import { useEffect, useState } from 'react';
import { COLORS, COLOR_IDS, DIFFICULTIES, LOGO_GLYPHS, EMBLEMS, validateBrandName, type DifficultyId } from '../../engine';
import type { SaveMeta } from '../../platform/storage';
import { EmblemIcon } from '../components/Emblem';
import { GarmentPreview } from '../components/GarmentPreview';
import { useStore } from '../hooks';
import { sfx } from '../../audio/sfx';
import { SaveSlots } from '../game/Overlays';
import { SettingsBlock } from './Settings';

type View = 'home' | 'new' | 'load' | 'settings';

const LOGO_COLORS = ['pink', 'lime', 'cyber', 'chrome', 'orange', 'purple', 'red', 'bone'];

function NewGame({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const [name, setName] = useState('');
  const [glyph, setGlyph] = useState('star');
  const [color, setColor] = useState('pink');
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal');
  const err = name.length ? validateBrandName(name) : null;
  const ok = name.trim().length >= 2 && !err;
  const start = () => {
    if (!ok) return;
    sfx.play('upgrade');
    store.newGame({ brandName: name.toUpperCase(), logo: { glyph, color }, difficulty });
  };
  return (
    <div className="newgame" data-testid="new-game">
      <button className="link back" onClick={onBack}>
        Back
      </button>
      <h2 className="display">start your brand</h2>
      <div className="newgame-grid">
        <div className="newgame-form">
          <div className="field">
            <label htmlFor="brand">Brand name</label>
            <input
              id="brand"
              className="input input-big"
              maxLength={18}
              value={name}
              placeholder="e.g. NULL CLUB"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && start()}
              data-testid="brand-name"
              autoFocus
            />
            {err && <span className="error small">{err}</span>}
          </div>
          <div className="field">
            <label>Logo</label>
            <div className="chips">
              {LOGO_GLYPHS.map((g) => (
                <button key={g} className={`chip ${glyph === g ? 'on' : ''}`} onClick={() => (sfx.play('click'), setGlyph(g))} title={EMBLEMS[g].name} aria-pressed={glyph === g}>
                  <EmblemIcon id={g} color={COLORS[color].hex} size={24} />
                </button>
              ))}
            </div>
            <div className="swatches">
              {LOGO_COLORS.filter((c) => COLOR_IDS.includes(c)).map((c) => (
                <button key={c} className={`swatch ${color === c ? 'on' : ''}`} style={{ background: COLORS[c].hex }} onClick={() => (sfx.play('click'), setColor(c))} aria-label={COLORS[c].name} title={COLORS[c].name} />
              ))}
            </div>
          </div>
          <div className="field">
            <label>Difficulty</label>
            <div className="difficulties">
              {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) => {
                const d = DIFFICULTIES[id];
                return (
                  <button key={id} className={`diff ${difficulty === id ? 'on' : ''}`} onClick={() => (sfx.play('click'), setDifficulty(id))} data-testid={`difficulty-${id}`} aria-pressed={difficulty === id}>
                    <strong>{d.name}</strong>
                    <span>{d.blurb}</span>
                    <span className="muted small">
                      Start with ${d.startCash.toLocaleString('en-US')}. {d.graceDays} days to recover if you go broke.
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <button className="btn btn-primary btn-big" disabled={!ok} onClick={start} data-testid="start-game">
            Open the basement
          </button>
        </div>
        <div className="newgame-preview">
          <div className="logo-preview">
            <EmblemIcon id={glyph} color={COLORS[color].hex} size={96} />
            <span className="logo-preview-name">{name.trim().toUpperCase() || 'YOUR BRAND'}</span>
          </div>
          <GarmentPreview
            design={{ name: 'preview', garment: 'hoodie', primary: 'black', secondary: color, pattern: 'solid', graphic: 'emblem', emblem: 'logo', text: '', font: 'chrome', material: 'standard', vibe: 'y2k' }}
            logo={{ glyph, color }}
            size={240}
          />
          <p className="muted small">Budapest, day one. A basement, some cash, and a name.</p>
        </div>
      </div>
    </div>
  );
}

export function MainMenu() {
  const store = useStore();
  const [view, setView] = useState<View>('home');
  const [latest, setLatest] = useState<SaveMeta | null>(null);
  const desktop = typeof window !== 'undefined' && !!window.streetwear;
  useEffect(() => {
    void store.listSaves().then((all) => {
      const alive = all.filter((m) => !m.gameOver).sort((a, b) => b.savedAt - a.savedAt);
      setLatest(alive[0] ?? null);
    });
  }, [store, view]);

  return (
    <div className="mainmenu" data-testid="main-menu">
      <div className="mainmenu-bg" aria-hidden="true" />
      {view === 'home' && (
        <div className="mainmenu-home">
          <h1 className="title chrome-text">
            streetwear
            <br />
            tycoon
          </h1>
          <p className="tagline">From a Budapest basement to the whole world.</p>
          <div className="menu-list">
            {latest && (
              <button
                className="btn btn-primary btn-big"
                data-testid="continue"
                onClick={async () => {
                  sfx.play('click');
                  await store.load(latest.slot);
                }}
              >
                Continue {latest.brand}
              </button>
            )}
            <button className={`btn ${latest ? '' : 'btn-primary btn-big'}`} onClick={() => (sfx.play('click'), setView('new'))} data-testid="new-game-btn">
              New game
            </button>
            <button className="btn" onClick={() => (sfx.play('click'), setView('load'))} data-testid="load-btn">
              Load game
            </button>
            <button className="btn" onClick={() => (sfx.play('click'), setView('settings'))}>
              Settings
            </button>
            {desktop && (
              <button className="btn btn-ghost" onClick={() => window.streetwear!.quit()}>
                Quit
              </button>
            )}
          </div>
        </div>
      )}
      {view === 'new' && <NewGame onBack={() => setView('home')} />}
      {view === 'load' && (
        <div className="mainmenu-sub">
          <button className="link back" onClick={() => setView('home')}>
            Back
          </button>
          <h2 className="display">load game</h2>
          <SaveSlots mode="load" />
        </div>
      )}
      {view === 'settings' && (
        <div className="mainmenu-sub">
          <button className="link back" onClick={() => setView('home')}>
            Back
          </button>
          <h2 className="display">settings</h2>
          <SettingsBlock />
        </div>
      )}
    </div>
  );
}
