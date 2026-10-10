'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Step<T extends string> {
  key: T;
  label: string;
}

interface StepperProps<T extends string> {
  steps: Step<T>[];
  current: T;
  /** The furthest step unlocked; earlier steps can be revisited. */
  furthest: T;
  onSelect: (step: T) => void;
}

/** Three segments that fill as the application progresses. */
export function Stepper<T extends string>({ steps, current, furthest, onSelect }: StepperProps<T>) {
  const currentIndex = steps.findIndex((step) => step.key === current);
  const furthestIndex = steps.findIndex((step) => step.key === furthest);

  return (
    <nav aria-label="Application progress">
      <ol className="grid gap-3" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const done = index < furthestIndex || (index < currentIndex && index <= furthestIndex);
          const isCurrent = index === currentIndex;
          const reachable = index <= furthestIndex && !isCurrent;
          return (
            <li key={step.key}>
              <button
                type="button"
                onClick={reachable ? () => onSelect(step.key) : undefined}
                disabled={!reachable}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'group w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600',
                  reachable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span className="block h-1.5 overflow-hidden rounded-full bg-paper-3">
                  <span
                    className={cn(
                      'block h-full origin-left rounded-full bg-ink transition-transform duration-700 ease-out',
                      done || isCurrent ? 'scale-x-100' : 'scale-x-0',
                      isCurrent && 'bg-saffron-500',
                    )}
                  />
                </span>
                <span className="mt-2.5 flex items-center gap-1.5 text-[13px]">
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                      done ? 'bg-ink text-paper' : isCurrent ? 'bg-saffron-400 text-ink' : 'bg-paper-3 text-ink-faint',
                    )}
                  >
                    {done ? <Check className="h-3 w-3" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className={cn('truncate font-medium', isCurrent ? 'text-ink' : done ? 'text-ink-muted group-hover:text-ink' : 'text-ink-faint')}>
                    {step.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
