import { describe, expect, it } from 'vitest';
import { dateInfo } from '../calendar';
import { nextFloat } from '../rng';
import { createNewGame } from '../newGame';
import { newGame } from './helpers';

describe('calendar', () => {
  it('calendar day 1 is Spring Y1 Monday', () => {
    const d = dateInfo(1);
    expect(d.season).toBe('Spring');
    expect(d.year).toBe(1);
    expect(d.dayName).toBe('Mon');
    expect(d.week).toBe(1);
  });
  it('day 92 is Summer', () => {
    expect(dateInfo(92).season).toBe('Summer');
    expect(dateInfo(91).season).toBe('Spring');
  });
  it('day 365 is Spring Y2', () => {
    const d = dateInfo(365);
    expect(d.season).toBe('Spring');
    expect(d.year).toBe(2);
  });
});

describe('rng', () => {
  it('rng same seed same sequence', () => {
    const a = { rngState: 7 };
    const b = { rngState: 7 };
    const sa = [nextFloat(a), nextFloat(a), nextFloat(a)];
    const sb = [nextFloat(b), nextFloat(b), nextFloat(b)];
    expect(sa).toEqual(sb);
    sa.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    sa.forEach((v) => expect(v).toBeLessThan(1));
  });
});

describe('new game', () => {
  it('new game cash per difficulty', () => {
    expect(newGame('easy').cash).toBe(25000);
    expect(newGame('normal').cash).toBe(12000);
    expect(newGame('hard').cash).toBe(6000);
  });
  it('starts on day 1 in the basement', () => {
    const s = newGame();
    expect(s.day).toBe(1);
    expect(s.hqLevel).toBe(0);
    expect(s.gameOver).toBeNull();
    expect(s.version).toBe(4);
  });
  it('rejects bad brand name', () => {
    const logo = { glyph: 'star', color: 'lime' };
    expect(() => createNewGame({ brandName: ' a ', logo, difficulty: 'normal' })).toThrow();
    expect(() => createNewGame({ brandName: 'x'.repeat(19), logo, difficulty: 'normal' })).toThrow();
    expect(createNewGame({ brandName: '  NULL CLUB ', logo, difficulty: 'normal' }).brand.name).toBe('NULL CLUB');
  });
});
