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

export function defaultBackend(): SaveBackend {
  if (typeof window !== 'undefined' && window.streetwear?.saves) return new DesktopBackend(window.streetwear.saves);
  if (typeof localStorage !== 'undefined') return new LocalStorageBackend();
  return new MemoryBackend();
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
