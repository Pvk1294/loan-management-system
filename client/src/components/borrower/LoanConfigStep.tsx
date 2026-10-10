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
        <span className="text-xs text-ink-muted">
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
        <div className="relative overflow-hidden rounded-[22px] bg-ink text-paper shadow-raised lg:sticky lg:top-24">
          <div className="ruled-light absolute inset-0" aria-hidden="true" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-600/40 blur-3xl" aria-hidden="true" />

          <div className="relative p-7" aria-live="polite">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-paper/50 uppercase">You repay</p>
            <p className="amount mt-2 text-[42px] leading-none text-saffron-300">{formatRupeesExact(total)}</p>
            <p className="mt-2.5 text-sm text-paper/55">in one payment, {tenureDays} days after the money reaches you</p>

            <div className="mt-7 flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              <div className="h-full bg-paper/80 transition-[width] duration-300" style={{ width: `${100 - interestShare}%` }} />
              <div className="h-full bg-saffron-400 transition-[width] duration-300" style={{ width: `${Math.max(interestShare, 1.5)}%` }} />
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-paper/60">
                  <span className="h-2 w-2 rounded-full bg-paper/80" aria-hidden="true" />
                  You borrow
                </dt>
                <dd className="amount text-lg">{formatRupees(amount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="flex items-center gap-2 text-paper/60">
                  <span className="h-2 w-2 rounded-full bg-saffron-400" aria-hidden="true" />
                  Interest, {rules.ANNUAL_INTEREST_RATE}% a year
                </dt>
                <dd className="amount text-lg">{formatRupeesExact(interest)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3">
                <dt className="text-paper/60">That is, per day</dt>
                <dd className="amount text-lg">{formatRupeesExact(perDay)}</dd>
              </div>
            </dl>

            <p className="mt-5 text-xs leading-relaxed text-paper/45">
              Simple interest, charged only for the days you borrow. No processing fee, no other charges.
            </p>
          </div>

          <div className="relative border-t border-white/10 bg-white/[0.04] p-7">
            {error && (
              <Alert tone="error" className="mb-4">
                {error}
              </Alert>
            )}
            <Button variant="accent" size="lg" fullWidth loading={submitting} onClick={apply}>
              Apply for {formatRupees(amount)}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="mt-3 text-center text-xs text-paper/45">We review every application by hand. Usually within a day.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
