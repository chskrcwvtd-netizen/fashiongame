/**
 * All sound effects are synthesised at runtime with the Web Audio API.
 * No samples. Character: glittery, detuned, slightly crushed, with 808-ish lows.
 */
export type SfxName =
  | 'click'
  | 'hover'
  | 'cash'
  | 'arrived'
  | 'notify'
  | 'dropAnnounce'
  | 'soldout'
  | 'flop'
  | 'error'
  | 'scandal'
  | 'bankrupt'
  | 'upgrade';

export const SFX_NAMES: SfxName[] = ['click', 'hover', 'cash', 'arrived', 'notify', 'dropAnnounce', 'soldout', 'flop', 'error', 'scandal', 'bankrupt', 'upgrade'];

export const SFX_LENGTH: Record<SfxName, number> = {
  click: 0.12, hover: 0.05, cash: 0.9, arrived: 0.6, notify: 0.8, dropAnnounce: 1.4, soldout: 3.2,
  flop: 1.4, error: 0.4, scandal: 1.6, bankrupt: 3.0, upgrade: 1.6,
};

interface Bus {
  ctx: BaseAudioContext;
  dry: AudioNode;
  wet: AudioNode;
  crush: AudioNode;
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x7fffffff) * 2 - 1;
    }
    noiseCache.set(ctx, b);
  }
  return b;
}

const impulseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function impulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const cached = impulseCache.get(ctx);
  if (cached) return cached;
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let seed = 99 + c * 7;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = ((seed / 0x7fffffff) * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  impulseCache.set(ctx, b);
  return b;
}

function crushCurve(steps: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.round(x * steps) / steps;
  }
  return c;
}

function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return c;
}

function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 4096;
  const c = new Float32Array(n);
  const k = 1.4;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = (0.95 * Math.tanh(x * k)) / Math.tanh(k);
  }
  return c;
}

/** Build the shared FX chain into `out`. */
function makeBus(ctx: BaseAudioContext, out: AudioNode): Bus {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  const limiter = ctx.createGain();
  limiter.gain.value = 0.75;
  // Brick-wall soft clipper: the output can never exceed 0.95.
  const clipper = ctx.createWaveShaper();
  clipper.curve = softClipCurve();
  clipper.oversample = '4x';
  comp.connect(limiter).connect(clipper).connect(out);

  const dry = ctx.createGain();
  dry.connect(comp);
  const verb = ctx.createConvolver();
  verb.buffer = impulse(ctx, 1.6, 3.2);
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.28;
  verb.connect(wetGain).connect(comp);
  const wet = ctx.createGain();
  wet.connect(verb);
  wet.connect(dry);

  const crush = ctx.createWaveShaper();
  crush.curve = crushCurve(14);
  const crushOut = ctx.createGain();
  crushOut.gain.value = 0.9;
  crush.connect(crushOut).connect(wet);
  return { ctx, dry, wet, crush };
}

type Env = { a?: number; d: number; peak?: number; sustain?: number; hold?: number };

function envGain(ctx: BaseAudioContext, t: number, e: Env): GainNode {
  const g = ctx.createGain();
  const a = e.a ?? 0.004;
  const peak = e.peak ?? 1;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  if (e.hold) g.gain.setValueAtTime(peak, t + a + e.hold);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, (e.sustain ?? 0) * peak + 0.0001), t + a + (e.hold ?? 0) + e.d);
  return g;
}

function tone(
  bus: Bus,
  dest: AudioNode,
  type: OscillatorType,
  freq: number,
  t: number,
  env: Env,
  opts: { toFreq?: number; glide?: number; detune?: number } = {},
): void {
  const ctx = bus.ctx;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (opts.toFreq) o.frequency.exponentialRampToValueAtTime(opts.toFreq, t + (opts.glide ?? env.d));
  if (opts.detune) o.detune.value = opts.detune;
  const g = envGain(ctx, t, env);
  o.connect(g).connect(dest);
  const end = t + (env.a ?? 0.004) + (env.hold ?? 0) + env.d + 0.05;
  o.start(t);
  o.stop(end);
}

function noise(bus: Bus, dest: AudioNode, t: number, env: Env, filter: { type: BiquadFilterType; freq: number; toFreq?: number; q?: number }) {
  const ctx = bus.ctx;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = filter.type;
  f.frequency.setValueAtTime(filter.freq, t);
  if (filter.toFreq) f.frequency.exponentialRampToValueAtTime(filter.toFreq, t + (env.a ?? 0) + (env.hold ?? 0) + env.d);
  f.Q.value = filter.q ?? 1;
  const g = envGain(ctx, t, env);
  src.connect(f).connect(g).connect(dest);
  src.start(t);
  src.stop(t + (env.a ?? 0.004) + (env.hold ?? 0) + env.d + 0.05);
}

/** FM bell: glassy hyperpop pluck. */
function bell(bus: Bus, dest: AudioNode, freq: number, t: number, d: number, peak = 0.5) {
  const ctx = bus.ctx;
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  car.frequency.value = freq;
  mod.frequency.value = freq * 3.5;
  modGain.gain.setValueAtTime(freq * 2.2, t);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.05, t + d);
  mod.connect(modGain).connect(car.frequency);
  const g = envGain(ctx, t, { a: 0.002, d, peak });
  car.connect(g).connect(dest);
  car.start(t);
  mod.start(t);
  car.stop(t + d + 0.1);
  mod.stop(t + d + 0.1);
}

/** Detuned saw stack (supersaw-ish). */
function supersaw(bus: Bus, dest: AudioNode, freqs: number[], t: number, env: Env, cutoff: [number, number]) {
  const ctx = bus.ctx;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 2;
  const total = (env.a ?? 0.004) + (env.hold ?? 0) + env.d;
  f.frequency.setValueAtTime(cutoff[0], t);
  f.frequency.exponentialRampToValueAtTime(cutoff[1], t + total);
  f.connect(dest);
  const per = (env.peak ?? 0.3) / Math.sqrt(freqs.length * 3);
  for (const fr of freqs) for (const det of [-14, 0, 14]) tone(bus, f, 'sawtooth', fr, t, { ...env, peak: per }, { detune: det });
}

/** 808-style kick/bass: pitch-dropping sine through a soft-clipper. */
function eightOhEight(bus: Bus, dest: AudioNode, t: number, from: number, to: number, d: number, peak = 0.9) {
  const ctx = bus.ctx;
  const sh = ctx.createWaveShaper();
  sh.curve = driveCurve(2.5);
  sh.connect(dest);
  tone(bus, sh, 'sine', from, t, { a: 0.002, d, peak }, { toFreq: to, glide: 0.18 });
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export function scheduleSfx(ctx: BaseAudioContext, out: AudioNode, name: SfxName, t: number, variation = 0): void {
  const bus = makeBus(ctx, out);
  const v = Math.pow(2, variation / 12);
  switch (name) {
    case 'click':
      tone(bus, bus.dry, 'triangle', 1900, t, { d: 0.05, peak: 0.35 }, { toFreq: 1100, glide: 0.04 });
      tone(bus, bus.dry, 'square', 3800, t, { d: 0.02, peak: 0.05 });
      break;
    case 'hover':
      tone(bus, bus.dry, 'sine', 2600, t, { d: 0.025, peak: 0.08 });
      break;
    case 'cash':
      bell(bus, bus.wet, midi(88) * v, t, 0.35, 0.4);
      bell(bus, bus.wet, midi(95) * v, t + 0.07, 0.5, 0.35);
      noise(bus, bus.wet, t + 0.02, { a: 0.003, d: 0.25, peak: 0.12 }, { type: 'bandpass', freq: 9000, q: 3 });
      tone(bus, bus.crush, 'square', midi(100) * v, t + 0.14, { d: 0.12, peak: 0.08 });
      break;
    case 'arrived':
      eightOhEight(bus, bus.dry, t, 160, 48, 0.32, 0.8);
      noise(bus, bus.dry, t, { a: 0.002, d: 0.12, peak: 0.35 }, { type: 'lowpass', freq: 1400 });
      tone(bus, bus.wet, 'triangle', midi(79), t + 0.12, { d: 0.18, peak: 0.18 });
      tone(bus, bus.wet, 'triangle', midi(86), t + 0.2, { d: 0.25, peak: 0.16 });
      break;
    case 'notify':
      bell(bus, bus.wet, midi(84), t, 0.3, 0.32);
      bell(bus, bus.wet, midi(91), t + 0.11, 0.45, 0.3);
      break;
    case 'dropAnnounce':
      noise(bus, bus.wet, t, { a: 0.6, d: 0.2, peak: 0.25 }, { type: 'bandpass', freq: 400, toFreq: 9000, q: 4 });
      supersaw(bus, bus.crush, [midi(61), midi(65), midi(68), midi(72)], t + 0.55, { a: 0.01, d: 0.7, peak: 0.45 }, [800, 7000]);
      eightOhEight(bus, bus.dry, t + 0.55, 120, 46, 0.6, 0.7);
      break;
    case 'soldout': {
      noise(bus, bus.wet, t, { a: 0.75, d: 0.05, peak: 0.3 }, { type: 'highpass', freq: 300, toFreq: 8000, q: 2 });
      tone(bus, bus.crush, 'sawtooth', midi(48), t, { a: 0.7, d: 0.1, peak: 0.12 }, { toFreq: midi(72), glide: 0.8 });
      const hit = t + 0.8;
      eightOhEight(bus, bus.dry, hit, 180, 44, 1.2, 1);
      noise(bus, bus.dry, hit, { a: 0.001, d: 0.15, peak: 0.4 }, { type: 'highpass', freq: 2000 });
      supersaw(bus, bus.crush, [midi(60), midi(64), midi(67), midi(71), midi(76)], hit, { a: 0.01, hold: 0.25, d: 1.4, peak: 0.5 }, [1200, 9000]);
      const arp = [76, 79, 83, 88, 91, 95, 100, 103];
      arp.forEach((n, i) => bell(bus, bus.wet, midi(n), hit + 0.08 + i * 0.07, 0.3, 0.22));
      break;
    }
    case 'flop':
      tone(bus, bus.crush, 'sawtooth', midi(64), t, { a: 0.01, d: 0.9, peak: 0.3 }, { toFreq: midi(40), glide: 0.9 });
      tone(bus, bus.crush, 'sawtooth', midi(64), t, { a: 0.01, d: 0.9, peak: 0.2 }, { toFreq: midi(40), glide: 0.9, detune: 30 });
      eightOhEight(bus, bus.dry, t + 0.05, 90, 38, 0.8, 0.6);
      break;
    case 'error':
      tone(bus, bus.dry, 'square', 110, t, { d: 0.09, peak: 0.25 });
      tone(bus, bus.dry, 'square', 104, t + 0.13, { d: 0.12, peak: 0.25 });
      break;
    case 'scandal': {
      const sh = ctx.createWaveShaper();
      sh.curve = driveCurve(4);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3000, t);
      lp.frequency.exponentialRampToValueAtTime(200, t + 1.2);
      sh.connect(lp).connect(bus.wet);
      for (const n of [33, 34, 40, 46]) tone(bus, sh, 'sawtooth', midi(n), t, { a: 0.005, d: 1.2, peak: 0.25 }, { detune: n === 34 ? 20 : -10 });
      eightOhEight(bus, bus.dry, t, 100, 36, 1.0, 0.8);
      noise(bus, bus.wet, t, { a: 0.3, d: 0.6, peak: 0.15 }, { type: 'bandpass', freq: 5000, toFreq: 300, q: 2 });
      break;
    }
    case 'bankrupt':
      tone(bus, bus.crush, 'sawtooth', midi(81), t, { a: 0.02, hold: 0.3, d: 2.2, peak: 0.25 }, { toFreq: 30, glide: 2.4 });
      tone(bus, bus.crush, 'square', midi(69), t + 0.05, { a: 0.02, hold: 0.3, d: 2.2, peak: 0.12 }, { toFreq: 24, glide: 2.4, detune: 25 });
      eightOhEight(bus, bus.dry, t + 1.6, 70, 30, 1.2, 0.9);
      break;
    case 'upgrade': {
      const notes = [72, 76, 79, 84, 88, 91];
      notes.forEach((n, i) => bell(bus, bus.wet, midi(n), t + i * 0.08, 0.4, 0.28));
      supersaw(bus, bus.crush, [midi(60), midi(67), midi(76)], t + 0.48, { a: 0.02, d: 0.9, peak: 0.35 }, [1500, 8000]);
      eightOhEight(bus, bus.dry, t + 0.48, 150, 50, 0.6, 0.7);
      break;
    }
  }
}

/** Renders a sound offline (for automated checks). Browser only. */
export async function renderOffline(name: SfxName, sampleRate = 44100): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * (SFX_LENGTH[name] + 1.8)), sampleRate);
  scheduleSfx(ctx, ctx.destination, name, 0.01);
  const buf = await ctx.startRendering();
  return buf.getChannelData(0);
}

/** Live player with volume, mute and rate limiting. */
export class SfxPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private last: Partial<Record<SfxName, number>> = {};
  volume = 0.7;
  muted = false;

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.master!.gain.value = this.muted ? 0 : this.volume;
    return this.ctx;
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.volume;
  }

  play(name: SfxName, minGapMs = 0) {
    if (this.muted) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const gap = minGapMs || (name === 'cash' ? 1400 : name === 'hover' ? 60 : 40);
    if ((this.last[name] ?? -Infinity) + gap > now) return;
    this.last[name] = now;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const variation = name === 'cash' ? [0, 2, -3, 5][Math.floor(Math.random() * 4)] : 0;
    try {
      scheduleSfx(ctx, this.master, name, ctx.currentTime + 0.01, variation);
    } catch {
      /* audio is best-effort */
    }
  }
}

export const sfx = new SfxPlayer();
