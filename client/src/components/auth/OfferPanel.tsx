'use client';

import { type CSSProperties, useEffect, useState } from 'react';
import { Brand } from '@/components/Brand';
import { useCountUp } from '@/hooks/useMotion';
import { formatRupees, formatRupeesExact } from '@/lib/format';
import { buildLoanQuote } from '@/lib/loan-math';

/** Example loans the card cycles through, so visitors see real figures before they sign up. */
const EXAMPLES = [
  { principal: 100_000, tenureDays: 90 },
  { principal: 250_000, tenureDays: 180 },
  { principal: 50_000, tenureDays: 30 },
  { principal: 500_000, tenureDays: 365 },
];

const PROMISES = [
  { figure: '₹5L', text: 'Borrow ₹50,000 to ₹5,00,000' },
  { figure: '12%', text: 'A year, simple interest, no other fees' },
  { figure: '4', text: 'Short steps from sign-up to applied' },
];

/**
 * The left half of the sign-in screen: what the product offers, with a
 * floating card that quietly works through example loans.
 */
export function OfferPanel() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % EXAMPLES.length), 4200);
    return () => window.clearInterval(timer);
  }, []);

  const example = EXAMPLES[index];
  const quote = buildLoanQuote(example.principal, example.tenureDays, 12);
  const principal = useCountUp(quote.principal, 900);
  const total = useCountUp(quote.totalRepayment, 1100);
  const interest = useCountUp(quote.interest, 1100);
  const days = useCountUp(quote.tenureDays, 900);

  return (
    <aside className="relative hidden w-[46%] max-w-3xl overflow-hidden bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Ambient background */}
      <div className="ruled-light absolute inset-0" aria-hidden="true" />
      <div className="grain absolute inset-0 opacity-[0.07]" aria-hidden="true" />
      <div className="absolute -top-32 -left-24 h-[34rem] w-[34rem] animate-drift rounded-full bg-brand-600/35 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-40 bottom-0 h-[30rem] w-[30rem] animate-drift rounded-full bg-saffron-500/15 blur-3xl [animation-delay:-9s]" aria-hidden="true" />

      <Brand tone="light" className="reveal relative" />

      <div className="relative">
        <h1 className="display max-w-lg text-[44px] leading-[1.08] text-paper">
          <span className="reveal block" style={{ '--i': 1 } as CSSProperties}>
            A loan that explains itself,
          </span>
          <span className="reveal block text-saffron-300" style={{ '--i': 2 } as CSSProperties}>
            before you sign anything.
          </span>
        </h1>
        <p className="reveal mt-5 max-w-md text-[15px] leading-relaxed text-paper/60" style={{ '--i': 3 } as CSSProperties}>
          Pick an amount and a tenure, see exactly what you will repay, and follow your application from the moment
          you submit it until the day it closes.
        </p>

        {/* The example-loan card */}
        <div className="reveal mt-10 max-w-md" style={{ '--i': 4 } as CSSProperties}>
          <div className="animate-float rounded-[22px] border border-white/10 bg-white/[0.06] p-6 shadow-overlay backdrop-blur-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.14em] text-paper/45 uppercase">
              <span>For example</span>
              <span className="flex gap-1" aria-hidden="true">
                {EXAMPLES.map((_, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${i === index ? 'bg-saffron-400' : 'bg-white/20'}`} />
                ))}
              </span>
            </div>
            <p className="mt-3 text-sm text-paper/70">
              Borrow <span className="amount text-lg text-paper">{formatRupees(principal)}</span> for{' '}
              <span className="amount text-lg text-paper">{Math.round(days)}</span> days
            </p>
            <p className="amount mt-3 text-[40px] leading-none text-saffron-300">{formatRupeesExact(total)}</p>
            <p className="mt-2 text-sm text-paper/55">
              to repay in one go, of which {formatRupeesExact(interest)} is interest
            </p>
          </div>
        </div>
      </div>

      <dl className="relative grid grid-cols-3 gap-6">
        {PROMISES.map((promise, i) => (
          <div key={promise.figure} className="reveal" style={{ '--i': 5 + i } as CSSProperties}>
            <dt className="amount text-[30px] leading-none text-paper">{promise.figure}</dt>
            <dd className="mt-2 text-[13px] leading-snug text-paper/50">{promise.text}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
