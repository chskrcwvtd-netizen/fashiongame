import { useId } from 'react';
import { COLORS, type Design, type GameState } from '../../engine';
import { EmblemShape } from './Emblem';
import { GarmentPreview } from './GarmentPreview';

interface Props {
  state: GameState;
  queue: number;
}

function Box({ x, y, w = 54, h = 40 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#8a6a43" stroke="#2b1f12" strokeWidth="2" />
      <rect x={x} y={y} width={w} height={8} fill="#a5814f" />
      <rect x={x + w / 2 - 5} y={y} width={10} height={h} fill="#c9b48a" opacity=".55" />
    </g>
  );
}

function Person({ x, y, color, delay, scale = 1 }: { x: number; y: number; color: string; delay: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className="hq-bob" style={{ animationDelay: `${delay}s` }}>
        <rect x={-13} y={-62} width={26} height={44} rx={10} fill={color} />
        <rect x={-11} y={-20} width={9} height={20} rx={3} fill="#15121d" />
        <rect x={2} y={-20} width={9} height={20} rx={3} fill="#15121d" />
        <circle cx={0} cy={-72} r={10} fill="#d9b99b" />
        <path d="M-11 -76 Q0 -90 11 -76 L11 -72 L-11 -72Z" fill="#15121d" />
      </g>
    </g>
  );
}

function Rack({ x, y, designs, width = 150 }: { x: number; y: number; designs: Design[]; width?: number }) {
  const n = Math.max(3, Math.min(7, designs.length + 2));
  return (
    <g>
      <rect x={x} y={y} width={width} height={4} fill="#c4cad6" />
      <rect x={x + 4} y={y} width={4} height={130} fill="#9aa1b0" />
      <rect x={x + width - 8} y={y} width={4} height={130} fill="#9aa1b0" />
      {Array.from({ length: n }).map((_, i) => {
        const d = designs[i % Math.max(1, designs.length)];
        const c = d ? COLORS[d.primary]?.hex ?? '#555' : ['#2a2733', '#3a3546', '#22202b'][i % 3];
        const cx = x + 18 + i * ((width - 36) / Math.max(1, n - 1));
        return (
          <g key={i}>
            <path d={`M${cx} ${y + 2} l0 10`} stroke="#c4cad6" strokeWidth="2" />
            <path d={`M${cx - 15} ${y + 14} L${cx + 15} ${y + 14} L${cx + 13} ${y + 74} L${cx - 13} ${y + 74} Z`} fill={c} stroke="#08070c" strokeWidth="1.5" />
          </g>
        );
      })}
    </g>
  );
}

export function HQScene({ state, queue }: Props) {
  const uid = useId().replace(/:/g, '');
  const level = state.hqLevel;
  const latest = state.designs[state.designs.length - 1];
  const units = Object.values(state.inventory).reduce((a, l) => a + l.units, 0);
  const boxes = Math.min(level === 0 ? 9 : 16, Math.ceil(units / (level === 0 ? 45 : 140)));
  const logoColor = COLORS[state.brand.logo.color]?.hex ?? '#ff3ec8';
  const glow = `glow-${uid}`;
  const brick = `brick-${uid}`;
  const light = `light-${uid}`;
  const name = state.brand.name;

  const wall = level === 0 ? '#1b1724' : level === 1 ? '#2a1a1f' : '#191a24';
  const floor = level === 0 ? '#121019' : level === 1 ? '#2b2018' : '#2a2c38';

  const boxSpots: Array<[number, number]> = [];
  for (let i = 0; i < boxes; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    boxSpots.push([level === 2 ? 70 + col * 56 : 60 + col * 58, 470 - row * 40 - (col % 2) * 2]);
  }

  return (
    <svg className="hq-scene" viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`${name} headquarters`} data-testid="hq-scene">
      <defs>
        <filter id={glow} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id={brick} width="60" height="30" patternUnits="userSpaceOnUse">
          <rect width="60" height="30" fill="#3a1f22" />
          <path d="M0 0H60M0 15H60M30 0V15M0 15V30M60 15V30" stroke="#24120f" strokeWidth="3" />
        </pattern>
        <radialGradient id={light} cx="0.5" cy="0" r="0.9">
          <stop offset="0" stopColor="#ffe9b0" stopOpacity=".35" />
          <stop offset="1" stopColor="#ffe9b0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* room shell */}
      <rect width="960" height="540" fill="#07060b" />
      <rect x="0" y="0" width="960" height="400" fill={level === 1 ? `url(#${brick})` : wall} />
      <path d="M0 400 L960 400 L960 540 L0 540 Z" fill={floor} />
      <path d="M0 400 L960 400" stroke="#000" strokeOpacity=".6" strokeWidth="4" />

      {level === 0 && (
        <g>
          {/* pipes + street window */}
          <rect x="0" y="22" width="960" height="10" fill="#2d2838" />
          <rect x="0" y="40" width="960" height="6" fill="#26222f" />
          <rect x="560" y="60" width="300" height="70" fill="#0e2230" stroke="#3a3447" strokeWidth="6" />
          <rect x="560" y="60" width="300" height="70" fill="#6cf2ff" opacity=".08" />
          <g className="hq-walk">
            <rect x="600" y="92" width="10" height="38" fill="#0a0910" />
            <rect x="616" y="96" width="10" height="34" fill="#0a0910" />
            <rect x="740" y="90" width="10" height="40" fill="#0a0910" />
            <rect x="756" y="94" width="10" height="36" fill="#0a0910" />
          </g>
          <path d="M700 60 L700 130 M630 60 L630 130 M770 60 L770 130" stroke="#3a3447" strokeWidth="4" />
          {/* bulb */}
          <path d="M470 46 L470 120" stroke="#111" strokeWidth="2" />
          <circle cx="470" cy="128" r="10" fill="#ffe9b0" className="hq-bulb" />
          <path d="M470 128 L260 540 L700 540 Z" fill={`url(#${light})`} className="hq-bulb" />
          {/* door */}
          <rect x="880" y="230" width="70" height="170" fill="#100e16" stroke="#3a3447" strokeWidth="5" />
          <circle cx="894" cy="320" r="4" fill="#9aa1b0" />
        </g>
      )}

      {level === 1 && (
        <g>
          <rect x="520" y="40" width="380" height="250" fill="#0b1426" stroke="#16131c" strokeWidth="10" />
          <circle cx="840" cy="90" r="22" fill="#e8e1cf" opacity=".85" />
          <path d="M520 290 L520 220 L560 220 L560 180 L600 180 L600 240 L640 240 L640 150 L690 150 L690 230 L730 230 L730 200 L770 200 L770 160 L800 160 L800 240 L850 240 L850 205 L900 205 L900 290 Z" fill="#05070e" />
          {[548, 572, 652, 668, 744, 812, 866].map((x, i) => (
            <rect key={i} x={x} y={190 + (i % 3) * 22} width="6" height="8" fill="#ffe08a" opacity=".8" />
          ))}
          <path d="M710 40 L710 290 M520 165 L900 165" stroke="#16131c" strokeWidth="8" />
          {/* ring light */}
          <circle cx="430" cy="210" r="34" fill="none" stroke="#f3f1ff" strokeWidth="8" filter={`url(#${glow})`} className="hq-bulb" />
          <path d="M430 244 L430 400 M410 400 L450 400" stroke="#9aa1b0" strokeWidth="4" />
          {/* cutting table */}
          <rect x="560" y="352" width="260" height="14" fill="#d6c6a4" />
          <rect x="572" y="366" width="10" height="70" fill="#5d4a33" />
          <rect x="798" y="366" width="10" height="70" fill="#5d4a33" />
          <rect x="600" y="340" width="90" height="12" fill={COLORS[latest?.primary ?? 'black']?.hex} opacity=".9" />
          {/* plant */}
          <rect x="880" y="420" width="44" height="50" fill="#2d2838" />
          <path d="M902 420 Q880 370 860 360 M902 420 Q905 360 920 340 M902 420 Q930 380 948 376" stroke="#3f8a55" strokeWidth="8" fill="none" strokeLinecap="round" />
        </g>
      )}

      {level === 2 && (
        <g>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={i * 120} y="0" width="118" height="400" fill={i % 2 ? '#1d1e2a' : '#20222f'} />
          ))}
          <path d="M0 60 H960" stroke="#c4cad6" strokeOpacity=".25" strokeWidth="2" />
          {/* glass storefront at the right with the street */}
          <rect x="700" y="90" width="250" height="310" fill="#0b1426" stroke="#c4cad6" strokeWidth="6" />
          <rect x="700" y="90" width="250" height="310" fill="#6cf2ff" opacity=".07" />
          <path d="M825 90 V400" stroke="#c4cad6" strokeWidth="4" />
          {/* shelves */}
          {[150, 220, 290].map((y) => (
            <g key={y}>
              <rect x="300" y={y} width="300" height="8" fill="#c4cad6" />
              {[0, 1, 2, 3, 4].map((j) => {
                const d = state.designs[(j + y) % Math.max(1, state.designs.length)];
                return <rect key={j} x={312 + j * 58} y={y - 22} width="44" height="22" rx="3" fill={d ? COLORS[d.primary]?.hex : '#2a2733'} stroke="#08070c" />;
              })}
            </g>
          ))}
          {/* podium */}
          <ellipse cx="640" cy="470" rx="70" ry="16" fill="#c4cad6" />
          <rect x="570" y="440" width="140" height="30" fill="#8a90a0" />
          <ellipse cx="640" cy="440" rx="70" ry="16" fill="#e9edf5" />
          {[0, 1, 2].map((i) => (
            <Person key={i} x={360 + i * 110} y={500 + (i % 2) * 14} color={['#7b3fe4', '#19c7ff', '#b3121f'][i]} delay={i * 0.4} scale={0.9} />
          ))}
        </g>
      )}

      {/* neon sign */}
      <g className="hq-neon" filter={`url(#${glow})`}>
        <EmblemShape id={state.brand.logo.glyph} fill={logoColor} hole={wall} x={level === 2 ? 70 : 60} y={level === 2 ? 90 : 120} size={level === 2 ? 70 : 54} />
        <text
          x={level === 2 ? 160 : 130}
          y={level === 2 ? 140 : 160}
          fontFamily="'Unbounded', sans-serif"
          fontWeight={800}
          fontSize={level === 2 ? 50 : level === 1 ? 40 : 32}
          fill="none"
          stroke={logoColor}
          strokeWidth={2.4}
        >
          {name}
        </text>
      </g>

      {/* rack */}
      {level < 2 && <Rack x={level === 0 ? 300 : 120} y={level === 0 ? 260 : 230} designs={state.designs.slice(-5)} />}
      {level === 1 && <Rack x={300} y={230} designs={state.designs.slice(-8, -3)} width={120} />}

      {/* desk + laptop */}
      {level < 2 && (
        <g transform={level === 0 ? 'translate(560 330)' : 'translate(40 120)'}>
          {level === 0 && (
            <>
              <rect x="0" y="40" width="200" height="12" fill="#3a3447" />
              <rect x="10" y="52" width="10" height="80" fill="#2d2838" />
              <rect x="180" y="52" width="10" height="80" fill="#2d2838" />
              <rect x="60" y="0" width="80" height="40" rx="3" fill="#0b0a10" stroke="#9aa1b0" strokeWidth="2" />
              <rect x="64" y="4" width="72" height="32" fill="#6cf2ff" opacity=".25" className="hq-screen" />
              <path d="M68 30 L84 22 L96 26 L112 12 L132 8" stroke="#d4ff3a" strokeWidth="2" fill="none" />
              <rect x="50" y="40" width="100" height="4" fill="#9aa1b0" />
            </>
          )}
        </g>
      )}

      {/* boxes = inventory */}
      {boxSpots.map(([x, y], i) => (
        <Box key={i} x={x} y={y} />
      ))}

      {/* mannequin with the latest design */}
      {latest && (
        <g transform={level === 2 ? 'translate(575 260)' : level === 1 ? 'translate(470 230)' : 'translate(430 250)'}>
          <rect x="62" y="150" width="6" height={level === 2 ? 40 : 110} fill="#9aa1b0" />
          <ellipse cx="65" cy={level === 2 ? 190 : 262} rx="34" ry="7" fill="#9aa1b0" />
          <circle cx="65" cy="-8" r="14" fill="#c4cad6" />
          <svg x="0" y="0" width="130" height="139" viewBox="0 0 300 320">
            <GarmentPreview design={latest} logo={state.brand.logo} size={300} />
          </svg>
        </g>
      )}

      {/* the queue on drop day */}
      {Array.from({ length: queue }).map((_, i) => (
        <Person
          key={`q${i}`}
          x={level === 0 ? 860 - i * 38 : level === 2 ? 920 - i * 34 : 920 - i * 40}
          y={530 - (i % 2) * 10}
          color={['#ff3ec8', '#19c7ff', '#c6ff1a', '#7b3fe4', '#ff7a1a', '#e8e1cf'][i % 6]}
          delay={i * 0.17}
          scale={0.85}
        />
      ))}
    </svg>
  );
}
