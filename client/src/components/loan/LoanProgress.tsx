import type { CSSProperties } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import type { Loan } from '@/types/api';

interface Milestone {
  label: string;
  date: string | null;
  state: 'done' | 'current' | 'upcoming' | 'failed';
  waitingFor?: string;
}

/** The borrower's view of the stages, in plain words. */
function milestonesFor(loan: Loan): Milestone[] {
  if (loan.status === 'REJECTED') {
    return [
      { label: 'Applied', date: loan.appliedAt, state: 'done' },
      { label: 'Not approved', date: loan.rejectedAt, state: 'failed' },
    ];
  }
  const reached = [loan.appliedAt, loan.sanctionedAt, loan.disbursedAt, loan.closedAt];
  const labels = ['Applied', 'Approved', 'Money sent', 'Repaid'];
  const waitingFor = ['', 'Being reviewed', 'Being arranged', 'In progress'];
  const nextIndex = reached.findIndex((date) => !date);

  return labels.map((label, index) => ({
    label,
    date: reached[index],
    state: reached[index] ? 'done' : index === nextIndex ? 'current' : 'upcoming',
    waitingFor: waitingFor[index],
  }));
}

/** A track that draws itself: nodes pop in sequence, lines grow between them. */
export function LoanProgress({ loan }: { loan: Loan }) {
  const milestones = milestonesFor(loan);

  return (
    <ol className="flex flex-col sm:flex-row" aria-label="Where your loan is">
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;
        const lineFilled = milestone.state === 'done' && milestones[index + 1]?.state !== 'upcoming';
        return (
          <li key={milestone.label} className={cn('flex gap-4 sm:flex-1 sm:flex-col sm:gap-0', isLast && 'sm:flex-none')} style={{ '--i': index } as CSSProperties}>
            <div className="flex flex-col items-center sm:flex-row">
              <span
                className={cn(
                  'animate-check flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  milestone.state === 'done' && 'bg-ink text-saffron-300',
                  milestone.state === 'failed' && 'bg-rose-600 text-white',
                  milestone.state === 'current' && 'animate-pulse-ring bg-white ring-2 ring-brand-600',
                  milestone.state === 'upcoming' && 'bg-white ring-1 ring-line-strong',
                )}
                style={{ animationDelay: `${index * 160}ms` }}
              >
                {milestone.state === 'done' && <Check className="h-4 w-4" aria-hidden="true" />}
                {milestone.state === 'failed' && <X className="h-4 w-4" aria-hidden="true" />}
                {milestone.state === 'current' && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
              </span>
              {!isLast && (
                <span className="my-1.5 w-0.5 flex-1 overflow-hidden rounded-full bg-line sm:mx-2.5 sm:my-0 sm:h-0.5 sm:w-auto" aria-hidden="true">
                  <span
                    className={cn('block h-full w-full origin-top bg-ink sm:origin-left', lineFilled ? 'animate-draw' : 'scale-0')}
                    style={{ animationDelay: `${index * 160 + 120}ms` }}
                  />
                </span>
              )}
            </div>
            <div className={cn('pb-6 sm:mt-3 sm:pr-4 sm:pb-0', isLast && 'pb-0')}>
              <p className={cn('text-sm font-medium', milestone.state === 'upcoming' ? 'text-ink-faint' : milestone.state === 'failed' ? 'text-rose-700' : 'text-ink')}>
                {milestone.label}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {milestone.date ? formatDate(milestone.date) : milestone.state === 'current' ? milestone.waitingFor : 'Next'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
