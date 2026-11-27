import { useState } from 'react';
import { sfx } from '../../audio/sfx';
import { music } from '../../audio/music';
import { ambience } from '../../audio/sfx';
import { useStore } from '../hooks';
import { serialize } from '../../engine';

const KEY = 'streetwear-tycoon:settings';

let currentScale = 1;
function applyScale(v: number) {
  currentScale = v;
  (document.documentElement.style as unknown as { zoom: string }).zoom = String(v);
}

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
      if (v.pack === 'rage' || v.pack === 'lofi' || v.pack === 'hyperpop') sfx.pack = v.pack;
      ambience.enabled = v.ambience !== false;
      applyScale(typeof v.scale === 'number' ? v.scale : 1);
    }
  } catch {
    /* defaults */
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ volume: sfx.volume, muted: sfx.muted, uiSounds: sfx.uiSounds, musicVolume: music.volume, music: music.enabled, pack: sfx.pack, ambience: ambience.enabled, scale: currentScale }));
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
  const [pack, setPack] = useState(sfx.pack);
  const [amb, setAmb] = useState(ambience.enabled);
  const [scale, setScale] = useState(currentScale);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const store = useStore();
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
      <div className="field">
        <label>Sound style</label>
        <div className="chips">
          {(['hyperpop', 'rage', 'lofi'] as const).map((p) => (
            <button
              key={p}
              className={`chip ${pack === p ? 'on' : ''}`}
              onClick={() => {
                setPack(p);
                sfx.pack = p;
                persist();
                sfx.play('cash', 1);
              }}
              data-testid={`pack-${p}`}
            >
              {p === 'hyperpop' ? 'Hyperpop' : p === 'rage' ? 'Rage' : 'Lo-fi'}
            </button>
          ))}
        </div>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={amb}
          onChange={(e) => {
            setAmb(e.target.checked);
            ambience.setEnabled(e.target.checked);
            persist();
          }}
        />
        Quiet city sounds at the HQ
      </label>
      <div className="field">
        <label>Interface size: {Math.round(scale * 100)}%</label>
        <div className="chips">
          {[0.9, 1, 1.15, 1.3].map((v) => (
            <button
              key={v}
              className={`chip ${scale === v ? 'on' : ''}`}
              onClick={() => {
                setScale(v);
                applyScale(v);
                persist();
              }}
              data-testid={`scale-${v}`}
            >
              {Math.round(v * 100)}%
            </button>
          ))}
        </div>
      </div>
      {/* your own music needs the desktop version: it reads a folder on the PC */}
      {desktop && (
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
          <button className="btn" onClick={() => window.streetwear!.openMusicFolder?.()} data-testid="open-music-folder">
            Open the music folder
          </button>
        </div>
      )}
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
      <p className="muted small">Shortcuts: Space pauses, 1 / 2 / 3 set the speed, Esc opens this menu, Ctrl+Z undoes, letters jump to screens (hover the menu to see them).</p>
      <div className="music-box">
        <h3>Report a problem</h3>
        <textarea className="input feedback" rows={3} value={note} placeholder="What happened? What did you expect?" onChange={(e) => setNote(e.target.value)} data-testid="feedback-text" />
        <button
          className="btn"
          disabled={!note.trim()}
          onClick={async () => {
            const text = `${note}\n\n---\nversion: ${__APP_VERSION__}\n${store.state ? serialize(store.state) : 'no game running'}`;
            if (window.streetwear?.saveFeedback) await window.streetwear.saveFeedback(text);
            else {
              const a = document.createElement('a');
              a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
              a.download = `streetwear-feedback-${Date.now()}.txt`;
              a.click();
            }
            setSent(true);
            setNote('');
          }}
          data-testid="feedback-send"
        >
          Save the report
        </button>
        {sent && <p className="small">Saved. The folder with the report is open; send me that file.</p>}
      </div>
    </div>
  );
}
