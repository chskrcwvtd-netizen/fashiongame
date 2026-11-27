import { FACTORIES } from './content';
import { getDesign, createDesign, unitCost } from './design';
import { newId } from './newGame';
import { freeCapacity, placeOrder } from './production';
import { recordSale } from './webshop';
import type { DropItem, FactoryId, GameEvent, GameState, LifePath } from './types';

/**
 * "Hand to hand" (prototype): one tee sold in a drop turns up weeks later on a local wearer,
 * changed by them. A club wants a small run of that version: take it (real cost, warehouse
 * space, factory time) or keep your capacity for the planned run.
 */
export const WEARERS = {
  mira: { name: 'Mira', who: 'bass player of a Kőbánya garage band', place: 'a Kőbánya rehearsal room', club: 'Pince Club', change: 'cut the sleeves off' },
  bence: { name: 'Bence', who: 'a sound tech at a Csepel squat club', place: 'the Csepel sound booth', club: 'Turbina Bar', change: 'cut the sleeves off' },
} as const;
export type WearerId = keyof typeof WEARERS;

export const HAND_TO_HAND = { returnDays: 21, units: 8, factory: 'fastloop' as FactoryId, clubPriceShare: 0.75 };

/** Stable per-drop choice, so the game's own random sequence is never touched. */
function wearerFor(dropId: string): WearerId {
  let h = 0;
  for (const c of dropId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 2 ? 'bence' : 'mira';
}

/** After a drop: mark at most one sold tee to follow, once per game. Unsold pieces never start a story. */
export function startLifePath(state: GameState, dropId: string, sales: (DropItem & { sold: number })[], events: GameEvent[] = []) {
  if (state.lifePaths?.length) return;
  const item = sales.find((s) => s.sold > 0 && getDesign(state, s.designId)?.garment === 'tee');
  if (!item) return;
  state.lifePaths = [{ dropId, designId: item.designId, price: item.price, wearer: wearerFor(dropId), soldDay: state.day, dueDay: state.day + HAND_TO_HAND.returnDays, status: 'out' }];
  events.push({ type: 'news', text: `One ${getDesign(state, item.designId)?.name ?? 'tee'} went home with someone in Budapest. Keep an eye out.` });
}

export function clubOffer(state: GameState, lp: LifePath) {
  const design = getDesign(state, lp.designId);
  const f = FACTORIES[HAND_TO_HAND.factory];
  const cost = design ? Math.ceil(unitCost(state, design, f.id) * HAND_TO_HAND.units) : 0;
  const pay = Math.round(lp.price * HAND_TO_HAND.clubPriceShare) * HAND_TO_HAND.units;
  return { cost, pay, days: f.leadDays, factory: f.name, free: freeCapacity(state) };
}

/** Daily: the photo comes back once; an accepted club run is handed over when it lands. */
export function processLifePaths(state: GameState, events: GameEvent[]) {
  for (const lp of state.lifePaths ?? []) {
    if (lp.status === 'out' && state.day >= lp.dueDay) {
      lp.status = 'spotted';
      state.pendingEvents.push({ id: newId(state, 'v'), defId: 'hand_to_hand', day: state.day, params: { drop: lp.dropId } });
      events.push({ type: 'eventStarted', defId: 'hand_to_hand' });
    }
    if (lp.status === 'accepted' && lp.variantId && !state.orders.some((o) => o.designId === lp.variantId)) {
      const lot = state.inventory[lp.variantId];
      const units = Math.min(HAND_TO_HAND.units, lot?.units ?? 0);
      if (lot) lot.units -= units;
      if (units > 0) recordSale(state, lp.variantId, units, units * Math.round(lp.price * HAND_TO_HAND.clubPriceShare), events);
      lp.status = 'delivered';
      lp.delivered = units;
      events.push({ type: 'news', text: `${WEARERS[lp.wearer].club} picked up ${units} cut-sleeve tees.` });
    }
  }
}

export function acceptClubOrder(state: GameState, lp: LifePath): string | null {
  const orig = getDesign(state, lp.designId);
  if (!orig) return 'The original design is gone.';
  const w = WEARERS[lp.wearer];
  const variant = createDesign(state, { ...orig, name: `${orig.name} CUT`.slice(0, 32), collection: orig.collection });
  variant.cut = true;
  variant.credit = `IDEA: ${w.name.toUpperCase()}`;
  const r = placeOrder(state, { designId: variant.id, factoryId: HAND_TO_HAND.factory, quantity: HAND_TO_HAND.units, smallRun: true });
  if (!r.ok) {
    state.designs = state.designs.filter((d) => d.id !== variant.id);
    return r.reason;
  }
  lp.status = 'accepted';
  lp.variantId = variant.id;
  return null;
}

/** The decision, shown in the normal decision window (saved, undoable, resolved once). */
export const HAND_TO_HAND_EVENT = {
  id: 'hand_to_hand',
  tone: 'good' as const,
  internal: true,
  weight: () => 0,
  title: (s: GameState) => {
    const lp = s.lifePaths?.[0];
    return lp ? `Spotted: your ${getDesign(s, lp.designId)?.name ?? 'tee'} on ${WEARERS[lp.wearer].name}` : 'Spotted';
  },
  body: (s: GameState) => {
    const lp = s.lifePaths?.[0];
    if (!lp) return '';
    const w = WEARERS[lp.wearer];
    const o = clubOffer(s, lp);
    return `A photo from ${w.place}: ${w.name}, ${w.who}, bought one in your drop and ${w.change}. Your back print still shows. ${w.club} wants ${HAND_TO_HAND.units} of this cut version with "${w.name.toUpperCase()}" credited on the back, and pays $${o.pay.toLocaleString('en-US')} on delivery.`;
  },
  options: (s: GameState) => {
    const lp = s.lifePaths?.[0];
    const o = lp ? clubOffer(s, lp) : null;
    return [
      {
        label: `Make ${HAND_TO_HAND.units} cut tees for the club`,
        hint: o ? `Costs $${o.cost.toLocaleString('en-US')} now at ${o.factory}, takes ${HAND_TO_HAND.units} of your ${o.free} free warehouse spaces, ready in ${o.days} days` : '',
        blocked: (st: GameState) => {
          const off = st.lifePaths?.[0] ? clubOffer(st, st.lifePaths[0]) : null;
          if (!off) return 'Nothing to make.';
          if (st.cash < off.cost) return 'Not enough cash.';
          if (off.free < HAND_TO_HAND.units) return `Not enough warehouse space (${off.free} free).`;
          return null;
        },
        apply: (st: GameState) => {
          const lp2 = st.lifePaths?.[0];
          if (!lp2) return 'Nothing happened.';
          const err = acceptClubOrder(st, lp2);
          return err ?? `Deal. ${HAND_TO_HAND.units} cut tees are on the line, ${WEARERS[lp2.wearer].name}'s name on the back. Less room for your next run.`;
        },
      },
      {
        label: 'Say no, keep my planned run',
        hint: 'Space and cash stay free; the original piece and its story stay as they are',
        apply: (st: GameState) => {
          const lp2 = st.lifePaths?.[0];
          if (lp2) lp2.status = 'declined';
          return `You passed. ${lp2 ? WEARERS[lp2.wearer].name : 'They'} keeps wearing the only one.`;
        },
      },
    ];
  },
};
