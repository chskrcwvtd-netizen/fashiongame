import { useState } from 'react';
import { sfx } from '../../audio/sfx';
import { music } from '../../audio/music';

const KEY = 'streetwear-tycoon:settings';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      sfx.setVolume(typeof v.volume === 'number' ? v.volume : 0.7);
      sfx.setMuted(!!v.muted);
      sfx.uiSounds = v.uiSounds !== false;
      music.volume = typeof v.musicVolume === 'number' ? v.musicVolume : 0.5;
      music.enabled = v.music !== false;
    }
  } catch {
    /* defaults */
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ volume: sfx.volume, muted: sfx.muted, uiSounds: sfx.uiSounds, musicVolume: music.volume, music: music.enabled }));
  } catch {
    /* ignore */
  }
}

export function SettingsBlock() {
  const [vol, setVol] = useState(sfx.volume);
  const [muted, setMuted] = useState(sfx.muted);
  const [ui, setUi] = useState(sfx.uiSounds);
  const [mVol, setMVol] = useState(music.volume);
  const [mOn, setMOn] = useState(music.enabled);
  const tracks = music.tracks();
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
      <label className="check">
        <input
          type="checkbox"
          checked={ui}
          onChange={(e) => {
            setUi(e.target.checked);
            sfx.uiSounds = e.target.checked;
            persist();
          }}
          data-testid="ui-sounds"
        />
        Button click sounds
      </label>
      <div className="music-box">
        <h3>Your music</h3>
        <p className="muted small">
          The game plays your own tracks if you put them in its music folder, named <strong>menu</strong>, <strong>game</strong> and <strong>drop</strong> (mp3, wav, ogg, m4a or flac). Restart the game after adding them.
        </p>
        <p className="small">{tracks.length ? `Found: ${tracks.join(', ')}` : 'No tracks yet. The game stays quiet until you add some.'}</p>
        <label className="check">
          <input
            type="checkbox"
            checked={mOn}
            onChange={(e) => {
              setMOn(e.target.checked);
              music.setEnabled(e.target.checked);
              persist();
            }}
          />
          Play my music
        </label>
        <div className="field">
          <label htmlFor="mvol">Music volume: {Math.round(mVol * 100)}%</label>
          <input
            id="mvol"
            type="range"
            min={0}
            max={100}
            value={Math.round(mVol * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              setMVol(v);
              music.setVolume(v);
              persist();
            }}
          />
        </div>
        {desktop && (
          <button className="btn" onClick={() => window.streetwear!.openMusicFolder?.()} data-testid="open-music-folder">
            Open the music folder
          </button>
        )}
      </div>
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
