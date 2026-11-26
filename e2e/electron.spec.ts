import { _electron as electron, expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

test('desktop program starts, plays and autosaves on close', async () => {
  const saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swt-saves-'));
  const musicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swt-music-'));
  // a tiny silent wav as the player's "game" track
  const wav = Buffer.alloc(44 + 800);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + 800, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(8000, 28);
  wav.writeUInt16LE(1, 32);
  wav.writeUInt16LE(8, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(800, 40);
  fs.writeFileSync(path.join(musicDir, 'game.wav'), wav);
  const app = await electron.launch({
    args: ['.', '--no-sandbox'],
    env: { ...process.env, STREETWEAR_SAVE_DIR: saveDir, STREETWEAR_MUSIC_DIR: musicDir },
  });
  const win = await app.firstWindow();
  await win.getByTestId('intro').click({ timeout: 20_000 }).catch(() => {});
  await expect(win.getByTestId('main-menu')).toBeVisible({ timeout: 30_000 });
  // music folder: tracks dropped in are found and served
  expect(await win.evaluate(() => (window as unknown as { streetwear: { musicTracks(): Promise<string[]> } }).streetwear.musicTracks())).toEqual(['game']);
  const loaded = await win.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const a = new Audio('swt-music://game');
        a.addEventListener('loadedmetadata', () => resolve(true));
        a.addEventListener('error', () => resolve(false));
        setTimeout(() => resolve(false), 5000);
      }),
  );
  expect(loaded).toBe(true);
  expect(await win.evaluate(() => !!(window as unknown as { streetwear?: unknown }).streetwear)).toBe(true);
  await win.screenshot({ path: 'test-results/desktop-menu.png' });
  await win.getByTestId('new-game-btn').click();
  await win.getByTestId('brand-name').fill('DESKTOP');
  await win.getByTestId('start-game').click();
  await expect(win.getByTestId('game')).toBeVisible();
  // manual save goes to a real file
  await win.getByTestId('open-menu').click();
  await win.getByTestId('menu-save').click();
  await win.getByTestId('save-slot2').click();
  await expect.poll(() => fs.existsSync(path.join(saveDir, 'slot2.json'))).toBe(true);
  await win.getByTestId('menu-resume').click();
  await win.screenshot({ path: 'test-results/desktop-game.png' });
  // Close the window like a player clicking the X.
  const closed = app.waitForEvent('close');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await closed;
  expect(fs.existsSync(path.join(saveDir, 'auto.json'))).toBe(true);
  const saved = JSON.parse(fs.readFileSync(path.join(saveDir, 'auto.json'), 'utf8'));
  expect(saved.meta.brand).toBe('DESKTOP');
  expect(saved.game.version).toBe(4);
});
