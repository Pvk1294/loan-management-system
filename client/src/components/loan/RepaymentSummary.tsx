import { cn } from '@/lib/cn';
import { daysUntil, formatDate, formatRupeesExact } from '@/lib/format';
import type { Loan } from '@/types/api';

/** Paid against owed, as three figures and a bar. Shared by the borrower's view and the dashboard. */
export function RepaymentSummary({ loan, className }: { loan: Loan; className?: string }) {
  const paidShare = loan.totalRepayment > 0 ? Math.min(100, (loan.amountPaid / loan.totalRepayment) * 100) : 0;
  const closed = loan.status === 'CLOSED';
  const daysLeft = loan.dueDate ? daysUntil(loan.dueDate) : null;

  return (
    <div className={className}>
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-slate-500">Total repayment</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900 tabular-nums sm:text-base">{formatRupeesExact(loan.totalRepayment)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Paid</dt>
          <dd className="mt-1 text-sm font-semibold text-emerald-700 tabular-nums sm:text-base">{formatRupeesExact(loan.amountPaid)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Outstanding</dt>
          <dd className={cn('mt-1 text-sm font-semibold tabular-nums sm:text-base', closed ? 'text-slate-400' : 'text-slate-900')}>
            {formatRupeesExact(loan.outstanding)}
          </dd>
        </div>
      </dl>

      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(paidShare)}
        aria-label="Share of the loan repaid"
      >
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${paidShare}%` }} />
      </div>

      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="tabular-nums">{paidShare.toFixed(paidShare > 0 && paidShare < 100 ? 1 : 0)}% repaid</span>
        {closed ? (
          <span>Closed on {formatDate(loan.closedAt)}</span>
        ) : loan.dueDate && daysLeft !== null ? (
          <span className={cn(daysLeft < 0 && 'font-medium text-rose-600')}>
            Due {formatDate(loan.dueDate)}
            {daysLeft < 0
              ? ` · ${-daysLeft} ${daysLeft === -1 ? 'day' : 'days'} overdue`
              : ` · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
