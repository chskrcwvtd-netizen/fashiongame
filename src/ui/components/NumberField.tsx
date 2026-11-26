import { useEffect, useState } from 'react';

/** Number input that only commits on blur / Enter, so typing isn't fought by clamping. */
export function NumberField({ value, onCommit, min, max, className, testid, label }: { value: number; onCommit: (v: number) => void; min?: number; max?: number; className?: string; testid?: string; label: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text);
    if (text.trim() === '' || !Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const clamped = Math.round(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
    if (clamped !== value) onCommit(clamped);
    else setText(String(value));
  };
  return (
    <input
      className={`input ${className ?? ''}`}
      inputMode="numeric"
      value={text}
      aria-label={label}
      data-testid={testid}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
