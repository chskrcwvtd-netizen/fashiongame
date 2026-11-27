import { useId } from 'react';
import { COLORS, type DesignInput, type LogoChoice } from '../../engine';
import { EmblemShape } from './Emblem';

interface Shape {
  /** silhouette (pattern is clipped to this) */
  body: string[];
  /** drawn behind the body */
  back?: string[];
  /** secondary-colour trim */
  trim: string[];
  /** shadowed openings (hood inside) */
  inner?: string[];
  /** dark detail lines */
  lines?: string[];
  graphic: { x: number; y: number; size: number; w: number };
  /** where a back print goes */
  backArea: { x: number; y: number; size: number; w: number };
  /** front-only details hidden on the back view (indexes into trim) */
  frontOnlyTrim?: number[];
}

const SHAPES: Record<DesignInput['garment'], Shape> = {
  tee: {
    body: ['M95 40 L125 30 Q150 52 175 30 L205 40 L262 82 L238 122 L212 108 L212 292 L88 292 L88 108 L62 122 L38 82 Z'],
    trim: ['M122 31 Q150 60 178 31 L172 29 Q150 50 128 29 Z', 'M38 82 L46 74 L68 116 L62 122 Z', 'M262 82 L254 74 L232 116 L238 122 Z'],
    graphic: { x: 150, y: 150, size: 74, w: 110 },
    backArea: { x: 150, y: 140, size: 110, w: 170 },
    frontOnlyTrim: [0],
  },
  hoodie: {
    back: ['M112 52 Q102 4 150 2 Q198 4 188 52 Z'],
    body: ['M90 60 L118 44 L182 44 L210 60 L262 110 L274 252 L240 258 L228 132 L222 292 L78 292 L72 132 L60 258 L26 252 L38 110 Z'],
    inner: ['M128 48 Q126 20 150 18 Q174 20 172 48 Q150 58 128 48 Z'],
    trim: [
      'M26 240 L61 246 L60 258 L26 252 Z',
      'M274 240 L239 246 L240 258 L274 252 Z',
      'M78 274 L222 274 L222 292 L78 292 Z',
    ],
    lines: ['M108 212 L192 212 L204 262 L96 262 Z', 'M138 56 L136 104', 'M162 56 L164 104'],
    graphic: { x: 150, y: 150, size: 66, w: 104 },
    backArea: { x: 150, y: 150, size: 100, w: 160 },
  },
  cargo: {
    body: ['M88 40 L212 40 L224 302 L162 302 L150 122 L138 302 L76 302 Z'],
    trim: ['M88 18 L212 18 L212 40 L88 40 Z', 'M80 158 L114 158 L114 172 L80 172 Z', 'M220 158 L186 158 L186 172 L220 172 Z'],
    lines: ['M80 172 L114 172 L116 214 L82 214 Z', 'M220 172 L186 172 L184 214 L218 214 Z', 'M150 40 L150 122', 'M100 40 L106 80'],
    graphic: { x: 118, y: 96, size: 34, w: 46 },
    backArea: { x: 182, y: 100, size: 40, w: 56 },
  },
  puffer: {
    body: ['M80 52 L120 38 L180 38 L220 52 L268 102 L278 250 L242 258 L230 132 L226 288 L74 288 L70 132 L58 258 L22 250 L32 102 Z'],
    trim: ['M110 18 L190 18 L192 54 L108 54 Z', 'M148 54 L152 54 L152 288 L148 288 Z'],
    lines: [
      'M74 92 Q150 104 226 92', 'M72 132 Q150 146 228 132', 'M72 172 Q150 186 228 172', 'M74 212 Q150 226 226 212', 'M74 252 Q150 266 226 252',
      'M36 150 L64 152', 'M30 196 L62 198', 'M264 150 L236 152', 'M270 196 L238 198',
    ],
    graphic: { x: 190, y: 112, size: 34, w: 50 },
    backArea: { x: 150, y: 150, size: 90, w: 150 },
    frontOnlyTrim: [1],
  },
  cap: {
    body: ['M62 196 Q60 72 150 66 Q240 72 238 196 Z'],
    trim: ['M36 196 Q150 166 282 200 Q292 232 250 236 Q150 214 38 218 Q26 206 36 196 Z', 'M142 60 Q150 54 158 60 Q158 70 150 70 Q142 70 142 60 Z'],
    lines: ['M150 68 L150 190', 'M150 68 Q100 90 92 194', 'M150 68 Q200 90 208 194'],
    graphic: { x: 150, y: 138, size: 58, w: 96 },
    backArea: { x: 150, y: 150, size: 40, w: 90 },
  },
  beanie: {
    body: ['M72 222 Q66 64 150 58 Q234 64 228 222 Z'],
    trim: ['M60 200 L240 200 L244 266 L56 266 Z', 'M150 30 a24 24 0 1 1 -0.1 0 Z'],
    lines: ['M84 204 L82 262', 'M108 204 L107 262', 'M132 204 L131 262', 'M156 204 L156 262', 'M180 204 L181 262', 'M204 204 L206 262', 'M228 204 L230 262'],
    graphic: { x: 150, y: 233, size: 40, w: 150 },
    backArea: { x: 150, y: 233, size: 36, w: 150 },
  },
  track: {
    body: ['M92 50 L122 36 L178 36 L208 50 L262 110 L274 252 L240 258 L228 132 L222 292 L78 292 L72 132 L60 258 L26 252 L38 110 Z'],
    trim: [
      'M148 44 L152 44 L152 292 L148 292 Z',
      'M118 20 L182 20 L184 46 L116 46 Z',
      'M44 106 L54 102 L72 250 L62 252 Z',
      'M256 106 L246 102 L228 250 L238 252 Z',
      'M78 276 L222 276 L222 292 L78 292 Z',
    ],
    lines: ['M100 200 L130 200', 'M170 200 L200 200'],
    graphic: { x: 190, y: 106, size: 34, w: 50 },
    backArea: { x: 150, y: 140, size: 100, w: 160 },
    frontOnlyTrim: [0],
  },
  sneakers: {
    body: ['M34 236 Q36 196 70 182 L120 168 Q140 128 176 120 L206 132 Q214 160 240 170 L270 180 Q292 190 290 220 L290 236 Z'],
    trim: [
      'M26 232 L296 232 L294 258 Q160 272 30 260 Z',
      'M118 196 Q160 150 226 176 Q196 200 130 214 Z',
      'M176 120 L206 132 L204 142 L172 132 Z',
    ],
    lines: ['M150 134 L170 150', 'M158 128 L180 144', 'M140 142 L160 158', 'M60 214 L280 214'],
    graphic: { x: 200, y: 200, size: 34, w: 56 },
    backArea: { x: 60, y: 206, size: 30, w: 40 },
  },
  bag: {
    back: ['M86 112 Q150 -20 214 112 L202 116 Q150 6 98 116 Z'],
    body: ['M60 130 Q60 110 82 110 L218 110 Q240 110 240 130 L240 270 Q240 292 218 292 L82 292 Q60 292 60 270 Z'],
    trim: ['M60 130 Q60 110 82 110 L218 110 Q240 110 240 130 L240 176 Q150 206 60 176 Z', 'M138 186 L162 186 L162 206 L138 206 Z'],
    lines: ['M76 250 L224 250'],
    graphic: { x: 150, y: 236, size: 40, w: 120 },
    backArea: { x: 150, y: 220, size: 70, w: 140 },
  },
  jewelry: {
    back: ['M60 24 Q150 210 240 24 L230 24 Q150 194 70 24 Z'],
    body: ['M150 150 L206 196 L150 290 L94 196 Z'],
    trim: ['M140 140 Q150 128 160 140 L156 156 L144 156 Z'],
    lines: ['M150 160 L150 280', 'M108 196 L192 196'],
    graphic: { x: 150, y: 210, size: 50, w: 70 },
    backArea: { x: 150, y: 210, size: 40, w: 70 },
  },
  jeans: {
    body: ['M86 40 L214 40 L230 302 L166 302 L150 120 L134 302 L70 302 Z'],
    trim: ['M86 22 L214 22 L214 40 L86 40 Z'],
    lines: ['M100 40 Q110 80 140 84', 'M200 40 Q190 80 160 84', 'M150 40 L150 120', 'M74 280 L134 280', 'M166 280 L226 280'],
    graphic: { x: 112, y: 120, size: 30, w: 40 },
    backArea: { x: 186, y: 100, size: 30, w: 40 },
  },
  shorts: {
    body: ['M80 70 L220 70 L236 220 L162 226 L150 140 L138 226 L64 220 Z'],
    trim: ['M80 50 L220 50 L220 70 L80 70 Z'],
    lines: ['M150 70 L150 140', 'M68 200 L138 206', 'M162 206 L232 200'],
    graphic: { x: 112, y: 150, size: 32, w: 44 },
    backArea: { x: 186, y: 130, size: 30, w: 44 },
  },
  perfume: {
    body: ['M92 126 L208 126 Q232 126 232 150 L232 278 Q232 302 208 302 L92 302 Q68 302 68 278 L68 150 Q68 126 92 126 Z'],
    trim: ['M128 96 L172 96 L172 128 L128 128 Z', 'M116 40 L184 40 Q190 40 190 46 L190 96 L110 96 L110 46 Q110 40 116 40 Z'],
    lines: ['M90 176 L210 176 L210 262 L90 262 Z'],
    graphic: { x: 150, y: 219, size: 56, w: 112 },
    backArea: { x: 150, y: 219, size: 40, w: 100 },
  },
};

const FONT_FAMILY: Record<DesignInput['font'], string> = {
  gothic: "'UnifrakturMaguntia', serif",
  bubble: "'Rubik Bubbles', sans-serif",
  chrome: "'Unbounded', sans-serif",
  graffiti: "'Permanent Marker', cursive",
};

function hex(id: string) {
  return COLORS[id]?.hex ?? '#888';
}

function luminance(h: string) {
  const n = parseInt(h.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function shade(h: string, amt: number) {
  const n = parseInt(h.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export interface GarmentPreviewProps {
  design: DesignInput;
  logo?: LogoChoice;
  size?: number;
  className?: string;
  title?: string;
  side?: 'front' | 'back';
}

export function GarmentPreview({ design, logo, size = 300, className, title, side = 'front' }: GarmentPreviewProps) {
  const back = side === 'back';
  const finish = design.finish ?? 'print';
  const uid = useId().replace(/:/g, '');
  const shape = SHAPES[design.garment];
  const p = hex(design.primary);
  const sc = hex(design.secondary);
  const same = design.primary === design.secondary;
  const ink = same ? (luminance(p) > 0.5 ? '#141218' : '#f3f1ff') : sc;
  const hole = p;
  const clip = `clip-${uid}`;
  const pat = `pat-${uid}`;
  const shadeId = `shade-${uid}`;
  const chromeId = `chrome-${uid}`;
  const weave = `weave-${uid}`;
  const showTextile = ['tee', 'hoodie', 'cargo', 'puffer', 'cap', 'beanie', 'track', 'jeans', 'shorts', 'bag'].includes(design.garment);

  const patternFill = (() => {
    switch (design.pattern) {
      case 'camo':
        return (
          <pattern id={pat} width="90" height="90" patternUnits="userSpaceOnUse">
            <path d="M0 10 Q20 0 34 14 T60 20 Q70 40 50 44 T20 40 Q0 34 0 10Z" fill={sc} opacity=".85" />
            <path d="M50 54 Q70 48 86 62 T88 86 Q66 92 56 80 T50 54Z" fill={shade(p, -0.12)} />
            <path d="M8 58 Q22 52 34 64 Q30 84 14 80 Q2 72 8 58Z" fill={shade(sc, 0.15)} opacity=".7" />
            <path d="M64 4 Q80 2 86 16 Q78 30 66 22Z" fill={shade(p, 0.12)} />
          </pattern>
        );
      case 'checker':
        return (
          <pattern id={pat} width="28" height="28" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill={sc} />
            <rect x="14" y="14" width="14" height="14" fill={sc} />
          </pattern>
        );
      case 'stripes':
        return (
          <pattern id={pat} width="30" height="30" patternUnits="userSpaceOnUse">
            <rect y="0" width="30" height="11" fill={sc} />
          </pattern>
        );
      case 'grid':
        return (
          <pattern id={pat} width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M22 0 L0 0 0 22" fill="none" stroke={sc} strokeWidth="1.6" opacity=".9" />
          </pattern>
        );
      case 'gradient':
        return (
          <linearGradient id={pat} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p} stopOpacity="0" />
            <stop offset="1" stopColor={sc} />
          </linearGradient>
        );
      case 'tiedye':
        return (
          <radialGradient id={pat} cx="0.45" cy="0.42" r="0.7" spreadMethod="reflect">
            <stop offset="0" stopColor={sc} />
            <stop offset="0.18" stopColor={p} stopOpacity="0.1" />
            <stop offset="0.32" stopColor={sc} stopOpacity="0.9" />
            <stop offset="0.5" stopColor={shade(p, 0.15)} stopOpacity="0.2" />
            <stop offset="0.7" stopColor={sc} stopOpacity="0.8" />
            <stop offset="1" stopColor={p} stopOpacity="0" />
          </radialGradient>
        );
      default:
        return null;
    }
  })();

  const stitch = finish === 'embroidery';
  const g = back ? shape.backArea : shape.graphic;
  let graphic: JSX.Element | null = null;
  const backKind = design.back ?? 'none';
  if (back && backKind === 'logo') {
    graphic = <EmblemShape id={logo?.glyph ?? 'star'} fill={logo ? hex(logo.color) : ink} hole={hole} x={g.x - g.size / 2} y={g.y - g.size / 2} size={g.size} stitch={stitch} />;
  } else if (back && backKind === 'text' && (design.backText ?? '').trim()) {
    const text = design.backText.trim();
    const fs = Math.min(g.size * 0.5, (g.w / Math.max(1, text.length)) * 1.8);
    graphic = (
      <text x={g.x} y={g.y} textAnchor="middle" dominantBaseline="central" fontFamily={FONT_FAMILY[design.font]} fontSize={fs} fontWeight={design.font === 'chrome' ? 800 : 400} fill={design.font === 'chrome' ? `url(#${chromeId})` : ink} stroke={stitch ? '#000' : 'none'} strokeOpacity={0.4} strokeDasharray={stitch ? '2 1.5' : undefined} strokeWidth={stitch ? 1 : 0}>
        {text}
      </text>
    );
  } else if (back) {
    graphic = null;
  } else if (design.graphic === 'emblem') {
    const id = design.emblem === 'logo' ? logo?.glyph ?? 'star' : design.emblem;
    const fill = design.emblem === 'logo' && logo ? hex(logo.color) : ink;
    graphic = <EmblemShape id={id} fill={fill} hole={hole} x={g.x - g.size / 2} y={g.y - g.size / 2} size={g.size} stitch={stitch} />;
  } else if (design.graphic === 'pixel' && design.pixels) {
    const cell = g.size / 8;
    graphic = (
      <g>
        {[...design.pixels].map((c, i) =>
          c === '1' ? <rect key={i} x={g.x - g.size / 2 + (i % 8) * cell} y={g.y - g.size / 2 + Math.floor(i / 8) * cell} width={cell + 0.3} height={cell + 0.3} fill={ink} /> : null,
        )}
      </g>
    );
  } else if (design.graphic === 'text' && design.text.trim()) {
    const text = design.text.trim();
    const fs = Math.min(g.size * 0.62, (g.w / Math.max(1, text.length)) * 1.7);
    graphic = (
      <text
        x={g.x}
        y={g.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT_FAMILY[design.font]}
        fontSize={fs}
        fontWeight={design.font === 'chrome' ? 800 : 400}
        fill={design.font === 'chrome' ? `url(#${chromeId})` : ink}
        stroke={stitch ? '#000' : design.font === 'chrome' ? '#0b0a10' : 'none'}
        strokeOpacity={stitch ? 0.45 : 1}
        strokeDasharray={stitch ? '2 1.5' : undefined}
        strokeWidth={stitch ? 1 : design.font === 'chrome' ? 0.8 : 0}
        letterSpacing={design.font === 'chrome' ? -0.5 : 0}
      >
        {text}
      </text>
    );
  }

  return (
    <svg className={className} width={size} height={(size * 320) / 300} viewBox="0 0 300 320" role="img" aria-label={title ?? `${design.name} preview`} data-testid="garment-preview">
      <defs>
        <clipPath id={clip}>
          {shape.body.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </clipPath>
        {patternFill}
        {showTextile && (
          <pattern id={weave} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform={design.garment === 'jeans' ? 'rotate(35)' : undefined}>
            <path d="M0 0h3M0 1.5h3M0 0v3" stroke="#fff" strokeOpacity=".14" strokeWidth=".35" />
            <path d="M0 2.5h3M2.5 0v3" stroke="#000" strokeOpacity=".35" strokeWidth=".45" />
          </pattern>
        )}
        <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".24" />
          <stop offset=".27" stopColor="#fff" stopOpacity=".27" />
          <stop offset=".49" stopColor="#fff" stopOpacity="0" />
          <stop offset=".73" stopColor="#000" stopOpacity=".20" />
          <stop offset=".85" stopColor="#fff" stopOpacity=".08" />
          <stop offset="1" stopColor="#000" stopOpacity=".43" />
        </linearGradient>
        <filter id={`blur-${uid}`}>
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <linearGradient id={chromeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".45" stopColor="#a9b0c2" />
          <stop offset=".52" stopColor="#3d4250" />
          <stop offset=".75" stopColor="#dfe4ee" />
          <stop offset="1" stopColor="#8a90a0" />
        </linearGradient>
      </defs>
      {shape.back?.map((d, i) => (
        <path key={`b${i}`} d={d} fill={shade(p, -0.08)} stroke="#06050a" strokeOpacity=".7" strokeWidth="2.5" />
      ))}
      {shape.body.map((d, i) => (
        <path key={`p${i}`} d={d} fill={p} />
      ))}
      <g clipPath={`url(#${clip})`}>
        {design.pattern === 'flames' && (
          <path
            d="M0 320 L0 250 Q20 200 30 240 Q40 170 60 230 Q70 150 92 222 Q104 160 120 226 Q134 140 150 220 Q166 150 180 226 Q196 160 208 222 Q230 150 240 230 Q260 170 270 240 Q280 200 300 250 L300 320 Z"
            fill={sc}
          />
        )}
        {patternFill && <rect x="0" y="0" width="300" height="320" fill={`url(#${pat})`} />}
        {showTextile && <rect width="300" height="320" fill={`url(#${weave})`} opacity={design.material === 'luxe' ? 0.55 : 1} />}
        {!back &&
          shape.lines?.map((d, i) => (
            <path key={`l${i}`} d={d} fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="2" />
          ))}
        {finish === 'washed' && (
          <g opacity=".22">
            {[[70, 90, 60], [190, 70, 70], [120, 200, 80], [230, 230, 55], [60, 260, 50]].map(([cx, cy, r], i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="#fff" filter={`url(#blur-${uid})`} />
            ))}
            <rect width="300" height="320" fill="#fff" opacity=".35" />
          </g>
        )}
        {finish === 'distressed' && (
          <g stroke="#000" strokeOpacity=".6" strokeLinecap="round" fill="none">
            <path d="M104 120 l14 3 M110 124 l10 1" strokeWidth="3" />
            <path d="M180 176 l16 -2 M184 180 l9 0" strokeWidth="3" />
            <path d="M124 236 l12 4" strokeWidth="3" />
            <path d="M80 286 l4 8 M96 287 l2 7 M118 288 l4 7 M146 287 l2 8 M170 288 l3 6 M196 287 l4 8 M214 286 l2 7" strokeWidth="2" />
          </g>
        )}
        <rect x="0" y="0" width="300" height="320" fill={`url(#${shadeId})`} />
        {showTextile && shape.body.map((d, i) => (
          <path key={`seam-${i}`} d={d} fill="none" stroke={shade(p, 0.23)} strokeWidth="5" strokeDasharray="1 3" opacity=".65" />
        ))}
      </g>
      {!back && shape.inner?.map((d, i) => (
        <path key={`in${i}`} d={d} fill={shade(p, luminance(p) > 0.25 ? -0.3 : -0.06)} stroke={sc} strokeWidth="5" />
      ))}
      {shape.trim.map((d, i) => back && shape.frontOnlyTrim?.includes(i) ? null : (
        <path key={`t${i}`} d={d} fill={same ? shade(p, -0.15) : sc} stroke="#06050a" strokeOpacity=".5" strokeWidth="1.5" />
      ))}
      {graphic}
      {shape.body.map((d, i) => (
        <path key={`o${i}`} d={d} fill="none" stroke="#06050a" strokeOpacity=".75" strokeWidth="2.5" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
