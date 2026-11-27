export type DifficultyId = 'easy' | 'normal' | 'hard';
export type GarmentId = 'tee' | 'hoodie' | 'cargo' | 'puffer' | 'cap' | 'beanie' | 'track' | 'sneakers' | 'bag' | 'jewelry' | 'perfume' | 'jeans' | 'shorts';
export type CityId = 'london' | 'paris' | 'tokyo' | 'la' | 'seoul' | 'berlin' | 'milan' | 'lagos' | 'saopaulo';
export type ShowBudget = 'small' | 'medium' | 'big';
export type MaterialId = 'basic' | 'standard' | 'premium' | 'luxe';
export type FactoryId = 'fastloop' | 'danube' | 'nord' | 'vela' | 'own';
export type PatternId = 'solid' | 'camo' | 'tiedye' | 'checker' | 'stripes' | 'flames' | 'grid' | 'gradient';
export type GraphicKind = 'none' | 'text' | 'emblem' | 'pixel';
export type FontId = 'gothic' | 'bubble' | 'chrome' | 'graffiti';
export type ColorId = string;
export type EmblemId = string;
export type Season = 'Spring' | 'Summer' | 'Fall' | 'Winter';
export type Speed = 0 | 1 | 2 | 4;
export type VibeId = 'y2k' | 'gorpcore' | 'techwear' | 'grunge' | 'skate' | 'luxury' | 'cyber' | 'retro';
export type TrendCategory = 'color' | 'pattern' | 'garment' | 'vibe';
export type RoleId = 'designer' | 'marketer' | 'sourcer' | 'manager' | 'analyst' | 'director';
export type TraitId = 'perfectionist' | 'hypebeast' | 'loyal' | 'diva' | 'chill' | 'intern';
export type PlatformId = 'loopz' | 'glint';
export type PostKind = 'fit' | 'bts' | 'meme' | 'teaser';

export type FinishId = 'print' | 'embroidery' | 'washed' | 'distressed';
export type BackPrint = 'none' | 'logo' | 'text';
export type BadgeId = 'none' | 'circle' | 'diamond' | 'shield';

export interface LogoChoice {
  glyph: EmblemId;
  color: ColorId;
  /** wordmark font (stage 3; optional for older saves) */
  font?: FontId;
  badge?: BadgeId;
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
  vibe: VibeId;
  finish: FinishId;
  back: BackPrint;
  backText: string;
  /** optional named collection (3+ live pieces with the same name get a bonus) */
  collection?: string;
  /** 8x8 pixel graphic, 64 chars of '0'/'1' */
  pixels?: string;
  /** hand to hand: a wearer's change (sleeves cut off) and their name credited on the back */
  cut?: boolean;
  credit?: string;
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
  /** auto-reorder rule (needs a manager on the team) */
  auto?: { factoryId: FactoryId; qty: number } | null;
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

export interface DropItem {
  designId: string;
  units: number;
  price: number;
}

export interface DropResult {
  partner?: string;
  items?: (DropItem & { sold: number })[];
  outcome: DropOutcome;
  units: number;
  sold: number;
  revenue: number;
  demand: number;
  minutes: number | null;
  resalePrice: number | null;
  raffle?: boolean;
  bots?: number;
  numbered?: boolean;
}

export interface Drop {
  name?: string;
  items?: DropItem[];
  id: string;
  designId: string;
  units: number;
  price: number;
  announcedDay: number;
  dropDay: number;
  hype: number;
  status: 'scheduled' | 'done';
  postponements: number;
  restock?: boolean;
  clash?: boolean;
  numbered?: boolean;
  preorder?: boolean;
  raffle?: boolean;
  botShield?: boolean;
  /** pre-order money already received */
  deposit?: number;
  result: DropResult | null;
}

export interface TrendValue {
  pop: number;
  vel: number;
  /** weeks spent at/near the peak */
  peakWeeks: number;
}

export interface Ignition {
  cat: TrendCategory;
  id: string;
  week: number;
  vel: number;
}

export interface TrendState {
  values: Record<TrendCategory, Record<string, TrendValue>>;
  /** future trend starts, generated ahead so research can reveal them */
  upcoming: Ignition[];
  /** last week's popularity, for ↑/↓ arrows */
  last: Record<TrendCategory, Record<string, number>>;
  reportUntilDay: number;
}

export interface Employee {
  id: string;
  name: string;
  role: RoleId;
  skill: number;
  salary: number;
  mood: number;
  trait: TraitId;
  hiredDay: number;
  lowMoodWeeks: number;
  lastPerk: number;
  xp?: number;
}

export interface Boost {
  kind: 'visitors' | 'followersDaily';
  mult: number;
  untilDay: number;
  source: string;
}

export interface Collab {
  artistId: string;
  signedDay: number;
  /** consumed by the next drop */
  used: boolean;
}

export interface PendingEvent {
  id: string;
  defId: string;
  day: number;
  params: Record<string, string | number>;
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
  soldByDesign?: Record<string, number>;
}

export interface GameState {
  version: 4;
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
  // ---- stage 2 ----
  trends: TrendState;
  employees: Employee[];
  candidates: Employee[];
  posts: { day: number; count: number };
  boosts: Boost[];
  influencerCampaign: { influencerId: string; untilDay: number } | null;
  collab: Collab | null;
  pendingEvents: PendingEvent[];
  lastEventDay: number;
  lastTeamNight: number;
  supplierDiscountUntil: number;
  // ---- stage 3 ----
  rivals: Rival[];
  wholesale: { offers: WholesaleOffer[]; receivables: Receivable[] };
  milestones: Record<string, number>;
  unlocks: string[];
  scheduledEvents: { defId: string; day: number; params: Record<string, string | number> }[];
  campaign: { wonDay: number | null; endSeen: boolean; winSeen: boolean };
  history: { followers: number[]; value: number[]; rank: number[] };
  // ---- stage 4 ----
  cities: Partial<Record<CityId, 1 | 2>>;
  corporate: Corporate;
  shows: { applied: ShowBooking[]; lastRunwayDay: number; history: ShowHistoryEntry[] };
  // ---- 50-question update (optional so older saves load untouched) ----
  loans?: Loan[];
  press?: { day: number; mag: string; headline: string }[];
  challenge?: { id: string; done: 'won' | 'lost' | null } | null;
  rivalCollab?: string | null;
  rivalOffer?: { rivalId: string; expiresDay: number };
  lastRivalOfferDay?: number;
  sustainability?: boolean;
  /** hand to hand: the one sold tee followed into the city (absent in older saves = empty) */
  lifePaths?: LifePath[];
}

export interface LifePath {
  dropId: string;
  designId: string;
  price: number;
  wearer: 'mira' | 'bence';
  soldDay: number;
  dueDay: number;
  status: 'out' | 'spotted' | 'accepted' | 'declined' | 'delivered';
  variantId?: string;
  delivered?: number;
}

export interface Loan {
  id: string;
  principal: number;
  weekly: number;
  weeksLeft: number;
  emergency?: boolean;
}

export interface ShowBooking {
  id: string;
  name: string;
  /** fashion week id, or 'runway' for your own show */
  weekId: string;
  budget: ShowBudget;
  day: number;
  lookIds?: string[];
}

export interface ShowHistoryEntry {
  name: string;
  day: number;
  outcome: 'ovation' | 'good' | 'panned';
  id?: string;
  text?: string;
  looks?: Design[];
  logo?: LogoChoice;
}

export interface Corporate {
  /** percent of the company you still own */
  ownership: number;
  rounds: string[];
  target: { value: number; byDay: number; round: string } | null;
  ipo: { day: number } | null;
  sentiment: number;
  sharePrice: number[];
  lastEarningsDay: number;
  lastQuarterRevenue: number;
  subsidiaries: { rivalId: string; name: string; weeklyIncome: number; day: number }[];
}

export type RivalPersonality = 'copycat' | 'snob' | 'hype' | 'eco' | 'heritage' | 'chaos';

export interface Rival {
  id: string;
  name: string;
  personality: RivalPersonality;
  vibe: VibeId;
  color: string;
  glyph: string;
  followers: number;
  weeklyRevenue: number;
  hype: number;
  reputation: number;
  relation: number;
  focus: { cat: TrendCategory; id: string } | null;
  lastDropDay: number;
  prevRank: number;
  lastActionDay: number;
}

export interface WholesaleOffer {
  id: string;
  storeId: string;
  designId: string;
  units: number;
  unitPrice: number;
  payDays: number;
  expiresDay: number;
}

export interface Receivable {
  id: string;
  storeId: string;
  amount: number;
  dueDay: number;
  defaultRisk: number;
}

export type ActionResult = { ok: true; id?: string } | { ok: false; reason: string };

export type GameEvent =
  | { type: 'sale'; designId: string; units: number; revenue: number }
  | { type: 'firstSale'; designId: string }
  | { type: 'orderArrived'; orderId: string; designId: string; units: number }
  | { type: 'defect'; orderId: string; designId: string; lost: number }
  | { type: 'delay'; orderId: string; designId: string; days: number }
  | { type: 'scandal'; factoryId: FactoryId; repLoss: number }
  | { type: 'dropResult'; dropId: string; designId: string; name?: string; result: DropResult }
  | { type: 'dropPostponed'; dropId: string; designId: string; newDay: number }
  | { type: 'bills'; total: number; rent: number; platform: number; storage: number; salaries: number; markets?: number }
  | { type: 'overdrawn'; graceDays: number }
  | { type: 'recovered' }
  | { type: 'bankrupt' }
  | { type: 'newWeek'; week: number }
  | { type: 'newSeason'; season: Season }
  | { type: 'eventStarted'; defId: string }
  | { type: 'viral'; followers: number }
  | { type: 'staffWarning'; employeeId: string; name: string }
  | { type: 'staffQuit'; name: string; role: RoleId }
  | { type: 'trendShift'; text: string }
  | { type: 'boostEnded'; source: string }
  | { type: 'milestone'; id: string; title: string; reward: string }
  | { type: 'rivalNews'; rivalId: string; text: string }
  | { type: 'wholesalePaid'; storeId: string; amount: number }
  | { type: 'wholesaleDefault'; storeId: string; amount: number }
  | { type: 'wholesaleOffer'; storeId: string }
  | { type: 'staffLevelUp'; name: string; skill: number }
  | { type: 'autoRestock'; designId: string; units: number }
  | { type: 'campaignWon' }
  | { type: 'campaignEnded'; rank: number }
  | { type: 'earnings'; beat: boolean; price: number }
  | { type: 'investorTarget'; met: boolean; round: string }
  | { type: 'showResult'; name: string; outcome: 'ovation' | 'good' | 'panned'; text: string }
  | { type: 'subsidiaryIncome'; amount: number }
  | { type: 'bailout'; amount: number }
  | { type: 'challengeResult'; won: boolean; title: string; text: string }
  | { type: 'news'; text: string };
