'use client';

import { type CSSProperties, useState } from 'react';
import { Check, ServerCrash } from 'lucide-react';
import { useUser } from '@/components/auth/SessionGate';
import { LoanStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Spinner';
import { useApiQuery } from '@/hooks/useApiQuery';
import { api } from '@/lib/api';
import { formatDate, formatRupees } from '@/lib/format';
import type { ApplicationOverview, ApplicationStep, Loan } from '@/types/api';
import { LoanConfigStep } from './LoanConfigStep';
import { LoanTracker } from './LoanTracker';
import { PersonalDetailsStep } from './PersonalDetailsStep';
import { SalarySlipStep } from './SalarySlipStep';
import { type Step, Stepper } from './Stepper';

type WizardStep = Exclude<ApplicationStep, 'TRACKING'>;

const STEPS: Step<WizardStep>[] = [
  { key: 'PERSONAL_DETAILS', label: 'About you' },
  { key: 'SALARY_SLIP', label: 'Salary slip' },
  { key: 'LOAN_CONFIG', label: 'Your loan' },
];

const ORDER: WizardStep[] = STEPS.map((step) => step.key);

/**
 * The borrower's home. The server says how far the application has got
 * (`nextStep`); this shows that step, lets earlier ones be revisited, and
 * switches to tracking once a loan exists.
 */
export function ApplicationPortal() {
  const user = useUser();
  const { data, error, isLoading, reload } = useApiQuery(user ? 'borrower-application' : null, () =>
    api<ApplicationOverview>('/borrower/application'),
  );
  const [selectedStep, setSelectedStep] = useState<WizardStep | null>(null);
  const [startingNew, setStartingNew] = useState(false);
  /** Shown for a moment right after applying, before the tracker takes over. */
  const [justApplied, setJustApplied] = useState<Loan | null>(null);

  if (error && !data) {
    return (
      <Card>
        <EmptyState icon={ServerCrash} tone="error" title="We could not load your application" description={error.message} action={<Button onClick={reload}>Try again</Button>} />
      </Card>
    );
  }
  if (!user || isLoading || !data) return <PortalSkeleton />;

  if (justApplied) {
    return <AppliedMoment loan={justApplied} onContinue={() => setJustApplied(null)} />;
  }

  /** Opens a new application, and lets Sales know this past borrower is back. */
  const startAgain = () => {
    setStartingNew(true);
    void api('/borrower/reapply-intent', { method: 'POST' }).catch(() => undefined);
  };

  const firstName = user.name.split(' ')[0];
  const latestLoan = data.loans[0];
  const trackedLoan = data.activeLoan ?? (latestLoan && !startingNew ? latestLoan : null);

  if (trackedLoan) {
    const pastLoans = data.loans.filter((loan) => loan.id !== trackedLoan.id);
    return (
      <div className="space-y-6">
        <LoanTracker loan={trackedLoan} onStartNew={data.activeLoan ? undefined : startAgain} />
        {pastLoans.length > 0 && (
          <Card className="reveal" style={{ '--i': 3 } as CSSProperties}>
            <CardHeader title="Earlier loans" />
            <CardBody className="pt-3">
              <ul className="divide-y divide-line">
                {pastLoans.map((loan) => (
                  <li key={loan.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="amount text-base text-ink">{formatRupees(loan.principal)}</p>
                      <p className="text-[13px] text-ink-muted">
                        <span className="font-mono">{loan.reference}</span> · applied {formatDate(loan.appliedAt)}
                      </p>
                    </div>
                    <LoanStatusBadge status={loan.status} />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  const furthest = data.nextStep as WizardStep;
  const step = ORDER[Math.min(ORDER.indexOf(selectedStep ?? furthest), ORDER.indexOf(furthest))];

  const advance = (to: WizardStep | null) => {
    setSelectedStep(to);
    reload();
  };

  return (
    <div className="space-y-8">
      <header className="reveal">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">
          {latestLoan ? 'New application' : `Hello, ${firstName}`}
        </p>
        <h1 className="display mt-2 text-[34px] leading-tight text-ink sm:text-[40px]">
          {latestLoan ? 'Let’s set up your next loan.' : 'Let’s get you a loan.'}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-ink-muted">
          {formatRupees(data.rules.loan.MIN_AMOUNT)} to {formatRupees(data.rules.loan.MAX_AMOUNT)}, for {data.rules.loan.MIN_TENURE_DAYS} to{' '}
          {data.rules.loan.MAX_TENURE_DAYS} days, at {data.rules.loan.ANNUAL_INTEREST_RATE}% a year. Three short steps.
        </p>
      </header>

      <div className="reveal" style={{ '--i': 1 } as CSSProperties}>
        <Stepper steps={STEPS} current={step} furthest={furthest} onSelect={setSelectedStep} />
      </div>

      <div key={step}>
        {step === 'PERSONAL_DETAILS' && (
          <PersonalDetailsStep profile={data.profile} defaultName={user.name} onEligible={() => advance('SALARY_SLIP')} />
        )}
        {step === 'SALARY_SLIP' && (
          <SalarySlipStep
            salarySlip={data.profile?.salarySlip ?? null}
            maxSizeBytes={data.rules.salarySlip.maxSizeBytes}
            allowedMimeTypes={data.rules.salarySlip.allowedMimeTypes}
            onUploaded={() => advance('SALARY_SLIP')}
            onContinue={() => setSelectedStep('LOAN_CONFIG')}
            onBack={() => setSelectedStep('PERSONAL_DETAILS')}
          />
        )}
        {step === 'LOAN_CONFIG' && (
          <LoanConfigStep
            rules={data.rules.loan}
            onApplied={(loan) => {
              setStartingNew(false);
              setJustApplied(loan);
              advance(null);
            }}
            onBack={() => setSelectedStep('SALARY_SLIP')}
          />
        )}
      </div>
    </div>
  );
}

/** The moment after "Apply": a pause to say it worked, before the tracker. */
function AppliedMoment({ loan, onContinue }: { loan: Loan; onContinue: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
      <span className="animate-check flex h-20 w-20 items-center justify-center rounded-full bg-ink text-saffron-300 shadow-raised">
        <Check className="h-9 w-9" aria-hidden="true" strokeWidth={2.5} />
      </span>
      <p className="reveal mt-8 text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase" style={{ '--i': 2 } as CSSProperties}>
        Application sent
      </p>
      <h1 className="display reveal mt-2 text-[34px] leading-tight text-ink" style={{ '--i': 3 } as CSSProperties}>
        {formatRupees(loan.principal)} requested
      </h1>
      <p className="reveal mt-3 text-[15px] text-ink-muted" style={{ '--i': 4 } as CSSProperties}>
        Your reference is <span className="font-mono text-ink">{loan.reference}</span>. Our team will review it, usually within a day, and
        you can follow every step here.
      </p>
      <Button variant="ink" size="lg" onClick={onContinue} className="reveal mt-8" style={{ '--i': 5 } as CSSProperties}>
        Track my application
      </Button>
    </div>
  );
}

function PortalSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your application">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full rounded-[20px]" />
    </div>
  );
}
