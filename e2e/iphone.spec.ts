import { expect, test, type Page } from '@playwright/test';

// The same game on an iPhone-sized touch screen (see the "iphone" project in playwright.config.ts).
type W = { __store: any };
const state = (page: Page) =>
  page.evaluate(() => {
    const s = (window as unknown as W).__store.state;
    return { stock: Object.values(s.inventory).reduce((a: number, l: any) => a + l.units, 0), sold: s.stats.unitsSold };
  });

async function settle(page: Page) {
  for (let i = 0; i < 3; i++) {
    if (await page.getByTestId('event-modal').isVisible()) {
      await page.locator('[data-testid^=event-option-]:not([disabled])').first().tap();
      await page.getByTestId('event-ok').tap();
    } else return;
  }
}

/** Nothing on the page may be wider than the phone screen. */
async function fitsScreen(page: Page) {
  const wide = await page.evaluate(() => {
    const w = window.innerWidth;
    return [...document.querySelectorAll('body *')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.right > w + 1 && !e.closest('.rail, [aria-hidden=true]') && !(e instanceof SVGElement && e.ownerSVGElement);
    }).map((e) => `${e.tagName}.${e.getAttribute('class')} in ${e.parentElement?.getAttribute('class')}`);
  });
  expect(wide).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
}

test('iPhone: play a round with taps, every screen fits, progress is kept when the app is left', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('intro').tap({ timeout: 5000 }).catch(() => {});
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await fitsScreen(page);
  await page.getByTestId('new-game-btn').tap();
  await page.getByTestId('brand-name').fill('PHONE CLUB');
  await page.getByTestId('difficulty-normal').tap();
  await fitsScreen(page);
  await page.getByTestId('start-game').tap();
  await expect(page.getByTestId('game')).toBeVisible();
  await page.evaluate(() => ((window as unknown as W).__store.state.lastEventDay = 1e9));

  // The layout is the phone one: menu at the bottom, feed as a strip that opens with a tap
  const rail = await page.locator('.rail').boundingBox();
  const screenH = await page.evaluate(() => window.innerHeight);
  expect(rail!.y + rail!.height).toBeGreaterThan(screenH - 2);
  expect(rail!.width).toBeLessThan(500);
  await page.getByTestId('feed-toggle').tap();
  await expect(page.locator('.feed.open')).toHaveCount(1);
  await page.getByTestId('feed-toggle').tap();

  await page.getByTestId('nav-lab').tap();
  await page.getByTestId('garment-tee').tap();
  await page.getByTestId('pattern-grid').tap();
  await page.getByTestId('design-name').fill('PHONE TEE');
  await page.getByTestId('save-design').tap();
  await expect(page.getByTestId('collection')).toContainText('PHONE TEE');

  await page.getByTestId('nav-production').tap();
  await page.getByTestId('factory-fastloop').tap();
  await page.getByTestId('qty-input').fill('200');
  await page.getByTestId('qty-input').press('Enter');
  await page.getByTestId('place-order').tap();
  await page.getByTestId('speed-4').tap();
  await expect
    .poll(
      async () => {
        await settle(page);
        return (await state(page)).stock;
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);
  await settle(page);
  await page.getByTestId('speed-0').tap();

  await page.getByTestId('nav-shop').tap();
  await page.locator('[data-testid^=list-]').first().tap();
  await expect(page.locator('.shop-row.live')).toHaveCount(1);

  // Every screen, scrolled into the bottom menu, fits the width of the phone
  for (const p of ['hq', 'lab', 'production', 'shop', 'drops', 'trends', 'marketing', 'team', 'rivals', 'wholesale', 'stats', 'world', 'empire', 'lookbook']) {
    const btn = page.getByTestId(`nav-${p}`);
    if (!(await btn.count())) continue;
    await btn.tap();
    await settle(page);
    await fitsScreen(page);
  }

  // Leaving the app (home button, app switcher) saves the game
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const saved = await page.evaluate(() => localStorage.getItem('streetwear-tycoon:auto'));
  expect(saved).toContain('PHONE TEE');
  expect(errors).toEqual([]);
});
