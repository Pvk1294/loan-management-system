'use client';

import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useCountUp } from '@/hooks/useMotion';
import { cn } from '@/lib/cn';
import { Skeleton } from './Spinner';

interface StatCardProps {
  label: string;
  value: number | undefined;
  /** Formats the rolling number, for example as rupees. Defaults to a plain integer. */
  format?: (value: number) => string;
  icon?: LucideIcon;
  caption?: string;
  onClick?: () => void;
  active?: boolean;
  index?: number;
  className?: string;
}

/** A key figure that rolls up to its value when it first appears or changes. */
export function StatCard({ label, value, format, icon: Icon, caption, onClick, active, index = 0, className }: StatCardProps) {
  const shown = useCountUp(value ?? 0, 900);
  const text = value === undefined ? null : format ? format(shown) : Math.round(shown).toLocaleString('en-IN');

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
        {Icon && <Icon className={cn('h-4 w-4', active ? 'text-saffron-500' : 'text-ink-faint')} aria-hidden="true" />}
      </div>
      {text === null ? (
        <Skeleton className="mt-2 h-8 w-20" />
      ) : (
        <p className="amount mt-1 text-[28px] leading-none text-ink">{text}</p>
      )}
      {caption && <p className="mt-2 text-[13px] text-ink-muted">{caption}</p>}
    </>
  );

  const classes = cn(
    'reveal rounded-[20px] border bg-white p-5 text-left shadow-card',
    active ? 'border-saffron-400 ring-4 ring-saffron-400/15' : 'border-line',
    className,
  );
  const style = { '--i': index } as CSSProperties;

  if (!onClick) {
    return (
      <div className={classes} style={style}>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={style}
      className={cn(classes, 'lift cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600')}
    >
      {content}
    </button>
  );
}
