import { sfx } from '../audio/sfx';

/** A Claude page (the iPhone version) is not allowed to save files. */
export const canSaveFiles = () => typeof window === 'undefined' || !window.claude;

/** Save a picture of the piece on the Design Lab turntable. */
export async function exportImage(name: string): Promise<void> {
  const el = document.getElementById('lab-turntable');
  if (!el) return;
  const safe = (name || 'design').replace(/[^a-z0-9 _-]/gi, '').trim().replace(/\s+/g, '_') || 'design';
  const r = el.getBoundingClientRect();
  const bridge = window.streetwear;
  if (bridge?.captureRect) {
    const ok = await bridge.captureRect({ x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }, safe);
    sfx.play(ok ? 'notify' : 'error');
    return;
  }
  // Browser fallback: draw the SVG onto a canvas.
  const svg = el.querySelector('svg');
  if (!svg) return;
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 960;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b0913';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${safe}.png`;
  a.click();
  sfx.play('notify');
}
