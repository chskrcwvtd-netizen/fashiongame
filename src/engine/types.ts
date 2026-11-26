export type DifficultyId = 'easy' | 'normal' | 'hard';
export type GarmentId = 'tee' | 'hoodie' | 'cargo' | 'puffer' | 'cap' | 'beanie';
export type MaterialId = 'basic' | 'standard' | 'premium' | 'luxe';
export type FactoryId = 'fastloop' | 'danube' | 'nord';
export type PatternId = 'solid' | 'camo' | 'tiedye' | 'checker' | 'stripes' | 'flames' | 'grid' | 'gradient';
export type GraphicKind = 'none' | 'text' | 'emblem';
export type FontId = 'gothic' | 'bubble' | 'chrome' | 'graffiti';
export type ColorId = string;
export type EmblemId = string;
export type Season = 'Spring' | 'Summer' | 'Fall' | 'Winter';
export type Speed = 0 | 1 | 2 | 4;

export interface LogoChoice {
  glyph: EmblemId;
  color: ColorId;
}

export interface DesignInput {
  name: string;
  garment: GarmentId;
  primary: ColorId;
  secondary: ColorId;
  pattern: PatternId;
  graphic: GraphicKind;
  text: string;
  font: FontId;
  emblem: EmblemId;
  material: MaterialId;
}

export interface Design extends DesignInput {
  id: string;
  createdDay: number;
}

export interface StockLot {
  units: number;
  quality: number;
  unitCost: number;
}

export interface Listing {
  designId: string;
  price: number;
  active: boolean;
  soldToday: number;
  soldWeek: number;
  soldTotal: number;
  history: number[];
}

export interface ProductionOrder {
  id: string;
  designId: string;
  factoryId: FactoryId;
  quantity: number;
  quality: number;
  unitCost: number;
  orderedDay: number;
  etaDay: number;
  delayed: boolean;
}

export type DropOutcome = 'soldout' | 'solid' | 'flop';

export interface DropResult {
  outcome: DropOutcome;
  units: number;
  sold: number;
  revenue: number;
  demand: number;
  minutes: number | null;
  resalePrice: number | null;
}

export interface Drop {
  id: string;
  designId: string;
  units: number;
  price: number;
  announcedDay: number;
  dropDay: number;
  hype: number;
  status: 'scheduled' | 'done';
  postponements: number;
  result: DropResult | null;
}

export interface GameStats {
  unitsSold: number;
  revenue: number;
  spent: number;
  dropsTotal: number;
  dropsSoldOut: number;
  revenueThisWeek: number;
  weeklyRevenue: number[];
  peakCash: number;
  bestSellerId: string | null;
}

export interface GameState {
  version: 1;
  seed: number;
  rngState: number;
  day: number;
  brand: { name: string; logo: LogoChoice };
  difficulty: DifficultyId;
  cash: number;
  followers: number;
  hype: number;
  reputation: number;
  hqLevel: number;
  designs: Design[];
  inventory: Record<string, StockLot>;
  listings: Record<string, Listing>;
  orders: ProductionOrder[];
  drops: Drop[];
  overdrawnSince: number | null;
  gameOver: null | { reason: 'bankrupt'; day: number };
  lastTeaserDay: number;
  stats: GameStats;
  flags: Record<string, boolean>;
  nextId: number;
}

export type ActionResult = { ok: true; id?: string } | { ok: false; reason: string };

export type GameEvent =
  | { type: 'sale'; designId: string; units: number; revenue: number }
  | { type: 'firstSale'; designId: string }
  | { type: 'orderArrived'; orderId: string; designId: string; units: number }
  | { type: 'defect'; orderId: string; designId: string; lost: number }
  | { type: 'delay'; orderId: string; designId: string; days: number }
  | { type: 'scandal'; factoryId: FactoryId; repLoss: number }
  | { type: 'dropResult'; dropId: string; designId: string; result: DropResult }
  | { type: 'dropPostponed'; dropId: string; designId: string; newDay: number }
  | { type: 'bills'; total: number; rent: number; platform: number; storage: number }
  | { type: 'overdrawn'; graceDays: number }
  | { type: 'recovered' }
  | { type: 'bankrupt' }
  | { type: 'newWeek'; week: number }
  | { type: 'newSeason'; season: Season };
