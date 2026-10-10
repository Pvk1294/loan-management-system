import { cn } from '@/lib/cn';

interface BrandProps {
  tone?: 'light' | 'dark';
  /** Internal tools show the console name under the wordmark. */
  subtitle?: string;
  className?: string;
}

/** The mark: a coin with a rising ledger line. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-9 w-9 items-center justify-center rounded-full bg-saffron-400 text-ink', className)}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 16.5 10 11l3.5 3.5L19 8" />
        <path d="M14.5 8H19v4.5" />
      </svg>
    </span>
  );
}

export function Brand({ tone = 'dark', subtitle, className }: BrandProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandMark />
      <span className="leading-none">
        <span className={cn('display block text-[20px]', tone === 'light' ? 'text-paper' : 'text-ink')}>Credo</span>
        {subtitle && (
          <span className={cn('mt-1 block text-[11px] font-medium tracking-wide uppercase', tone === 'light' ? 'text-paper/50' : 'text-ink-faint')}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
