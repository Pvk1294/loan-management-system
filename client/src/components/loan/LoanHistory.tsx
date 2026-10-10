import { LOAN_STATUS_TONES } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { LOAN_STATUS_LABELS, formatDateTime } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/rbac';
import type { StatusChange } from '@/types/api';

const DOT_COLOURS = {
  neutral: 'bg-slate-400',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  brand: 'bg-brand-500',
};

/** The audit trail of a loan: every status it has been through, who moved it and when. */
export function LoanHistory({ history }: { history: StatusChange[] }) {
  return (
    <ol>
      {history.map((change, index) => {
        const isLast = index === history.length - 1;
        return (
          <li key={`${change.status}-${change.changedAt}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white', DOT_COLOURS[LOAN_STATUS_TONES[change.status]])}
                aria-hidden="true"
              />
              {!isLast && <span className="w-px flex-1 bg-slate-200" aria-hidden="true" />}
            </div>
            <div className={cn('min-w-0', !isLast && 'pb-5')}>
              <p className="text-sm font-medium text-slate-900">{LOAN_STATUS_LABELS[change.status]}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatDateTime(change.changedAt)}
                {change.changedBy && ` · ${change.changedBy.name} (${ROLE_LABELS[change.changedBy.role]})`}
              </p>
              {change.note && <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">{change.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
