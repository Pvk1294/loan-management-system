import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-paper-2 text-ink-muted ring-1 ring-line">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-6 text-xs font-semibold tracking-widest text-ink-muted uppercase">404</p>
      <h1 className="display mt-2 text-[30px] leading-tight text-ink">This page does not exist</h1>
      <p className="mt-3 max-w-sm text-sm text-ink-muted">The address may be mistyped, or the page may have moved.</p>
      <Link
        href="/"
        className="mt-7 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-medium text-paper shadow-sm transition-all hover:-translate-y-px hover:shadow-raised"
      >
        Back to the start
      </Link>
    </div>
  );
}
