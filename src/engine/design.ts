import { COLORS, DIFFICULTIES, EMBLEMS, FACTORIES, GARMENTS, GRAPHIC_TASTE, MATERIALS, PATTERNS } from './content';
import { dateInfo } from './calendar';
import { newId } from './newGame';
import type { Design, DesignInput, FactoryId, GameState } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function sanitizeDesignInput(input: DesignInput): DesignInput {
  return {
    ...input,
    name: (input.name || '').trim().slice(0, 32) || `${GARMENTS[input.garment].name.toUpperCase()}`,
    text: (input.text || '').slice(0, 16),
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

export function designQuality(design: Pick<Design, 'material'>, factoryId: FactoryId): number {
  return clamp(MATERIALS[design.material].quality + FACTORIES[factoryId].qualityMod, 0, 100);
}

export function unitCost(state: GameState, design: Pick<Design, 'garment' | 'material'>, factoryId: FactoryId): number {
  const g = GARMENTS[design.garment];
  return g.baseCost * MATERIALS[design.material].costMult * FACTORIES[factoryId].costMult * DIFFICULTIES[state.difficulty].costMult;
}

/** 0..1 — how well the design matches current taste (static Budapest taste in stage 1). */
export function marketFit(_state: GameState, design: DesignInput): number {
  const garment = GARMENTS[design.garment].taste;
  const primary = COLORS[design.primary]?.taste ?? 0.4;
  const secondary = COLORS[design.secondary]?.taste ?? 0.4;
  const pattern = PATTERNS[design.pattern]?.taste ?? 0.4;
  let graphic = GRAPHIC_TASTE[design.graphic];
  if (design.graphic === 'emblem') graphic = (graphic + (EMBLEMS[design.emblem]?.taste ?? 0.5)) / 2;
  if (design.graphic === 'text' && design.text.trim().length === 0) graphic = GRAPHIC_TASTE.none;
  const fit = 0.3 * garment + 0.3 * primary + 0.1 * secondary + 0.2 * pattern + 0.1 * graphic;
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

export function priceFactor(fair: number, price: number, elasticity: number): number {
  if (price <= 0) return 3;
  return clamp(Math.pow(fair / price, elasticity), 0.01, 3);
}
