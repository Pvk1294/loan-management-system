import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-6 text-xs font-semibold tracking-widest text-slate-500 uppercase">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">This page does not exist</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">The address may be mistyped, or the page may have moved.</p>
      <Link
        href="/"
        className="mt-7 inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-800"
      >
        Back to the start
      </Link>
    </div>
  );
}
