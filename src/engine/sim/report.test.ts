import { it } from 'vitest';
import { runBot } from './bots';

// Manual balance report: REPORT=1 npx vitest run src/engine/sim/report.test.ts
it.skipIf(!process.env.REPORT)('balance report', () => {
  const days = Number(process.env.DAYS ?? 450);
  for (const diff of ['easy', 'normal', 'hard'] as const)
    for (const strat of ['smart', 'sloppy', 'reckless', 'idle'] as const)
      for (const seed of [1, 2, 3]) {
        const { state: _s, ...rest } = runBot(diff, strat, days, seed);
        console.log(diff, strat, seed, JSON.stringify(rest));
      }
});
