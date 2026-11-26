import { useState } from 'react';
import { sfx } from '../../audio/sfx';

const KEY = 'streetwear-tycoon:settings';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      sfx.setVolume(typeof v.volume === 'number' ? v.volume : 0.7);
      sfx.setMuted(!!v.muted);
    }
  } catch {
    /* defaults */
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ volume: sfx.volume, muted: sfx.muted }));
  } catch {
    /* ignore */
  }
}

export function SettingsBlock() {
  const [vol, setVol] = useState(sfx.volume);
  const [muted, setMuted] = useState(sfx.muted);
  const desktop = typeof window !== 'undefined' && !!window.streetwear;
  return (
    <div className="settings" data-testid="settings">
      <div className="field">
        <label htmlFor="vol">Sound effects volume: {Math.round(vol * 100)}%</label>
        <input
          id="vol"
          type="range"
          min={0}
          max={100}
          value={Math.round(vol * 100)}
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            setVol(v);
            sfx.setVolume(v);
            persist();
          }}
          onMouseUp={() => sfx.play('cash', 1)}
        />
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={muted}
          onChange={(e) => {
            setMuted(e.target.checked);
            sfx.setMuted(e.target.checked);
            persist();
          }}
        />
        Mute all sounds
      </label>
      <div className="row">
        <button className="btn btn-ghost" onClick={() => sfx.play('soldout', 1)}>
          Test the sold-out sound
        </button>
        {desktop && (
          <button className="btn btn-ghost" onClick={() => window.streetwear!.toggleFullscreen()}>
            Toggle fullscreen (F11)
          </button>
        )}
      </div>
      <p className="muted small">Shortcuts: Space pauses, 1 / 2 / 3 set the speed, Esc opens this menu.</p>
    </div>
  );
}
