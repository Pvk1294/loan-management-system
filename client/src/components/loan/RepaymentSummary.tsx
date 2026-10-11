'use client';

import { useCountUp } from '@/hooks/useMotion';
import { cn } from '@/lib/cn';
import { daysUntil, formatDate, formatRupeesExact } from '@/lib/format';
import type { Loan } from '@/types/api';

/** Paid against owed: three figures and a bar. Shared by the borrower's view and the dashboard. */
export function RepaymentSummary({ loan, className }: { loan: Loan; className?: string }) {
  const paidShare = loan.totalRepayment > 0 ? Math.min(100, (loan.amountPaid / loan.totalRepayment) * 100) : 0;
  const closed = loan.status === 'CLOSED';
  const daysLeft = loan.dueDate ? daysUntil(loan.dueDate) : null;
  const paid = useCountUp(loan.amountPaid, 800);
  const outstanding = useCountUp(loan.outstanding, 800);

  return (
    <div className={className}>
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-[13px] text-ink-muted">To repay</dt>
          <dd className="amount mt-1 text-lg text-ink sm:text-xl">{formatRupeesExact(loan.totalRepayment)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-ink-muted">Paid</dt>
          <dd className="amount mt-1 text-lg text-brand-700 sm:text-xl">{formatRupeesExact(paid)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-ink-muted">Left</dt>
          <dd className={cn('amount mt-1 text-lg sm:text-xl', closed ? 'text-ink-faint' : 'text-ink')}>{formatRupeesExact(outstanding)}</dd>
        </div>
      </dl>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-paper-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(paidShare)} aria-label="Share repaid">
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700 ease-out" style={{ width: `${paidShare}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px] text-ink-muted">
        <span className="tabular-nums">{paidShare.toFixed(paidShare > 0 && paidShare < 100 ? 1 : 0)}% repaid</span>
        {closed ? (
          <span>Closed {formatDate(loan.closedAt)}</span>
        ) : loan.dueDate && daysLeft !== null ? (
          <span className={cn(daysLeft < 0 && 'font-medium text-rose-600')}>
            Due {formatDate(loan.dueDate)}
            {daysLeft < 0 ? ` · ${-daysLeft} ${daysLeft === -1 ? 'day' : 'days'} overdue` : ` · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
