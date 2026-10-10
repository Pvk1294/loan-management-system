import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="reveal mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-[32px] leading-none text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{description}</p>
      </div>
      {children}
    </header>
  );
}
