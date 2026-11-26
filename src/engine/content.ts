import type {
  CityId,
  ShowBudget,
  BadgeId,
  FinishId,
  RivalPersonality,
  DifficultyId,
  FactoryId,
  FontId,
  GarmentId,
  GraphicKind,
  MaterialId,
  PatternId,
  PlatformId,
  PostKind,
  RoleId,
  Season,
  TraitId,
  VibeId,
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
  track: { id: 'track', name: 'Track Jacket', refPrice: 90, baseCost: 17, demand: 0.7, seasonal: [1.2, 0.8, 1.1, 0.8], taste: 0.55 },
  sneakers: { id: 'sneakers', name: 'Sneakers', refPrice: 140, baseCost: 28, demand: 0.65, seasonal: [1.1, 1.0, 1.0, 0.9], taste: 0.7 },
  bag: { id: 'bag', name: 'Bag', refPrice: 110, baseCost: 20, demand: 0.55, seasonal: [1.0, 1.0, 1.0, 1.0], taste: 0.55 },
  jewelry: { id: 'jewelry', name: 'Chain', refPrice: 120, baseCost: 15, demand: 0.5, seasonal: [1.0, 1.0, 1.0, 1.1], taste: 0.6 },
  perfume: { id: 'perfume', name: 'Perfume', refPrice: 85, baseCost: 8, demand: 0.7, seasonal: [0.9, 0.9, 1.1, 1.4], taste: 0.6 },
};
/** Pieces that must be unlocked first (milestone or product-line investment). */
export const LOCKED_GARMENTS: Partial<Record<GarmentId, string>> = { track: 'unlock_track', sneakers: 'line_sneakers', bag: 'line_bag', jewelry: 'line_jewelry', perfume: 'line_perfume' };
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
  vela: {
    id: 'vela', name: 'Vela Craftworks', tagline: 'Premium and fast. Pricey.',
    costMult: 1.75, qualityMod: 12, leadDays: 5, minOrder: 40,
    defectChance: 0.01, delayChance: 0.03, scandalChance: 0,
  },
};
export const LOCKED_FACTORIES: Partial<Record<FactoryId, string>> = { vela: 'unlock_vela' };
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
  { level: 3, name: 'Glass Tower', rent: 8000, capacity: 50000, visitorMult: 1.4, upgradeCost: 500000, walkIn: 60 },
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
  visitorsPerFollower: 0.031,
  conversion: 0.03,
  attentionExponent: 0.6,
  priceElasticity: 1.8,
  platformFeeWeekly: 40,
  platformCut: 0.05,
  storagePerUnitWeekly: 0.15,
  teaserCost: 150,
  followersPerSale: 0.25,
  /** audience ceiling of the home market; follower growth slows toward it */
  homeMarketCap: 120000,
  organicFollowerRate: 0.001,
  dropMinDays: 3,
  dropMaxDays: 14,
  dropPostponeDays: 3,
  maxListingPrice: 10000,
};

// ---------------------------------------------------------------- stage 2


export const VIBES: Record<VibeId, { id: VibeId; name: string; blurb: string; taste: number }> = {
  y2k: { id: 'y2k', name: 'Y2K', blurb: 'Chrome, butterflies, low-rise nostalgia.', taste: 0.65 },
  gorpcore: { id: 'gorpcore', name: 'Gorpcore', blurb: 'Hiking gear in the club.', taste: 0.55 },
  techwear: { id: 'techwear', name: 'Techwear', blurb: 'Straps, zips, all black.', taste: 0.6 },
  grunge: { id: 'grunge', name: 'Grunge', blurb: 'Distressed, moody, loud.', taste: 0.55 },
  skate: { id: 'skate', name: 'Skate', blurb: 'Boxy fits and scuffed shoes.', taste: 0.6 },
  luxury: { id: 'luxury', name: 'Luxury', blurb: 'Quiet logos, loud price tags.', taste: 0.5 },
  cyber: { id: 'cyber', name: 'Cyber', blurb: 'Neon glitch, future dread.', taste: 0.55 },
  retro: { id: 'retro', name: 'Retro Sport', blurb: 'Track tops and old-school stripes.', taste: 0.5 },
};
export const VIBE_IDS = Object.keys(VIBES) as VibeId[];

/** Default vibe for designs made before vibes existed. */
export const PATTERN_VIBE: Record<string, VibeId> = {
  solid: 'luxury', camo: 'gorpcore', tiedye: 'grunge', checker: 'skate', stripes: 'retro', flames: 'grunge', grid: 'y2k', gradient: 'cyber',
};

export interface RoleDef {
  id: RoleId;
  name: string;
  does: string;
  baseSalary: number;
}

export const ROLES: Record<RoleId, RoleDef> = {
  designer: { id: 'designer', name: 'Designer', does: 'Raises the quality of new batches and how well pieces fit the trends.', baseSalary: 450 },
  marketer: { id: 'marketer', name: 'Marketer', does: 'One extra post a day, better odds of going viral, stronger influencer deals.', baseSalary: 400 },
  sourcer: { id: 'sourcer', name: 'Sourcer', does: 'Cheaper production and fewer defects.', baseSalary: 380 },
  manager: { id: 'manager', name: 'Manager', does: 'Keeps the team happy and trims the weekly bills.', baseSalary: 500 },
  analyst: { id: 'analyst', name: 'Trend Analyst', does: 'Shows where trends are heading, weeks ahead.', baseSalary: 420 },
};
export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

export const TRAITS: Record<TraitId, { id: TraitId; name: string; blurb: string }> = {
  perfectionist: { id: 'perfectionist', name: 'Perfectionist', blurb: 'Works 15% better, takes flops personally.' },
  hypebeast: { id: 'hypebeast', name: 'Hype Beast', blurb: 'Loves sold-out drops, gets bored without them.' },
  loyal: { id: 'loyal', name: 'Loyal', blurb: 'Mood never drops below 30.' },
  diva: { id: 'diva', name: 'Diva', blurb: 'Works 25% better, always a little unhappy.' },
  chill: { id: 'chill', name: 'Chill', blurb: 'Easy to keep happy.' },
};
export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

/** Staff slots per HQ level. */
export const STAFF_SLOTS = [2, 5, 10, 20];

export const FIRST_NAMES = ['Bence', 'Lili', 'Marco', 'Aiko', 'Dóra', 'Kofi', 'Zoé', 'Tamás', 'Nia', 'Levente', 'Ines', 'Jun', 'Réka', 'Omar', 'Petra', 'Malik', 'Hanna', 'Viktor', 'Sasha', 'Emőke', 'Rafa', 'Mei', 'Ádám', 'Luca'];
export const LAST_NAMES = ['Kovács', 'Brandt', 'Okafor', 'Tanaka', 'Szűcs', 'Moreau', 'Varga', 'Lindqvist', 'Haddad', 'Fekete', 'Novak', 'Reyes', 'Balogh', 'Ishikawa', 'Mensah', 'Takács', 'Duval', 'Petrov'];

export const PLATFORMS: Record<PlatformId, { id: PlatformId; name: string; blurb: string; reach: number; viral: number }> = {
  loopz: { id: 'loopz', name: 'Loopz', blurb: 'Short videos. Big swings.', reach: 1.0, viral: 1.4 },
  glint: { id: 'glint', name: 'Glint', blurb: 'Photo feed. Steady growth.', reach: 1.25, viral: 0.7 },
};

export const POST_KINDS: Record<PostKind, { id: PostKind; name: string; blurb: string }> = {
  fit: { id: 'fit', name: 'Fit pic', blurb: 'Show off a piece. Works best when it fits the trends.' },
  bts: { id: 'bts', name: 'Behind the scenes', blurb: 'Basement life. Small but builds reputation.' },
  meme: { id: 'meme', name: 'Meme', blurb: 'Pure chaos. Highest viral odds, can backfire.' },
  teaser: { id: 'teaser', name: 'Drop teaser', blurb: 'Free hype for your upcoming drop.' },
};

export interface InfluencerDef {
  id: string;
  name: string;
  handle: string;
  audience: number;
  fee: number;
  vibe: VibeId;
  risk: number;
  minFollowers: number;
}

export const INFLUENCERS: InfluencerDef[] = [
  { id: 'zsofi', name: 'Zsófi Neon', handle: '@zsofineon', audience: 18000, fee: 900, vibe: 'y2k', risk: 0.05, minFollowers: 0 },
  { id: 'kai', name: 'Kai Rubber', handle: '@kairubber', audience: 42000, fee: 2200, vibe: 'skate', risk: 0.08, minFollowers: 800 },
  { id: 'bianca', name: 'Bianca Glitter', handle: '@biancaglttr', audience: 90000, fee: 5000, vibe: 'cyber', risk: 0.12, minFollowers: 2500 },
  { id: 'otto', name: 'Ottó Vapor', handle: '@ottovapor', audience: 150000, fee: 9000, vibe: 'gorpcore', risk: 0.06, minFollowers: 6000 },
  { id: 'nell', name: 'Nell Ozone', handle: '@nellozone', audience: 320000, fee: 20000, vibe: 'luxury', risk: 0.1, minFollowers: 15000 },
  { id: 'marcus', name: 'Marcus Static', handle: '@mstaticfits', audience: 600000, fee: 42000, vibe: 'techwear', risk: 0.15, minFollowers: 40000 },
];

export interface ArtistDef {
  id: string;
  name: string;
  genre: string;
  fans: number;
  fee: number;
  vibe: VibeId;
  minFollowers: number;
}

export const ARTISTS: ArtistDef[] = [
  { id: 'halogen', name: 'Kid Halogen', genre: 'rage', fans: 25000, fee: 2500, vibe: 'cyber', minFollowers: 1000 },
  { id: 'tungsten', name: 'Baby Tungsten', genre: 'hyperpop', fans: 60000, fee: 6000, vibe: 'y2k', minFollowers: 3000 },
  { id: 'velcro', name: 'Velcro Prince', genre: 'trap', fans: 140000, fee: 15000, vibe: 'techwear', minFollowers: 8000 },
  { id: 'bleach', name: 'Nova Bleach', genre: 'alt-pop', fans: 300000, fee: 35000, vibe: 'grunge', minFollowers: 20000 },
  { id: 'ghostline', name: 'Ghostline', genre: 'drill', fans: 700000, fee: 80000, vibe: 'luxury', minFollowers: 50000 },
];

export const STAGE2 = {
  trendReportCost: 1500,
  trendReportDays: 42,
  eventChancePerDay: 0.08,
  eventMinGapDays: 6,
  teamNightCostPerHead: 120,
  teamNightCooldown: 28,
  influencerDays: 7,
  marketSalaryVariance: 0.15,
};

// ---------------------------------------------------------------- stage 3


export const FINISHES: Record<FinishId, { id: FinishId; name: string; blurb: string; costMult: number; quality: number; vibes: VibeId[] }> = {
  print: { id: 'print', name: 'Printed', blurb: 'Clean screen print. Cheapest.', costMult: 1, quality: 0, vibes: [] },
  embroidery: { id: 'embroidery', name: 'Embroidered', blurb: 'Stitched graphics. Feels expensive.', costMult: 1.25, quality: 6, vibes: ['luxury', 'retro'] },
  washed: { id: 'washed', name: 'Washed', blurb: 'Faded, lived-in colour.', costMult: 1.1, quality: 0, vibes: ['grunge', 'skate', 'retro'] },
  distressed: { id: 'distressed', name: 'Distressed', blurb: 'Rips and frayed edges.', costMult: 1.15, quality: -2, vibes: ['grunge', 'y2k', 'skate'] },
};
export const FINISH_IDS = Object.keys(FINISHES) as FinishId[];

export const BADGES: Record<BadgeId, string> = { none: 'None', circle: 'Circle', diamond: 'Diamond', shield: 'Shield' };
export const BADGE_IDS = Object.keys(BADGES) as BadgeId[];

export interface RivalDef {
  id: string;
  name: string;
  personality: RivalPersonality;
  vibe: VibeId;
  color: string;
  glyph: string;
  followers: number;
  weeklyRevenue: number;
  growth: number;
  bio: string;
}

export const RIVALS: RivalDef[] = [
  { id: 'krush', name: 'KRUSHLAB', personality: 'copycat', vibe: 'y2k', color: '#ff7a1a', glyph: 'bolt', followers: 900, weeklyRevenue: 1200, growth: 0.022, bio: 'Sees your hit, ships it cheaper two weeks later.' },
  { id: 'velour', name: 'Velour Syndicate', personality: 'snob', vibe: 'luxury', color: '#e8e1cf', glyph: 'wings', followers: 150000, weeklyRevenue: 260000, growth: 0.013, bio: 'Old money pretending to be underground.' },
  { id: 'hexpark', name: 'Hexpark', personality: 'chaos', vibe: 'cyber', color: '#19c7ff', glyph: 'alien', followers: 6000, weeklyRevenue: 7000, growth: 0.02, bio: 'Glitch-cult collective. Unpredictable drops.' },
  { id: 'moss', name: 'Moss Theory', personality: 'eco', vibe: 'gorpcore', color: '#5d6534', glyph: 'flame', followers: 15000, weeklyRevenue: 18000, growth: 0.012, bio: 'Recycled fleece and moral high ground.' },
  { id: 'pylon', name: 'Saint Pylon', personality: 'hype', vibe: 'techwear', color: '#ff2fb4', glyph: 'skull', followers: 40000, weeklyRevenue: 60000, growth: 0.019, bio: 'Every drop is an event. Every event is a drop.' },
  { id: 'faithful', name: 'Old Faithful Athletic', personality: 'heritage', vibe: 'retro', color: '#b3121f', glyph: 'star', followers: 350000, weeklyRevenue: 650000, growth: 0.012, bio: 'Forty-year-old sportswear giant. Slow, rich, everywhere.' },
];

export interface StoreDef {
  id: string;
  name: string;
  city: string;
  minRep: number;
  size: number;
  risk: number;
}

export const STORES: StoreDef[] = [
  { id: 'concrete', name: 'Concrete Garden', city: 'Budapest', minRep: 15, size: 1, risk: 0.02 },
  { id: 'kollektiv', name: 'Kollektiv Nord', city: 'Berlin', minRep: 25, size: 1.6, risk: 0.04 },
  { id: 'lateshift', name: 'Late Shift', city: 'Warsaw', minRep: 20, size: 1.2, risk: 0.06 },
  { id: 'threads', name: 'Basement Threads', city: 'Prague', minRep: 30, size: 1.4, risk: 0.03 },
  { id: 'atomic', name: 'Atomic Lobby', city: 'Milan', minRep: 45, size: 2.4, risk: 0.05 },
  { id: 'tidal', name: 'Tidal Room', city: 'Copenhagen', minRep: 55, size: 3, risk: 0.02 },
];

export const STAGE3 = {
  campaignYears: 5,
  wholesaleOfferChance: 0.55,
  wholesalePriceShare: 0.52,
  offerDays: 10,
  restockDemandMult: 0.8,
  collectionBonus: 0.08,
  collectionMin: 3,
  xpPerLevelBase: 6,
};

// ---------------------------------------------------------------- stage 4


export interface CityDef {
  id: CityId;
  name: string;
  /** position on the world map, 0..1000 x 0..500 */
  x: number;
  y: number;
  vibes: VibeId[];
  blurb: string;
  shipCost: number;
  shipWeekly: number;
  storeCost: number;
  storeRent: number;
  capShip: number;
  capStore: number;
}

export const CITIES: CityDef[] = [
  { id: 'london', name: 'London', x: 478, y: 128, vibes: ['grunge', 'luxury'], blurb: 'Rain, grime and old money.', shipCost: 50000, shipWeekly: 1200, storeCost: 450000, storeRent: 8000, capShip: 80000, capStore: 160000 },
  { id: 'paris', name: 'Paris', x: 492, y: 146, vibes: ['luxury', 'y2k'], blurb: 'Fashion capital. Snobby, rich, picky.', shipCost: 60000, shipWeekly: 1400, storeCost: 550000, storeRent: 9000, capShip: 70000, capStore: 150000 },
  { id: 'tokyo', name: 'Tokyo', x: 868, y: 192, vibes: ['techwear', 'cyber'], blurb: 'Obsessive collectors, endless detail.', shipCost: 70000, shipWeekly: 1600, storeCost: 625000, storeRent: 10000, capShip: 120000, capStore: 240000 },
  { id: 'la', name: 'Los Angeles', x: 172, y: 200, vibes: ['skate', 'gorpcore'], blurb: 'Skate parks and influencer mansions.', shipCost: 60000, shipWeekly: 1400, storeCost: 500000, storeRent: 9000, capShip: 130000, capStore: 260000 },
  { id: 'seoul', name: 'Seoul', x: 836, y: 184, vibes: ['y2k', 'techwear'], blurb: 'Trends move at light speed.', shipCost: 56000, shipWeekly: 1300, storeCost: 475000, storeRent: 8400, capShip: 90000, capStore: 180000 },
];
export const BUDAPEST = { x: 528, y: 150 };

export const PRODUCT_LINES: { id: string; garment: GarmentId; name: string; cost: number; blurb: string }[] = [
  { id: 'line_sneakers', garment: 'sneakers', name: 'Sneakers', cost: 40000, blurb: 'The holy grail of hype. Pricey to make, everyone wants them.' },
  { id: 'line_bag', garment: 'bag', name: 'Bags', cost: 60000, blurb: 'Crossbody bags. Steady sellers all year.' },
  { id: 'line_jewelry', garment: 'jewelry', name: 'Jewelry', cost: 90000, blurb: 'Chains and pendants. Small, cheap to ship, big markup.' },
  { id: 'line_perfume', garment: 'perfume', name: 'Perfume', cost: 150000, blurb: 'Cheap to make, huge margins, gift season gold.' },
];

export const FUNDING_ROUNDS: { id: string; name: string; minValue: number; amount: number; pct: number }[] = [
  { id: 'seed', name: 'Seed round', minValue: 1_000_000, amount: 250_000, pct: 10 },
  { id: 'a', name: 'Series A', minValue: 5_000_000, amount: 1_500_000, pct: 15 },
  { id: 'b', name: 'Series B', minValue: 20_000_000, amount: 6_000_000, pct: 15 },
];

export const STAGE4 = {
  ipoMinValue: 40_000_000,
  ipoFloat: 0.2,
  shares: 1_000_000,
  growthTarget: 1.6,
  acquireRatio: 1.5,
  acquirePriceShare: 0.6,
  subsidiaryShare: 0.3,
  runwayCooldown: 60,
  towerCities: 2,
};

export const FASHION_WEEKS: { id: string; name: string; city: CityId | null; weekOfYear: number; minRep: number }[] = [
  { id: 'danube', name: 'Danube Fashion Week', city: null, weekOfYear: 8, minRep: 30 },
  { id: 'tokyo', name: 'Tokyo Neon Week', city: 'tokyo', weekOfYear: 16, minRep: 45 },
  { id: 'paris', name: 'Paris Atelier Week', city: 'paris', weekOfYear: 36, minRep: 55 },
  { id: 'la', name: 'LA Concrete Week', city: 'la', weekOfYear: 46, minRep: 40 },
];

export const SHOW_BUDGETS: Record<ShowBudget, { name: string; cost: number; mult: number }> = {
  small: { name: 'Scrappy', cost: 15000, mult: 0.8 },
  medium: { name: 'Proper', cost: 40000, mult: 1.0 },
  big: { name: 'Spectacle', cost: 100000, mult: 1.25 },
};
