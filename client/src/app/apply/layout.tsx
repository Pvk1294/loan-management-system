import type { Metadata } from 'next';
import { SessionGate } from '@/components/auth/SessionGate';
import { BorrowerHeader } from '@/components/borrower/BorrowerHeader';

export const metadata: Metadata = { title: 'Your loan' };

export default function BorrowerLayout({ children }: LayoutProps<'/apply'>) {
  return (
    <SessionGate audience="borrower">
      <BorrowerHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12">{children}</main>
      <footer className="py-6 text-center text-xs text-ink-faint">Credo · a demonstration lending product</footer>
    </SessionGate>
  );
}
