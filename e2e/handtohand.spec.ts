import { expect, test, type Page } from '@playwright/test';

// "Hand to hand" prototype, played through the normal game screens.
type W = { __store: any };
type Snap = { day: number; cash: number; lp: any[]; orders: string[]; designs: { id: string; name: string; cut: boolean; credit?: string }[] };
const S = (page: Page): Promise<Snap> => page.evaluate(() => {
  const s = (window as unknown as W).__store.state;
  return { day: s.day, cash: s.cash, lp: s.lifePaths ?? [], orders: s.orders.map((o: any) => o.designId), designs: s.designs.map((d: any) => ({ id: d.id, name: d.name, cut: !!d.cut, credit: d.credit })) };
});
const shot = (name: string) => `test-results/handtohand/${name}.png`;

async function startGame(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('intro').click({ timeout: 5000 }).catch(() => {});
  await page.getByTestId('new-game-btn').click();
  await page.getByTestId('brand-name').fill('PINCE WORKS');
  await page.getByTestId('difficulty-normal').click();
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('game')).toBeVisible();
  await page.evaluate(() => ((window as unknown as W).__store.state.lastEventDay = 1e9));
  await page.getByTestId('coach-skip').click().catch(() => {});
}

/** Close anything that pops up, except the hand-to-hand decision we are testing. */
async function settle(page: Page) {
  for (let i = 0; i < 4; i++) {
    if (await page.getByTestId('event-outcome').isVisible()) await page.getByTestId('event-ok').click();
    else if (await page.getByTestId('splash-continue').isVisible()) await page.getByTestId('splash-continue').click();
    else if (await page.getByTestId('campaign-continue').isVisible()) await page.getByTestId('campaign-continue').click();
    else if (await page.getByTestId('event-modal').isVisible() && !(await page.getByTestId('worn-photo').isVisible())) {
      await page.locator('[data-testid^=event-option-]:not([disabled])').first().click();
      await page.getByTestId('event-ok').click();
    } else return;
  }
}

async function design(page: Page, name: string, garment: string, backText?: string) {
  await page.getByTestId('nav-lab').click();
  await page.getByTestId(`garment-${garment}`).click();
  await page.getByTestId('pattern-grid').click();
  if (backText) {
    await page.getByTestId('back-text').click();
    await page.getByTestId('back-text-input').fill(backText);
  }
  await page.getByTestId('design-name').fill(name);
  await page.getByTestId('save-design').click();
  await expect(page.getByTestId('collection')).toContainText(name);
}

async function produce(page: Page, name: string, qty: number) {
  await page.getByTestId('nav-production').click();
  await page.getByTestId('production-design').selectOption({ label: name });
  await page.getByTestId('factory-fastloop').click();
  await page.getByTestId('qty-input').fill(String(qty));
  await page.getByTestId('qty-input').press('Enter');
  await page.getByTestId('place-order').click();
}

async function waitFor(page: Page, check: () => Promise<boolean>, ms = 40_000) {
  await page.getByTestId('speed-4').click();
  await expect.poll(async () => (await settle(page), check()), { timeout: ms, intervals: [250] }).toBe(true);
  await page.evaluate(() => (window as unknown as W).__store.setSpeed(0));
  await settle(page);
}

async function dropIt(page: Page, designName: string, price: number, extra?: string) {
  await page.getByTestId('nav-drops').click();
  await page.getByTestId('drop-design').selectOption({ label: designName });
  await page.getByTestId('drop-price').fill(String(price));
  await page.getByTestId('drop-price').press('Enter');
  await page.getByTestId('drop-days').fill('3');
  if (extra) {
    await page.getByLabel('Piece to add').selectOption({ label: extra });
    await page.getByTestId('add-drop-piece').click();
    await page.getByTestId('collection-name').fill('BASEMENT SET');
  }
  await page.getByTestId('announce-drop').click();
  await expect(page.getByTestId('drop-live')).toBeVisible();
  const n = await page.evaluate(() => (window as unknown as W).__store.state.drops.length);
  await waitFor(page, () => page.evaluate((n) => (window as unknown as W).__store.state.drops[n - 1].status === 'done', n));
  // the live countdown, then the result: skip both
  await page.getByTestId('drop-splash').click({ timeout: 5000 }).catch(() => {});
  await page.getByTestId('splash-continue').click({ timeout: 15000 }).catch(() => {});
  await settle(page);
}

test('desktop 1280x720: sold tee comes back on a wearer; accept, reload, decline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await startGame(page);
  await design(page, 'FIRST TEE', 'tee', 'PINCE');
  await page.getByTestId('view-back').click();
  await page.screenshot({ path: shot('1-design-table-back') });
  await produce(page, 'FIRST TEE', 60);
  await waitFor(page, async () => (await S(page)).orders.length === 0);
  await dropIt(page, 'FIRST TEE', 5);
  let st = await S(page);
  expect(st.lp).toHaveLength(1);
  expect(st.lp[0].status).toBe('out');
  await expect(page.getByTestId('feed')).toContainText('went home with someone in Budapest');

  await waitFor(page, () => page.getByTestId('worn-photo').isVisible(), 60_000);
  await expect(page.getByTestId('event-modal')).toContainText('Spotted');
  await page.screenshot({ path: shot('2-photo-decision') });

  // save now, reload the page and load it: the decision is still there exactly once
  await page.evaluate(() => (window as unknown as W).__store.save('slot1'));
  await page.reload();
  await page.getByTestId('intro').click({ timeout: 5000 }).catch(() => {});
  await page.evaluate(() => (window as unknown as W).__store.load('slot1'));
  await expect(page.getByTestId('worn-photo')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as W).__store.state.pendingEvents.filter((p: any) => p.defId === 'hand_to_hand').length)).toBe(1);

  // accept: a real small run of the cut, credited version
  const cash = (await S(page)).cash;
  await page.getByTestId('event-option-0').click();
  await page.getByTestId('event-ok').click();
  st = await S(page);
  expect(st.lp[0].status).toBe('accepted');
  expect(st.cash).toBeLessThan(cash);
  const variant = st.designs.find((d) => d.id === st.lp[0].variantId)!;
  expect(variant).toMatchObject({ cut: true, name: 'FIRST TEE CUT' });
  expect(st.orders).toContain(variant.id);
  await waitFor(page, async () => (await S(page)).lp[0].status === 'delivered');
  await page.getByTestId('nav-lookbook').click();
  await expect(page.getByTestId('wild-status')).toContainText('cut tees');
  await page.screenshot({ path: shot('3-lookbook-pair-accepted'), fullPage: true });

  // the same decision, from the save: say no this time
  await page.evaluate(() => (window as unknown as W).__store.load('slot1'));
  await expect(page.getByTestId('worn-photo')).toBeVisible();
  const cash2 = (await S(page)).cash;
  await page.getByTestId('event-option-1').click();
  await page.getByTestId('event-ok').click();
  st = await S(page);
  expect(st.lp[0].status).toBe('declined');
  expect(st.cash).toBe(cash2);
  expect(st.designs.some((d) => d.cut)).toBe(false);
  expect(errors).toEqual([]);
});

test('iPhone portrait at 130%: zero sales starts nothing, a two-piece drop follows the tee', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 659 });
  await startGame(page);
  await page.evaluate(() => {
    document.documentElement.style.setProperty('zoom', '1.3');
  });
  await design(page, 'FIRST TEE', 'tee', 'PINCE');
  await design(page, 'NIGHT BAG', 'bag');
  await produce(page, 'FIRST TEE', 60);
  await produce(page, 'NIGHT BAG', 60);
  await waitFor(page, async () => (await S(page)).orders.length === 0);

  // nobody buys at this price: no story starts
  await dropIt(page, 'FIRST TEE', 9000);
  expect((await S(page)).lp).toHaveLength(0);

  await dropIt(page, 'FIRST TEE', 5, 'NIGHT BAG');
  const st = await S(page);
  expect(st.lp).toHaveLength(1);
  expect(st.designs.find((d) => d.id === st.lp[0].designId)!.name).toBe('FIRST TEE');

  await waitFor(page, () => page.getByTestId('worn-photo').isVisible(), 60_000);
  await page.screenshot({ path: shot('4-iphone-130-decision') });
  for (const id of ['event-option-0', 'event-option-1']) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  await page.getByTestId('event-option-1').scrollIntoViewIfNeeded();
  await page.getByTestId('event-option-1').click();
  await page.getByTestId('event-ok').click();
  await page.getByTestId('nav-lookbook').click();
  await expect(page.getByTestId('lookbook-wild')).toBeVisible();
  await page.screenshot({ path: shot('5-iphone-130-lookbook') });
});
