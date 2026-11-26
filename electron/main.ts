import { app, BrowserWindow, ipcMain, net, protocol, shell } from 'electron';
import { pathToFileURL } from 'node:url';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SLOTS = new Set(['auto', 'slot1', 'slot2', 'slot3']);
const MUSIC = ['menu', 'game', 'drop'];
const MUSIC_EXT = ['.mp3', '.ogg', '.wav', '.m4a', '.flac'];

// Your own music: files named menu / game / drop in the music folder, served as swt-music://<name>
protocol.registerSchemesAsPrivileged([{ scheme: 'swt-music', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true } }]);

function musicDir(): string {
  const dir = process.env.STREETWEAR_MUSIC_DIR || path.join(app.getPath('userData'), 'music');
  fs.mkdirSync(dir, { recursive: true });
  const readme = path.join(dir, 'PUT YOUR TRACKS HERE.txt');
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(readme, 'Drop your own tracks in this folder, named:\r\n  menu.mp3  - main menu\r\n  game.mp3  - while you play\r\n  drop.mp3  - drop day\r\n(.ogg, .wav, .m4a and .flac work too.) Restart the game to hear them.\r\n');
  }
  return dir;
}

function musicFile(name: string): string | null {
  if (!MUSIC.includes(name)) return null;
  for (const ext of MUSIC_EXT) {
    const f = path.join(musicDir(), name + ext);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

function saveDir(): string {
  const dir = process.env.STREETWEAR_SAVE_DIR || path.join(app.getPath('userData'), 'saves');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function slotPath(slot: unknown): string {
  if (typeof slot !== 'string' || !SLOTS.has(slot)) throw new Error('Invalid save slot');
  return path.join(saveDir(), `${slot}.json`);
}

/** Write via a temp file + rename so a crash never leaves half a save. */
function writeAtomic(file: string, text: string) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
  fs.renameSync(tmp, file);
}

function registerIpc() {
  ipcMain.handle('save:read', (_e, slot) => {
    const file = slotPath(slot);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  });
  ipcMain.handle('save:write', (_e, slot, text) => {
    if (typeof text !== 'string') throw new Error('Invalid save');
    writeAtomic(slotPath(slot), text);
  });
  ipcMain.handle('save:remove', (_e, slot) => {
    const file = slotPath(slot);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
  ipcMain.on('save:writeSync', (e, slot, text) => {
    try {
      if (typeof text === 'string') writeAtomic(slotPath(slot), text);
      e.returnValue = true;
    } catch {
      e.returnValue = false;
    }
  });
  ipcMain.on('app:quit', () => app.quit());
  ipcMain.on('music:open', () => void shell.openPath(musicDir()));
  ipcMain.handle('music:list', () => MUSIC.filter((m) => musicFile(m)));
  ipcMain.handle('capture:rect', async (e, rect, name) => {
    try {
      const win = BrowserWindow.fromWebContents(e.sender);
      if (!win || typeof name !== 'string') return false;
      const img = await win.webContents.capturePage(rect);
      const dir = path.join(app.getPath('pictures'), 'Streetwear Tycoon');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${name.replace(/[^a-z0-9 _-]/gi, '_').slice(0, 40)}-${Date.now()}.png`);
      fs.writeFileSync(file, img.toPNG());
      shell.showItemInFolder(file);
      return true;
    } catch {
      return false;
    }
  });
  ipcMain.on('app:fullscreen', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (win) win.setFullScreen(!win.isFullScreen());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#08060f',
    title: 'Streetwear Tycoon',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.removeMenu();
  // Ask the game to autosave before the window really closes (max 2 s wait).
  let closeReady = false;
  win.on('close', (e) => {
    if (closeReady || win.webContents.isDestroyed()) return;
    e.preventDefault();
    const finish = () => {
      if (closeReady) return;
      closeReady = true;
      ipcMain.removeListener('app:close-ready', onReady);
      if (!win.isDestroyed()) win.close();
    };
    const onReady = (ev: Electron.IpcMainEvent) => {
      if (ev.sender === win.webContents) finish();
    };
    ipcMain.on('app:close-ready', onReady);
    win.webContents.send('app:before-close');
    setTimeout(finish, 2000);
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  // Never navigate away or open other windows.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  return win;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    protocol.handle('swt-music', (req) => {
      const name = new URL(req.url).hostname;
      const f = musicFile(name);
      if (!f) return new Response('not found', { status: 404 });
      return net.fetch(pathToFileURL(f).toString());
    });
    registerIpc();
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
