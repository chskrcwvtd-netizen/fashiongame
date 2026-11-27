import { useEffect, useRef, useState } from 'react';
import type { ShowHistoryEntry } from '../../engine';
import { GarmentPreview } from '../components/GarmentPreview';
import '../../styles/runway.css';

export const runwayVerdict: Record<ShowHistoryEntry['outcome'], string> = {
  ovation: 'Standing ovation',
  good: 'Good show',
  panned: 'Panned',
};

export function RunwayReplay({ show, onClose }: { show: ShowHistoryEntry; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const looks = show.looks ?? [];
  const look = looks[index];

  useEffect(() => { heading.current?.focus(); }, []);

  useEffect(() => {
    if (!playing || index >= looks.length) return;
    const timer = window.setTimeout(() => setIndex(index + 1), 2600);
    return () => window.clearTimeout(timer);
  }, [index, looks.length, playing]);

  return (
    <section className="runway-replay" data-testid="runway-replay" aria-labelledby="runway-replay-title">
      <header className="row spread">
        <h4 id="runway-replay-title" ref={heading} tabIndex={-1}>{show.name}</h4>
        <button className="link" onClick={onClose} data-testid="close-runway">Close</button>
      </header>
      <div className="runway-stage" aria-live="polite">
        {look ? (
          <figure className="runway-look" key={look.id}>
            <GarmentPreview design={look} logo={show.logo} size={270} title={look.name} />
            <figcaption><span>Look {index + 1} of {looks.length}</span><strong>{look.name}</strong></figcaption>
          </figure>
        ) : (
          <div className="runway-verdict" data-outcome={show.outcome} data-testid="runway-verdict">
            <strong>{runwayVerdict[show.outcome]}</strong>
            <p>{show.text}</p>
          </div>
        )}
      </div>
      <div className="row runway-controls">
        {look ? (
          <>
            <button className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button>
            <button className="btn" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
            <button className="btn" onClick={() => setIndex(index + 1)}>{index < looks.length - 1 ? 'Next' : 'Results'}</button>
            <button className="link" onClick={() => setIndex(looks.length)} data-testid="runway-result">Skip to results</button>
          </>
        ) : (
          <button className="btn" onClick={() => { setIndex(0); setPlaying(true); }}>Replay show</button>
        )}
      </div>
    </section>
  );
}
