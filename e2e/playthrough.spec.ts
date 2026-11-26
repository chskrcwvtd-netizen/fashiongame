import { expect, test, type Page } from '@playwright/test';

type W = { __store: any };
const state = (page: Page) => page.evaluate(() => {
  const s = (window as unknown as W).__store.state;
  return s ? { day: s.day, cash: s.cash, orders: s.orders.length, stock: Object.values(s.inventory).reduce((a: number, l: any) => a + l.units, 0), sold: s.stats.unitsSold, gameOver: !!s.gameOver, drops: s.drops.length } : null;
});

async function startGame(page: Page, name = 'E2E CLUB') {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('new-game-btn').click();
  await page.getByTestId('brand-name').fill(name);
  await page.getByTestId('difficulty-normal').click();
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('game')).toBeVisible();
  // keep random events out of scripted runs; factory problems are handled by settle()
  await page.evaluate(() => {
    (window as unknown as W).__store.state.lastEventDay = 1e9;
  });
}

/** If a decision event popped up, take the first option and close it. */
async function settle(page: Page) {
  for (let i = 0; i < 3; i++) {
    if (await page.getByTestId('event-modal').isVisible()) {
      await page.locator('[data-testid^=event-option-]:not([disabled])').first().click();
      await page.getByTestId('event-ok').click();
    } else return;
  }
}

test('a full short round: design, produce, sell, drop, save, reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await startGame(page);
  await expect(page.getByTestId('cash')).toHaveText('$12.0k');
  await expect(page.getByTestId('first-steps')).toBeVisible();

  // Design
  await page.getByTestId('nav-lab').click();
  await page.getByTestId('garment-tee').click();
  await page.getByTestId('pattern-grid').click();
  await page.getByTestId('graphic-text').click();
  await page.getByTestId('graphic-text-input').fill('E2E');
  await page.getByTestId('design-name').fill('TEST TEE');
  await page.getByTestId('save-design').click();
  await expect(page.getByTestId('collection')).toContainText('TEST TEE');

  // Produce at the cheap, fast factory
  await page.getByTestId('nav-production').click();
  await page.getByTestId('factory-fastloop').click();
  await page.getByTestId('qty-input').fill('200');
  await page.getByTestId('qty-input').press('Enter');
  const before = (await state(page))!.cash;
  await page.getByTestId('place-order').click();
  expect((await state(page))!.cash).toBeLessThan(before);
  await expect(page.getByTestId('shipments')).toContainText('TEST TEE');

  // Fast-forward until the shipment lands
  await page.getByTestId('speed-4').click();
  await expect
    .poll(
      async () => {
        await settle(page);
        return (await state(page))!.stock;
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);
  await settle(page);

  // Webshop
  await page.getByTestId('nav-shop').click();
  await page.locator('[data-testid^=list-]').first().click();
  await expect(page.locator('.shop-row.live')).toHaveCount(1);

  // Drop in 3 days
  await page.getByTestId('nav-drops').click();
  await page.getByTestId('drop-days').fill('3');
  await page.getByTestId('drop-units').fill('40');
  await page.getByTestId('announce-drop').click();
  await expect(page.getByTestId('drop-live')).toBeVisible();
  await page.getByTestId('post-teaser').click();
  await expect
    .poll(
      async () => {
        await settle(page);
        return page.getByTestId('drop-splash').isVisible();
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/playthrough-splash.png' });
  await page.getByTestId('splash-continue').click();
  await expect(page.getByTestId('feed')).toContainText('Drop:');
  expect((await state(page))!.sold).toBeGreaterThan(0);

  // Save to slot 1, go to the main menu, load it back
  await page.getByTestId('open-menu').click();
  await page.getByTestId('menu-save').click();
  await page.getByTestId('save-slot1').click();
  const savedDay = (await state(page))!.day;
  await page.getByTestId('menu-main').click();
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await page.getByTestId('load-btn').click();
  await page.getByTestId('load-slot1').click();
  await expect(page.getByTestId('game')).toBeVisible();
  expect((await state(page))!.day).toBe(savedDay);
  await expect(page.locator('.brandmark-name')).toHaveText('E2E CLUB');
  await page.getByTestId('nav-hq').click();
  await page.screenshot({ path: 'test-results/playthrough-hq.png' });
  expect(errors).toEqual([]);
});

test('space pauses without pressing the focused button again', async ({ page }) => {
  await startGame(page, 'SPACE CO');
  await page.getByTestId('nav-lab').click();
  await page.getByTestId('save-design').click();
  await page.getByTestId('nav-production').click();
  await page.getByTestId('place-order').click();
  expect((await state(page))!.orders).toBe(1);
  await page.keyboard.press(' ');
  await page.waitForTimeout(200);
  expect((await state(page))!.orders).toBe(1);
  await expect(page.getByTestId('game')).toHaveClass(/is-paused/);
});

test('going broke ends the game with the bankrupt screen', async ({ page }) => {
  await startGame(page, 'BROKE CO');
  await page.evaluate(() => {
    (window as unknown as W).__store.state.cash = 50;
  });
  await page.getByTestId('speed-4').click();
  await expect(page.getByTestId('overdrawn')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('game-over')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('gameover-menu').click();
  await expect(page.getByTestId('main-menu')).toBeVisible();
});

test('refuses impossible orders with a readable reason', async ({ page }) => {
  await startGame(page, 'LIMIT CO');
  await page.getByTestId('nav-lab').click();
  await page.getByTestId('garment-puffer').click();
  await page.getByTestId('material-luxe').click();
  await page.getByTestId('save-design').click();
  await page.getByTestId('nav-production').click();
  await page.getByTestId('factory-nord').click();
  // max is clamped to what fits in cash and space; typing more gets clamped
  await page.getByTestId('qty-input').fill('99999');
  await page.getByTestId('qty-input').press('Enter');
  await expect(page.getByTestId('qty-input')).toHaveValue(/^\d{2,3}$/);
  const qty = Number(await page.getByTestId('qty-input').inputValue());
  expect(qty).toBeLessThan(500);
  await page.getByTestId('place-order').click();
  expect((await state(page))!.cash).toBeGreaterThanOrEqual(0);
});

test('stage 2: hire, post, research trends and decide an event', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await startGame(page, 'STAGE TWO');
  await page.getByTestId('speed-0').click();

  // a design with a vibe
  await page.getByTestId('nav-lab').click();
  await page.getByTestId('vibe-techwear').click();
  await page.getByTestId('save-design').click();
  expect(await page.evaluate(() => (window as unknown as W).__store.state.designs[0].vibe)).toBe('techwear');

  // hire someone
  await page.getByTestId('nav-team').click();
  await page.locator('[data-testid^=hire-]').first().click();
  await expect(page.locator('.staff')).toHaveCount(1);

  // post
  await page.getByTestId('nav-marketing').click();
  const before = await page.evaluate(() => (window as unknown as W).__store.state.followers);
  await page.getByTestId('post-now').click();
  await expect(page.locator('.post-result')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as W).__store.state.followers)).toBeGreaterThanOrEqual(before);

  // trends research
  await page.getByTestId('nav-trends').click();
  await page.getByTestId('buy-report').click();
  await expect(page.getByTestId('coming-trends')).toBeVisible();

  // an event pauses the game and needs a decision
  await page.getByTestId('speed-1').click();
  await page.evaluate(() => {
    const st = (window as unknown as W).__store;
    st.state.pendingEvents.push({ id: 'vx', defId: 'blog_feature', day: st.state.day, params: {} });
    st.bump();
  });
  await expect(page.getByTestId('event-modal')).toBeVisible();
  const day = (await state(page))!.day;
  await page.waitForTimeout(2500);
  expect((await state(page))!.day).toBe(day); // paused while deciding
  await page.getByTestId('event-option-1').click();
  await expect(page.getByTestId('event-outcome')).toBeVisible();
  await page.getByTestId('event-ok').click();
  await expect(page.getByTestId('feed')).toContainText('A fashion blog wants you');
  await page.screenshot({ path: 'test-results/stage2-hq.png' });
  expect(errors).toEqual([]);
});
