import {
  advanceDay,
  createNewGame,
  deserialize,
  getDesign,
  serialize,
  FACTORIES,
  type ActionResult,
  type DropResult,
  type GameEvent,
  type GameState,
  type NewGameOptions,
  type Speed,
} from '../engine';
import { defaultBackend, readMeta, unwrapGame, wrapSave, SLOTS, type SaveBackend, type SaveMeta, type SlotId } from '../platform/storage';
import type { SfxName } from '../audio/sfx';

export const MS_PER_DAY_1X = 2000;

export type Panel = 'hq' | 'lab' | 'production' | 'shop' | 'drops';
export type Phase = 'menu' | 'game';
export type Tone = 'money' | 'good' | 'bad' | 'info';

export interface FeedItem {
  id: number;
  day: number;
  text: string;
  tone: Tone;
}

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: Tone;
}

export interface Splash {
  designName: string;
  result: DropResult;
}

export interface SoundSink {
  play(name: SfxName): void;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export class GameStore {
  state: GameState | null = null;
  phase: Phase = 'menu';
  panel: Panel = 'hq';
  speed: Speed = 1;
  feed: FeedItem[] = [];
  toasts: Toast[] = [];
  splash: Splash | null = null;
  lastSavedAt: number | null = null;
  /** design picked in one screen and carried to the next (Lab → Factories → Drops) */
  selectedDesignId: string | null = null;
  private version = 0;
  private listeners = new Set<() => void>();
  private nextFeedId = 1;
  private acc = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTime = 0;

  constructor(
    public backend: SaveBackend = defaultBackend(),
    public sound: SoundSink = { play: () => {} },
  ) {}

  // ---- subscription -------------------------------------------------------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = () => this.version;
  bump() {
    this.version++;
    for (const l of this.listeners) l();
  }

  // ---- lifecycle ----------------------------------------------------------
  newGame(opts: NewGameOptions) {
    this.state = createNewGame(opts);
    this.phase = 'game';
    this.panel = 'hq';
    this.speed = 1;
    this.feed = [];
    this.toasts = [];
    this.splash = null;
    this.acc = 0;
    this.pushFeed(`${this.state.brand.name} is born in a Budapest basement. Design your first piece.`, 'info');
    this.bump();
  }

  loadState(state: GameState) {
    this.state = state;
    this.phase = 'game';
    this.panel = 'hq';
    this.speed = 0;
    this.feed = [];
    this.toasts = [];
    this.splash = null;
    this.acc = 0;
    this.pushFeed('Save loaded. Time is paused, hit play when ready.', 'info');
    this.bump();
  }

  toMenu() {
    this.phase = 'menu';
    this.speed = 0;
    this.bump();
  }

  setPanel(p: Panel, designId?: string) {
    this.panel = p;
    if (designId) this.selectedDesignId = designId;
    this.bump();
  }

  setSpeed(s: Speed) {
    this.speed = s;
    this.bump();
  }

  get effectiveSpeed(): Speed {
    if (this.phase !== 'game' || !this.state || this.state.gameOver || this.splash) return 0;
    return this.speed;
  }

  // ---- clock --------------------------------------------------------------
  startClock() {
    if (this.timer) return;
    this.lastTime = Date.now();
    this.timer = setInterval(() => this.pump(Date.now()), 50);
  }

  stopClock() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Advance the clock by real elapsed time; ticks whole days. Exposed for tests. */
  pump(now: number) {
    const dt = Math.min(1000, now - this.lastTime);
    this.lastTime = now;
    const speed = this.effectiveSpeed;
    if (!speed) return;
    this.acc += dt * speed;
    while (this.acc >= MS_PER_DAY_1X && this.effectiveSpeed) {
      this.acc -= MS_PER_DAY_1X;
      this.tick();
    }
  }

  /** Fraction of the current day elapsed (0..1), for UI progress. */
  get dayProgress() {
    return Math.min(1, this.acc / MS_PER_DAY_1X);
  }

  tick() {
    if (!this.state || this.state.gameOver) return;
    const events = advanceDay(this.state);
    this.handleEvents(events);
    this.bump();
  }

  // ---- actions ------------------------------------------------------------
  act(fn: (s: GameState) => ActionResult, success?: { sound?: SfxName; feed?: string; toast?: string }): ActionResult {
    if (!this.state) return { ok: false, reason: 'No game running.' };
    const r = fn(this.state);
    if (!r.ok) {
      this.sound.play('error');
      this.toast(r.reason, undefined, 'bad');
    } else {
      this.sound.play(success?.sound ?? 'click');
      if (success?.feed) this.pushFeed(success.feed, 'info');
      if (success?.toast) this.toast(success.toast, undefined, 'good');
    }
    this.bump();
    return r;
  }

  /** Mutate state without an ActionResult (e.g. creating a design). */
  mutate<T>(fn: (s: GameState) => T): T | undefined {
    if (!this.state) return undefined;
    const out = fn(this.state);
    this.bump();
    return out;
  }

  dismissSplash() {
    this.splash = null;
    this.bump();
  }

  dismissToast(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.bump();
  }

  // ---- feed / toasts ------------------------------------------------------
  pushFeed(text: string, tone: Tone) {
    this.feed.unshift({ id: this.nextFeedId++, day: this.state?.day ?? 0, text, tone });
    if (this.feed.length > 60) this.feed.length = 60;
  }

  toast(title: string, body: string | undefined, tone: Tone) {
    const id = this.nextFeedId++;
    this.toasts.push({ id, title, body, tone });
    if (this.toasts.length > 4) this.toasts.shift();
    if (typeof setTimeout !== 'undefined') setTimeout(() => this.dismissToast(id), 5000);
  }

  private designName(id: string) {
    return this.state ? getDesign(this.state, id)?.name ?? 'piece' : 'piece';
  }

  handleEvents(events: GameEvent[]) {
    const s = this.state!;
    const sales = events.filter((e): e is Extract<GameEvent, { type: 'sale' }> => e.type === 'sale');
    if (sales.length) {
      const units = sales.reduce((a, e) => a + e.units, 0);
      const rev = sales.reduce((a, e) => a + e.revenue, 0);
      const what = sales.length === 1 ? this.designName(sales[0].designId) : `${sales.length} pieces`;
      this.pushFeed(`Sold ${units}× ${what}, +${money(rev)}`, 'money');
      this.sound.play('cash');
    }
    for (const e of events) {
      switch (e.type) {
        case 'firstSale':
          this.toast('First sale!', 'Someone in Budapest just copped your piece.', 'good');
          this.sound.play('notify');
          break;
        case 'orderArrived':
          this.pushFeed(`Shipment in: ${e.units}× ${this.designName(e.designId)}`, 'good');
          this.toast('Shipment arrived', `${e.units}× ${this.designName(e.designId)} in the warehouse.`, 'good');
          this.sound.play('arrived');
          break;
        case 'defect':
          this.pushFeed(`Factory botched ${e.lost} units of ${this.designName(e.designId)}. Written off.`, 'bad');
          this.toast('Defective units', `${e.lost} pieces of ${this.designName(e.designId)} were unusable.`, 'bad');
          this.sound.play('error');
          break;
        case 'delay':
          this.pushFeed(`${this.designName(e.designId)} is running ${e.days} days late.`, 'bad');
          this.toast('Factory delay', `${this.designName(e.designId)} arrives ${e.days} days late.`, 'bad');
          this.sound.play('notify');
          break;
        case 'scandal':
          this.pushFeed(`Exposé: ${FACTORIES[e.factoryId].name} working conditions. Reputation −${e.repLoss}.`, 'bad');
          this.toast('Scandal!', `A blog exposed ${FACTORIES[e.factoryId].name}. People are asking who makes your clothes.`, 'bad');
          this.sound.play('scandal');
          break;
        case 'dropResult': {
          const name = this.designName(e.designId);
          this.splash = { designName: name, result: e.result };
          const label = e.result.outcome === 'soldout' ? 'SOLD OUT' : e.result.outcome === 'solid' ? 'Solid drop' : 'Flop';
          this.pushFeed(`Drop: ${name}. ${label}, ${e.result.sold}/${e.result.units} sold, +${money(e.result.revenue)}`, e.result.outcome === 'flop' ? 'bad' : 'money');
          this.sound.play(e.result.outcome === 'soldout' ? 'soldout' : e.result.outcome === 'flop' ? 'flop' : 'notify');
          break;
        }
        case 'dropPostponed':
          this.pushFeed(`Drop postponed: stock for ${this.designName(e.designId)} isn't here yet.`, 'bad');
          this.toast('Drop postponed', 'The stock did not arrive in time. Some hype was lost.', 'bad');
          this.sound.play('error');
          break;
        case 'bills':
          this.pushFeed(`Weekly bills: −${money(e.total)}`, 'info');
          break;
        case 'overdrawn':
          this.toast('You are overdrawn!', `Get back above $0 within ${e.graceDays} days or the brand goes bankrupt.`, 'bad');
          this.pushFeed('Account overdrawn. The clock is ticking.', 'bad');
          this.sound.play('scandal');
          break;
        case 'recovered':
          this.toast('Back in the black', 'Crisis averted.', 'good');
          this.pushFeed('Account back above $0.', 'good');
          this.sound.play('notify');
          break;
        case 'bankrupt':
          this.pushFeed('Bankrupt. The basement lights go out.', 'bad');
          this.sound.play('bankrupt');
          break;
        case 'newSeason':
          this.pushFeed(SEASON_LINES[e.season], 'info');
          break;
        case 'newWeek':
          void this.save('auto');
          break;
        case 'sale':
          break;
      }
    }
    void s;
  }

  // ---- saving -------------------------------------------------------------
  private meta(slot: SlotId): SaveMeta {
    const s = this.state!;
    return { slot, brand: s.brand.name, day: s.day, cash: Math.round(s.cash), savedAt: Date.now(), gameOver: !!s.gameOver };
  }

  async save(slot: SlotId): Promise<boolean> {
    if (!this.state) return false;
    try {
      await this.backend.write(slot, wrapSave(this.meta(slot), serialize(this.state)));
      this.lastSavedAt = Date.now();
      if (slot !== 'auto') {
        this.toast('Game saved', undefined, 'good');
        this.sound.play('notify');
      }
      this.bump();
      return true;
    } catch {
      this.toast('Could not save', 'The save file could not be written.', 'bad');
      this.bump();
      return false;
    }
  }

  saveSync(slot: SlotId = 'auto') {
    if (!this.state || this.phase !== 'game') return;
    try {
      this.backend.writeSync(slot, wrapSave(this.meta(slot), serialize(this.state)));
    } catch {
      /* closing: nothing else we can do */
    }
  }

  async listSaves(): Promise<SaveMeta[]> {
    const out: SaveMeta[] = [];
    for (const slot of SLOTS) {
      const text = await this.backend.read(slot);
      if (!text) continue;
      const m = readMeta(text);
      if (m) out.push({ ...m, slot });
    }
    return out;
  }

  async load(slot: SlotId): Promise<ActionResult> {
    const text = await this.backend.read(slot);
    if (!text) return { ok: false, reason: 'That save slot is empty.' };
    try {
      const state = deserialize(unwrapGame(text));
      this.loadState(state);
      this.sound.play('notify');
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'Save file is damaged.' };
    }
  }
}

const SEASON_LINES: Record<string, string> = {
  Spring: 'Spring drops. Hoodies and cargos move, puffers cool off.',
  Summer: 'Summer heat. Tees and caps fly, nobody wants a puffer.',
  Fall: 'Fall is here. Hoodies, beanies and puffers heat up.',
  Winter: 'Winter. Puffers and beanies are king. Tees go cold.',
};
