import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FieldMessages {
  label: string;
  /** Neutral help text shown under the control. */
  hint?: ReactNode;
  /** Blocks submission: the value is missing or malformed. */
  error?: string;
  /** Does not block submission: the value is valid but may be turned down. */
  warning?: string;
  optional?: boolean;
}

const controlClasses = (state: 'default' | 'error' | 'warning') =>
  cn(
    'block w-full rounded-lg border bg-white text-sm text-slate-900 shadow-sm transition-colors',
    'placeholder:text-slate-400 focus:outline-none focus:ring-4',
    'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
    state === 'error' && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15',
    state === 'warning' && 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/15',
    state === 'default' && 'border-slate-300 hover:border-slate-400 focus:border-brand-600 focus:ring-brand-600/15',
  );

function FieldShell({
  id,
  label,
  hint,
  error,
  warning,
  optional,
  children,
}: FieldMessages & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-slate-400">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-message`} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-rose-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : warning ? (
        <p id={`${id}-message`} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-amber-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {warning}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className="mt-1.5 text-[13px] text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const stateOf = ({ error, warning }: Pick<FieldMessages, 'error' | 'warning'>) =>
  error ? 'error' : warning ? 'warning' : 'default';

type InputFieldProps = FieldMessages &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> & {
    /** Short text shown inside the input on the left, such as a currency symbol. */
    prefix?: ReactNode;
    suffix?: ReactNode;
  };

export function InputField({ label, hint, error, warning, optional, prefix, suffix, className, id, ...props }: InputFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasMessage = Boolean(error || warning || hint);

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} warning={warning} optional={optional}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-slate-500">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hasMessage ? `${inputId}-message` : undefined}
          className={cn(controlClasses(stateOf({ error, warning })), 'h-11 px-3.5', Boolean(prefix) && 'pl-8', Boolean(suffix) && 'pr-10', className)}
          {...props}
        />
        {suffix && <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">{suffix}</span>}
      </div>
    </FieldShell>
  );
}

type TextareaFieldProps = FieldMessages & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaField({ label, hint, error, warning, optional, className, id, ...props }: TextareaFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} warning={warning} optional={optional}>
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || warning || hint ? `${inputId}-message` : undefined}
        className={cn(controlClasses(stateOf({ error, warning })), 'min-h-24 resize-y px-3.5 py-2.5', className)}
        {...props}
      />
    </FieldShell>
  );
}

type SelectFieldProps = FieldMessages & SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ label, hint, error, warning, optional, className, id, children, ...props }: SelectFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} warning={warning} optional={optional}>
      <select
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(controlClasses(stateOf({ error, warning })), 'h-11 px-3', className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
