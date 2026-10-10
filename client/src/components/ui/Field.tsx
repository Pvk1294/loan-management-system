import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FieldMessages {
  label: string;
  hint?: ReactNode;
  /** Blocks submission: the value is missing or malformed. */
  error?: string;
  optional?: boolean;
}

const controlClasses = (invalid: boolean) =>
  cn(
    'block w-full rounded-xl border bg-white text-[15px] text-ink shadow-sm transition-[border-color,box-shadow] duration-200',
    'placeholder:text-ink-faint focus:outline-none focus:ring-4',
    'disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-muted',
    invalid
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15'
      : 'border-line-strong hover:border-ink-faint focus:border-brand-600 focus:ring-brand-600/15',
  );

function FieldShell({ id, label, hint, error, optional, children }: FieldMessages & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-ink-faint">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-message`} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-rose-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className="mt-1.5 text-[13px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputFieldProps = FieldMessages &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & { prefix?: ReactNode; suffix?: ReactNode };

export function InputField({ label, hint, error, optional, prefix, suffix, className, id, ...props }: InputFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[15px] text-ink-muted">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${inputId}-message` : undefined}
          className={cn(controlClasses(Boolean(error)), 'h-12 px-4', Boolean(prefix) && 'pl-9', Boolean(suffix) && 'pr-11', className)}
          {...props}
        />
        {suffix && <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-faint">{suffix}</span>}
      </div>
    </FieldShell>
  );
}

type TextareaFieldProps = FieldMessages & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaField({ label, hint, error, optional, className, id, ...props }: TextareaFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${inputId}-message` : undefined}
        className={cn(controlClasses(Boolean(error)), 'min-h-28 resize-y px-4 py-3', className)}
        {...props}
      />
    </FieldShell>
  );
}

type SelectFieldProps = FieldMessages & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, hint, error, optional, className, id, children, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} optional={optional}>
      <select
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(controlClasses(Boolean(error)), 'h-12 px-3', className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
