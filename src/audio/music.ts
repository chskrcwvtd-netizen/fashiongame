/** Plays the player's own tracks (menu / game / drop) from the music folder, with crossfades. */
export type Scene = 'menu' | 'game' | 'drop';

class MusicPlayer {
  private els = new Map<Scene, HTMLAudioElement>();
  private available = new Set<Scene>();
  private current: Scene | null = null;
  private fades = new Map<HTMLAudioElement, ReturnType<typeof setInterval>>();
  volume = 0.5;
  enabled = true;
  ready = false;

  async init() {
    const list = (await window.streetwear?.musicTracks?.()) ?? [];
    for (const n of list) if (n === 'menu' || n === 'game' || n === 'drop') this.available.add(n);
    this.ready = true;
    if (this.current) {
      const c = this.current;
      this.current = null;
      this.setScene(c);
    }
  }

  tracks(): Scene[] {
    return [...this.available];
  }

  private el(scene: Scene): HTMLAudioElement {
    let a = this.els.get(scene);
    if (!a) {
      a = new Audio(`swt-music://${scene}`);
      a.loop = true;
      a.volume = 0;
      this.els.set(scene, a);
    }
    return a;
  }

  private fade(a: HTMLAudioElement, to: number, ms = 1500) {
    const prev = this.fades.get(a);
    if (prev) clearInterval(prev);
    const from = a.volume;
    const start = Date.now();
    if (to > 0 && a.paused) void a.play().catch(() => {});
    const t = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) {
        clearInterval(t);
        this.fades.delete(a);
        if (to === 0) a.pause();
      }
    }, 50);
    this.fades.set(a, t);
  }

  /** Switch to a scene; falls back to the game track for drops if no drop track exists. */
  setScene(scene: Scene | null) {
    let target = scene;
    if (target === 'drop' && !this.available.has('drop')) target = 'game';
    if (!this.ready) {
      this.current = target;
      return;
    }
    if (target === this.current) return;
    if (this.current && this.available.has(this.current)) this.fade(this.el(this.current), 0);
    this.current = target;
    if (target && this.enabled && this.available.has(target)) this.fade(this.el(target), this.volume);
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.current && this.available.has(this.current) && this.enabled) this.fade(this.el(this.current), this.volume, 200);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!this.current || !this.available.has(this.current)) return;
    this.fade(this.el(this.current), on ? this.volume : 0, 400);
  }
}

export const music = new MusicPlayer();
