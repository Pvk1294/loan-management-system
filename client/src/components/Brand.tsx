import { cn } from '@/lib/cn';

interface BrandProps {
  /** `light` for dark backgrounds, `dark` for light ones. */
  tone?: 'light' | 'dark';
  className?: string;
}

/** The product mark: three rising bars (a loan growing to closure) and the wordmark. */
export function Brand({ tone = 'dark', className }: BrandProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-sm ring-1 ring-white/10">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden="true">
          <rect x="4" y="13" width="4" height="7" rx="1.2" opacity="0.65" />
          <rect x="10" y="9" width="4" height="11" rx="1.2" opacity="0.85" />
          <rect x="16" y="4" width="4" height="16" rx="1.2" />
        </svg>
      </span>
      <span className="leading-none">
        <span className={cn('block text-[15px] font-semibold tracking-tight', tone === 'light' ? 'text-white' : 'text-slate-900')}>
          LMS
        </span>
        <span className={cn('mt-1 block text-[11px] font-medium', tone === 'light' ? 'text-white/55' : 'text-slate-500')}>
          Loan Management
        </span>
      </span>
    </span>
  );
}
