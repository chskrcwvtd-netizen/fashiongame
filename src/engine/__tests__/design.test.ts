import { describe, expect, it } from 'vitest';
import { appeal, designQuality, fairPrice, marketFit, unitCost } from '../design';
import { expectedDailySales, setListing } from '../webshop';
import { HOODIE, giveStock, newGame, withDesign } from './helpers';

describe('design maths', () => {
  it('luxe costs more than basic', () => {
    const s = newGame();
    const basic = withDesign(s, { material: 'basic' });
    const luxe = withDesign(s, { material: 'luxe' });
    expect(unitCost(s, luxe, 'danube')).toBeGreaterThan(unitCost(s, basic, 'danube'));
    expect(unitCost(s, basic, 'danube')).toBeCloseTo(14 * 0.8, 5);
  });
  it('cheap factory is cheaper, premium dearer', () => {
    const s = newGame();
    const d = withDesign(s);
    expect(unitCost(s, d, 'fastloop')).toBeLessThan(unitCost(s, d, 'danube'));
    expect(unitCost(s, d, 'nord')).toBeGreaterThan(unitCost(s, d, 'danube'));
  });
  it('premium factory raises quality', () => {
    const s = newGame();
    const d = withDesign(s);
    expect(designQuality(d, 'nord')).toBe(65);
    expect(designQuality(d, 'fastloop')).toBe(35);
    expect(designQuality({ ...d, material: 'luxe' }, 'nord')).toBe(100);
  });
  it('fair price grows with quality and reputation', () => {
    const s = newGame();
    const d = withDesign(s);
    const low = fairPrice(s, d, 30);
    const high = fairPrice(s, d, 80);
    expect(high).toBeGreaterThan(low);
    s.reputation = 90;
    expect(fairPrice(s, d, 80)).toBeGreaterThan(high);
  });
  it('market fit is between 0 and 1 and prefers tasteful choices', () => {
    const s = newGame();
    const good = withDesign(s);
    const meh = withDesign(s, { primary: 'forest', pattern: 'stripes', graphic: 'none', garment: 'beanie' });
    expect(marketFit(s, good)).toBeGreaterThan(marketFit(s, meh));
    expect(marketFit(s, good)).toBeLessThanOrEqual(1);
    expect(marketFit(s, meh)).toBeGreaterThanOrEqual(0);
  });
  it('appeal stays within 0.2..2', () => {
    const s = newGame();
    const d = withDesign(s);
    for (const q of [0, 30, 50, 100]) {
      const a = appeal(s, d, q);
      expect(a).toBeGreaterThanOrEqual(0.2);
      expect(a).toBeLessThanOrEqual(2);
    }
  });
  it('puffer sells better in winter than summer', () => {
    const s = newGame();
    const d = withDesign(s, { ...HOODIE, garment: 'puffer' });
    giveStock(s, d.id, 100);
    setListing(s, d.id, 150, true);
    s.day = 92 + 10; // summer
    const summer = expectedDailySales(s, d.id);
    s.day = 273 + 10; // winter
    const winter = expectedDailySales(s, d.id);
    expect(winter).toBeGreaterThan(summer * 2);
  });
});
