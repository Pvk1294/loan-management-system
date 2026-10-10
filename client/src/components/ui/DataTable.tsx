'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Skeleton } from './Spinner';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
  /**
   * How the column appears when the table collapses into cards on a phone:
   *  - title:  the card heading (left)
   *  - aside:  next to the heading (right), typically a status badge
   *  - detail: a "label: value" line in the card body (the default)
   *  - footer: full-width at the bottom, typically the action button
   *  - hidden: left out
   */
  mobile?: 'title' | 'aside' | 'detail' | 'footer' | 'hidden';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** No data yet: show placeholder rows. */
  loading?: boolean;
  /** Data on screen is being replaced: dim it. */
  refreshing?: boolean;
  empty: ReactNode;
  caption: string;
}

/**
 * A table on tablets and desktops, a list of cards on phones. Both are built
 * from the same column definitions, so a module only describes its data once.
 */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, loading, refreshing, empty, caption }: DataTableProps<T>) {
  const activate = (row: T) => (event: KeyboardEvent) => {
    if (onRowClick && (event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
      event.preventDefault();
      onRowClick(row);
    }
  };

  if (!loading && rows && rows.length === 0) {
    return <div className="rounded-2xl border border-slate-200 bg-white shadow-card">{empty}</div>;
  }

  const byMobile = (kind: Column<T>['mobile']) => columns.filter((column) => (column.mobile ?? 'detail') === kind);

  return (
    <div className={cn('transition-opacity', refreshing && 'opacity-60')} aria-busy={loading || refreshing || undefined}>
      {/* Tablet and desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase first:pl-6 last:pr-6',
                      column.align === 'right' && 'text-right',
                      column.className,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 5 }, (_, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td key={column.key} className="px-4 py-4 first:pl-6 last:pr-6">
                          <Skeleton className={cn('h-4', column.align === 'right' ? 'ml-auto w-16' : 'w-24')} />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows?.map((row) => (
                    <tr
                      key={rowKey(row)}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={activate(row)}
                      tabIndex={onRowClick ? 0 : undefined}
                      className={cn(
                        'transition-colors',
                        onRowClick &&
                          'cursor-pointer hover:bg-slate-50 focus-visible:bg-brand-50/60 focus-visible:outline-none',
                      )}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            'px-4 py-3.5 align-middle first:pl-6 last:pr-6',
                            column.align === 'right' && 'text-right',
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phone */}
      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {loading
          ? Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </li>
            ))
          : rows?.map((row) => (
              <li
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={activate(row)}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'rounded-2xl border border-slate-200 bg-white p-4 shadow-card',
                  onRowClick && 'cursor-pointer active:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-600',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">{byMobile('title').map((column) => <div key={column.key}>{column.cell(row)}</div>)}</div>
                  <div className="shrink-0">{byMobile('aside').map((column) => <div key={column.key}>{column.cell(row)}</div>)}</div>
                </div>
                {byMobile('detail').length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-slate-100 pt-3">
                    {byMobile('detail').map((column) => (
                      <div key={column.key} className="min-w-0">
                        <dt className="text-xs text-slate-500">{column.header}</dt>
                        <dd className="mt-0.5 text-sm text-slate-900">{column.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {byMobile('footer').map((column) => (
                  <div key={column.key} className="mt-3 border-t border-slate-100 pt-3 [&_button]:w-full">
                    {column.cell(row)}
                  </div>
                ))}
              </li>
            ))}
      </ul>
    </div>
  );
}
