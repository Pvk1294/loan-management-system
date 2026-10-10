import { BadgeCheck, Banknote, FileCheck2, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/Brand';

const JOURNEY = [
  { icon: FileCheck2, title: 'Apply', text: 'Details, salary slip and loan amount in four short steps.' },
  { icon: ShieldCheck, title: 'Sanction', text: 'An executive reviews the application and approves or rejects it.' },
  { icon: Banknote, title: 'Disbursement', text: 'Funds are released and the repayment clock starts.' },
  { icon: BadgeCheck, title: 'Closure', text: 'Repayments are recorded until the loan closes itself.' },
];

/** Split screen for sign-in and sign-up: product story on the left, the form on the right. */
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="relative hidden w-[44%] max-w-2xl flex-col justify-between overflow-hidden bg-ink-950 p-12 text-white lg:flex">
        <div className="dot-grid absolute inset-0" aria-hidden="true" />
        <div
          className="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-brand-600/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -right-32 -bottom-48 h-[28rem] w-[28rem] rounded-full bg-brand-400/10 blur-3xl"
          aria-hidden="true"
        />

        <Brand tone="light" className="relative" />

        <div className="relative">
          <h1 className="max-w-md text-4xl leading-[1.15] font-semibold tracking-tight">
            Every loan, from application to closure, in one place.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
            Borrowers apply in minutes. Sales, Sanction, Disbursement and Collection each work their own stage, with
            access limited to exactly what their role needs.
          </p>

          <ol className="mt-10 space-y-5">
            {JOURNEY.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/15">
                    <Icon className="h-4 w-4 text-brand-300" aria-hidden="true" />
                  </span>
                  {index < JOURNEY.length - 1 && <span className="mt-1 w-px flex-1 bg-white/12" aria-hidden="true" />}
                </div>
                <div className="pb-1">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-white/55">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative text-xs text-white/40">
          12% p.a. simple interest · ₹50,000 to ₹5,00,000 · 30 to 365 days
        </p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[26rem]">
          <Brand className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
