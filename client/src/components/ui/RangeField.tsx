'use client';

import { type CSSProperties, useId, useState } from 'react';
import { cn } from '@/lib/cn';

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  formatBound: (value: number) => string;
  presets?: number[];
}

/**
 * A slider paired with a text box: drag to explore, type for an exact figure.
 * Typed values are pulled back into range when the box loses focus.
 */
export function RangeField({ label, value, min, max, step, onChange, prefix, suffix, formatBound, presets }: RangeFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (raw: number) => Math.min(max, Math.max(min, Math.round(raw / step) * step));
  const fill = ((value - min) / (max - min)) * 100;

  const onType = (text: string) => {
    const digits = text.replace(/[^\d]/g, '');
    setDraft(digits);
    const typed = Number(digits);
    if (digits !== '' && typed >= min && typed <= max) onChange(typed);
  };

  const commit = () => {
    if (draft !== null && draft !== '') onChange(clamp(Number(draft)));
    setDraft(null);
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <div className="flex h-12 items-center rounded-xl border border-line-strong bg-white px-3.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15">
          {prefix && <span className="mr-1 text-[15px] text-ink-muted">{prefix}</span>}
          <input
            type="text"
            inputMode="numeric"
            aria-label={`${label}, exact value`}
            value={draft ?? value.toLocaleString('en-IN')}
            onChange={(event) => onType(event.target.value)}
            onFocus={() => setDraft(String(value))}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="amount w-28 bg-transparent text-right text-xl text-ink focus:outline-none"
          />
          {suffix && <span className="ml-1.5 text-sm text-ink-muted">{suffix}</span>}
        </div>
      </div>

      <input
        id={id}
        type="range"
        className="range mt-3"
        style={{ '--fill': `${fill}%` } as CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          setDraft(null);
          onChange(Number(event.target.value));
        }}
      />
      <div className="flex justify-between text-[13px] text-ink-muted tabular-nums">
        <span>{formatBound(min)}</span>
        <span>{formatBound(max)}</span>
      </div>

      {presets && (
        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setDraft(null);
                onChange(preset);
              }}
              aria-pressed={value === preset}
              className={cn(
                'cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-brand-600',
                value === preset
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line-strong bg-white text-ink-muted hover:-translate-y-px hover:border-ink hover:text-ink',
              )}
            >
              {formatBound(preset)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
