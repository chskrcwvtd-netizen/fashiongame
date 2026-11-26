import type { GameState } from './types';

/** Holder for the mutable 32-bit RNG state. GameState satisfies it. */
export interface RngHolder {
  rngState: number;
}

/** mulberry32: small, fast, deterministic. Mutates holder.rngState. */
export function nextFloat(h: RngHolder): number {
  let t = (h.rngState = (h.rngState + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(h: RngHolder, min: number, max: number): number {
  return min + Math.floor(nextFloat(h) * (max - min + 1));
}

export function randRange(h: RngHolder, min: number, max: number): number {
  return min + nextFloat(h) * (max - min);
}

export function chance(h: RngHolder, p: number): boolean {
  return nextFloat(h) < p;
}

export function pick<T>(h: RngHolder, arr: readonly T[]): T {
  return arr[Math.floor(nextFloat(h) * arr.length)];
}

/** Poisson sample; uses normal approximation for large lambda. */
export function poisson(h: RngHolder, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 40) {
    const u1 = Math.max(nextFloat(h), 1e-12);
    const u2 = nextFloat(h);
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(lambda + z * Math.sqrt(lambda)));
  }
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= nextFloat(h);
  } while (p > L);
  return k - 1;
}

export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export type { GameState };
