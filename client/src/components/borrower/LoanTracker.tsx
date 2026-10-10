'use client';

import type { ReactNode } from 'react';
import { BadgeCheck, Banknote, CircleCheckBig, Hourglass, type LucideIcon, Plus, XCircle } from 'lucide-react';
import { LoanProgress } from '@/components/loan/LoanProgress';
import { PaymentList } from '@/components/loan/PaymentList';
import { RepaymentSummary } from '@/components/loan/RepaymentSummary';
import { LoanStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useApiQuery } from '@/hooks/useApiQuery';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatRupees, formatRupeesExact, formatTenure } from '@/lib/format';
import type { Loan, LoanStatus, Payment } from '@/types/api';

interface LoanTrackerProps {
  loan: Loan;
  /** Given when the loan is finished and the borrower may apply again. */
  onStartNew?: () => void;
}

const HEADLINES: Record<LoanStatus, { icon: LucideIcon; accent: string; title: string; text: (loan: Loan) => ReactNode }> = {
  APPLIED: {
    icon: Hourglass,
    accent: 'bg-amber-50 text-amber-700 ring-amber-200',
    title: 'Your application is being reviewed',
    text: () => 'Our sanction team is going through your details. The decision will appear here.',
  },
  SANCTIONED: {
    icon: BadgeCheck,
    accent: 'bg-sky-50 text-sky-700 ring-sky-200',
    title: 'Your loan is approved',
    text: (loan) => `${formatRupees(loan.principal)} has been sanctioned and is waiting to be disbursed to you.`,
  },
  DISBURSED: {
    icon: Banknote,
    accent: 'bg-violet-50 text-violet-700 ring-violet-200',
    title: 'Your loan is active',
    text: (loan) => (
      <>
        {formatRupees(loan.principal)} was disbursed on {formatDate(loan.disbursedAt)}. Repay{' '}
        <strong className="font-semibold text-slate-900">{formatRupeesExact(loan.outstanding)}</strong> by{' '}
        {formatDate(loan.dueDate)}.
      </>
    ),
  },
  CLOSED: {
    icon: CircleCheckBig,
    accent: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    title: 'Loan closed, repaid in full',
    text: (loan) => `You finished repaying this loan on ${formatDate(loan.closedAt)}. Thank you.`,
  },
  REJECTED: {
    icon: XCircle,
    accent: 'bg-rose-50 text-rose-700 ring-rose-200',
    title: 'This application was not approved',
    text: (loan) => (
      <>
        Reason given: <span className="text-slate-900">{loan.rejectionReason}</span>
      </>
    ),
  },
};

/** The borrower's view of one loan: where it stands, its terms and what has been repaid. */
export function LoanTracker({ loan, onStartNew }: LoanTrackerProps) {
  const hasRepayments = loan.status === 'DISBURSED' || loan.status === 'CLOSED';
  const { data } = useApiQuery(hasRepayments ? `borrower-loan:${loan.id}:${loan.amountPaid}` : null, () =>
    api<{ loan: Loan; payments: Payment[] }>(`/borrower/loans/${loan.id}`),
  );
  const headline = HEADLINES[loan.status];
  const Icon = headline.icon;

  const terms: [string, string][] = [
    ['Loan amount', formatRupees(loan.principal)],
    ['Tenure', formatTenure(loan.tenureDays)],
    ['Interest rate', `${loan.interestRate}% a year`],
    ['Interest', formatRupeesExact(loan.interest)],
    ['Total repayment', formatRupeesExact(loan.totalRepayment)],
    ['Applied on', formatDate(loan.appliedAt)],
  ];

  return (
    <div className="space-y-6">
      <Card className="animate-rise overflow-hidden">
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1', headline.accent)}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{headline.title}</h1>
              <LoanStatusBadge status={loan.status} />
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{headline.text(loan)}</p>
            <p className="mt-2 font-mono text-xs text-slate-400">{loan.reference}</p>
          </div>
          {onStartNew && (
            <Button onClick={onStartNew} icon={<Plus className="h-4 w-4" />} className="sm:self-center">
              New application
            </Button>
          )}
        </CardBody>
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-6">
          <LoanProgress loan={loan} />
        </div>
      </Card>

      <div className={cn('grid gap-6', hasRepayments && 'lg:grid-cols-2')}>
        {hasRepayments && (
          <Card>
            <CardHeader title="Repayment" description="Updated as soon as a payment is recorded." />
            <CardBody className="space-y-5">
              <RepaymentSummary loan={loan} />
              <div>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Payments received</h3>
                <PaymentList payments={data?.payments} emptyText="No payments have been recorded yet." />
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="Loan terms" description="Fixed when you applied." />
          <CardBody>
            <dl className={cn('grid grid-cols-2 gap-x-6 gap-y-5', !hasRepayments && 'sm:grid-cols-3')}>
              {terms.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
