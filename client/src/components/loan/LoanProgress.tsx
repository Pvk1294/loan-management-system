import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { Loan } from '@/types/api';

interface Milestone {
  label: string;
  date: string | null;
  state: 'done' | 'current' | 'upcoming' | 'failed';
  /** What the loan is waiting for while this is the next stop. */
  waitingFor?: string;
}

/** The four stops of a loan's life, with where this loan stands on each. */
function milestonesFor(loan: Loan): Milestone[] {
  if (loan.status === 'REJECTED') {
    return [
      { label: 'Applied', date: loan.appliedAt, state: 'done' },
      { label: 'Rejected', date: loan.rejectedAt, state: 'failed' },
    ];
  }

  const reached = [loan.appliedAt, loan.sanctionedAt, loan.disbursedAt, loan.closedAt];
  const labels = ['Applied', 'Sanctioned', 'Disbursed', 'Closed'];
  const waitingFor = ['', 'Under review', 'Awaiting release of funds', 'When fully repaid'];
  const nextIndex = reached.findIndex((date) => !date);

  return labels.map((label, index) => ({
    label,
    date: reached[index],
    state: reached[index] ? 'done' : index === nextIndex ? 'current' : 'upcoming',
    waitingFor: waitingFor[index],
  }));
}

/** A horizontal track on wide screens, a vertical one on phones. */
export function LoanProgress({ loan }: { loan: Loan }) {
  const milestones = milestonesFor(loan);

  return (
    <ol className="flex flex-col gap-0 sm:flex-row" aria-label="Loan progress">
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;
        const lineFilled = milestone.state === 'done' && milestones[index + 1]?.state !== 'upcoming';
        return (
          <li key={milestone.label} className={cn('flex gap-3 sm:flex-1 sm:flex-col sm:gap-0', isLast && 'sm:flex-none')}>
            <div className="flex flex-col items-center sm:flex-row">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  milestone.state === 'done' && 'bg-brand-600 text-white',
                  milestone.state === 'failed' && 'bg-rose-600 text-white',
                  milestone.state === 'current' && 'bg-white ring-2 ring-brand-600',
                  milestone.state === 'upcoming' && 'bg-white ring-1 ring-slate-300',
                )}
              >
                {milestone.state === 'done' && <Check className="h-4 w-4" aria-hidden="true" />}
                {milestone.state === 'failed' && <X className="h-4 w-4" aria-hidden="true" />}
                {milestone.state === 'current' && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-600" />}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    'my-1 w-0.5 flex-1 rounded-full sm:mx-2 sm:my-0 sm:h-0.5 sm:w-auto',
                    lineFilled ? 'bg-brand-600' : 'bg-slate-200',
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className={cn('pb-5 sm:mt-3 sm:pr-4 sm:pb-0', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-medium',
                  milestone.state === 'upcoming' ? 'text-slate-400' : milestone.state === 'failed' ? 'text-rose-700' : 'text-slate-900',
                )}
              >
                {milestone.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {milestone.date ? formatDate(milestone.date) : milestone.state === 'current' ? milestone.waitingFor : 'Pending'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
