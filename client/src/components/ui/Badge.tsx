import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { LEAD_STAGE_LABELS, LOAN_STATUS_LABELS } from '@/lib/format';
import type { LeadStage, LoanStatus } from '@/types/api';

export type Tone = 'neutral' | 'amber' | 'sky' | 'violet' | 'emerald' | 'rose' | 'brand';

const TONES: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-paper-2 text-ink-muted ring-line', dot: 'bg-ink-faint' },
  amber: { badge: 'bg-saffron-100 text-saffron-600 ring-saffron-200', dot: 'bg-saffron-500' },
  sky: { badge: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  violet: { badge: 'bg-violet-50 text-violet-800 ring-violet-200', dot: 'bg-violet-500' },
  emerald: { badge: 'bg-brand-50 text-brand-800 ring-brand-200', dot: 'bg-brand-500' },
  rose: { badge: 'bg-rose-50 text-rose-800 ring-rose-200', dot: 'bg-rose-500' },
  brand: { badge: 'bg-brand-50 text-brand-800 ring-brand-200', dot: 'bg-brand-500' },
};

interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', dot = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        TONES[tone].badge,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', TONES[tone].dot)} aria-hidden="true" />}
      {children}
    </span>
  );
}

export const LOAN_STATUS_TONES: Record<LoanStatus, Tone> = {
  APPLIED: 'amber',
  SANCTIONED: 'sky',
  DISBURSED: 'violet',
  CLOSED: 'emerald',
  REJECTED: 'rose',
};

export function LoanStatusBadge({ status, className }: { status: LoanStatus; className?: string }) {
  return (
    <Badge tone={LOAN_STATUS_TONES[status]} dot className={className}>
      {LOAN_STATUS_LABELS[status]}
    </Badge>
  );
}

const LEAD_STAGE_TONES: Record<LeadStage, Tone> = {
  REGISTERED: 'neutral',
  NOT_ELIGIBLE: 'rose',
  ELIGIBLE: 'amber',
  READY_TO_APPLY: 'emerald',
  RETURNING: 'violet',
};

export function LeadStageBadge({ stage }: { stage: LeadStage }) {
  return (
    <Badge tone={LEAD_STAGE_TONES[stage]} dot>
      {LEAD_STAGE_LABELS[stage]}
    </Badge>
  );
}
