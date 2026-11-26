import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('streetwear', {
  isDesktop: true,
  saves: {
    read: (slot: string) => ipcRenderer.invoke('save:read', slot),
    write: (slot: string, text: string) => ipcRenderer.invoke('save:write', slot, text),
    writeSync: (slot: string, text: string) => ipcRenderer.sendSync('save:writeSync', slot, text),
    remove: (slot: string) => ipcRenderer.invoke('save:remove', slot),
  },
  quit: () => ipcRenderer.send('app:quit'),
  onBeforeClose: (cb: () => void) => {
    ipcRenderer.on('app:before-close', () => {
      try {
        cb();
      } finally {
        ipcRenderer.send('app:close-ready');
      }
    });
  },
  toggleFullscreen: () => ipcRenderer.send('app:fullscreen'),
  captureRect: (rect: { x: number; y: number; width: number; height: number }, name: string) => ipcRenderer.invoke('capture:rect', rect, name),
  openMusicFolder: () => ipcRenderer.send('music:open'),
  musicTracks: () => ipcRenderer.invoke('music:list'),
});
