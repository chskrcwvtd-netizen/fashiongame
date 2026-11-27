import { COLORS, DIFFICULTIES, EMBLEMS, FACTORIES, FINISHES, GARMENTS, GRAPHIC_TASTE, MATERIALS, PATTERNS, PATTERN_VIBE, STAGE3, VIBES } from './content';
import { chasers } from './rivals';
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
    finish: input.finish && FINISHES[input.finish] ? input.finish : 'print',
    back: input.back === 'logo' || input.back === 'text' ? input.back : 'none',
    backText: (input.backText || '').slice(0, 18),
    collection: (input.collection || '').trim().slice(0, 24),
    pixels: /^[01]{64}$/.test(input.pixels ?? '') ? input.pixels : '0'.repeat(64),
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
export function designQuality(design: Pick<Design, 'material'> & Partial<Pick<Design, 'finish'>>, factoryId: FactoryId, state?: GameState): number {
  const staff = state ? designerQualityBonus(state) : 0;
  const finish = FINISHES[design.finish ?? 'print']?.quality ?? 0;
  return clamp(MATERIALS[design.material].quality + FACTORIES[factoryId].qualityMod + staff + finish, 0, 100);
}

export function unitCost(state: GameState, design: Pick<Design, 'garment' | 'material'> & Partial<Pick<Design, 'finish'>>, factoryId: FactoryId): number {
  const g = GARMENTS[design.garment];
  const deal = state.supplierDiscountUntil > state.day ? 0.7 : 1;
  const finish = FINISHES[design.finish ?? 'print']?.costMult ?? 1;
  return g.baseCost * MATERIALS[design.material].costMult * FACTORIES[factoryId].costMult * DIFFICULTIES[state.difficulty].costMult * sourcerCostMult(state) * deal * finish;
}

/** Blend of Budapest's steady taste (35%) and what is trending right now (65%). */
function blend(taste: number, pop: number) {
  return 0.35 * taste + 0.65 * Math.min(1, pop * 1.1);
}

/** Trend popularity left for you after rivals chase the same thing. */
function livePop(state: GameState, cat: 'color' | 'pattern' | 'garment' | 'vibe', id: string) {
  return trendPop(state, cat, id) * (1 - 0.07 * chasers(state, cat, id));
}

/** 0..1 — how well the design matches what people want right now. */
export function marketFit(state: GameState, design: DesignInput): number {
  const garment = blend(GARMENTS[design.garment].taste, livePop(state, 'garment', design.garment));
  const primary = blend(COLORS[design.primary]?.taste ?? 0.4, livePop(state, 'color', design.primary));
  const secondary = blend(COLORS[design.secondary]?.taste ?? 0.4, livePop(state, 'color', design.secondary));
  const pattern = blend(PATTERNS[design.pattern]?.taste ?? 0.4, livePop(state, 'pattern', design.pattern));
  const vibeId = design.vibe ?? PATTERN_VIBE[design.pattern] ?? 'y2k';
  const vibe = blend(VIBES[vibeId]?.taste ?? 0.4, livePop(state, 'vibe', vibeId));
  const fin = FINISHES[design.finish ?? 'print'];
  const finishFit = fin && fin.vibes.length ? (fin.vibes.includes(vibeId) ? 0.04 : -0.02) : 0;
  const backBonus = design.back && design.back !== 'none' ? 0.015 : 0;
  let graphic = GRAPHIC_TASTE[design.graphic];
  if (design.graphic === 'emblem') graphic = (graphic + (EMBLEMS[design.emblem]?.taste ?? 0.5)) / 2;
  if (design.graphic === 'text' && design.text.trim().length === 0) graphic = GRAPHIC_TASTE.none;
  const fit = 0.24 * garment + 0.24 * primary + 0.08 * secondary + 0.17 * pattern + 0.17 * vibe + 0.1 * graphic + designerFitBonus(state) + finishFit + backBonus;
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
  // pieces made this season feel fresh
  const created = (design as Partial<Design>).createdDay;
  const fresh = created !== undefined && Math.floor((created - 1) / 91) === Math.floor((state.day - 1) / 91) ? 0.05 : 0;
  return clamp((0.5 + quality / 100) * (0.4 + fit * 1.2) * (1 + collectionBonus(state, design) + fresh), 0.2, 2);
}

/** Live pieces in the webshop that share this vibe (a "collection"). */
export function collectionSize(state: GameState, vibe: DesignInput['vibe']): number {
  return Object.values(state.listings).filter((l) => {
    if (!l.active || (state.inventory[l.designId]?.units ?? 0) <= 0) return false;
    return getDesign(state, l.designId)?.vibe === vibe;
  }).length;
}

export function collectionBonus(state: GameState, design: DesignInput): number {
  if (design.collection && namedCollectionSize(state, design.collection) >= STAGE3.collectionMin) return 0.12;
  return collectionSize(state, design.vibe) >= STAGE3.collectionMin ? STAGE3.collectionBonus : 0;
}

/** Live pieces that share a collection name you gave them. */
export function namedCollectionSize(state: GameState, name: string): number {
  return Object.values(state.listings).filter((l) => l.active && (state.inventory[l.designId]?.units ?? 0) > 0 && getDesign(state, l.designId)?.collection === name).length;
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
