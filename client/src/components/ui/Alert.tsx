import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'error';

const STYLES: Record<Tone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: 'border-sky-200 bg-sky-50 text-sky-900', icon: 'text-sky-600', Icon: Info },
  success: { box: 'border-brand-200 bg-brand-50 text-brand-900', icon: 'text-brand-600', Icon: CheckCircle2 },
  warning: { box: 'border-saffron-200 bg-saffron-100 text-saffron-600', icon: 'text-saffron-500', Icon: AlertTriangle },
  error: { box: 'border-rose-200 bg-rose-50 text-rose-900', icon: 'text-rose-600', Icon: XCircle },
};

interface AlertProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const { box, icon, Icon } = STYLES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-2xl border p-4 text-sm animate-pop', box, className)}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', icon)} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}
