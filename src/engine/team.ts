import { DIFFICULTIES, FIRST_NAMES, LAST_NAMES, ROLES, ROLE_IDS, STAFF_SLOTS, STAGE2, TRAIT_IDS } from './content';
import { newId } from './newGame';
import { chance, pick, randInt, randRange } from './rng';
import type { ActionResult, Employee, GameEvent, GameState, RoleId } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function staffSlots(state: GameState): number {
  return STAFF_SLOTS[state.hqLevel] ?? STAFF_SLOTS[STAFF_SLOTS.length - 1];
}

export function marketRate(state: GameState, role: RoleId, skill: number): number {
  return Math.round(ROLES[role].baseSalary * (0.6 + skill * 0.1) * DIFFICULTIES[state.difficulty].costMult);
}

export function makeCandidate(state: GameState, role?: RoleId): Employee {
  const r = role ?? pick(state, ROLE_IDS);
  const top = 6 + state.hqLevel * 2;
  const skill = clamp(Math.round(randRange(state, 2, top) * (0.7 + randRange(state, 0, 0.45))), 1, 10);
  const salary = Math.round(marketRate(state, r, skill) * randRange(state, 1 - STAGE2.marketSalaryVariance / 2, 1 + STAGE2.marketSalaryVariance));
  return {
    id: newId(state, 'e'),
    name: `${pick(state, FIRST_NAMES)} ${pick(state, LAST_NAMES)}`,
    role: r,
    skill,
    salary,
    mood: randInt(state, 62, 78),
    trait: pick(state, TRAIT_IDS),
    hiredDay: 0,
    lowMoodWeeks: 0,
    lastPerk: -999,
  };
}

export function refreshCandidates(state: GameState): void {
  // four different roles each week, in random order
  const roles = [...ROLE_IDS];
  const picked: RoleId[] = [];
  while (picked.length < 4) picked.push(roles.splice(randInt(state, 0, roles.length - 1), 1)[0]);
  state.candidates = picked.map((r) => makeCandidate(state, r));
}

export function hire(state: GameState, candidateId: string): ActionResult {
  const c = state.candidates.find((x) => x.id === candidateId);
  if (!c) return { ok: false, reason: 'That candidate is gone.' };
  if (state.employees.length >= staffSlots(state)) return { ok: false, reason: 'No desk left. Upgrade your HQ to hire more people.' };
  if (state.cash < c.salary) return { ok: false, reason: 'You cannot cover their first week of pay.' };
  state.candidates = state.candidates.filter((x) => x.id !== candidateId);
  state.employees.push({ ...c, hiredDay: state.day, mood: Math.max(c.mood, 70) });
  return { ok: true, id: c.id };
}

export function fire(state: GameState, employeeId: string): ActionResult {
  const e = state.employees.find((x) => x.id === employeeId);
  if (!e) return { ok: false, reason: 'No such employee.' };
  state.cash -= e.salary; // one week severance
  state.stats.spent += e.salary;
  state.employees = state.employees.filter((x) => x.id !== employeeId);
  for (const o of state.employees) o.mood = clamp(o.mood - 5, 0, 100);
  return { ok: true };
}

const PERK_COOLDOWN = 28;

export function giveRaise(state: GameState, employeeId: string): ActionResult {
  const e = state.employees.find((x) => x.id === employeeId);
  if (!e) return { ok: false, reason: 'No such employee.' };
  if (state.day - e.lastPerk < PERK_COOLDOWN) return { ok: false, reason: `${e.name.split(' ')[0]} got something recently. Wait a few weeks.` };
  e.salary = Math.round(e.salary * 1.1);
  e.mood = clamp(e.mood + 15, 0, 100);
  e.lastPerk = state.day;
  return { ok: true };
}

export function bonusCost(e: Employee): number {
  return e.salary * 2;
}

export function giveBonus(state: GameState, employeeId: string): ActionResult {
  const e = state.employees.find((x) => x.id === employeeId);
  if (!e) return { ok: false, reason: 'No such employee.' };
  if (state.day - e.lastPerk < PERK_COOLDOWN) return { ok: false, reason: `${e.name.split(' ')[0]} got something recently. Wait a few weeks.` };
  const cost = bonusCost(e);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash for a bonus.' };
  state.cash -= cost;
  state.stats.spent += cost;
  e.mood = clamp(e.mood + 20, 0, 100);
  e.lastPerk = state.day;
  return { ok: true };
}

export function teamNightCost(state: GameState): number {
  return Math.round(STAGE2.teamNightCostPerHead * state.employees.length * DIFFICULTIES[state.difficulty].costMult);
}

export function teamNight(state: GameState): ActionResult {
  if (state.employees.length === 0) return { ok: false, reason: 'No team to take out yet.' };
  if (state.day - state.lastTeamNight < STAGE2.teamNightCooldown) return { ok: false, reason: 'The team is still recovering from the last one.' };
  const cost = teamNightCost(state);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash for a night out.' };
  state.cash -= cost;
  state.stats.spent += cost;
  state.lastTeamNight = state.day;
  for (const e of state.employees) e.mood = clamp(e.mood + 12, 0, 100);
  return { ok: true };
}

export function weeklySalaries(state: GameState): number {
  return state.employees.reduce((a, e) => a + e.salary, 0);
}

// ---- effects ----------------------------------------------------------------

/** Skill adjusted by trait and mood. */
export function effectiveSkill(e: Employee): number {
  const trait = e.trait === 'perfectionist' ? 1.15 : e.trait === 'diva' ? 1.25 : 1;
  return e.skill * trait * (0.6 + e.mood / 250);
}

function byRole(state: GameState, role: RoleId) {
  return state.employees.filter((e) => e.role === role);
}

function best(state: GameState, role: RoleId): number {
  return byRole(state, role).reduce((m, e) => Math.max(m, effectiveSkill(e)), 0);
}

function sum(state: GameState, role: RoleId): number {
  return byRole(state, role).reduce((a, e) => a + effectiveSkill(e), 0);
}

export function designerQualityBonus(state: GameState): number {
  return Math.round(best(state, 'designer') * 1.2);
}
export function designerFitBonus(state: GameState): number {
  return Math.min(0.12, sum(state, 'designer') * 0.01);
}
export function sourcerCostMult(state: GameState): number {
  return 1 - Math.min(0.18, best(state, 'sourcer') * 0.018);
}
export function sourcerDefectMult(state: GameState): number {
  return 1 - Math.min(0.6, best(state, 'sourcer') * 0.06);
}
export function marketerViralBonus(state: GameState): number {
  return Math.min(0.025, sum(state, "marketer") * 0.002);
}
export function marketerInfluenceMult(state: GameState): number {
  return 1 + best(state, 'marketer') * 0.05;
}
export function postsPerDay(state: GameState): number {
  return 1 + Math.min(2, byRole(state, 'marketer').length);
}
export function managerBillMult(state: GameState): number {
  return 1 - Math.min(0.15, best(state, 'manager') * 0.015);
}
export function analystHorizon(state: GameState): number {
  const b = best(state, 'analyst');
  return b > 0 ? 2 + Math.floor(b / 3) : 0;
}

// ---- weekly mood ------------------------------------------------------------

function recentDrops(state: GameState) {
  return state.drops.filter((d) => d.status === 'done' && d.result && state.day - d.dropDay <= 14);
}

export function moodTarget(state: GameState, e: Employee): number {
  const pay = e.salary / Math.max(1, marketRate(state, e.role, e.skill)) - 1;
  let t = 62 + pay * 120 + best(state, 'manager') * 1.2;
  const drops = recentDrops(state);
  const soldOut = drops.some((d) => d.result!.outcome === 'soldout');
  const flop = drops.some((d) => d.result!.outcome === 'flop');
  if (soldOut) t += 6;
  if (flop) t -= 6;
  if (e.trait === 'diva') t -= 12;
  if (e.trait === 'chill') t += 10;
  if (e.trait === 'hypebeast') t += soldOut ? 10 : -8;
  if (e.trait === 'perfectionist' && flop) t -= 10;
  if (state.hqLevel === 0 && state.employees.length >= 2) t -= 5; // cramped basement
  return clamp(t, 0, 100);
}

export function weeklyTeam(state: GameState, events: GameEvent[]): void {
  const leaving: Employee[] = [];
  for (const e of state.employees) {
    e.mood += (moodTarget(state, e) - e.mood) * 0.3;
    if (e.trait === 'loyal') e.mood = Math.max(30, e.mood);
    e.mood = clamp(e.mood, 0, 100);
    if (e.mood < 25) {
      e.lowMoodWeeks += 1;
      if (e.lowMoodWeeks === 1) events.push({ type: 'staffWarning', employeeId: e.id, name: e.name });
      if (e.lowMoodWeeks >= 3 || (e.lowMoodWeeks >= 2 && chance(state, 0.4))) leaving.push(e);
    } else {
      e.lowMoodWeeks = 0;
    }
  }
  for (const e of leaving) {
    state.employees = state.employees.filter((x) => x.id !== e.id);
    events.push({ type: 'staffQuit', name: e.name, role: e.role });
  }
  refreshCandidates(state);
}
