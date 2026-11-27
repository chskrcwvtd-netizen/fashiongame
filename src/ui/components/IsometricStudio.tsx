import type { CSSProperties } from 'react';
import { activeDrop, incomingUnits, stockUnits } from '../../engine';
import type { Panel } from '../../store/gameStore';
import { useGame } from '../hooks';

type Point = readonly [number, number, number?];
type Wood = readonly [string, string, string];

const METAL: Wood = ['#b8bfc3', '#626b75', '#828f9b'];
const DESK: Wood = ['#c58b60', '#654d48', '#925f4e'];
const CARTON: Wood = ['#cead72', '#806241', '#a68153'];
const PRESS: Wood = ['#cf528a', '#63375f', '#973e70'];

function project([x, y, z = 0]: Point) {
  return [420 + (x - y) * 35, 166 + (x + y) * 17 - z * 30] as const;
}

function Face({ points, fill, stroke }: { points: Point[]; fill: string; stroke?: string }) {
  return <polygon points={points.map((p) => project(p).join(',')).join(' ')} fill={fill} stroke={stroke} strokeLinejoin="round" />;
}

function Line({ from, to, stroke, width = 1 }: { from: Point; to: Point; stroke: string; width?: number }) {
  const [x1, y1] = project(from);
  const [x2, y2] = project(to);
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={width} strokeLinecap="round" />;
}

function Box({ x, y, w, d, h, z = 0, colors }: { x: number; y: number; w: number; d: number; h: number; z?: number; colors: Wood }) {
  const right = x + w;
  const front = y + d;
  const top = z + h;
  return (
    <g stroke="#24232b" strokeWidth=".7">
      <Face points={[[x, front, z], [right, front, z], [right, front, top], [x, front, top]]} fill={colors[1]} />
      <Face points={[[right, y, z], [right, front, z], [right, front, top], [right, y, top]]} fill={colors[2]} />
      <Face points={[[x, y, top], [right, y, top], [right, front, top], [x, front, top]]} fill={colors[0]} />
    </g>
  );
}

function Table({ x, y, w, d }: { x: number; y: number; w: number; d: number }) {
  return (
    <>
      <Box x={x} y={y + d - .17} w={.18} d={.17} h={1.2} colors={METAL} />
      <Box x={x + w - .18} y={y} w={.18} d={.17} h={1.2} colors={METAL} />
      <Box x={x + w - .18} y={y + d - .17} w={.18} d={.17} h={1.2} colors={METAL} />
      <Box x={x} y={y} w={w} d={d} h={.17} z={1.2} colors={DESK} />
    </>
  );
}

function Person({ x, y, color, skin, active, index }: { x: number; y: number; color: string; skin: string; active: boolean; index: number }) {
  const [left, top] = project([x, y]);
  return (
    <g transform={`translate(${left} ${top})`}>
      <ellipse cx="0" cy="2" rx="17" ry="6" fill="#101019" opacity=".26" />
      <path d="M-9 -32v29l8 2 2-26 3 22 9 2-2-29z" fill="#252938" />
      <g className={active ? 'studio-worker' : undefined} style={{ animationDelay: `${index * -0.43}s` }}>
        <path d="M-12 -53l17-8 10 9-3 26-21 4z" fill={color} stroke="#1c202d" strokeWidth="1.3" />
        <path d="M-10 -50l-6 13 9 6M12 -50l8 10-7 7" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="1" cy="-62" rx="10" ry="12" fill={skin} />
        <path d="M-10 -62q-2-15 13-16 11 2 12 11l-6 4-12-4z" fill="#26202b" />
      </g>
    </g>
  );
}

const STATIONS: { panel: Panel; label: string; marker: string; x: number; y: number }[] = [
  { panel: 'lab', label: 'Design', marker: '✦', x: 38, y: 41 },
  { panel: 'production', label: 'Factories', marker: '▤', x: 70, y: 43 },
  { panel: 'shop', label: 'Webshop', marker: '◇', x: 20, y: 69 },
  { panel: 'drops', label: 'Drops', marker: '↗', x: 58, y: 78 },
];

const STAFF_SPOTS = [[2.2, 6.7], [6.1, 2.6], [6.0, 5.4], [3.5, 8.1], [8.8, 4.1]] as const;
const STAFF_COLORS = ['#ed72a7', '#9bd4d6', '#bdc76e', '#b0a0d2', '#efab75'];
const SKIN = ['#c38364', '#805440', '#e4aa89', '#a16d58'];

export function IsometricStudio({ interactive = true }: { interactive?: boolean }) {
  const { store, s } = useGame();
  const stock = stockUnits(s);
  const incoming = incomingUnits(s);
  const drop = activeDrop(s);
  const boxes = Math.min(7, Math.ceil((stock + incoming) / 55));
  const staffCount = Math.min(STAFF_SPOTS.length, 1 + s.employees.length);
  const hq = s.hqLevel;
  const leftWall = hq === 0 ? '#70888e' : hq === 1 ? '#9a7773' : '#6e777d';
  const rightWall = hq === 0 ? '#4c626b' : hq === 1 ? '#675867' : '#46566b';
  const floor = hq === 0 ? '#6d7780' : hq === 1 ? '#956f5c' : '#879393';

  return (
    <div className={`studio-scene studio-level-${hq}`} aria-hidden={!interactive ? true : undefined}>
      <svg viewBox="0 0 840 540" className="studio-art" role="img" aria-label="Isometric headquarters" data-testid={interactive ? 'hq-scene' : undefined}>
        <ellipse cx="420" cy="482" rx="326" ry="43" fill="#0b101a" opacity=".22" />
        <Box x={0} y={0} w={10} d={10} h={.27} z={-.3} colors={[floor, '#3b4652', '#525f6e']} />
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i} opacity=".28">
            <Line from={[i + 1, 0]} to={[i + 1, 10]} stroke="#273542" />
            <Line from={[0, i + 1]} to={[10, i + 1]} stroke="#273542" />
          </g>
        ))}
        <Face points={[[0, 0], [0, 10], [0, 10, 4], [0, 0, 4]]} fill={leftWall} stroke="#273542" />
        <Face points={[[0, 0], [10, 0], [10, 0, 4], [0, 0, 4]]} fill={rightWall} stroke="#273542" />
        <Line from={[0, 10, 4]} to={[0, 0, 4]} stroke="#b2c1be" width={3} />
        <Line from={[0, 0, 4]} to={[10, 0, 4]} stroke="#9baeb0" width={3} />
        <Face points={[[.01, 1.6, 2.45], [.01, 4.8, 2.45], [.01, 4.8, 3.6], [.01, 1.6, 3.6]]} fill="#1c293c" stroke="#c1cacc" />
        <Face points={[[.03, 1.7, 2.47], [.03, 4.7, 2.47], [.03, 4.7, 2.9], [.03, 1.7, 3.15]]} fill="#90bcc9" />
        <Line from={[.05, 3.1, 2.45]} to={[.05, 3.1, 3.6]} stroke="#556c7e" width={2.5} />
        <Face points={[[6.9, .01, .03], [9.15, .01, .03], [9.15, .01, 3.2], [6.9, .01, 3.2]]} fill="#324453" stroke="#c1cacc" />
        <Face points={[[7.1, .03, 1.37], [8.94, .03, 1.37], [8.94, .03, 2.1], [7.1, .03, 2.1]]} fill="#475969" />
        <Face points={[[1.2, .02, 2.15], [5.7, .02, 2.15], [5.7, .02, 3.31], [1.2, .02, 3.31]]} fill="#242e40" stroke="#8498a5" />
        <Line from={[1.48, .04, 2.46]} to={[4.85, .04, 2.46]} stroke="#a9dfdf" width={3} />
        <Line from={[1.48, .04, 2.81]} to={[3.4, .04, 2.81]} stroke="#f38bb6" width={3} />
        {hq === 0 && <g>
          <Line from={[.1, 5.4, 3.15]} to={[.1, 9.8, 3.15]} stroke="#454f5d" width={5} />
          <Line from={[.1, 9.76, 3.15]} to={[.1, 9.76, .15]} stroke="#454f5d" width={5} />
          <Line from={[.15, 5.55, 3.17]} to={[.15, 7.45, 3.17]} stroke="#e1fffa" width={5} />
        </g>}
        {hq >= 1 && <g>
          <Face points={[[.1, 5.3, 1.4], [.1, 9.5, 1.4], [.1, 9.5, 3.67], [.1, 5.3, 3.67]]} fill={hq === 1 ? '#c89c91' : '#a2cdd0'} stroke="#ece0cc" />
          {[6.4, 7.4, 8.5].map(y => <Line key={y} from={[.13, y, 1.4]} to={[.13, y, 3.67]} stroke="#476166" width={3} />)}
          <Box x={.12} y={5.25} z={1.32} w={.28} d={4.3} h={.11} colors={DESK} />
        </g>}
        <Box x={1.05} y={.1} w={2.75} d={.48} h={.12} z={1.36} colors={DESK} />
        {['#cc6899', '#92cad1', '#bad075', '#d7a983'].map((ink, i) => {
          const [cx, cy] = project([1.4 + i * .55, .32, 1.88]);
          return <g key={ink}><rect x={cx - 4} y={cy} width="8" height="10" rx="1.5" fill={ink} stroke="#303641" /><ellipse cx={cx} cy={cy} rx="4.2" ry="1.8" fill="#d2cfc6" /></g>;
        })}
        <g transform="translate(132 278) skewY(-26)">
          <rect y="-29" width="35" height="49" fill="#ead2ad" stroke="#464146" />
          <path d="M4 8L15-21l16 26-8-4-9-13z" fill="#ae4776" />
          <path d="M5 10h23m-23 4h16" fill="none" stroke="#413843" strokeWidth="2" />
        </g>
        <Face points={[[1.0, 3.5, .03], [4.9, 3.5, .03], [4.9, 7.6, .03], [1.0, 7.6, .03]]} fill="#63536f" />
        <Face points={[[1.25, 3.75, .04], [4.65, 3.75, .04], [4.65, 7.35, .04], [1.25, 7.35, .04]]} fill="#705c82" stroke="#96769b" />
        <Face points={[[.2, 2.1, .06], [2.9, 3.25, .06], [2.9, 6.3, .06], [.2, 5.2, .06]]} fill={hq === 1 ? '#edd2a12a' : '#c1edf22a'} />
        <Table x={1.2} y={3.75} w={2.2} d={1.35} />
        <Box x={1.55} y={3.91} w={.86} d={.62} h={.6} z={1.37} colors={METAL} />
        <Face points={[[1.62, 4.54, 1.48], [2.34, 4.54, 1.48], [2.34, 4.54, 1.87], [1.62, 4.54, 1.87]]} fill="#2e4859" />
        <Line from={[1.78, 4.55, 1.63]} to={[2.16, 4.55, 1.63]} stroke="#b9e8db" width={3} />
        <Box x={2.61} y={4.20} w={.52} d={.53} h={.025} z={1.37} colors={['#f0dcc3', '#b89b80', '#ccb59d']} />
        <Table x={5.1} y={1.5} w={2.35} d={1.8} />
        <Box x={5.4} y={1.72} w={1.78} d={1.17} h={.11} z={1.37} colors={METAL} />
        <Face points={[[5.61, 1.87, 2.45], [6.99, 1.87, 2.45], [6.99, 2.72, 1.62], [5.61, 2.72, 1.62]]} fill={PRESS[0]} stroke="#6d315f" />
        <Face points={[[5.78, 2.00, 2.36], [6.82, 2.00, 2.36], [6.82, 2.59, 1.76], [5.78, 2.59, 1.76]]} fill="#703e6f" stroke="#e288ad" />
        <Line from={[.85, 6.1]} to={[.85, 6.1, 2.55]} stroke="#c8d3d7" width={3} />
        <Line from={[.85, 8.7]} to={[.85, 8.7, 2.55]} stroke="#c8d3d7" width={3} />
        <Line from={[.85, 6.1, 2.55]} to={[.85, 8.7, 2.55]} stroke="#c8d3d7" width={3} />
        {Array.from({ length: Math.min(5, s.designs.length + 2) }, (_, i) => {
          const [x, y] = project([.86, 6.6 + i * .42, 2.3]);
          return <path key={i} transform={`translate(${x} ${y})`} d="M-4 0l9-2 10 5 4 7-6 5-4-4-2 20-13-1V10l-4 2-3-6z" fill={STAFF_COLORS[i]} stroke="#273241" strokeWidth="1.2" />;
        })}
        {hq > 0 && (
          <>
            <Table x={4.4} y={5.1} w={1.6} d={1.3} />
            <Box x={4.66} y={5.26} w={.73} d={.5} h={.45} z={1.37} colors={METAL} />
            <Box x={3.15} y={8.3} w={1.6} d={.75} h={.55} colors={['#99778b', '#655568', '#725c74']} />
          </>
        )}
        {hq > 1 && <Box x={8.9} y={1.22} w={.7} d={2.6} h={1.4} colors={['#98b5b6', '#4f757e', '#648e96']} />}
        {Array.from({ length: Math.max(2, boxes) }, (_, i) => (
          <Box key={i} x={7 + i % 3 * .7} y={6.77 + Math.floor(i / 3) % 2 * .66} w={.65} d={.62} h={.56 + i % 3 * .11} z={i > 5 ? .56 : 0} colors={CARTON} />
        ))}
        {STAFF_SPOTS.slice(0, staffCount).map(([x, y], i) => (
          <Person key={i} x={x} y={y} color={STAFF_COLORS[i]} skin={SKIN[i % SKIN.length]} active={store.speed !== 0} index={i} />
        ))}
        {interactive && <g className="studio-furniture" aria-hidden="true" fill="transparent">
          <polygon points="305,218 348,190 412,219 413,282 354,306 301,275" onClick={() => store.setPanel('lab')} />
          <polygon points="521,236 560,201 631,240 635,306 560,343 514,291" onClick={() => store.setPanel('production')} />
          <polygon points="135,243 242,194 247,258 145,320" onClick={() => store.setPanel('shop')} />
          <polygon points="406,388 451,368 522,395 501,435 432,441 402,425" onClick={() => store.setPanel('drops')} />
        </g>}
      </svg>
      {interactive && STATIONS.map(({ panel, label, marker, x, y }) => (
        <button
          className={`studio-station studio-station-${panel}`}
          key={panel}
          style={{ '--station-x': `${x}%`, '--station-y': `${y}%` } as CSSProperties}
          onClick={() => store.setPanel(panel)}
          data-testid={`station-${panel}`}
        >
          <span aria-hidden="true">{marker}</span> {label}
        </button>
      ))}
      {interactive && (drop || s.orders.length > 0) && (
        <div className="studio-activity">
          {drop && <button className="studio-status" onClick={() => store.setPanel('drops')}>Drop in {Math.max(0, drop.dropDay - s.day)}d</button>}
          {s.orders.length > 0 && <button className="studio-status" onClick={() => store.setPanel('production')}>{s.orders.length} in production</button>}
        </div>
      )}
    </div>
  );
}
