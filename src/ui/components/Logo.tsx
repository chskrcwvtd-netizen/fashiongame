import { BADGES, BADGE_IDS, COLORS, COLOR_IDS, EMBLEMS, FONTS, FONT_IDS, LOGO_GLYPHS, type BadgeId, type FontId, type LogoChoice } from '../../engine';
import { EmblemIcon } from './Emblem';
import { sfx } from '../../audio/sfx';

export const LOGO_COLORS = ['pink', 'lime', 'cyber', 'chrome', 'orange', 'purple', 'red', 'bone'];

export const WORDMARK_FONT: Record<FontId, string> = {
  gothic: "'UnifrakturMaguntia', serif",
  bubble: "'Rubik Bubbles', sans-serif",
  chrome: "'Unbounded', sans-serif",
  graffiti: "'Permanent Marker', cursive",
};

export function Wordmark({ name, logo, className }: { name: string; logo: LogoChoice; className?: string }) {
  const font = logo.font ?? 'chrome';
  return (
    <span className={`wordmark wm-${font} ${className ?? ''}`} style={{ fontFamily: WORDMARK_FONT[font] }}>
      {name}
    </span>
  );
}

/** Glyph, colour, badge and wordmark font pickers. */
export function LogoEditor({ logo, onChange }: { logo: LogoChoice; onChange: (l: LogoChoice) => void }) {
  const color = COLORS[logo.color]?.hex ?? '#ff3ec8';
  const set = (patch: Partial<LogoChoice>) => {
    sfx.play('click');
    onChange({ ...logo, ...patch });
  };
  return (
    <div className="logo-editor">
      <div className="chips">
        {LOGO_GLYPHS.map((g) => (
          <button key={g} className={`chip ${logo.glyph === g ? 'on' : ''}`} onClick={() => set({ glyph: g })} title={EMBLEMS[g].name} aria-pressed={logo.glyph === g}>
            <EmblemIcon id={g} color={color} size={26} />
          </button>
        ))}
      </div>
      <div className="swatches">
        {LOGO_COLORS.filter((c) => COLOR_IDS.includes(c)).map((c) => (
          <button key={c} className={`swatch ${logo.color === c ? 'on' : ''}`} style={{ background: COLORS[c].hex }} onClick={() => set({ color: c })} aria-label={COLORS[c].name} title={COLORS[c].name} />
        ))}
      </div>
      <div className="chips">
        {BADGE_IDS.map((b) => (
          <button key={b} className={`chip ${(logo.badge ?? 'none') === b ? 'on' : ''}`} onClick={() => set({ badge: b as BadgeId })} data-testid={`badge-${b}`}>
            <EmblemIcon id={logo.glyph} color={color} size={22} badge={b} />
            {BADGES[b as BadgeId]}
          </button>
        ))}
      </div>
      <div className="chips">
        {FONT_IDS.map((f) => (
          <button key={f} className={`chip ${(logo.font ?? 'chrome') === f ? 'on' : ''}`} onClick={() => set({ font: f })} data-testid={`wordmark-${f}`}>
            <span className={`font-${f}`}>{FONTS[f].name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
