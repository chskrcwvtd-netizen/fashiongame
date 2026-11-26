import { describe, expect, it } from 'vitest';
import { GameStore, MS_PER_DAY_1X } from './gameStore';
import { MemoryBackend } from '../platform/storage';
import { createDesign, setListing } from '../engine';
import { HOODIE } from '../engine/__tests__/helpers';

function makeStore() {
  const sounds: string[] = [];
  const backend = new MemoryBackend();
  const store = new GameStore(backend, { play: (n) => sounds.push(n) });
  store.newGame({ brandName: 'Store Test', logo: { glyph: 'star', color: 'lime' }, difficulty: 'normal', seed: 5 });
  return { store, sounds, backend };
}

describe('store', () => {
  it('tick turns sale events into feed and cash sound', () => {
    const { store, sounds } = makeStore();
    const s = store.state!;
    const d = createDesign(s, HOODIE);
    s.inventory[d.id] = { units: 200, quality: 50, unitCost: 14 };
    setListing(s, d.id, 50, true);
    s.followers = 5000;
    for (let i = 0; i < 5; i++) store.tick();
    expect(store.feed.some((f) => f.tone === 'money' && f.text.startsWith('Sold'))).toBe(true);
    expect(sounds).toContain('cash');
  });
  it('autosave on week start writes slot auto', async () => {
    const { store, backend } = makeStore();
    for (let i = 0; i < 7; i++) store.tick();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(backend.data.has('auto')).toBe(true);
    const saves = await store.listSaves();
    expect(saves[0].brand).toBe('Store Test');
    expect(saves[0].day).toBe(8);
  });
  it('manual save and load restores the game paused', async () => {
    const { store } = makeStore();
    for (let i = 0; i < 3; i++) store.tick();
    await store.save('slot1');
    const day = store.state!.day;
    for (let i = 0; i < 5; i++) store.tick();
    const r = await store.load('slot1');
    expect(r.ok).toBe(true);
    expect(store.state!.day).toBe(day);
    expect(store.speed).toBe(0);
  });
  it('loading an empty or broken slot fails without touching the game', async () => {
    const { store, backend } = makeStore();
    const before = store.state;
    expect((await store.load('slot2')).ok).toBe(false);
    backend.data.set('slot3', '{"meta":{},"game":{"version":7}}');
    expect((await store.load('slot3')).ok).toBe(false);
    expect(store.state).toBe(before);
  });
  it('pump advances days according to speed and stops on pause', () => {
    const { store } = makeStore();
    store.pump(0);
    (store as unknown as { lastTime: number }).lastTime = 0;
    store.setSpeed(4);
    let t = 0;
    for (let i = 0; i < 20; i++) store.pump((t += 100)); // 2s real at 4x = 4 days
    expect(store.state!.day).toBe(1 + (2000 * 4) / MS_PER_DAY_1X);
    store.setSpeed(0);
    for (let i = 0; i < 20; i++) store.pump((t += 100));
    expect(store.state!.day).toBe(5);
  });
  it('failed action plays error and toasts reason', () => {
    const { store, sounds } = makeStore();
    const r = store.act(() => ({ ok: false, reason: 'Nope.' }));
    expect(r.ok).toBe(false);
    expect(sounds).toContain('error');
    expect(store.toasts[0].title).toBe('Nope.');
  });
});
