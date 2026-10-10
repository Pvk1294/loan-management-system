import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'ink' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-raised active:translate-y-0 focus-visible:outline-brand-600',
  /** The main action on a light surface when it should feel weighty. */
  ink: 'bg-ink text-paper shadow-sm hover:bg-ink-2 hover:shadow-raised focus-visible:outline-ink',
  /** The main action on a dark surface. */
  accent: 'bg-saffron-400 text-ink shadow-sm hover:bg-saffron-300 hover:shadow-glow focus-visible:outline-saffron-300',
  secondary: 'border border-line-strong bg-white text-ink shadow-sm hover:border-ink-faint hover:bg-paper focus-visible:outline-brand-600',
  ghost: 'text-ink-muted hover:bg-paper-2 hover:text-ink focus-visible:outline-brand-600',
  subtle: 'bg-brand-50 text-brand-800 hover:bg-brand-100 focus-visible:outline-brand-600',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:outline-rose-600',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-[13px]',
  md: 'h-11 gap-2 rounded-xl px-4.5 text-sm',
  lg: 'h-13 gap-2 rounded-xl px-6 text-[15px]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center font-medium whitespace-nowrap',
        'transition-[background-color,box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-px',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}
