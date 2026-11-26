/** Hand-drawn emblem glyphs on a 24×24 grid. `hole` paints cut-outs (eyes, keyholes). */
interface Glyph {
  body: string;
  holes?: string;
  stroke?: boolean;
}

export const GLYPHS: Record<string, Glyph> = {
  star: { body: 'M12 0C12.9 7.6 16.4 11.1 24 12 16.4 12.9 12.9 16.4 12 24 11.1 16.4 7.6 12.9 0 12 7.6 11.1 11.1 7.6 12 0Z' },
  skull: {
    body: 'M12 1.5C6.6 1.5 3 5.4 3 10.2c0 3.1 1.4 5.3 3.4 6.5V21h2.4v-2.2h2V21h2.4v-2.2h2V21h2.4v-4.3c2-1.2 3.4-3.4 3.4-6.5 0-4.8-3.6-8.7-9-8.7Z',
    holes: 'M8.4 8.2a2.3 2.5 0 1 0 0.01 0ZM15.6 8.2a2.3 2.5 0 1 0 0.01 0ZM12 13l1.4 2.6h-2.8Z',
  },
  flame: { body: 'M12.5 0.5c.8 4.3 6.5 6.6 6.5 12.6a7 7 0 0 1-14 0c0-3.4 1.9-5 2.6-7.9 1.6 1.6 2 3.4 2 3.4s2.3-3 2.9-8.1Z', holes: 'M12 23a3.4 3.4 0 0 1-3.4-3.4c0-2.2 2.2-3.3 2.7-5.6 1.9 1.8 4.1 3.2 4.1 5.6A3.4 3.4 0 0 1 12 23Z' },
  wings: {
    body: 'M11 9C8 4 3.5 3 0 3.5 1.8 5 2.6 6.4 3 8c-1.4 0-2.4.3-3 .8 1.6.6 2.6 1.6 3.2 2.9-1 .2-1.8.6-2.2 1.2 3.6 0 6.8.6 10 3.1ZM13 9c3-5 7.5-6 11-5.5C22.2 5 21.4 6.4 21 8c1.4 0 2.4.3 3 .8-1.6.6-2.6 1.6-3.2 2.9 1 .2 1.8.6 2.2 1.2-3.6 0-6.8.6-10 3.1ZM12 8.5a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2ZM11 13h2l.6 9h-3.2Z',
  },
  barbed: {
    stroke: true,
    body: 'M0 12c3-4 6-4 9 0s6 4 9 0 4.5-3 6-2M6 7.5l3 4.5M9 7.5l-3 4.5M15 12l3 4.5M18 12l-3 4.5',
  },
  alien: {
    body: 'M12 1C6 1 2.5 5.2 2.5 10c0 5.6 5.4 12.5 9.5 12.5S21.5 15.6 21.5 10C21.5 5.2 18 1 12 1Z',
    holes: 'M5.6 9.6c1.6-.6 4.6.4 5 3.2-1.8.8-4.6-.2-5-3.2ZM18.4 9.6c-1.6-.6-4.6.4-5 3.2 1.8.8 4.6-.2 5-3.2ZM10.6 18h2.8v.9h-2.8Z',
  },
  heartlock: {
    body: 'M12 22.5S1 15.6 1 8.4C1 4.7 3.8 2 7 2c2.2 0 3.9 1.2 5 3 1.1-1.8 2.8-3 5-3 3.2 0 6 2.7 6 6.4 0 7.2-11 14.1-11 14.1Z',
    holes: 'M12 7.6a2.2 2.2 0 0 1 1.2 4.1l.9 4.3h-4.2l.9-4.3A2.2 2.2 0 0 1 12 7.6Z',
  },
  bolt: { body: 'M14.2 0 3 13.6h7.2L8.6 24 21 9.4h-7.4L14.2 0Z' },
};

export function EmblemShape({ id, fill, hole, x = 0, y = 0, size = 24 }: { id: string; fill: string; hole: string; x?: number; y?: number; size?: number }) {
  const g = GLYPHS[id] ?? GLYPHS.star;
  const s = size / 24;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {g.stroke ? (
        <path d={g.body} fill="none" stroke={fill} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d={g.body} fill={fill} />
      )}
      {g.holes && <path d={g.holes} fill={hole} />}
    </g>
  );
}

/** Standalone emblem icon (logo pickers, top bar). */
export function EmblemIcon({ id, color, size = 24, hole = '#0a0812' }: { id: string; color: string; size?: number; hole?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <EmblemShape id={id} fill={color} hole={hole} />
    </svg>
  );
}
