'use client';

import type { CSSProperties, ReactNode } from 'react';
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
 * with module tabs on small ones. Only the modules the role may open are listed.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const user = useUser();
  const pathname = usePathname();
  const modules = user ? modulesFor(user.role) : [];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper lg:flex-row">
      {/* Large screens: sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col bg-ink text-paper lg:flex">
        <div className="ruled-light pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative flex h-[4.5rem] items-center px-6">
          <Brand tone="light" subtitle="Operations" />
        </div>

        <nav className="relative flex-1 px-4 py-5" aria-label="Modules">
          <p className="px-3 pb-3 text-[11px] font-semibold tracking-[0.14em] text-paper/35 uppercase">
            {user?.role === 'admin' ? 'All modules' : 'Your module'}
          </p>
          {!user && <Skeleton className="mx-3 h-10 bg-white/10" />}
          <ul className="space-y-1">
            {modules.map((module, i) => {
              const Icon = MODULE_ICONS[module.key];
              const active = isActive(module.href);
              return (
                <li key={module.key} className="reveal-fade" style={{ '--i': i } as CSSProperties}>
                  <Link
                    href={module.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      'focus-visible:outline-2 focus-visible:outline-saffron-400',
                      active ? 'bg-white/10 text-paper' : 'text-paper/55 hover:translate-x-0.5 hover:bg-white/5 hover:text-paper',
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-saffron-400" aria-hidden="true" />}
                    <Icon className={cn('h-[18px] w-[18px] transition-colors', active ? 'text-saffron-300' : 'text-paper/40 group-hover:text-paper/80')} aria-hidden="true" />
                    {module.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="relative border-t border-white/10 p-4">
          {user ? <UserMenu user={user} tone="light" /> : <Skeleton className="h-9 bg-white/10" />}
        </div>
      </aside>

      {/* Small screens: top bar and tabs */}
      <header className="sticky top-0 z-30 bg-ink text-paper lg:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Brand tone="light" />
          {user && <UserMenu user={user} tone="light" className="min-w-0" />}
        </div>
        {modules.length > 1 && (
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2" aria-label="Modules">
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
                    active ? 'bg-white/12 text-paper' : 'text-paper/55',
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

      <main className="flex min-w-0 flex-1 flex-col lg:pl-[17rem]">
        <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
