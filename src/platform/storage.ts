/** Where save files live: Electron (files in app-data) or browser localStorage. */
export type SlotId = 'auto' | 'slot1' | 'slot2' | 'slot3';
export const SLOTS: SlotId[] = ['auto', 'slot1', 'slot2', 'slot3'];

export interface SaveMeta {
  slot: SlotId;
  brand: string;
  day: number;
  cash: number;
  savedAt: number;
  gameOver: boolean;
}

export interface SaveBackend {
  read(slot: SlotId): Promise<string | null>;
  write(slot: SlotId, text: string): Promise<void>;
  /** Synchronous write used while the window is closing. */
  writeSync(slot: SlotId, text: string): void;
  remove(slot: SlotId): Promise<void>;
}

interface Bridge {
  read(slot: string): Promise<string | null>;
  write(slot: string, text: string): Promise<void>;
  writeSync(slot: string, text: string): void;
  remove(slot: string): Promise<void>;
}

declare global {
  interface Window {
    streetwear?: {
      saves: Bridge;
      quit(): void;
      toggleFullscreen(): void;
      onBeforeClose(cb: () => void): void;
      isDesktop: true;
      captureRect?(rect: { x: number; y: number; width: number; height: number }, name: string): Promise<boolean>;
      openMusicFolder?(): void;
      musicTracks?(): Promise<string[]>;
      saveFeedback?(text: string): Promise<boolean>;
    };
  }
}

export class MemoryBackend implements SaveBackend {
  data = new Map<SlotId, string>();
  async read(slot: SlotId) {
    return this.data.get(slot) ?? null;
  }
  async write(slot: SlotId, text: string) {
    this.data.set(slot, text);
  }
  writeSync(slot: SlotId, text: string) {
    this.data.set(slot, text);
  }
  async remove(slot: SlotId) {
    this.data.delete(slot);
  }
}

class LocalStorageBackend implements SaveBackend {
  private key = (s: SlotId) => `streetwear-tycoon:${s}`;
  async read(slot: SlotId) {
    return localStorage.getItem(this.key(slot));
  }
  async write(slot: SlotId, text: string) {
    localStorage.setItem(this.key(slot), text);
  }
  writeSync(slot: SlotId, text: string) {
    localStorage.setItem(this.key(slot), text);
  }
  async remove(slot: SlotId) {
    localStorage.removeItem(this.key(slot));
  }
}

class DesktopBackend implements SaveBackend {
  constructor(private b: Bridge) {}
  read(slot: SlotId) {
    return this.b.read(slot);
  }
  write(slot: SlotId, text: string) {
    return this.b.write(slot, text);
  }
  writeSync(slot: SlotId, text: string) {
    this.b.writeSync(slot, text);
  }
  remove(slot: SlotId) {
    return this.b.remove(slot);
  }
}

/** Browser storage, or memory where the page may not use it (a sandboxed frame throws on access). */
function localBackend(): SaveBackend {
  try {
    if (typeof localStorage !== 'undefined') {
      void localStorage.length; // throws where the page is not allowed to use it
      return new LocalStorageBackend();
    }
  } catch {
    /* blocked */
  }
  return new MemoryBackend();
}

/** The Claude page host (claude.ai artifact) offers a private per-player store. */
export interface ClaudeHost {
  use(name: string): Promise<any>;
}
interface CloudDoc {
  get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>;
  set(body: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
declare global {
  interface Window {
    claude?: ClaudeHost;
  }
}

const newer = (a: string | null, b: string | null) => ((readMeta(b ?? '')?.savedAt ?? -1) > (readMeta(a ?? '')?.savedAt ?? -1) ? b : a);

/**
 * Web version: saves stay in the browser and, when the game runs as a Claude page (iPhone),
 * also go to the player's private cloud store, because browser storage there can be wiped.
 * Reading takes whichever copy was saved last.
 */
export class WebBackend implements SaveBackend {
  private cloud: Promise<((slot: SlotId) => CloudDoc) | null> | null = null;
  private pending = new Map<SlotId, Record<string, unknown> | null>();
  private busy = new Set<SlotId>();
  constructor(
    private local: SaveBackend = localBackend(),
    private host: () => ClaudeHost | undefined = () => (typeof window !== 'undefined' ? window.claude : undefined),
  ) {}

  private docs() {
    this.cloud ??= (async () => {
      const h = this.host();
      if (!h?.use) return null;
      try {
        const [db, user] = await Promise.all([h.use('db'), h.use('user')]);
        const id = db && user ? await user.id() : null;
        return id ? (slot: SlotId) => db.doc(`data/users/${id}/${slot}`) as CloudDoc : null;
      } catch {
        return null;
      }
    })();
    return this.cloud;
  }

  /** One cloud write at a time per slot; only the latest waiting save is sent. */
  private push(slot: SlotId, body: Record<string, unknown> | null) {
    this.pending.set(slot, body);
    if (this.busy.has(slot)) return;
    this.busy.add(slot);
    void (async () => {
      const doc = await this.docs();
      while (this.pending.has(slot)) {
        const next = this.pending.get(slot)!;
        this.pending.delete(slot);
        try {
          if (doc) await (next ? doc(slot).set(next) : doc(slot).delete());
        } catch {
          /* the browser copy still has it */
        }
      }
      this.busy.delete(slot);
    })();
  }

  async read(slot: SlotId) {
    const mine = await this.local.read(slot).catch(() => null);
    const doc = await this.docs();
    if (!doc) return mine;
    try {
      const snap = await doc(slot).get();
      const text = snap.exists ? snap.data()?.text : null;
      return newer(mine, typeof text === 'string' ? text : null);
    } catch {
      return mine;
    }
  }
  async write(slot: SlotId, text: string) {
    this.push(slot, { text });
    await this.local.write(slot, text).catch(() => {});
  }
  writeSync(slot: SlotId, text: string) {
    this.push(slot, { text });
    try {
      this.local.writeSync(slot, text);
    } catch {
      /* full or blocked */
    }
  }
  async remove(slot: SlotId) {
    this.push(slot, null);
    await this.local.remove(slot);
  }
}

export function defaultBackend(): SaveBackend {
  if (typeof window !== 'undefined' && window.streetwear?.saves) return new DesktopBackend(window.streetwear.saves);
  return new WebBackend();
}

/** Save file = { meta, game } so the menu can list saves without loading them. */
export function wrapSave(meta: SaveMeta, gameText: string): string {
  return JSON.stringify({ meta }) .slice(0, -1) + `,"game":${gameText}}`;
}

export function readMeta(text: string): SaveMeta | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && parsed.meta ? (parsed.meta as SaveMeta) : null;
  } catch {
    return null;
  }
}

export function unwrapGame(text: string): string {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !parsed.game) throw new Error('Save file is damaged.');
  return JSON.stringify(parsed.game);
}
