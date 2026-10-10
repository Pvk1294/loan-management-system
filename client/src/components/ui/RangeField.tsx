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
  /** Shown before the number in the text box, such as a currency symbol. */
  prefix?: string;
  /** Shown after the number in the text box, such as a unit. */
  suffix?: string;
  /** Formats the labels under the slider and on the shortcut buttons. */
  formatBound: (value: number) => string;
  /** Shortcut values offered as buttons. */
  presets?: number[];
}

/**
 * A slider paired with a text box. The slider is quick for exploring; the text
 * box lets someone type the exact figure they have in mind. Both edit the same
 * value, and typed values are pulled back into range when the box loses focus.
 */
export function RangeField({ label, value, min, max, step, onChange, prefix, suffix, formatBound, presets }: RangeFieldProps) {
  const id = useId();
  /** What is being typed, which may be out of range or half-finished. */
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
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <div className="flex h-11 items-center rounded-lg border border-slate-300 bg-white px-3 shadow-sm transition-colors focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15">
          {prefix && <span className="mr-1 text-sm text-slate-500">{prefix}</span>}
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
            className="w-24 bg-transparent text-right text-base font-semibold text-slate-900 tabular-nums focus:outline-none"
          />
          {suffix && <span className="ml-1.5 text-sm text-slate-500">{suffix}</span>}
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
      <div className="flex justify-between text-xs text-slate-500 tabular-nums">
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
                'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-600',
                value === preset
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-brand-500 hover:text-brand-700',
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
