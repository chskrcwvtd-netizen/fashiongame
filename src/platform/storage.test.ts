import { describe, expect, it } from 'vitest';
import { MemoryBackend, WebBackend, wrapSave, type ClaudeHost } from './storage';

const save = (savedAt: number) => wrapSave({ slot: 'auto', brand: 'X', day: savedAt, cash: 0, savedAt, gameOver: false }, '{}');

/** A stand-in for the Claude page's private store. */
function fakeHost(store: Map<string, Record<string, unknown>>): ClaudeHost {
  const doc = (path: string) => ({
    get: async () => ({ exists: store.has(path), data: () => store.get(path) }),
    set: async (b: Record<string, unknown>) => void store.set(path, b),
    delete: async () => void store.delete(path),
  });
  return { use: async (n: string) => (n === 'db' ? { doc } : n === 'user' ? { id: async () => 'me' } : null) };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('web saves (iPhone / Claude page)', () => {
  it('without a Claude page it is plain browser storage', async () => {
    const b = new WebBackend(new MemoryBackend(), () => undefined);
    await b.write('slot1', save(1));
    expect(await b.read('slot1')).toBe(save(1));
  });

  it('also keeps saves in the cloud, so a wiped browser loses nothing', async () => {
    const cloud = new Map<string, Record<string, unknown>>();
    await new WebBackend(new MemoryBackend(), () => fakeHost(cloud)).write('auto', save(5));
    await flush();
    expect(cloud.get('data/users/me/auto')).toEqual({ text: save(5) });
    const freshPhone = new WebBackend(new MemoryBackend(), () => fakeHost(cloud));
    expect(await freshPhone.read('auto')).toBe(save(5));
  });

  it('reads whichever copy was saved last', async () => {
    const cloud = new Map<string, Record<string, unknown>>([['data/users/me/auto', { text: save(9) }]]);
    const local = new MemoryBackend();
    await local.write('auto', save(3));
    expect(await new WebBackend(local, () => fakeHost(cloud)).read('auto')).toBe(save(9));
    await local.write('auto', save(12));
    expect(await new WebBackend(local, () => fakeHost(cloud)).read('auto')).toBe(save(12));
  });

  it('a cloud that never answers or fails still leaves the browser copy', async () => {
    const broken: ClaudeHost = { use: async () => Promise.reject(new Error('down')) };
    const b = new WebBackend(new MemoryBackend(), () => broken);
    await b.write('slot2', save(2));
    expect(await b.read('slot2')).toBe(save(2));
  });
});
