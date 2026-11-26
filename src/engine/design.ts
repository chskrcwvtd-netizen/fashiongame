import { COLORS, DIFFICULTIES, EMBLEMS, FACTORIES, GARMENTS, GRAPHIC_TASTE, MATERIALS, PATTERNS, PATTERN_VIBE, VIBES } from './content';
import { designerFitBonus, designerQualityBonus, sourcerCostMult } from './team';
import { trendPop } from './trends';
import { dateInfo } from './calendar';
import { newId } from './newGame';
import type { Design, DesignInput, FactoryId, GameState } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function sanitizeDesignInput(input: DesignInput): DesignInput {
  return {
    ...input,
    name: (input.name || '').trim().slice(0, 32) || `${GARMENTS[input.garment].name.toUpperCase()}`,
    text: (input.text || '').slice(0, 16),
    vibe: input.vibe && VIBES[input.vibe] ? input.vibe : PATTERN_VIBE[input.pattern] ?? 'y2k',
  };
}

export function createDesign(state: GameState, input: DesignInput): Design {
  if (!GARMENTS[input.garment]) throw new Error('Unknown garment');
  const design: Design = { ...sanitizeDesignInput(input), id: newId(state, 'd'), createdDay: state.day };
  state.designs.push(design);
  return design;
}

export function getDesign(state: GameState, id: string): Design | undefined {
  return state.designs.find((d) => d.id === id);
}

/** Batch quality: fabric + factory, plus your best designer when `state` is given. */
export function designQuality(design: Pick<Design, 'material'>, factoryId: FactoryId, state?: GameState): number {
  const staff = state ? designerQualityBonus(state) : 0;
  return clamp(MATERIALS[design.material].quality + FACTORIES[factoryId].qualityMod + staff, 0, 100);
}

export function unitCost(state: GameState, design: Pick<Design, 'garment' | 'material'>, factoryId: FactoryId): number {
  const g = GARMENTS[design.garment];
  const deal = state.supplierDiscountUntil > state.day ? 0.7 : 1;
  return g.baseCost * MATERIALS[design.material].costMult * FACTORIES[factoryId].costMult * DIFFICULTIES[state.difficulty].costMult * sourcerCostMult(state) * deal;
}

/** Blend of Budapest's steady taste (35%) and what is trending right now (65%). */
function blend(taste: number, pop: number) {
  return 0.35 * taste + 0.65 * Math.min(1, pop * 1.1);
}

/** 0..1 — how well the design matches what people want right now. */
export function marketFit(state: GameState, design: DesignInput): number {
  const garment = blend(GARMENTS[design.garment].taste, trendPop(state, 'garment', design.garment));
  const primary = blend(COLORS[design.primary]?.taste ?? 0.4, trendPop(state, 'color', design.primary));
  const secondary = blend(COLORS[design.secondary]?.taste ?? 0.4, trendPop(state, 'color', design.secondary));
  const pattern = blend(PATTERNS[design.pattern]?.taste ?? 0.4, trendPop(state, 'pattern', design.pattern));
  const vibeId = design.vibe ?? PATTERN_VIBE[design.pattern] ?? 'y2k';
  const vibe = blend(VIBES[vibeId]?.taste ?? 0.4, trendPop(state, 'vibe', vibeId));
  let graphic = GRAPHIC_TASTE[design.graphic];
  if (design.graphic === 'emblem') graphic = (graphic + (EMBLEMS[design.emblem]?.taste ?? 0.5)) / 2;
  if (design.graphic === 'text' && design.text.trim().length === 0) graphic = GRAPHIC_TASTE.none;
  const fit = 0.24 * garment + 0.24 * primary + 0.08 * secondary + 0.17 * pattern + 0.17 * vibe + 0.1 * graphic + designerFitBonus(state);
  return clamp(fit, 0, 1);
}

export function seasonFactor(state: GameState, design: Pick<Design, 'garment'>): number {
  return GARMENTS[design.garment].seasonal[dateInfo(state.day).seasonIndex];
}

/** What customers think is a fair price for this piece at this quality. */
export function fairPrice(state: GameState, design: Pick<Design, 'garment'>, quality: number): number {
  const ref = GARMENTS[design.garment].refPrice;
  return ref * (0.6 + (quality / 100) * 0.8) * (0.85 + (state.reputation / 100) * 0.3);
}

/** 0.2..2 — overall desirability ignoring price. */
export function appeal(state: GameState, design: DesignInput, quality: number): number {
  const fit = marketFit(state, design);
  return clamp((0.5 + quality / 100) * (0.4 + fit * 1.2), 0.2, 2);
}

/**
 * Demand multiplier from price vs fair price. Under fair: gentle boost.
 * Over fair: steep drop — nobody pays 2x for an unknown brand.
 */
export function priceFactor(fair: number, price: number, elasticity: number): number {
  if (price <= 0 || fair <= 0) return price <= 0 ? 3 : 0;
  const r = price / fair;
  if (r <= 1) return clamp(Math.pow(r, -elasticity * 0.8), 1, 3);
  return clamp(Math.exp(-3.2 * Math.pow(r - 1, 1.3)), 0, 1);
}
