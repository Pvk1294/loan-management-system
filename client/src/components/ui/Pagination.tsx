'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PageMeta } from '@/types/api';
import { Button } from './Button';

interface PaginationProps {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  /** What is being counted, for example "loans". */
  noun: string;
}

export function Pagination({ meta, onPageChange, noun }: PaginationProps) {
  const { page, limit, total, totalPages } = meta;
  if (total === 0) return null;

  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-slate-500">
      <p>
        Showing <span className="font-medium text-slate-700 tabular-nums">{first}–{last}</span> of{' '}
        <span className="font-medium text-slate-700 tabular-nums">{total}</span> {noun}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronLeft className="h-4 w-4" />}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
