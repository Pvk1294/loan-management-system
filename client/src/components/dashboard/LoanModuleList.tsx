'use client';

import { Inbox, type LucideIcon, SearchX, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Tabs } from '@/components/ui/Tabs';
import type { Loan, ModuleView } from '@/types/api';
import { SearchInput } from './SearchInput';
import type { ModuleLoans } from './useModuleLoans';

interface LoanModuleListProps {
  loans: ModuleLoans;
  columns: Column<Loan>[];
  onSelect: (loan: Loan) => void;
  labels: Record<ModuleView, string>;
  /** What to say when the queue has nothing in it. */
  emptyQueue: { icon?: LucideIcon; title: string; description: string };
  caption: string;
}

/**
 * The part every loan module shares: Queue / History tabs with counts, a
 * search box, the table (or cards on a phone) and paging. Each module supplies
 * its own columns and decides what happens when a row is opened.
 */
export function LoanModuleList({ loans, columns, onSelect, labels, emptyQueue, caption }: LoanModuleListProps) {
  const { view, meta, error } = loans;

  const empty = loans.isSearching ? (
    <EmptyState icon={SearchX} title="No loans match your search" description="Try a different name or PAN." />
  ) : view === 'queue' ? (
    <EmptyState icon={emptyQueue.icon ?? Inbox} title={emptyQueue.title} description={emptyQueue.description} />
  ) : (
    <EmptyState icon={Inbox} title="Nothing here yet" description="Loans this team has dealt with will be listed here." />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          label="Loan lists"
          value={view}
          onChange={loans.changeView}
          tabs={[
            { value: 'queue', label: labels.queue, count: meta?.counts.queue },
            { value: 'history', label: labels.history, count: meta?.counts.history },
          ]}
        />
        <SearchInput value={loans.search} onChange={loans.changeSearch} placeholder="Search by name or PAN" />
      </div>

      {error && !loans.loans ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
          <EmptyState
            icon={ServerCrash}
            tone="error"
            title={error.status === 403 ? 'You do not have access to this module' : 'These loans could not be loaded'}
            description={error.message}
            action={error.status === 403 ? undefined : <Button onClick={loans.reload}>Try again</Button>}
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={loans.loans}
          rowKey={(loan) => loan.id}
          onRowClick={onSelect}
          loading={loans.isLoading}
          refreshing={loans.isFetching}
          empty={empty}
          caption={caption}
        />
      )}

      {meta && <Pagination meta={meta} onPageChange={loans.setPage} noun="loans" />}
    </div>
  );
}
