import { cn } from '@/lib/cn';
import { formatDate, formatRupees, formatRupeesExact, initials } from '@/lib/format';
import type { Loan } from '@/types/api';

export function ApplicantCell({ loan }: { loan: Loan }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-2 text-xs font-semibold text-ink-muted" aria-hidden="true">
        {initials(loan.applicant.fullName)}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{loan.applicant.fullName}</p>
        <p className="truncate font-mono text-[13px] text-ink-muted">{loan.reference}</p>
      </div>
    </div>
  );
}

export function Money({ amount, exact = false, className }: { amount: number; exact?: boolean; className?: string }) {
  return <span className={cn('tabular-nums', className)}>{exact ? formatRupeesExact(amount) : formatRupees(amount)}</span>;
}

export function DateText({ value }: { value: string | null }) {
  return <span className="whitespace-nowrap text-ink-muted">{formatDate(value)}</span>;
}

export function OutstandingCell({ loan }: { loan: Loan }) {
  const paidShare = loan.totalRepayment > 0 ? (loan.amountPaid / loan.totalRepayment) * 100 : 0;
  return (
    <div className="w-full max-w-40 md:ml-auto">
      <p className="font-medium text-ink tabular-nums md:text-right">{formatRupeesExact(loan.outstanding)}</p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-3">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${paidShare}%` }} />
      </div>
      <p className="mt-1 text-[13px] text-ink-muted tabular-nums md:text-right">{Math.floor(paidShare)}% repaid</p>
    </div>
  );
}
