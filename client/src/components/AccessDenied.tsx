'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { ROLE_LABELS, homePathFor, modulesFor } from '@/lib/rbac';

/**
 * Shown when someone opens a page their role may not see. It says what the
 * role *can* open, so the page is a signpost and not a dead end.
 */
export function AccessDenied() {
  const { session } = useSession();
  const role = session?.user.role;
  const allowed = role ? modulesFor(role) : [];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <span className="animate-check flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
        <ShieldAlert className="h-7 w-7" aria-hidden="true" />
      </span>
      <p className="mt-6 text-xs font-semibold tracking-widest text-rose-600 uppercase">403 · Access denied</p>
      <h1 className="display mt-2 text-[30px] leading-tight text-ink">This module is not part of your role</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
        {role ? (
          <>
            You are signed in as <strong className="font-medium text-ink">{ROLE_LABELS[role]}</strong>
            {allowed.length > 0 && (
              <>
                , which has access to <strong className="font-medium text-ink">{allowed.map((module) => module.label).join(', ')}</strong>
              </>
            )}
            . Ask an administrator if you need more.
          </>
        ) : (
          'Sign in with an account that has access to this page.'
        )}
      </p>
      <Link
        href={role ? homePathFor(role) : '/login'}
        className="mt-7 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-medium text-paper shadow-sm transition-all hover:-translate-y-px hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {role ? 'Go to my workspace' : 'Sign in'}
      </Link>
    </div>
  );
}
