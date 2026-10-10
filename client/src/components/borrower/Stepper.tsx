'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Step<T extends string> {
  key: T;
  label: string;
  caption: string;
}

interface StepperProps<T extends string> {
  steps: Step<T>[];
  /** The step on screen. */
  current: T;
  /** The furthest step the borrower has unlocked. Earlier steps can be revisited. */
  furthest: T;
  onSelect: (step: T) => void;
  /** Steps completed before this flow started, shown ticked and not clickable (the account). */
  leading?: { label: string; caption: string };
}

/**
 * Progress through the application. On wide screens every step is listed; on a
 * phone it collapses to "Step 2 of 4" with a progress bar.
 */
export function Stepper<T extends string>({ steps, current, furthest, onSelect, leading }: StepperProps<T>) {
  const currentIndex = steps.findIndex((step) => step.key === current);
  const furthestIndex = steps.findIndex((step) => step.key === furthest);
  const offset = leading ? 1 : 0;
  const total = steps.length + offset;
  const position = currentIndex + 1 + offset;

  return (
    <nav aria-label="Application progress">
      {/* Phone */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-slate-900">{steps[currentIndex]?.label}</p>
          <p className="text-xs text-slate-500 tabular-nums">
            Step {position} of {total}
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-500"
            style={{ width: `${(position / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Tablet and desktop */}
      <ol className="hidden items-start sm:flex">
        {leading && (
          <li className="flex flex-1 items-start">
            <StepMarker state="done" number={1} label={leading.label} caption={leading.caption} />
            <Connector filled />
          </li>
        )}
        {steps.map((step, index) => {
          // Every step before the furthest one unlocked has been completed.
          const state =
            index === currentIndex ? 'current' : index < furthestIndex ? 'done' : index === furthestIndex ? 'available' : 'upcoming';
          const reachable = index <= furthestIndex && index !== currentIndex;
          const isLast = index === steps.length - 1;
          return (
            <li key={step.key} className={cn('flex items-start', !isLast && 'flex-1')}>
              <StepMarker
                state={state}
                number={index + 1 + offset}
                label={step.label}
                caption={step.caption}
                onClick={reachable ? () => onSelect(step.key) : undefined}
              />
              {!isLast && <Connector filled={index < currentIndex} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Connector({ filled }: { filled: boolean }) {
  return (
    <span className="mx-3 mt-[18px] h-0.5 min-w-6 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
      <span className={cn('block h-full bg-brand-600 transition-all duration-500', filled ? 'w-full' : 'w-0')} />
    </span>
  );
}

interface StepMarkerProps {
  state: 'done' | 'current' | 'available' | 'upcoming';
  number: number;
  label: string;
  caption: string;
  onClick?: () => void;
}

function StepMarker({ state, number, label, caption, onClick }: StepMarkerProps) {
  const body = (
    <>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
          state === 'done' && 'bg-brand-600 text-white',
          state === 'current' && 'bg-white text-brand-700 ring-2 ring-brand-600',
          state === 'available' && 'bg-brand-50 text-brand-700 ring-1 ring-brand-300',
          state === 'upcoming' && 'bg-white text-slate-400 ring-1 ring-slate-300',
        )}
      >
        {state === 'done' ? <Check className="h-4 w-4" aria-hidden="true" /> : number}
      </span>
      <span className="text-left leading-tight">
        <span className={cn('block text-sm font-medium', state === 'upcoming' ? 'text-slate-400' : 'text-slate-900')}>{label}</span>
        <span className={cn('mt-0.5 hidden text-xs lg:block', state === 'upcoming' ? 'text-slate-400' : 'text-slate-500')}>{caption}</span>
      </span>
    </>
  );

  if (!onClick) {
    return (
      <span className="flex items-center gap-3" aria-current={state === 'current' ? 'step' : undefined}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="-m-1 flex cursor-pointer items-center gap-3 rounded-lg p-1 transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-brand-600"
    >
      {body}
    </button>
  );
}
