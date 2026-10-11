'use client';

import { useId, useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface DateFieldProps {
  label: string;
  /** YYYY-MM-DD, or an empty string while the date is incomplete. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest and latest selectable dates, as YYYY-MM-DD. */
  min?: string;
  max?: string;
  error?: string;
  hint?: string;
  /** Marks the field as needing attention without an error message of its own. */
  flagged?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();

function parse(value: string): { day: string; month: string; year: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) } : { day: '', month: '', year: '' };
}

/**
 * A date entered as three lists: day, month, year. For a date of birth this is
 * quicker than paging a calendar back thirty years, and it looks the same in
 * every browser. The field reports a value only once all three are chosen.
 */
export function DateField({ label, value, onChange, min, max, error, hint, flagged }: DateFieldProps) {
  const id = useId();
  const [parts, setParts] = useState(() => parse(value));

  const maxYear = max ? Number(max.slice(0, 4)) : new Date().getFullYear();
  const minYear = min ? Number(min.slice(0, 4)) : maxYear - 100;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
  const dayCount = parts.month ? daysIn(Number(parts.year) || 2000, Number(parts.month)) : 31;

  const update = (change: Partial<typeof parts>) => {
    const next = { ...parts, ...change };
    // Changing the month or year can make the chosen day impossible (31 February).
    if (next.day && next.month && Number(next.day) > daysIn(Number(next.year) || 2000, Number(next.month))) next.day = '';
    setParts(next);
    onChange(next.day && next.month && next.year ? `${next.year}-${pad(Number(next.month))}-${pad(Number(next.day))}` : '');
  };

  const selectClass = cn(
    'h-12 w-full cursor-pointer appearance-none rounded-xl border bg-white pr-7 pl-3 text-[15px] shadow-sm transition-[border-color,box-shadow] duration-200',
    'focus:outline-none focus:ring-4',
    error || flagged
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15'
      : 'border-line-strong hover:border-ink-faint focus:border-brand-600 focus:ring-brand-600/15',
  );

  const list = (key: 'day' | 'month' | 'year', placeholder: string, options: { value: string; text: string }[]) => (
    <div className="relative min-w-0">
      <select
        id={key === 'day' ? id : undefined}
        aria-label={`${label}: ${placeholder.toLowerCase()}`}
        value={parts[key]}
        onChange={(event) => update({ [key]: event.target.value })}
        className={cn(selectClass, parts[key] ? 'text-ink' : 'text-ink-faint')}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.text}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
    </div>
  );

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="grid grid-cols-[4.25rem_minmax(0,1fr)_5.5rem] gap-2">
        {list('day', 'Day', Array.from({ length: dayCount }, (_, i) => ({ value: String(i + 1), text: String(i + 1) })))}
        {list('month', 'Month', MONTHS.map((name, i) => ({ value: String(i + 1), text: name })))}
        {list('year', 'Year', years.map((year) => ({ value: String(year), text: String(year) })))}
      </div>
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-rose-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
