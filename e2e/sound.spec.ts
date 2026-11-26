import { expect, test } from '@playwright/test';

test('every sound effect renders, is audible and does not clip', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const t = (window as unknown as { __sfxTest: { renderOffline: (n: string) => Promise<Float32Array>; SFX_NAMES: string[] } }).__sfxTest;
    const out: Record<string, { peak: number; nan: boolean }> = {};
    for (const name of t.SFX_NAMES) {
      const data = await t.renderOffline(name);
      let peak = 0;
      let nan = false;
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        if (Number.isNaN(v)) nan = true;
        peak = Math.max(peak, Math.abs(v));
      }
      out[name] = { peak, nan };
    }
    return out;
  });
  for (const [name, r] of Object.entries(results)) {
    expect.soft(r.nan, `${name} has NaN`).toBe(false);
    expect.soft(r.peak, `${name} too quiet`).toBeGreaterThan(name === 'hover' || name === 'tick' ? 0.01 : 0.05);
    expect.soft(r.peak, `${name} clips`).toBeLessThanOrEqual(1.0);
  }
  console.log(JSON.stringify(results));
});
