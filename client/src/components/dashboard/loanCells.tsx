import { cn } from '@/lib/cn';
import { formatDate, formatRupees, formatRupeesExact, initials } from '@/lib/format';
import type { Loan } from '@/types/api';

/** Building blocks for the table cells that the loan modules have in common. */

export function ApplicantCell({ loan }: { loan: Loan }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
        aria-hidden="true"
      >
        {initials(loan.applicant.fullName)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">{loan.applicant.fullName}</p>
        <p className="truncate font-mono text-xs text-slate-500">{loan.reference}</p>
      </div>
    </div>
  );
}

export function Money({ amount, exact = false, className }: { amount: number; exact?: boolean; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{exact ? formatRupeesExact(amount) : formatRupees(amount)}</span>;
}

export function DateText({ value }: { value: string | null }) {
  return <span className="whitespace-nowrap text-slate-600">{formatDate(value)}</span>;
}

/** A slim bar showing how much of the loan has been repaid, with the outstanding figure above it. */
export function OutstandingCell({ loan }: { loan: Loan }) {
  const paidShare = loan.totalRepayment > 0 ? (loan.amountPaid / loan.totalRepayment) * 100 : 0;
  return (
    <div className="ml-auto w-36 md:w-40">
      <p className="text-right font-medium text-slate-900 tabular-nums">{formatRupeesExact(loan.outstanding)}</p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${paidShare}%` }} />
      </div>
      <p className="mt-1 text-right text-xs text-slate-500 tabular-nums">{Math.floor(paidShare)}% repaid</p>
    </div>
  );
}
