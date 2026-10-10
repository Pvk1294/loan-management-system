'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Banknote, ClipboardCheck, HandCoins, type LucideIcon, Users } from 'lucide-react';
import { useUser } from '@/components/auth/SessionGate';
import { Brand } from '@/components/Brand';
import { Skeleton } from '@/components/ui/Spinner';
import { UserMenu } from '@/components/UserMenu';
import { cn } from '@/lib/cn';
import { type ModuleKey, modulesFor } from '@/lib/rbac';

const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  sales: Users,
  sanction: ClipboardCheck,
  disbursement: Banknote,
  collection: HandCoins,
};

/**
 * The frame around every dashboard page: a sidebar on large screens, a top bar
 * with scrolling tabs on small ones. The navigation lists only the modules the
 * signed-in role may open, so nobody is shown a link that would be refused.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const user = useUser();
  const pathname = usePathname();
  const modules = user ? modulesFor(user.role) : [];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      {/* Large screens: sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink-950 text-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Brand tone="light" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard modules">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-widest text-white/35 uppercase">
            {user?.role === 'admin' ? 'All modules' : 'Your module'}
          </p>
          {!user && <Skeleton className="mx-3 h-9 bg-white/10" />}
          <ul className="space-y-1">
            {modules.map((module) => {
              const Icon = MODULE_ICONS[module.key];
              const active = isActive(module.href);
              return (
                <li key={module.key}>
                  <Link
                    href={module.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-brand-400',
                      active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand-400" aria-hidden="true" />}
                    <Icon className={cn('h-[18px] w-[18px]', active ? 'text-brand-300' : 'text-white/45 group-hover:text-white/80')} aria-hidden="true" />
                    {module.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-4">
          {user ? <UserMenu user={user} tone="light" /> : <Skeleton className="h-9 bg-white/10" />}
        </div>
      </aside>

      {/* Small screens: top bar and module tabs */}
      <header className="sticky top-0 z-30 bg-ink-950 text-white lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Brand tone="light" />
          {user && <UserMenu user={user} tone="light" className="min-w-0" />}
        </div>
        {modules.length > 1 && (
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2" aria-label="Dashboard modules">
            {modules.map((module) => {
              const Icon = MODULE_ICONS[module.key];
              const active = isActive(module.href);
              return (
                <Link
                  key={module.key}
                  href={module.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium whitespace-nowrap transition-colors sm:text-sm',
                    active ? 'bg-white/12 text-white' : 'text-white/60',
                  )}
                >
                  <Icon className="hidden h-4 w-4 sm:block" aria-hidden="true" />
                  {module.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
