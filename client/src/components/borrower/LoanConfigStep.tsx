'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { RangeField } from '@/components/ui/RangeField';
import { useToast } from '@/components/ui/Toast';
import { api, errorMessage } from '@/lib/api';
import { formatNumber, formatRupees, formatRupeesExact, formatRupeesShort } from '@/lib/format';
import { buildLoanQuote } from '@/lib/loan-math';
import type { Loan, LoanRules } from '@/types/api';

interface LoanConfigStepProps {
  rules: LoanRules;
  onApplied: () => void;
  onBack: () => void;
}

const AMOUNT_STEP = 1000;
const AMOUNT_PRESETS = [50_000, 100_000, 200_000, 300_000, 500_000];
const TENURE_PRESETS = [30, 60, 90, 180, 365];

const within = (values: number[], min: number, max: number) => values.filter((value) => value >= min && value <= max);

/**
 * Step 4: choose the amount and tenure. The panel on the right recalculates on
 * every slider movement. It is a preview: the server calculates the interest
 * again when the loan is created, and that is the figure that is stored.
 */
export function LoanConfigStep({ rules, onApplied, onBack }: LoanConfigStepProps) {
  const toast = useToast();
  const [amount, setAmount] = useState(Math.min(rules.MAX_AMOUNT, Math.max(rules.MIN_AMOUNT, 100_000)));
  const [tenureDays, setTenureDays] = useState(Math.min(rules.MAX_TENURE_DAYS, Math.max(rules.MIN_TENURE_DAYS, 90)));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const quote = buildLoanQuote(amount, tenureDays, rules.ANNUAL_INTEREST_RATE);
  const interestShare = (quote.interest / quote.totalRepayment) * 100;

  const apply = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { loan } = await api<{ loan: Loan }>('/borrower/loans', { method: 'POST', body: { amount, tenureDays } });
      toast.success(`Application ${loan.reference} submitted.`);
      onApplied();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      {/* On a phone the full panel sits below the sliders, so the total stays pinned in view. */}
      <div
        className="sticky top-16 z-10 -mx-4 -mt-2 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden"
        aria-hidden="true"
      >
        <span className="text-xs text-slate-500">
          Total repayment
          <span className="block text-[11px] text-slate-400">incl. {formatRupeesExact(quote.interest)} interest</span>
        </span>
        <span className="text-lg font-semibold tracking-tight text-slate-900 tabular-nums">{formatRupeesExact(quote.totalRepayment)}</span>
      </div>

      <Card>
        <CardHeader title="Configure your loan" description="Move the sliders or type an exact figure." />
        <CardBody className="space-y-9">
          <RangeField
            label="Loan amount"
            value={amount}
            min={rules.MIN_AMOUNT}
            max={rules.MAX_AMOUNT}
            step={AMOUNT_STEP}
            onChange={setAmount}
            prefix="₹"
            formatBound={formatRupeesShort}
            presets={within(AMOUNT_PRESETS, rules.MIN_AMOUNT, rules.MAX_AMOUNT)}
          />
          <RangeField
            label="Tenure"
            value={tenureDays}
            min={rules.MIN_TENURE_DAYS}
            max={rules.MAX_TENURE_DAYS}
            step={1}
            onChange={setTenureDays}
            suffix="days"
            formatBound={(days) => `${days} days`}
            presets={within(TENURE_PRESETS, rules.MIN_TENURE_DAYS, rules.MAX_TENURE_DAYS)}
          />

          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
            <p>
              The interest rate is fixed at <strong className="font-semibold text-slate-900">{rules.ANNUAL_INTEREST_RATE}% a year</strong>,
              charged as simple interest for the days you borrow. There are no other fees.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack} disabled={submitting}>
              Back to salary slip
            </Button>
          </div>
        </CardBody>
      </Card>

      <aside>
        <div className="overflow-hidden rounded-2xl bg-ink-950 text-white shadow-raised lg:sticky lg:top-24">
          <div className="relative p-6">
            <div className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative" aria-live="polite">
              <p className="text-xs font-medium tracking-wide text-white/55 uppercase">Total repayment</p>
              <p className="mt-1.5 text-[2rem] leading-none font-semibold tracking-tight tabular-nums">
                {formatRupeesExact(quote.totalRepayment)}
              </p>
              <p className="mt-2 text-sm text-white/55">
                due {tenureDays} days after the money reaches you
              </p>

              {/* How the total splits between what was borrowed and what it costs. */}
              <div className="mt-6 flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div className="h-full bg-brand-400 transition-all duration-300" style={{ width: `${100 - interestShare}%` }} />
                <div className="h-full bg-amber-300 transition-all duration-300" style={{ width: `${Math.max(interestShare, 1.5)}%` }} />
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-white/65">
                    <span className="h-2 w-2 rounded-full bg-brand-400" aria-hidden="true" />
                    Loan amount
                  </dt>
                  <dd className="font-medium tabular-nums">{formatRupeesExact(quote.principal)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="flex items-center gap-2 text-white/65">
                    <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden="true" />
                    Interest ({quote.interestRate}% p.a.)
                  </dt>
                  <dd className="font-medium tabular-nums">{formatRupeesExact(quote.interest)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3">
                  <dt className="text-white/65">Cost per day</dt>
                  <dd className="font-medium tabular-nums">{formatRupeesExact(quote.interest / tenureDays)}</dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl bg-white/6 p-3.5 ring-1 ring-white/10">
                <p className="text-[11px] font-medium tracking-wide text-white/45 uppercase">How interest is worked out</p>
                <p className="mt-1.5 font-mono text-xs leading-relaxed text-white/75">
                  P × R × T ÷ (365 × 100)
                  <br />
                  {formatNumber(amount)} × {quote.interestRate} × {tenureDays} ÷ 36,500
                  <br />= {formatRupeesExact(quote.interest)}
                </p>
              </div>
            </div>
          </div>

          <div className="relative border-t border-white/10 bg-white/4 p-6">
            {error && (
              <Alert tone="error" className="mb-4">
                {error}
              </Alert>
            )}
            <Button variant="accent" size="lg" fullWidth loading={submitting} onClick={apply}>
              Apply for {formatRupees(amount)}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="mt-3 text-center text-xs text-white/45">Your application goes to our team for review.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
