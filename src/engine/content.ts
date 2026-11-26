import type {
  DifficultyId,
  FactoryId,
  FontId,
  GarmentId,
  GraphicKind,
  MaterialId,
  PatternId,
  Season,
} from './types';

export const SEASONS: Season[] = ['Spring', 'Summer', 'Fall', 'Winter'];

export interface GarmentDef {
  id: GarmentId;
  name: string;
  refPrice: number;
  baseCost: number;
  demand: number;
  /** demand multiplier per season index (Spring, Summer, Fall, Winter) */
  seasonal: [number, number, number, number];
  taste: number;
}

export const GARMENTS: Record<GarmentId, GarmentDef> = {
  tee: { id: 'tee', name: 'Tee', refPrice: 35, baseCost: 6, demand: 1.3, seasonal: [1.1, 1.35, 0.9, 0.6], taste: 0.7 },
  hoodie: { id: 'hoodie', name: 'Hoodie', refPrice: 75, baseCost: 14, demand: 1.0, seasonal: [1.0, 0.7, 1.25, 1.1], taste: 0.8 },
  cargo: { id: 'cargo', name: 'Cargo Pants', refPrice: 70, baseCost: 13, demand: 0.8, seasonal: [1.05, 0.95, 1.1, 0.9], taste: 0.65 },
  puffer: { id: 'puffer', name: 'Puffer Jacket', refPrice: 160, baseCost: 30, demand: 0.55, seasonal: [0.6, 0.25, 1.2, 1.8], taste: 0.6 },
  cap: { id: 'cap', name: 'Cap', refPrice: 30, baseCost: 5, demand: 0.9, seasonal: [1.15, 1.3, 0.85, 0.6], taste: 0.55 },
  beanie: { id: 'beanie', name: 'Beanie', refPrice: 25, baseCost: 4, demand: 0.8, seasonal: [0.6, 0.3, 1.2, 1.7], taste: 0.5 },
};
export const GARMENT_IDS = Object.keys(GARMENTS) as GarmentId[];

export interface ColorDef {
  id: string;
  name: string;
  hex: string;
  taste: number;
}

export const COLORS: Record<string, ColorDef> = {
  black: { id: 'black', name: 'Jet Black', hex: '#111114', taste: 0.85 },
  bone: { id: 'bone', name: 'Bone', hex: '#e8e1cf', taste: 0.65 },
  lime: { id: 'lime', name: 'Acid Lime', hex: '#c6ff1a', taste: 0.7 },
  pink: { id: 'pink', name: 'Hot Pink', hex: '#ff2fb4', taste: 0.55 },
  cyber: { id: 'cyber', name: 'Cyber Blue', hex: '#19c7ff', taste: 0.6 },
  chrome: { id: 'chrome', name: 'Chrome Silver', hex: '#b9bec8', taste: 0.75 },
  red: { id: 'red', name: 'Blood Red', hex: '#b3121f', taste: 0.5 },
  olive: { id: 'olive', name: 'Olive', hex: '#5d6534', taste: 0.55 },
  sand: { id: 'sand', name: 'Sand', hex: '#c9b48a', taste: 0.5 },
  purple: { id: 'purple', name: 'Purple Haze', hex: '#7b3fe4', taste: 0.6 },
  orange: { id: 'orange', name: 'Orange Burst', hex: '#ff7a1a', taste: 0.4 },
  baby: { id: 'baby', name: 'Baby Blue', hex: '#9fd3ff', taste: 0.45 },
  forest: { id: 'forest', name: 'Forest', hex: '#1f4d36', taste: 0.4 },
  slate: { id: 'slate', name: 'Slate Grey', hex: '#4a5059', taste: 0.6 },
};
export const COLOR_IDS = Object.keys(COLORS);

export const PATTERNS: Record<PatternId, { id: PatternId; name: string; taste: number }> = {
  solid: { id: 'solid', name: 'Solid', taste: 0.6 },
  camo: { id: 'camo', name: 'Camo', taste: 0.65 },
  tiedye: { id: 'tiedye', name: 'Tie-Dye', taste: 0.45 },
  checker: { id: 'checker', name: 'Checker', taste: 0.55 },
  stripes: { id: 'stripes', name: 'Stripes', taste: 0.4 },
  flames: { id: 'flames', name: 'Flames', taste: 0.6 },
  grid: { id: 'grid', name: 'Y2K Grid', taste: 0.7 },
  gradient: { id: 'gradient', name: 'Gradient', taste: 0.55 },
};
export const PATTERN_IDS = Object.keys(PATTERNS) as PatternId[];

export const GRAPHIC_TASTE: Record<GraphicKind, number> = { none: 0.45, text: 0.6, emblem: 0.65 };

export const EMBLEMS: Record<string, { id: string; name: string; taste: number }> = {
  star: { id: 'star', name: 'Star', taste: 0.65 },
  skull: { id: 'skull', name: 'Skull', taste: 0.7 },
  flame: { id: 'flame', name: 'Flame', taste: 0.6 },
  wings: { id: 'wings', name: 'Wings', taste: 0.65 },
  barbed: { id: 'barbed', name: 'Barbed Wire', taste: 0.7 },
  alien: { id: 'alien', name: 'Alien', taste: 0.55 },
  heartlock: { id: 'heartlock', name: 'Heart-Lock', taste: 0.6 },
  bolt: { id: 'bolt', name: 'Lightning', taste: 0.6 },
  logo: { id: 'logo', name: 'Brand Logo', taste: 0.65 },
};
export const EMBLEM_IDS = Object.keys(EMBLEMS);
/** Glyphs usable as a brand logo (all emblems except 'logo' itself). */
export const LOGO_GLYPHS = EMBLEM_IDS.filter((id) => id !== 'logo');

export const FONTS: Record<FontId, { id: FontId; name: string }> = {
  gothic: { id: 'gothic', name: 'Gothic' },
  bubble: { id: 'bubble', name: 'Bubble' },
  chrome: { id: 'chrome', name: 'Chrome' },
  graffiti: { id: 'graffiti', name: 'Graffiti' },
};
export const FONT_IDS = Object.keys(FONTS) as FontId[];

export const MATERIALS: Record<MaterialId, { id: MaterialId; name: string; costMult: number; quality: number }> = {
  basic: { id: 'basic', name: 'Basic', costMult: 0.8, quality: 30 },
  standard: { id: 'standard', name: 'Standard', costMult: 1, quality: 50 },
  premium: { id: 'premium', name: 'Premium', costMult: 1.6, quality: 75 },
  luxe: { id: 'luxe', name: 'Luxe', costMult: 2.6, quality: 92 },
};
export const MATERIAL_IDS = Object.keys(MATERIALS) as MaterialId[];

export interface FactoryDef {
  id: FactoryId;
  name: string;
  tagline: string;
  costMult: number;
  qualityMod: number;
  leadDays: number;
  minOrder: number;
  defectChance: number;
  delayChance: number;
  scandalChance: number;
}

export const FACTORIES: Record<FactoryId, FactoryDef> = {
  fastloop: {
    id: 'fastloop', name: 'FastLoop Textiles', tagline: 'Cheap, fast, sketchy.',
    costMult: 0.75, qualityMod: -15, leadDays: 4, minOrder: 50,
    defectChance: 0.14, delayChance: 0.15, scandalChance: 0.04,
  },
  danube: {
    id: 'danube', name: 'Danube Works', tagline: 'Local, honest, reliable.',
    costMult: 1.0, qualityMod: 0, leadDays: 7, minOrder: 30,
    defectChance: 0.03, delayChance: 0.05, scandalChance: 0,
  },
  nord: {
    id: 'nord', name: 'Atelier Nord', tagline: 'Premium craft. Takes its time.',
    costMult: 1.5, qualityMod: 15, leadDays: 12, minOrder: 25,
    defectChance: 0.005, delayChance: 0.02, scandalChance: 0,
  },
};
export const FACTORY_IDS = Object.keys(FACTORIES) as FactoryId[];

export interface HqLevelDef {
  level: number;
  name: string;
  rent: number;
  capacity: number;
  visitorMult: number;
  upgradeCost: number;
  walkIn: number;
}

export const HQ_LEVELS: HqLevelDef[] = [
  { level: 0, name: 'Budapest Basement', rent: 200, capacity: 500, visitorMult: 1, upgradeCost: 0, walkIn: 0 },
  { level: 1, name: 'Studio', rent: 600, capacity: 2000, visitorMult: 1.1, upgradeCost: 8000, walkIn: 0 },
  { level: 2, name: 'Flagship Store', rent: 2000, capacity: 8000, visitorMult: 1.25, upgradeCost: 60000, walkIn: 25 },
];

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  blurb: string;
  startCash: number;
  demandMult: number;
  costMult: number;
  graceDays: number;
  badEventMult: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  easy: { id: 'easy', name: 'Easy', blurb: 'Fat wallet, forgiving crowd.', startCash: 25000, demandMult: 1.25, costMult: 0.85, graceDays: 21, badEventMult: 0.6 },
  normal: { id: 'normal', name: 'Normal', blurb: 'The real underground grind.', startCash: 12000, demandMult: 1.0, costMult: 1.0, graceDays: 14, badEventMult: 1.0 },
  hard: { id: 'hard', name: 'Hard', blurb: 'Broke, ignored, one shot.', startCash: 6000, demandMult: 0.8, costMult: 1.15, graceDays: 7, badEventMult: 1.4 },
};

/** Tunable economy constants (balance simulations tune these). */
export const ECON = {
  startFollowers: 300,
  startHype: 10,
  startReputation: 20,
  hypeBaseline: 10,
  hypeDecay: 0.04,
  baseVisitors: 20,
  visitorsPerFollower: 0.06,
  conversion: 0.035,
  attentionExponent: 0.6,
  priceElasticity: 1.8,
  platformFeeWeekly: 40,
  platformCut: 0.05,
  storagePerUnitWeekly: 0.15,
  teaserCost: 150,
  followersPerSale: 0.5,
  organicFollowerRate: 0.0015,
  dropMinDays: 3,
  dropMaxDays: 14,
  dropPostponeDays: 3,
  maxListingPrice: 10000,
};
