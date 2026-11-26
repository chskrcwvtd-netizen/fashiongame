import { useState } from 'react';
import {
  COLORS,
  COLOR_IDS,
  EMBLEMS,
  EMBLEM_IDS,
  FACTORIES,
  FACTORY_IDS,
  FONTS,
  FONT_IDS,
  GARMENTS,
  GARMENT_IDS,
  MATERIALS,
  MATERIAL_IDS,
  PATTERNS,
  PATTERN_IDS,
  VIBES,
  VIBE_IDS,
  trendDelta,
  trendPop,
  type TrendCategory,
  createDesign,
  designQuality,
  fairPrice,
  marketFit,
  randomDesignName,
  unitCost,
  type DesignInput,
  type GraphicKind,
} from '../../engine';
import { GarmentPreview } from '../components/GarmentPreview';
import { EmblemIcon } from '../components/Emblem';
import { money, useGame } from '../hooks';
import { sfx } from '../../audio/sfx';

const DEFAULT: DesignInput = {
  name: 'NIGHT SIGNAL HOODIE',
  garment: 'hoodie',
  primary: 'black',
  secondary: 'pink',
  pattern: 'solid',
  graphic: 'emblem',
  text: '',
  font: 'chrome',
  emblem: 'logo',
  material: 'standard',
  vibe: 'y2k',
};

const GARMENT_ICONS: Record<string, string> = {
  tee: 'M7 3l-5 3 2 4 2-1v12h12V9l2 1 2-4-5-3c-1 2-2.5 3-4 3S8 5 7 3z',
  hoodie: 'M8 4c0-2 8-2 8 0l5 4-2 9-2-1v6H7v-6l-2 1-2-9zM10 4a2 2 0 0 0 4 0',
  cargo: 'M6 2h12l1 20h-5l-2-13-2 13H5zM6 10h3v4H6zM15 10h3v4h-3z',
  puffer: 'M7 3h10l5 5-2 11-2-1v4H6v-4l-2 1L2 8zM6 9h12M6 13h12M6 17h12',
  cap: 'M3 15C3 8 7 5 12 5s9 3 9 10zM1 15h14c3 0 6 1 7 3H3c-2 0-2-3-2-3z',
  beanie: 'M4 18C4 9 7 5 12 5s8 4 8 13zM3 15h18v5H3zM12 1a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
};

/** 'hot' / 'rising' marker class from public trend data. */
function heatClass(s: Parameters<typeof trendPop>[0], cat: TrendCategory, id: string) {
  if (trendPop(s, cat, id) > 0.75) return 'is-hot';
  if (trendDelta(s, cat, id) > 0.03) return 'is-rising';
  return '';
}

function Chip<T extends string>({ value, current, onPick, children, testid, title, heat }: { value: T; current: T; onPick: (v: T) => void; children: React.ReactNode; testid?: string; title?: string; heat?: string }) {
  return (
    <button
      className={`chip ${value === current ? 'on' : ''} ${heat ?? ''}`}
      onClick={() => {
        sfx.play('click');
        onPick(value);
      }}
      data-testid={testid}
      title={title}
      aria-pressed={value === current}
    >
      {children}
    </button>
  );
}

function Swatches({ current, onPick, testid, heat }: { current: string; onPick: (v: string) => void; testid: string; heat: (id: string) => string }) {
  return (
    <div className="swatches" data-testid={testid}>
      {COLOR_IDS.map((c) => (
        <button
          key={c}
          className={`swatch ${c === current ? 'on' : ''} ${heat(c)}`}
          style={{ background: COLORS[c].hex }}
          title={COLORS[c].name}
          aria-label={COLORS[c].name}
          aria-pressed={c === current}
          onClick={() => {
            sfx.play('click');
            onPick(c);
          }}
        />
      ))}
    </div>
  );
}

export function DesignLab() {
  const { store, s } = useGame();
  const [draft, setDraft] = useState<DesignInput>(() => {
    const last = s.designs[s.designs.length - 1];
    return last ? { ...DEFAULT, ...last } : DEFAULT;
  });
  const set = <K extends keyof DesignInput>(k: K, v: DesignInput[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const fit = marketFit(s, draft);
  const qDanube = designQuality(draft, 'danube', s);
  const fair = fairPrice(s, draft, qDanube);
  const fitLabel = fit > 0.72 ? 'Budapest loves this' : fit > 0.6 ? 'Solid fit' : fit > 0.5 ? 'Niche' : 'Hard sell';

  const save = () => {
    const d = store.mutate((st) => createDesign(st, draft));
    if (d) {
      sfx.play('upgrade');
      store.toast('Saved to your collection', `${d.name} is ready for production.`, 'good');
      store.pushFeed(`New design: ${d.name}`, 'info');
      store.setPanel('lab', d.id);
    }
  };

  return (
    <div className="panel lab" data-testid="panel-lab">
      <div className="lab-controls">
        <h2 className="display">design lab</h2>

        <div className="field">
          <label>Piece</label>
          <div className="chips">
            {GARMENT_IDS.map((g) => (
              <Chip key={g} value={g} current={draft.garment} heat={heatClass(s, 'garment', g)} onPick={(v) => setDraft((d) => ({ ...d, garment: v, name: d.name.replace(/(TEE|HOODIE|CARGO PANTS|PUFFER JACKET|CAP|BEANIE)$/, GARMENTS[v].name.toUpperCase()) }))} testid={`garment-${g}`}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d={GARMENT_ICONS[g]} fill="currentColor" />
                </svg>
                {GARMENTS[g].name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Main colour: {COLORS[draft.primary].name}</label>
          <Swatches current={draft.primary} onPick={(v) => set('primary', v)} testid="primary-colors" heat={(c) => heatClass(s, 'color', c)} />
        </div>
        <div className="field">
          <label>Detail colour: {COLORS[draft.secondary].name}</label>
          <Swatches current={draft.secondary} onPick={(v) => set('secondary', v)} testid="secondary-colors" heat={(c) => heatClass(s, 'color', c)} />
        </div>

        <div className="field">
          <label>Pattern</label>
          <div className="chips">
            {PATTERN_IDS.map((p) => (
              <Chip key={p} value={p} current={draft.pattern} heat={heatClass(s, 'pattern', p)} onPick={(v) => set('pattern', v)} testid={`pattern-${p}`}>
                {PATTERNS[p].name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Graphic</label>
          <div className="chips">
            {(['none', 'text', 'emblem'] as GraphicKind[]).map((k) => (
              <Chip key={k} value={k} current={draft.graphic} onPick={(v) => set('graphic', v)} testid={`graphic-${k}`}>
                {k === 'none' ? 'Clean' : k === 'text' ? 'Text' : 'Emblem'}
              </Chip>
            ))}
          </div>
          {draft.graphic === 'text' && (
            <div className="sub">
              <input className="input" maxLength={16} value={draft.text} placeholder="Up to 16 characters" onChange={(e) => set('text', e.target.value)} data-testid="graphic-text-input" />
              <div className="chips">
                {FONT_IDS.map((f) => (
                  <Chip key={f} value={f} current={draft.font} onPick={(v) => set('font', v)}>
                    <span className={`font-${f}`}>{FONTS[f].name}</span>
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {draft.graphic === 'emblem' && (
            <div className="chips emblems">
              {EMBLEM_IDS.map((e) => (
                <Chip key={e} value={e} current={draft.emblem} onPick={(v) => set('emblem', v)} title={EMBLEMS[e].name}>
                  <EmblemIcon id={e === 'logo' ? s.brand.logo.glyph : e} color={e === 'logo' ? COLORS[s.brand.logo.color].hex : '#e9edf5'} size={22} />
                  <span className="sr">{EMBLEMS[e].name}</span>
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label>Vibe: {VIBES[draft.vibe].blurb}</label>
          <div className="chips">
            {VIBE_IDS.map((v) => (
              <Chip key={v} value={v} current={draft.vibe} heat={heatClass(s, 'vibe', v)} onPick={(x) => set('vibe', x)} testid={`vibe-${v}`}>
                {VIBES[v].name}
              </Chip>
            ))}
          </div>
          <span className="muted small heat-legend">
            <i className="legend-hot" /> hot right now <i className="legend-rising" /> rising
          </span>
        </div>

        <div className="field">
          <label>Fabric</label>
          <div className="chips">
            {MATERIAL_IDS.map((m) => (
              <Chip key={m} value={m} current={draft.material} onPick={(v) => set('material', v)} testid={`material-${m}`}>
                {MATERIALS[m].name}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="lab-stage">
        <div className="turntable">
          <GarmentPreview design={draft} logo={s.brand.logo} size={360} className="lab-preview" />
        </div>
        <div className="name-row">
          <input className="input name-input" maxLength={32} value={draft.name} onChange={(e) => set('name', e.target.value.toUpperCase())} data-testid="design-name" aria-label="Design name" />
          <button
            className="btn btn-ghost"
            title="Random name"
            onClick={() => {
              sfx.play('click');
              set('name', randomDesignName({ rngState: (Math.random() * 2 ** 32) >>> 0 }, draft.garment));
            }}
          >
            Shuffle name
          </button>
        </div>
        <button className="btn btn-primary btn-big" onClick={save} data-testid="save-design">
          Save design
        </button>
      </div>

      <div className="lab-stats">
        <section className="card">
          <h3>Market fit</h3>
          <div className="fit">
            <div className="fit-bar">
              <span style={{ width: `${fit * 100}%` }} />
            </div>
            <strong>{fitLabel}</strong>
          </div>
          <p className="muted small">How well these choices match what people want right now. Trends move every week; check the Trends screen. Seasons matter too.</p>
        </section>
        <section className="card">
          <h3>Cost and quality by factory</h3>
          <table className="mini">
            <tbody>
              {FACTORY_IDS.map((f) => (
                <tr key={f}>
                  <td>{FACTORIES[f].name}</td>
                  <td>{money(unitCost(s, draft, f))} each</td>
                  <td>quality {designQuality(draft, f, s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h3>Price customers expect</h3>
          <p className="big-num">
            {money(fair * 0.9)} to {money(fair * 1.05)}
          </p>
          <p className="muted small">At Danube Works quality. Price above this and sales fall off fast. Drops with hype can charge more.</p>
        </section>

        {s.designs.length > 0 && (
          <section className="card collection" data-testid="collection">
            <h3>Your collection</h3>
            <div className="collection-grid">
              {[...s.designs].reverse().map((d) => (
                <div key={d.id} className={`collection-item ${store.selectedDesignId === d.id ? 'on' : ''}`}>
                  <GarmentPreview design={d} logo={s.brand.logo} size={64} />
                  <div className="collection-meta">
                    <strong>{d.name}</strong>
                    <div className="collection-actions">
                      <button className="link" onClick={() => setDraft({ ...DEFAULT, ...d })}>
                        Edit a copy
                      </button>
                      <button className="link" onClick={() => store.setPanel('production', d.id)} data-testid={`produce-${d.id}`}>
                        Produce
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
