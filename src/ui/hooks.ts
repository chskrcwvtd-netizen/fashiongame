import { createContext, useContext, useSyncExternalStore } from 'react';
import type { GameStore } from '../store/gameStore';
import type { GameState } from '../engine';

export const StoreContext = createContext<GameStore | null>(null);

/** Subscribe to the store; re-renders on every store change. */
export function useStore(): GameStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('StoreContext missing');
  useSyncExternalStore(store.subscribe, store.getVersion);
  return store;
}

/** For screens that only render while a game is running. */
export function useGame(): { store: GameStore; s: GameState } {
  const store = useStore();
  if (!store.state) throw new Error('No game');
  return { store, s: store.state };
}

export function money(n: number, compact = false): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (compact && a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}M`;
  if (compact && a >= 10_000) return `${sign}$${(a / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(a).toLocaleString('en-US')}`;
}

export function count(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return Math.round(n).toLocaleString('en-US');
}
