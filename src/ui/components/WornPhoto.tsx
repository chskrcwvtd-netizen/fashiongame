import { WEARERS, dateInfo, type Design, type LifePath, type LogoChoice } from '../../engine';
import { GarmentPreview } from './GarmentPreview';

/**
 * Hand to hand: an instant photo of the player's own tee on a Budapest wearer, seen from the back
 * (their back print still readable), sleeves cut off. Cold rehearsal-room light, concrete, an amp.
 */
export function WornPhoto({ design, logo, lp, width = 240 }: { design: Design; logo?: LogoChoice; lp: LifePath; width?: number }) {
  const w = WEARERS[lp.wearer];
  const d = dateInfo(lp.dueDay);
  const worn = { ...design, cut: true };
  const caption = `${w.name}, ${w.place.replace(/^the |^a /, '')}`;
  return (
    <figure className="worn-photo" style={{ width }} data-testid="worn-photo">
      <svg viewBox="0 0 320 400" role="img" aria-label={`Photo: ${w.name} wearing your ${design.name} from the back, sleeves cut off, your back print still visible`}>
        <defs>
          <linearGradient id="wp-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a3a40" />
            <stop offset="1" stopColor="#121116" />
          </linearGradient>
          <radialGradient id="wp-light" cx=".55" cy="0" r=".9">
            <stop offset="0" stopColor="#bfe6ff" stopOpacity=".38" />
            <stop offset="1" stopColor="#bfe6ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="400" fill="url(#wp-wall)" />
        {/* concrete seams and an egg-box acoustic panel */}
        <path d="M0 132 H320 M0 262 H320 M106 0 V132 M214 132 V262" stroke="#000" strokeOpacity=".35" strokeWidth="2" />
        <g opacity=".5">
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={238 + (i % 3) * 24} y={20 + Math.floor(i / 3) * 24} width="20" height="20" rx="6" fill="#26252c" />
          ))}
        </g>
        {/* amp */}
        <rect x="14" y="250" width="92" height="120" rx="6" fill="#0d0c10" stroke="#2c2b33" strokeWidth="3" />
        <rect x="24" y="262" width="72" height="12" rx="3" fill="#cfc8b4" opacity=".7" />
        <circle cx="60" cy="322" r="30" fill="#18171c" stroke="#2c2b33" strokeWidth="3" />
        {/* the wearer, from the back: arms bare where the sleeves were cut */}
        <path d="M124 140 Q112 200 110 268" stroke="#b98d6e" strokeWidth="20" strokeLinecap="round" fill="none" />
        <path d="M196 140 Q208 200 210 268" stroke="#b98d6e" strokeWidth="20" strokeLinecap="round" fill="none" />
        <rect x="148" y="104" width="24" height="26" rx="8" fill="#a9805f" />
        <circle cx="160" cy="88" r="28" fill="#1c1715" />
        <rect x="124" y="280" width="34" height="120" rx="10" fill="#1d2230" />
        <rect x="162" y="280" width="34" height="120" rx="10" fill="#1d2230" />
        <svg x="70" y="112" width="180" height="192" viewBox="0 0 300 320">
          <GarmentPreview design={worn} logo={logo} size={300} side="back" title={`${design.name}, cut by ${w.name}`} />
        </svg>
        <rect width="320" height="400" fill="url(#wp-light)" />
        <rect width="320" height="400" fill="#7fb4ff" opacity=".06" />
      </svg>
      <figcaption className="worn-caption">
        {caption} · {d.season} wk {d.weekOfSeason}
      </figcaption>
    </figure>
  );
}
