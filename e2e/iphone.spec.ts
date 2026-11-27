import { devices, expect, test, type Page } from '@playwright/test';
import type { GameStore } from '../src/store/gameStore';

declare global {
  interface Window {
    __store: GameStore;
  }
}

const PANELS = ['hq', 'lab', 'production', 'shop', 'drops', 'trends', 'marketing', 'team', 'rivals', 'wholesale', 'stats', 'world', 'empire', 'lookbook'];
const BRAND = 'WWWWWWWWWWWWWWWWWW';
const PIECE = 'WWWWWWWWWWWWWWWWWWWW';

async function fitsScreen(page: Page, screen: string) {
  await page.evaluate(() => document.fonts.ready);
  const problems = await page.evaluate(() => {
    const failures: string[] = [];
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const name = (el: Element) => el.getAttribute('data-testid') ?? el.getAttribute('class') ?? el.tagName;
    const dialog = Array.from(document.querySelectorAll<HTMLElement>('.modal, .splash')).at(-1);
    const regions = dialog ? [dialog] : [
      ...document.querySelectorAll<HTMLElement>('.intro, .mainmenu, .stage, .topbar, .feed'),
    ];
    for (const region of regions) {
      const rect = region.getBoundingClientRect();
      if (region.scrollWidth > region.clientWidth + 1) failures.push(`${name(region)} scrolls sideways`);
      if (rect.left < -1 || rect.right > width + 1 || rect.top < -1 || rect.bottom > height + 1) {
        failures.push(`${name(region)} is outside the viewport`);
      }
      for (const el of region.querySelectorAll('h1,h2,h3,p,button,select,.wordmark,.trend-dir')) {
        if (el.closest('[aria-hidden=true]')) continue;
        const item = el.getBoundingClientRect();
        if (item.width && item.height && (item.left < rect.left - 2 || item.right > rect.right + 2)) {
          failures.push(`${name(el)} is outside ${name(region)}`);
        }
      }
      for (const control of region.querySelectorAll('.input, input[type=range], .btn-primary')) {
        const { width, height } = control.getBoundingClientRect();
        if (width > 0 && height > 0 && height < 44) failures.push(`${name(control)} is too short to tap`);
      }
    }
    const rail = document.querySelector('.rail')?.getBoundingClientRect();
    const stage = document.querySelector('.stage')?.getBoundingClientRect();
    const undo = document.querySelector('.undo-btn')?.getBoundingClientRect();
    if (rail && Math.abs(rail.bottom - height) > 2) failures.push('Navigation is outside the bottom edge');
    if (stage && stage.height < 96) failures.push('The feed and controls leave too little room to play');
    if (stage && undo && undo.top < stage.bottom - 1 && undo.left < stage.right - 1) {
      failures.push('Undo covers the game');
    }
    if (document.documentElement.scrollWidth > width + 1) failures.push('The page scrolls sideways');
    return failures;
  });
  expect.soft(problems, screen).toEqual([]);
}

async function checkTargets(page: Page) {
  const targets = page.locator('.rail-btn, .speed-btn, .menu-btn, .feed-title, .help-btn, .studio-station');
  for (const target of await targets.all()) {
    const size = await target.evaluate((el) => el.getBoundingClientRect().toJSON());
    expect.soft(Math.min(size.width, size.height), await target.getAttribute('data-testid') ?? 'touch target')
      .toBeGreaterThanOrEqual(44);
  }
}

async function openHome(page: Page) {
  // The intro dismisses itself. Wait for the menu so a tap cannot race its timer.
  await expect(page.getByTestId('new-game-btn')).toBeVisible({ timeout: 15_000 });
}

async function visitPanels(page: Page, state: string) {
  for (const panel of PANELS) {
    await page.getByTestId(`nav-${panel}`).tap();
    await expect(page.getByTestId(`panel-${panel}`)).toBeVisible();
    await fitsScreen(page, `${state} ${panel}`);
  }
}

async function resolveEvent(page: Page) {
  if (await page.getByTestId('event-modal').isVisible()) {
    await page.locator('[data-testid^=event-option-]:not([disabled])').first().tap();
  }
  if (await page.getByTestId('event-outcome').isVisible()) await page.getByTestId('event-ok').tap();
}

const portrait = devices['iPhone 15'].viewport;
for (const orientation of ['portrait', 'landscape'] as const) {
  test.describe(orientation, () => {
    test.use({ viewport: orientation === 'portrait' ? portrait : { width: portrait.height, height: portrait.width } });

    test('touch playthrough, every panel, and save recovery', async ({ page }) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      const tap = (id: string) => page.getByTestId(id).tap();
      await page.goto('/');
      await fitsScreen(page, 'intro');
      await openHome(page);
      await fitsScreen(page, 'main menu');
      await tap('new-game-btn');
      await page.getByTestId('brand-name').fill(BRAND);
      await tap('difficulty-normal');
      await fitsScreen(page, 'new game with a full-length brand name');
      await tap('start-game');
      await tap('speed-0');
      await page.evaluate(() => { window.__store.state!.lastEventDay = 1e9; });
      await fitsScreen(page, 'HQ with tutorial');
      await checkTargets(page);
      await tap('feed-toggle');
      await expect(page.locator('.feed.open')).toBeVisible();
      await fitsScreen(page, 'expanded live feed');
      await tap('feed-toggle');
      await tap('help-btn');
      await expect(page.getByTestId('help-pop')).toBeVisible();
      await fitsScreen(page, 'help');
      await tap('help-btn');
      await tap('coach-skip');
      for (const station of ['lab', 'production', 'shop', 'drops']) {
        await tap('station-' + station);
        await expect(page.getByTestId('panel-' + station)).toBeVisible();
        await tap('studio-back');
      }
      await visitPanels(page, 'early game');

      await tap('nav-lab');
      await tap('garment-tee');
      await tap('pattern-grid');
      await page.getByTestId('design-name').fill(PIECE);
      await tap('save-design');
      await expect(page.getByTestId('collection')).toContainText(PIECE);

      await tap('nav-production');
      await tap('factory-fastloop');
      await page.getByTestId('qty-input').fill('200');
      await page.getByTestId('qty-input').press('Enter');
      await tap('place-order');
      await expect(page.getByTestId('shipments')).toContainText(PIECE);
      await expect(page.getByTestId('undo')).toBeVisible();
      await fitsScreen(page, 'order in transit and undo visible');
      await tap('speed-4');
      await expect.poll(async () => {
        await resolveEvent(page);
        return page.evaluate(() => Object.values(window.__store.state!.inventory).some((lot) => lot.units > 0));
      }, { timeout: 25_000 }).toBe(true);
      await tap('speed-0');
      await tap('nav-shop');
      await page.getByTestId(/^list-/).first().tap();
      await expect(page.locator('.shop-row.live')).toHaveCount(1);

      await tap('nav-drops');
      await page.getByTestId('drop-days').fill('3');
      await page.getByTestId('drop-units').fill('40');
      await tap('announce-drop');
      await expect(page.getByTestId('drop-live')).toBeVisible();
      await tap('post-teaser');
      await tap('speed-4');
      await expect.poll(async () => {
        await resolveEvent(page);
        return page.getByTestId('drop-splash').isVisible();
      }, { timeout: 25_000 }).toBe(true);
      await fitsScreen(page, 'live drop');
      await expect(page.getByTestId('splash-continue')).toBeVisible();
      await fitsScreen(page, 'drop results');
      await tap('splash-continue');
      await tap('speed-0');
      await expect.poll(() => page.evaluate(() => window.__store.state!.stats.unitsSold)).toBeGreaterThan(0);

      // Use the same game and unlock representative late-game content for the layout pass.
      await page.evaluate(() => {
        const store = window.__store;
        const state = store.state!;
        state.cash = 20_000_000;
        state.hqLevel = 2;
        state.reputation = 60;
        state.followers = 400_000;
        state.stats.weeklyRevenue = [900_000, 900_000];
        state.unlocks.push('unlock_wholesale');
        state.wholesale.offers.push({
          id: 'phone-offer', storeId: 'concrete', designId: state.designs[0].id,
          units: 40, unitPrice: 30, payDays: 30, expiresDay: state.day + 10,
        });
        state.pendingEvents.push({ id: 'phone-event', defId: 'blog_feature', day: state.day, params: {} });
        store.bump();
      });
      await expect(page.getByTestId('event-modal')).toBeVisible();
      await fitsScreen(page, 'event decision');
      await page.locator('[data-testid^=event-option-]:not([disabled])').first().tap();
      await expect(page.getByTestId('event-outcome')).toBeVisible();
      await fitsScreen(page, 'event result');
      await tap('event-ok');

      await tap('open-menu');
      await fitsScreen(page, 'pause menu');
      await page.getByRole('button', { name: 'Settings', exact: true }).tap();
      await tap('scale-1.3');
      await fitsScreen(page, 'settings at 130%');
      await page.locator('button.back').tap();
      await tap('menu-resume');
      await tap('speed-0');
      await tap('feed-toggle');
      await fitsScreen(page, 'expanded feed at 130%');
      await tap('feed-toggle');
      await tap('nav-trends');
      await tap('buy-report');
      await expect(page.getByTestId('panel-trends')).toContainText('weeks ahead');
      await tap('nav-team');
      await page.locator('[data-testid^=hire-]:enabled').first().tap();
      await expect(page.locator('li.staff')).toHaveCount(1);
      await visitPanels(page, 'populated game at 130%');
      await tap('nav-hq');
      await tap('edit-logo');
      await expect(page.getByTestId('logo-modal')).toBeVisible();
      await fitsScreen(page, 'logo editor at 130%');
      await page.getByTestId('logo-modal').locator('.btn-primary').tap();

      await tap('open-menu');
      await tap('menu-save');
      await fitsScreen(page, 'manual save slots');
      await tap('save-slot1');
      const savedDay = await page.evaluate(() => {
        const state = window.__store.state!;
        const day = state.day;
        state.day += 5;
        return day;
      });
      await page.getByRole('button', { name: 'Load game', exact: true }).tap();
      await fitsScreen(page, 'in-game load slots');
      await tap('load-slot1');
      await tap('speed-0');
      expect(await page.evaluate(() => window.__store.state!.day)).toBe(savedDay);
      await page.evaluate(() => {
        localStorage.removeItem('streetwear-tycoon:auto');
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      const saved = JSON.parse((await page.evaluate(() => localStorage.getItem('streetwear-tycoon:auto')))!);
      expect(saved.game.designs[0].name).toBe(PIECE);

      await page.reload();
      await openHome(page);
      await fitsScreen(page, 'main menu with a saved game at 130%');
      await page.getByRole('button', { name: 'Settings', exact: true }).tap();
      await fitsScreen(page, 'main menu settings');
      await page.locator('button.back').tap();
      await tap('load-btn');
      await fitsScreen(page, 'load slots');
      await tap('load-auto');
      await expect(page.getByTestId('game')).toBeVisible();
      await tap('nav-lab');
      await expect(page.getByTestId('collection')).toContainText(PIECE);
      expect(errors).toEqual([]);
    });

    test('end screens keep the title and return actions within reach', async ({ page }) => {
      await page.goto('/');
      await openHome(page);
      await page.getByTestId('new-game-btn').tap();
      await page.getByTestId('brand-name').fill(BRAND);
      await page.getByTestId('start-game').tap();
      await page.getByTestId('speed-0').tap();
      await page.evaluate(() => {
        const store = window.__store;
        store.state!.cash = -100;
        store.state!.overdrawnSince = store.state!.day;
        store.bump();
      });
      await expect(page.getByTestId('overdrawn')).toBeVisible();
      await fitsScreen(page, 'overdrawn warning');
      await page.evaluate(() => {
        const store = window.__store;
        store.splash = { designName: 'NIGHT SHIFT TEE', result: {
          outcome: 'solid', units: 50_000, sold: 32_000, demand: 35_000, revenue: 1_400_000,
          minutes: null, resalePrice: null,
        } };
        store.bump();
      });
      await expect(page.getByTestId('drop-live-count')).toBeVisible();
      await fitsScreen(page, 'late-game live drop counter');
      await page.getByTestId('splash-continue').tap();
      await page.evaluate(() => {
        const store = window.__store;
        store.campaignSplash = { kind: 'won', rank: 1 };
        store.bump();
      });
      await expect(page.getByTestId('campaign-splash')).toBeVisible();
      await fitsScreen(page, 'campaign win');
      await page.getByTestId('campaign-continue').tap();
      await page.evaluate(() => {
        const store = window.__store;
        store.state!.gameOver = { reason: 'bankrupt', day: store.state!.day };
        store.bump();
      });
      await expect(page.getByTestId('game-over')).toBeVisible();
      await fitsScreen(page, 'bankruptcy');
      await page.getByTestId('gameover-menu').tap();
      await expect(page.getByTestId('main-menu')).toBeVisible();
    });
  });
}
