import type { Employee } from '../../engine';

const SKIN = ['#f1d3b6', '#e0b58f', '#c68b5f', '#8d5a3b', '#5e3a26', '#f5e0c8'];
const HAIR = ['#14110f', '#3b2416', '#7a4a22', '#d9b36a', '#e8e1cf', '#ff3ec8', '#6cf2ff', '#d4ff3a', '#7b3fe4'];
const ROLE_TOP: Record<string, string> = { designer: '#ff3ec8', marketer: '#d4ff3a', sourcer: '#6cf2ff', manager: '#ffc24a', analyst: '#a98bff' };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** A small drawn portrait, always the same for the same person. */
export function Avatar({ e, size = 48 }: { e: Pick<Employee, 'name' | 'role'>; size?: number }) {
  const h = hash(e.name);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >>> 4) % HAIR.length];
  const style = (h >>> 8) % 5;
  const glasses = (h >>> 12) % 4 === 0;
  const earring = (h >>> 14) % 3 === 0;
  const top = ROLE_TOP[e.role] ?? '#888';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="avatar-svg" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#1c1829" />
      <path d="M6 48c1-10 8-14 18-14s17 4 18 14Z" fill={top} />
      <path d="M18 34h12l-2 4h-8Z" fill={skin} />
      <ellipse cx="24" cy="22" rx="9.5" ry="11" fill={skin} />
      {style === 0 && <path d="M14 20c0-9 6-12 10-12s10 3 10 12c-2-4-5-6-10-6s-8 2-10 6Z" fill={hair} />}
      {style === 1 && <path d="M13 24c-1-12 5-16 11-16s12 4 11 16c-1-5-3-8-5-9-3 2-9 3-17 9Z" fill={hair} />}
      {style === 2 && <path d="M14 18c1-7 6-9 10-9s9 2 10 9c-3-2-6-3-10-3s-7 1-10 3ZM12 20c-2 6 0 16 4 20l1-14Z M36 20c2 6 0 16-4 20l-1-14Z" fill={hair} />}
      {style === 3 && <path d="M15 16c2-5 5-7 9-7s7 2 9 7c-2-1-5-2-9-2s-7 1-9 2Z" fill={hair} />}
      {style === 4 && (
        <g fill={hair}>
          <circle cx="24" cy="9" r="5" />
          <path d="M15 19c1-6 5-9 9-9s8 3 9 9c-3-3-6-4-9-4s-6 1-9 4Z" />
        </g>
      )}
      <circle cx="20.5" cy="23" r="1.2" fill="#14110f" />
      <circle cx="27.5" cy="23" r="1.2" fill="#14110f" />
      <path d="M21 28.5c2 1.5 4 1.5 6 0" stroke="#14110f" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {glasses && (
        <g stroke="#e9edf5" strokeWidth="1.2" fill="rgba(108,242,255,.25)">
          <rect x="16.5" y="20.5" width="7" height="5" rx="2" />
          <rect x="24.5" y="20.5" width="7" height="5" rx="2" />
        </g>
      )}
      {earring && <circle cx="14.6" cy="26" r="1.3" fill="#d4ff3a" />}
    </svg>
  );
}
