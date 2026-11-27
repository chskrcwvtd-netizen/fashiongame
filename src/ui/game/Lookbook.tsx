import { useState } from 'react';
import { GARMENTS, type Design } from '../../engine';
import { GarmentPreview } from '../components/GarmentPreview';
import { useGame } from '../hooks';
import { canSaveFiles, exportImage } from '../exportImage';

/** Where a piece sits on the model (top, bottom, head, feet, accessory). */
function slot(d: Design): { x: number; y: number; w: number } {
  if (d.garment === 'cap' || d.garment === 'beanie') return { x: 45, y: 0, w: 70 };
  if (d.garment === 'cargo' || d.garment === 'jeans' || d.garment === 'shorts') return { x: 12, y: 150, w: 136 };
  if (d.garment === 'sneakers') return { x: 35, y: 300, w: 90 };
  if (d.garment === 'jewelry') return { x: 55, y: 60, w: 50 };
  if (d.garment === 'bag' || d.garment === 'perfume') return { x: 95, y: 150, w: 60 };
  return { x: 20, y: 50, w: 120 };
}

/** A photo-studio "lookbook": each piece on a model silhouette. */
export function Lookbook() {
  const { s } = useGame();
  const [pick, setPick] = useState<string | null>(null);
  const designs = [...s.designs].reverse();
  return (
    <div className="panel lookbook" data-testid="panel-lookbook">
      <h2 className="display">lookbook</h2>
      {designs.length === 0 ? (
        <p className="muted">Design something first. Every piece gets its own studio shot here.</p>
      ) : (
        <div className="look-grid">
          {designs.map((d) => {
            const p = slot(d);
            return (
              <figure key={d.id} id={pick === d.id ? 'lab-turntable' : undefined} className={`look ${pick === d.id ? 'on' : ''}`} onClick={() => setPick(d.id)}>
                <svg viewBox="0 0 160 360" className="look-model" aria-hidden="true">
                  <circle cx="80" cy="40" r="24" fill="#3a3447" />
                  <rect x="48" y="66" width="64" height="120" rx="18" fill="#2d2838" />
                  <rect x="50" y="180" width="26" height="140" rx="10" fill="#2d2838" />
                  <rect x="84" y="180" width="26" height="140" rx="10" fill="#2d2838" />
                  <svg x={p.x} y={p.y} width={p.w} height={(p.w * 320) / 300} viewBox="0 0 300 320">
                    <GarmentPreview design={d} logo={s.brand.logo} size={300} />
                  </svg>
                </svg>
                <figcaption>
                  <strong>{d.name}</strong>
                  <span className="muted small">
                    {GARMENTS[d.garment].name}
                    {d.collection ? `, ${d.collection}` : ''}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
      {pick && canSaveFiles() && (
        <button className="btn btn-primary" onClick={() => void exportImage(s.designs.find((d) => d.id === pick)?.name ?? 'look')} data-testid="lookbook-export">
          Save the selected look as an image
        </button>
      )}
    </div>
  );
}
