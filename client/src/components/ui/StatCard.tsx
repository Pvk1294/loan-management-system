import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Skeleton } from './Spinner';

interface StatCardProps {
  label: string;
  value: number | string | undefined;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip, for example "bg-amber-50 text-amber-700". */
  accent?: string;
  /** When given, the card is a button that filters the list below it. */
  onClick?: () => void;
  active?: boolean;
}

export function StatCard({ label, value, icon: Icon, accent = 'bg-slate-100 text-slate-600', onClick, active }: StatCardProps) {
  const content = (
    <>
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', accent)}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        {value === undefined ? (
          <Skeleton className="mt-1.5 h-6 w-10" />
        ) : (
          <p className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
        )}
      </div>
    </>
  );

  const classes = cn(
    'flex items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-card transition-all',
    active ? 'border-brand-600 ring-2 ring-brand-600/15' : 'border-slate-200',
  );

  if (!onClick) return <div className={classes}>{content}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        classes,
        'cursor-pointer hover:border-slate-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        active && 'hover:border-brand-600',
      )}
    >
      {content}
    </button>
  );
}
