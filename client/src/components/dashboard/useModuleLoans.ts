'use client';

import { useState } from 'react';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { apiRequest } from '@/lib/api';
import type { Loan, ModuleLoanMeta, ModuleView } from '@/types/api';

const PAGE_SIZE = 10;

/**
 * The list state shared by the Sanction, Disbursement and Collection modules:
 * which view is open (the team's queue or its history), the page and the
 * search term, plus the loans the API returns for that combination.
 */
export function useModuleLoans(module: 'sanction' | 'disbursement' | 'collection') {
  const [view, setView] = useState<ModuleView>('queue');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim());

  const query = useApiQuery(`${module}:${view}:${page}:${term}`, (signal) =>
    apiRequest<{ loans: Loan[] }, ModuleLoanMeta>(`/${module}/loans`, {
      query: { view, page, limit: PAGE_SIZE, search: term },
      signal,
    }),
  );

  return {
    view,
    page,
    search,
    isSearching: term !== '',
    loans: query.data?.data.loans,
    meta: query.data?.meta,
    error: query.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    reload: query.reload,
    setPage,
    // Changing the view or the search always starts again from the first page.
    changeView: (next: ModuleView) => {
      setView(next);
      setPage(1);
    },
    changeSearch: (next: string) => {
      setSearch(next);
      setPage(1);
    },
  };
}

export type ModuleLoans = ReturnType<typeof useModuleLoans>;
