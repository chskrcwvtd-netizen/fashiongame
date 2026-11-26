import { describe, expect, it } from 'vitest';
import { runBot } from '../sim/bots';

const SEEDS = [1, 2, 3, 4];

describe('balance (Normal unless stated)', () => {
  it('smart Normal grows and reaches Studio within 120 days', () => {
    for (const seed of SEEDS) {
      const r = runBot('normal', 'smart', 300, seed);
      expect(r.bankruptDay).toBeNull();
      expect(r.studioDay).not.toBeNull();
      expect(r.studioDay!).toBeLessThanOrEqual(120);
      expect(r.followers).toBeGreaterThan(3000);
      expect(r.cash).toBeGreaterThan(12000);
    }
  });
  it('smart Normal reaches the Flagship within roughly the first 15 real minutes (450 days at 1x)', () => {
    for (const seed of SEEDS) {
      const r = runBot('normal', 'smart', 450, seed);
      expect(r.flagshipDay).not.toBeNull();
      expect(r.flagshipDay!).toBeGreaterThan(120); // not instantly
    }
  });
  it('sloppy Normal goes bankrupt within 365 days', () => {
    for (const seed of SEEDS) {
      const r = runBot('normal', 'sloppy', 365, seed);
      expect(r.bankruptDay).not.toBeNull();
    }
  });
  it('reckless Normal goes bankrupt within 365 days', () => {
    for (const seed of SEEDS) expect(runBot('normal', 'reckless', 365, seed).bankruptDay).not.toBeNull();
  });
  it('sloppy Easy survives longer than Normal', () => {
    for (const seed of SEEDS) {
      const easy = runBot('easy', 'sloppy', 365, seed);
      const normal = runBot('normal', 'sloppy', 365, seed);
      expect(easy.bankruptDay ?? Infinity).toBeGreaterThan(normal.bankruptDay!);
    }
  });
  it('sloppy Hard dies faster than Normal', () => {
    for (const seed of SEEDS) {
      const hard = runBot('hard', 'sloppy', 365, seed);
      const normal = runBot('normal', 'sloppy', 365, seed);
      expect(hard.bankruptDay!).toBeLessThan(normal.bankruptDay!);
    }
  });
  it('smart Hard still survives', () => {
    for (const seed of SEEDS) expect(runBot('hard', 'smart', 365, seed).bankruptDay).toBeNull();
  });
});
