import { GARMENTS } from './content';
import { pick, type RngHolder } from './rng';
import type { GarmentId } from './types';

const FIRST = ['VOID', 'NEON', 'GHOST', 'CHROME', 'STATIC', 'VENOM', 'HALO', 'GLITCH', 'NIGHT', 'ACID', 'DANUBE', 'BUDA', 'PEST', 'RIOT', 'SILK', 'ZERO', 'HEX', 'FERAL', 'LUNAR', 'TOXIC', 'PIXEL', 'SAINT', 'VANDAL', 'NOVA'];
const SECOND = ['RUNNER', 'CLUB', 'DREAM', 'SIGNAL', 'PROTOCOL', 'CULT', 'WAVE', 'CODE', 'BLOOM', 'ANGEL', 'SYSTEM', 'MOTEL', 'ARMOR', 'SHIFT', 'DRIP', 'ORBIT', 'RITUAL', 'FREQUENCY'];

export function randomDesignName(h: RngHolder, garment: GarmentId): string {
  return `${pick(h, FIRST)} ${pick(h, SECOND)} ${GARMENTS[garment].name.toUpperCase()}`;
}
