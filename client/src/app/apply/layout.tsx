import type { Metadata } from 'next';
import { SessionGate } from '@/components/auth/SessionGate';
import { BorrowerHeader } from '@/components/borrower/BorrowerHeader';

export const metadata: Metadata = { title: 'My loan' };

export default function BorrowerLayout({ children }: LayoutProps<'/apply'>) {
  return (
    <SessionGate audience="borrower">
      <BorrowerHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
        12% p.a. simple interest · No hidden charges · Demo application
      </footer>
    </SessionGate>
  );
}
