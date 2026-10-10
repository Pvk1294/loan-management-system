'use client';

import type { CSSProperties, ReactNode } from 'react';
import { BadgeCheck, Banknote, CircleCheckBig, Hourglass, type LucideIcon, Plus, XCircle } from 'lucide-react';
import { LoanProgress } from '@/components/loan/LoanProgress';
import { PaymentList } from '@/components/loan/PaymentList';
import { RepaymentSummary } from '@/components/loan/RepaymentSummary';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useApiQuery } from '@/hooks/useApiQuery';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatRupees, formatRupeesExact, formatTenure } from '@/lib/format';
import type { Loan, LoanStatus, Payment } from '@/types/api';

interface LoanTrackerProps {
  loan: Loan;
  onStartNew?: () => void;
}

const HEADLINES: Record<LoanStatus, { icon: LucideIcon; eyebrow: string; title: string; text: (loan: Loan) => ReactNode }> = {
  APPLIED: {
    icon: Hourglass,
    eyebrow: 'Application received',
    title: 'We are looking at it',
    text: () => 'Our team reviews every application by hand, usually within a day. You will see the decision here.',
  },
  SANCTIONED: {
    icon: BadgeCheck,
    eyebrow: 'Approved',
    title: 'Your loan is approved',
    text: (loan) => `${formatRupees(loan.principal)} is on its way. We are arranging the transfer to your account.`,
  },
  DISBURSED: {
    icon: Banknote,
    eyebrow: 'Active',
    title: 'The money is with you',
    text: (loan) => (
      <>
        {formatRupees(loan.principal)} was sent on {formatDate(loan.disbursedAt)}. Repay{' '}
        <strong className="amount text-lg text-saffron-300">{formatRupeesExact(loan.outstanding)}</strong> by {formatDate(loan.dueDate)}.
      </>
    ),
  },
  CLOSED: {
    icon: CircleCheckBig,
    eyebrow: 'Repaid in full',
    title: 'All done. Thank you.',
    text: (loan) => `You repaid this loan on ${formatDate(loan.closedAt)}. Nothing more to pay.`,
  },
  REJECTED: {
    icon: XCircle,
    eyebrow: 'Not approved',
    title: "We couldn't approve this one",
    text: (loan) => (
      <>
        The reason given: <span className="text-paper">{loan.rejectionReason}</span>
      </>
    ),
  },
};

export function LoanTracker({ loan, onStartNew }: LoanTrackerProps) {
  const hasRepayments = loan.status === 'DISBURSED' || loan.status === 'CLOSED';
  const { data } = useApiQuery(hasRepayments ? `borrower-loan:${loan.id}:${loan.amountPaid}` : null, () =>
    api<{ loan: Loan; payments: Payment[] }>(`/borrower/loans/${loan.id}`),
  );
  const headline = HEADLINES[loan.status];
  const Icon = headline.icon;
  const refused = loan.status === 'REJECTED';

  const terms: [string, string][] = [
    ['Borrowed', formatRupees(loan.principal)],
    ['For', formatTenure(loan.tenureDays)],
    ['Interest', `${formatRupeesExact(loan.interest)} at ${loan.interestRate}% a year`],
    ['To repay', formatRupeesExact(loan.totalRepayment)],
    ['Applied', formatDate(loan.appliedAt)],
    ['Reference', loan.reference],
  ];

  return (
    <div className="space-y-6">
      <section className={cn('reveal relative overflow-hidden rounded-[22px] text-paper shadow-raised', refused ? 'bg-ink-2' : 'bg-ink')}>
        <div className="ruled-light absolute inset-0" aria-hidden="true" />
        <div className={cn('absolute -top-28 -right-20 h-72 w-72 rounded-full blur-3xl', refused ? 'bg-rose-500/25' : 'bg-brand-600/40')} aria-hidden="true" />
        <div className="relative flex flex-col gap-6 p-7 sm:flex-row sm:items-start sm:p-9">
          <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', refused ? 'bg-rose-500/20 text-rose-200' : 'bg-saffron-400 text-ink')}>
            <Icon className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-paper/50 uppercase">{headline.eyebrow}</p>
            <h1 className="display mt-2 text-[32px] leading-tight">{headline.title}</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-paper/65">{headline.text(loan)}</p>
          </div>
          {onStartNew && (
            <Button variant="accent" onClick={onStartNew} icon={<Plus className="h-4 w-4" />} className="sm:self-center">
              Apply again
            </Button>
          )}
        </div>
        <div className="relative border-t border-white/10 bg-paper px-7 py-6 text-ink sm:px-9">
          <LoanProgress loan={loan} />
        </div>
      </section>

      <div className={cn('grid gap-6', hasRepayments && 'lg:grid-cols-2')}>
        {hasRepayments && (
          <Card className="reveal" style={{ '--i': 1 } as CSSProperties}>
            <CardHeader title="Repayment" description="Updates the moment a payment is recorded." />
            <CardBody className="space-y-6">
              <RepaymentSummary loan={loan} />
              <div>
                <h3 className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">Payments received</h3>
                <PaymentList payments={data?.payments} emptyText="No payments yet." />
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="reveal" style={{ '--i': 2 } as CSSProperties}>
          <CardHeader title="The terms" description="Fixed when you applied." />
          <CardBody>
            <dl className={cn('grid grid-cols-2 gap-x-6 gap-y-5', !hasRepayments && 'sm:grid-cols-3')}>
              {terms.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className={cn('mt-1 text-sm font-medium text-ink', label === 'Reference' && 'font-mono text-xs')}>{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
