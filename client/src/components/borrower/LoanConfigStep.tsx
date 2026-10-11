'use client';

import { type CSSProperties, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { RangeField } from '@/components/ui/RangeField';
import { useCountUp } from '@/hooks/useMotion';
import { api, errorMessage } from '@/lib/api';
import { formatRupees, formatRupeesExact, formatRupeesShort } from '@/lib/format';
import { buildLoanQuote } from '@/lib/loan-math';
import type { Loan, LoanRules } from '@/types/api';

interface LoanConfigStepProps {
  rules: LoanRules;
  onApplied: (loan: Loan) => void;
  onBack: () => void;
}

const AMOUNT_STEP = 1000;
const AMOUNT_PRESETS = [50_000, 100_000, 200_000, 300_000, 500_000];
const TENURE_PRESETS = [30, 60, 90, 180, 365];

const within = (values: number[], min: number, max: number) => values.filter((value) => value >= min && value <= max);

/**
 * Step 3: choose the amount and tenure. The offer card recalculates as the
 * sliders move; the server works the figures out again when the loan is
 * created, and its result is the one stored.
 */
export function LoanConfigStep({ rules, onApplied, onBack }: LoanConfigStepProps) {
  const [amount, setAmount] = useState(Math.min(rules.MAX_AMOUNT, Math.max(rules.MIN_AMOUNT, 100_000)));
  const [tenureDays, setTenureDays] = useState(Math.min(rules.MAX_TENURE_DAYS, Math.max(rules.MIN_TENURE_DAYS, 90)));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const quote = buildLoanQuote(amount, tenureDays, rules.ANNUAL_INTEREST_RATE);
  const total = useCountUp(quote.totalRepayment, 420);
  const interest = useCountUp(quote.interest, 420);
  const perDay = useCountUp(quote.interest / tenureDays, 420);
  const interestShare = (quote.interest / quote.totalRepayment) * 100;

  const apply = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const { loan } = await api<{ loan: Loan }>('/borrower/loans', { method: 'POST', body: { amount, tenureDays } });
      onApplied(loan);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_23rem]">
      {/* On a phone the offer card is below the sliders, so the total stays pinned up top. */}
      <div
        className="sticky top-16 z-10 -mx-5 -mt-2 flex items-center justify-between gap-4 border-b border-line/70 bg-paper/85 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8 lg:hidden"
        aria-hidden="true"
      >
        <span className="text-[13px] text-ink-muted">
          You repay
          <span className="block text-[11px] text-ink-faint">incl. {formatRupeesExact(interest)} interest</span>
        </span>
        <span className="amount text-2xl text-ink">{formatRupeesExact(total)}</span>
      </div>

      <Card className="reveal">
        <CardHeader title="Choose your loan" description="Slide, tap a preset, or type an exact figure." />
        <CardBody className="space-y-10">
          <RangeField
            label="How much"
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
            label="For how long"
            value={tenureDays}
            min={rules.MIN_TENURE_DAYS}
            max={rules.MAX_TENURE_DAYS}
            step={1}
            onChange={setTenureDays}
            suffix="days"
            formatBound={(days) => `${days} days`}
            presets={within(TENURE_PRESETS, rules.MIN_TENURE_DAYS, rules.MAX_TENURE_DAYS)}
          />
          <div className="border-t border-line pt-6">
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack} disabled={submitting}>
              Back
            </Button>
          </div>
        </CardBody>
      </Card>

      <aside className="reveal" style={{ '--i': 1 } as CSSProperties}>
        {/* A light card on purpose: every figure and every line of small print is dark text on a pale surface. */}
        <div className="overflow-hidden rounded-[22px] border border-line bg-white shadow-raised lg:sticky lg:top-24">
          <div className="border-b border-saffron-200 bg-saffron-100/60 px-7 py-6" aria-live="polite">
            <p className="text-[13px] font-semibold tracking-[0.1em] text-ink-muted uppercase">You repay</p>
            <p className="amount mt-1.5 text-[42px] leading-none text-ink">{formatRupeesExact(total)}</p>
            <p className="mt-2.5 text-[15px] text-ink-2">in one payment, {tenureDays} days after the money reaches you</p>
          </div>

          <div className="px-7 py-6">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-paper-3" aria-hidden="true">
              <div className="h-full bg-brand-600 transition-[width] duration-300" style={{ width: `${100 - interestShare}%` }} />
              <div className="h-full bg-saffron-500 transition-[width] duration-300" style={{ width: `${Math.max(interestShare, 1.5)}%` }} />
            </div>

            <dl className="mt-5 space-y-3.5 text-base">
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2.5 text-ink-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-600" aria-hidden="true" />
                  You borrow
                </dt>
                <dd className="amount text-xl text-ink">{formatRupees(amount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2.5 text-ink-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-saffron-500" aria-hidden="true" />
                  Interest, {rules.ANNUAL_INTEREST_RATE}% a year
                </dt>
                <dd className="amount text-xl text-ink">{formatRupeesExact(interest)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-line pt-3.5">
                <dt className="text-ink-2">That is, per day</dt>
                <dd className="amount text-xl text-ink">{formatRupeesExact(perDay)}</dd>
              </div>
            </dl>

            <p className="mt-5 rounded-xl bg-paper px-4 py-3 text-sm leading-relaxed text-ink-2">
              Simple interest, charged only for the days you borrow. No processing fee, no other charges.
            </p>
          </div>

          <div className="border-t border-line bg-paper/60 px-7 py-6">
            {error && (
              <Alert tone="error" className="mb-4">
                {error}
              </Alert>
            )}
            <Button variant="ink" size="lg" fullWidth loading={submitting} onClick={apply}>
              Apply for {formatRupees(amount)}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="mt-3 text-center text-sm text-ink-2">We review every application by hand. Usually within a day.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
