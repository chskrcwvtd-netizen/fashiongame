import { expect, test, type Page } from '@playwright/test';

type W = { __store: any };
const state = (page: Page) => page.evaluate(() => {
  const s = (window as unknown as W).__store.state;
  return s ? { day: s.day, cash: s.cash, orders: s.orders.length, stock: Object.values(s.inventory).reduce((a: number, l: any) => a + l.units, 0), sold: s.stats.unitsSold, gameOver: !!s.gameOver, drops: s.drops.length } : null;
});

async function skipIntro(page: Page) {
  await page.getByTestId('intro').click({ timeout: 5000 }).catch(() => {});
  await expect(page.getByTestId('main-menu')).toBeVisible();
}

async function startGame(page: Page, name = 'E2E CLUB') {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await skipIntro(page);
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
  await expect(page.getByTestId('coach')).toBeVisible();

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
    (window as unknown as W).__store.state.flags.bailoutUsed = true; // the one emergency loan is spent
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

test('stage 3: tutorial, chart, wholesale, trophies, logo, back print', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await startGame(page, 'STAGE THREE');
  await page.getByTestId('speed-0').click();

  // tutorial points the way, and can be skipped
  await expect(page.getByTestId('coach')).toBeVisible();
  await page.getByTestId('coach-go').click();
  await expect(page.getByTestId('panel-lab')).toBeVisible();

  // design with a finish and a back print; flip to the back
  await page.getByTestId('finish-washed').click();
  await page.getByTestId('back-text').click();
  await page.getByTestId('back-text-input').fill('BUDAPEST');
  await page.getByTestId('view-back').click();
  await expect(page.locator('#lab-turntable svg text')).toContainText('BUDAPEST');
  await page.getByTestId('save-design').click();
  expect(await page.evaluate(() => (window as unknown as W).__store.state.designs[0].finish)).toBe('washed');
  await page.getByTestId('coach-skip').click();
  await expect(page.getByTestId('coach')).toHaveCount(0);

  // the chart
  await page.getByTestId('nav-rivals').click();
  await expect(page.getByTestId('leaderboard').locator('li')).toHaveCount(7);
  await page.getByTestId('diss-krush').click();
  await expect(page.getByTestId('diss-krush')).toBeDisabled();

  // wholesale opens after 1,000 sales
  await page.evaluate(() => {
    const st = (window as unknown as W).__store;
    const s = st.state;
    s.stats.unitsSold = 1200;
    s.reputation = 60;
    s.inventory[s.designs[0].id] = { units: 500, quality: 50, unitCost: 12 };
    st.bump();
  });
  await page.getByTestId('speed-4').click();
  await expect.poll(async () => page.evaluate(() => (window as unknown as W).__store.state.unlocks.includes('unlock_wholesale')), { timeout: 10_000 }).toBe(true);
  await page.getByTestId('speed-0').click();
  await settle(page);
  await page.evaluate(() => {
    const st = (window as unknown as W).__store;
    const s = st.state;
    s.wholesale.offers.push({ id: 'wtest', storeId: 'concrete', designId: s.designs[0].id, units: 40, unitPrice: 30, payDays: 30, expiresDay: s.day + 10 });
    st.bump();
  });
  await page.getByTestId('nav-wholesale').click();
  await page.getByTestId('accept-wtest').click();
  await expect(page.locator('.receivables li')).toHaveCount(1);

  // trophies and stats
  await page.getByTestId('nav-stats').click();
  await expect(page.getByTestId('trophies').locator('li.won').first()).toBeVisible();

  // logo editor
  await page.getByTestId('nav-hq').click();
  await page.getByTestId('edit-logo').click();
  await page.getByTestId('badge-shield').click();
  await page.getByTestId('wordmark-gothic').click();
  expect(await page.evaluate(() => (window as unknown as W).__store.state.brand.logo)).toMatchObject({ badge: 'shield', font: 'gothic' });
  await page.locator('[data-testid=logo-modal] .btn-primary').click();
  await expect(page.getByTestId('logo-modal')).toHaveCount(0);

  // campaign win screen
  await page.evaluate(() => {
    const st = (window as unknown as W).__store;
    st.campaignSplash = { kind: 'won', rank: 1 };
    st.bump();
  });
  await expect(page.getByTestId('campaign-splash')).toBeVisible();
  await page.getByTestId('campaign-continue').click();
  await page.screenshot({ path: 'test-results/stage3-hq.png' });
  expect(errors).toEqual([]);
});

test('stage 4: world, product lines, investors, stock market, takeover, runway', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await startGame(page, 'STAGE FOUR');
  await page.getByTestId('speed-0').click();
  await page.evaluate(() => {
    const st = (window as unknown as W).__store;
    const s = st.state;
    s.cash = 20_000_000;
    s.hqLevel = 2;
    s.reputation = 60;
    s.followers = 400_000;
    s.campaign.winSeen = true; // This setup can win the chart while the runway result is open.
    s.stats.weeklyRevenue = [900_000, 900_000];
    st.endTutorial();
    st.bump();
  });
  for (let i = 0; i < 3; i++) {
    await page.getByTestId('nav-lab').click();
    if (i === 2) {
      await page.getByTestId('garment-puffer').click();
      await page.getByTestId('pattern-grid').click();
    }
    await page.getByTestId('design-name').fill(`PIECE ${i}`);
    await page.getByTestId('save-design').click();
  }

  await page.getByTestId('nav-world').click();
  await page.getByTestId('expand-london').click();
  await expect(page.getByTestId('city-london')).toContainText('Shipping here');
  await page.getByTestId('expand-london').click();
  await expect(page.getByTestId('city-london')).toContainText('Your store is open');

  await page.getByTestId('nav-empire').click();
  await page.getByTestId('unlock-line_sneakers').click();
  await expect(page.getByTestId('line-line_sneakers')).toContainText('In the Design Lab');
  await page.getByTestId('raise-round').click();
  await page.getByTestId('go-public').click();
  await expect(page.getByTestId('panel-empire')).toContainText('Share price');
  await page.getByTestId('buy-krush').click();
  expect(await page.evaluate(() => (window as unknown as W).__store.state.rivals.some((r: { id: string }) => r.id === 'krush'))).toBe(false);

  await page.getByTestId('nav-lab').click();
  await expect(page.getByTestId('garment-sneakers')).toBeVisible();
  await page.getByTestId('garment-sneakers').click();
  await expect(page.locator('#lab-turntable svg').first()).toBeVisible();

  await page.getByTestId('nav-marketing').click();
  await page.getByTestId('open-runway').click();
  await page.getByTestId('runway-look-1').selectOption({ label: 'PIECE 2' });
  await page.getByTestId('book-runway').click();
  await expect(page.getByTestId('runway-bookings')).toContainText('PIECE 2');
  await page.getByTestId('speed-4').click();
  await expect(page.getByTestId('event-outcome')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('event-ok').click();
  await page.getByTestId('speed-0').click();
  await page.getByTestId('watch-runway').click();
  await expect(page.getByTestId('runway-replay').getByRole('img', { name: 'PIECE 2', exact: true })).toBeVisible();
  await page.getByTestId('runway-replay').getByRole('button', { name: 'Pause', exact: true }).click();
  await page.screenshot({ path: 'test-results/runway.png', animations: 'disabled' });
  await page.getByTestId('runway-result').click();
  await expect(page.getByTestId('runway-verdict')).toBeVisible();
  await page.getByTestId('close-runway').click();
  await page.getByTestId('nav-hq').click();
  await page.screenshot({ path: 'test-results/stage4-hq.png' });
  expect(errors).toEqual([]);
});

test('50-question update: modes, hotkeys, help, pixel art, undo, drop options, loans, lookbook, settings', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await skipIntro(page);
  await page.getByTestId('new-game-btn').click();
  await page.getByTestId('brand-name').fill('SANDBOX CO');
  await page.getByTestId('mode-sandbox').click();
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('game')).toBeVisible();
  await page.evaluate(() => {
    const st = (window as unknown as W).__store;
    st.state.lastEventDay = 1e9;
    st.endTutorial();
  });
  await page.getByTestId('speed-0').click();
  expect(await page.evaluate(() => (window as unknown as W).__store.state.flags.sandbox)).toBe(true);

  // hotkey + help
  await page.keyboard.press('l');
  await expect(page.getByTestId('panel-lab')).toBeVisible();
  await page.getByTestId('help-btn').click();
  await expect(page.getByTestId('help-pop')).toBeVisible();

  // pixel art + collection + jeans
  await page.getByTestId('garment-jeans').click();
  await page.getByTestId('graphic-pixel').click();
  await page.getByTestId('pixel-grid').locator('button').first().click();
  await page.getByTestId('collection-input').fill('NIGHT');
  await page.getByTestId('save-design').click();
  const d = await page.evaluate(() => (window as unknown as W).__store.state.designs[0]);
  expect(d.garment).toBe('jeans');
  expect(d.collection).toBe('NIGHT');
  expect(d.pixels[0]).toBe('1');

  // order, then undo it
  await page.keyboard.press('f');
  await page.getByTestId('place-order').click();
  expect(await page.evaluate(() => (window as unknown as W).__store.state.orders.length)).toBe(1);
  await page.getByTestId('undo').click();
  expect(await page.evaluate(() => (window as unknown as W).__store.state.orders.length)).toBe(0);

  // pre-order drop with bot protection, no stock needed
  await page.getByTestId('place-order').click();
  await page.keyboard.press('d');
  await page.getByTestId('opt-preorder').check();
  await page.getByTestId('opt-botShield').check();
  await page.getByTestId('announce-drop').click();
  const drop = await page.evaluate(() => (window as unknown as W).__store.state.drops[0]);
  expect(drop.preorder).toBe(true);
  expect(drop.botShield).toBe(true);

  // loans in the Empire
  await page.keyboard.press('x');
  await page.getByTestId('loan-10000').click();
  expect(await page.evaluate(() => (window as unknown as W).__store.state.loans.length)).toBe(1);

  // lookbook
  await page.keyboard.press('k');
  await expect(page.getByTestId('panel-lookbook').locator('figure')).toHaveCount(1);

  // settings: sound pack and interface size
  await page.getByTestId('open-menu').click();
  await page.getByText('Settings').click();
  await page.getByTestId('pack-rage').click();
  await page.getByTestId('scale-1.15').click();
  expect(await page.evaluate(() => (document.documentElement.style as unknown as { zoom: string }).zoom)).toBe('1.15');
  await page.getByTestId('scale-1').click();
  expect(errors).toEqual([]);
});

test('challenge mode starts with its own rules', async ({ page }) => {
  await page.goto('/');
  await skipIntro(page);
  await page.getByTestId('new-game-btn').click();
  await page.getByTestId('brand-name').fill('SHOE CO');
  await page.getByTestId('mode-shoestring').click();
  await page.getByTestId('start-game').click();
  await expect(page.getByTestId('cash')).toHaveText('$2,000');
});

test('all four workstations open above the room and return to the studio', async ({ page }) => {
  await startGame(page, 'STUDIO CLUB');
  await page.getByTestId('speed-0').click();
  await page.getByTestId('coach-skip').click();
  for (const panel of ['lab', 'production', 'shop', 'drops']) {
    await page.getByTestId('station-' + panel).click();
    await expect(page.getByTestId('panel-' + panel)).toBeVisible();
    await expect(page.locator('.studio-backdrop svg')).toBeVisible();
    await page.getByTestId('studio-back').click();
    await expect(page.getByTestId('station-' + panel)).toBeVisible();
  }
});

test('bags and chains can launch together with an incoming brand collab', async ({ page }) => {
  await startGame(page, 'NIGHT RUN');
  await page.getByTestId('speed-0').click();
  await page.getByTestId('coach-skip').click();
  await page.getByTestId('station-lab').click();
  await page.getByTestId('garment-bag').click();
  await page.getByTestId('design-name').fill('DANUBE BAG');
  await page.getByTestId('collection-input').fill('AFTER DARK');
  await page.getByTestId('save-design').click();
  await page.getByTestId('garment-jewelry').click();
  await page.getByTestId('design-name').fill('NIGHT CHAIN');
  await page.getByTestId('save-design').click();
  await expect(page.getByTestId('collection')).toContainText('DANUBE BAG');
  await expect(page.getByTestId('collection')).toContainText('NIGHT CHAIN');

  await page.getByTestId('studio-back').click();
  await page.getByTestId('station-drops').click();
  await page.getByTestId('add-drop-piece').click();
  await expect(page.getByText('0 ready by drop day')).toBeVisible();
  await page.getByTestId('load-drop-collection').click();
  await expect(page.getByTestId('collection-name')).toHaveValue('AFTER DARK');
  await expect(page.getByRole('textbox', { name: 'Units for NIGHT CHAIN' })).toBeVisible();

  await page.getByTestId('nav-production').click();
  for (const name of ['DANUBE BAG', 'NIGHT CHAIN']) {
    await page.getByTestId('production-design').selectOption({ label: name });
    await page.getByTestId('qty-input').fill('30');
    await page.getByTestId('qty-input').press('Enter');
    await page.getByTestId('place-order').click();
    await expect(page.getByTestId('shipments')).toContainText(name);
  }

  await page.getByTestId('speed-4').click();
  await expect.poll(async () => {
    await settle(page);
    return (await state(page))!.orders;
  }, { timeout: 25_000 }).toBe(0);
  await page.getByTestId('speed-0').click();
  await page.getByTestId('nav-shop').click();
  await page.getByTestId(/^list-/).first().click();
  const shopPrice = page.getByRole('textbox', { name: 'Price', exact: true }).first();
  await shopPrice.fill('10');
  await shopPrice.press('Enter');
  await page.getByTestId('nav-rivals').click();
  await page.getByTestId('speed-4').click();
  await expect.poll(async () => {
    await settle(page);
    return page.getByTestId('accept-brand-collab').isVisible();
  }, { timeout: 25_000 }).toBe(true);
  await page.getByTestId('speed-0').click();
  await expect(page.getByTestId('brand-collabs')).toContainText('wants to promote your next drop');
  await page.screenshot({ path: 'test-results/brand-collab-offer.png' });
  await page.getByTestId('accept-brand-collab').click();
  await expect(page.getByTestId('brand-collabs')).toContainText('Your next drop is a collab with');

  await page.getByTestId('nav-drops').click();
  await page.getByTestId('load-drop-collection').click();
  await page.getByTestId('drop-units').fill('2');
  await page.getByRole('textbox', { name: 'Units for NIGHT CHAIN' }).fill('3');
  await page.getByRole('textbox', { name: 'Units for NIGHT CHAIN' }).press('Enter');
  await page.getByTestId('drop-days').fill('3');
  await page.getByTestId('announce-drop').click();
  const live = page.getByTestId('drop-live');
  await expect(live).toContainText('AFTER DARK');
  await expect(live).toContainText('5 units across 2 pieces');
  await expect(live).toContainText('In collaboration with');
  await page.screenshot({ path: 'test-results/collection-announced.png' });
  await page.getByTestId('open-menu').click();
  await page.getByTestId('menu-save').click();
  await page.getByTestId('save-slot1').click();
  await page.reload();
  await skipIntro(page);
  await page.getByTestId('continue').click();
  await page.getByTestId('nav-drops').click();
  await expect(live).toContainText('AFTER DARK');
  await page.getByTestId('speed-4').click();
  await expect.poll(async () => { await settle(page); return page.getByTestId('splash-continue').isVisible(); }, { timeout: 35_000 }).toBe(true);
  await expect(page.locator('.splash-collection li')).toHaveCount(2);
  await expect(page.locator('.splash-collection')).toContainText('DANUBE BAG');
  await expect(page.locator('.splash-collection')).toContainText('NIGHT CHAIN');
  await expect(page.getByTestId('drop-splash')).toContainText('In collaboration with');
  await page.screenshot({ path: 'test-results/collection-result.png' });
});
