'use client';

import type { LucideIcon } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { formatRupees } from '@/lib/format';

export interface Figure {
  label: string;
  value: number | undefined;
  money?: boolean;
  icon?: LucideIcon;
  caption?: string;
}

/** The row of key figures at the top of a module. */
export function ModuleFigures({ figures }: { figures: Figure[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {figures.map((figure, i) => (
        <StatCard
          key={figure.label}
          index={i}
          label={figure.label}
          value={figure.value}
          format={figure.money ? (v) => formatRupees(Math.round(v)) : undefined}
          icon={figure.icon}
          caption={figure.caption}
          className={i === 0 ? 'col-span-2 md:col-span-1' : undefined}
        />
      ))}
    </div>
  );
}
