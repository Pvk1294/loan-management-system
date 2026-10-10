'use client';

import { useState } from 'react';
import { CircleCheck, FileUp, Mail, SearchX, ServerCrash, UserPlus, UserRoundX, Users } from 'lucide-react';
import { LeadStageBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { type Column, DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { StatCard } from '@/components/ui/StatCard';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { apiRequest } from '@/lib/api';
import { EMPLOYMENT_LABELS, formatDate, formatDateTime, formatRupees, initials } from '@/lib/format';
import type { Lead, LeadMeta, LeadStage } from '@/types/api';
import { PageHeader } from './PageHeader';
import { SearchInput } from './SearchInput';

const PAGE_SIZE = 10;

/** What each stage means for a sales executive, and what to do about it. */
const STAGE_GUIDE: Record<LeadStage, { summary: string; nextStep: string }> = {
  REGISTERED: {
    summary: 'Created an account but has not filled in personal details.',
    nextStep: 'A reminder to start the application is usually enough.',
  },
  NOT_ELIGIBLE: {
    summary: 'Submitted personal details and did not pass the eligibility rules.',
    nextStep: 'Check the reasons below. A typo can be corrected; otherwise this lead cannot proceed.',
  },
  ELIGIBLE: {
    summary: 'Passed eligibility and still has to upload a salary slip.',
    nextStep: 'Nudge them to upload their latest payslip.',
  },
  READY_TO_APPLY: {
    summary: 'Eligible, salary slip uploaded. Only the loan request itself is missing.',
    nextStep: 'The warmest kind of lead: help them choose an amount and tenure.',
  },
};

/**
 * Sales: borrowers who have registered but not applied yet, with how far each
 * one got. The cards at the top are both a summary of the funnel and a filter.
 */
export function SalesModule() {
  const [stage, setStage] = useState<LeadStage | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const term = useDebouncedValue(search.trim());

  const { data, error, isLoading, isFetching, reload } = useApiQuery(`sales:${stage}:${page}:${term}`, (signal) =>
    apiRequest<{ leads: Lead[] }, LeadMeta>('/sales/leads', {
      query: { stage, page, limit: PAGE_SIZE, search: term },
      signal,
    }),
  );
  const leads = data?.data.leads;
  const counts = data?.meta.counts;

  const filterBy = (next: LeadStage | null) => {
    setStage(next);
    setPage(1);
  };

  const columns: Column<Lead>[] = [
    {
      key: 'lead',
      header: 'Lead',
      mobile: 'title',
      cell: (lead) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600" aria-hidden="true">
            {initials(lead.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{lead.name}</p>
            <p className="truncate text-xs text-slate-500">{lead.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'stage', header: 'Stage', mobile: 'aside', cell: (lead) => <LeadStageBadge stage={lead.stage} /> },
    {
      key: 'salary',
      header: 'Monthly salary',
      align: 'right',
      cell: (lead) =>
        lead.profile ? <span className="text-slate-900 tabular-nums">{formatRupees(lead.profile.monthlySalary)}</span> : <span className="text-slate-400">—</span>,
    },
    {
      key: 'employment',
      header: 'Employment',
      cell: (lead) =>
        lead.profile ? <span className="text-slate-600">{EMPLOYMENT_LABELS[lead.profile.employmentMode]}</span> : <span className="text-slate-400">—</span>,
    },
    { key: 'registered', header: 'Registered', cell: (lead) => <span className="whitespace-nowrap text-slate-600">{formatDate(lead.registeredAt)}</span> },
    { key: 'activity', header: 'Last activity', cell: (lead) => <span className="whitespace-nowrap text-slate-600">{formatDate(lead.lastActivityAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Sales" description="People who have registered but have not applied for a loan yet." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="All leads" value={counts?.total} icon={Users} accent="bg-brand-50 text-brand-700" onClick={() => filterBy(null)} active={stage === null} className="col-span-2 lg:col-span-1" />
        <StatCard label="Registered" value={counts?.REGISTERED} icon={UserPlus} onClick={() => filterBy('REGISTERED')} active={stage === 'REGISTERED'} />
        <StatCard label="Not eligible" value={counts?.NOT_ELIGIBLE} icon={UserRoundX} accent="bg-rose-50 text-rose-700" onClick={() => filterBy('NOT_ELIGIBLE')} active={stage === 'NOT_ELIGIBLE'} />
        <StatCard label="Slip pending" value={counts?.ELIGIBLE} icon={FileUp} accent="bg-amber-50 text-amber-700" onClick={() => filterBy('ELIGIBLE')} active={stage === 'ELIGIBLE'} />
        <StatCard label="Ready to apply" value={counts?.READY_TO_APPLY} icon={CircleCheck} accent="bg-emerald-50 text-emerald-700" onClick={() => filterBy('READY_TO_APPLY')} active={stage === 'READY_TO_APPLY'} />
      </div>

      <div className="space-y-4">
        <div className="flex justify-end">
          <SearchInput
            value={search}
            onChange={(next) => {
              setSearch(next);
              setPage(1);
            }}
            placeholder="Search by name or email"
          />
        </div>

        {error && !leads ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
            <EmptyState
              icon={ServerCrash}
              tone="error"
              title={error.status === 403 ? 'You do not have access to this module' : 'Leads could not be loaded'}
              description={error.message}
              action={error.status === 403 ? undefined : <Button onClick={reload}>Try again</Button>}
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={leads}
            rowKey={(lead) => lead.id}
            onRowClick={setSelected}
            loading={isLoading}
            refreshing={isFetching}
            caption="Leads"
            empty={
              term || stage ? (
                <EmptyState icon={SearchX} title="No leads match" description="Try a different search, or clear the stage filter." />
              ) : (
                <EmptyState icon={Users} title="No open leads" description="Everyone who registered has gone on to apply." />
              )
            }
          />
        )}

        {data && <Pagination meta={data.meta} onPageChange={setPage} noun="leads" />}
      </div>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        description={selected && <LeadStageBadge stage={selected.stage} />}
        footer={
          selected && (
            <a
              href={`mailto:${selected.email}?subject=${encodeURIComponent('Your loan application')}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-800"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email this lead
            </a>
          )
        }
      >
        {selected && <LeadDetails lead={selected} />}
      </Drawer>
    </>
  );
}

function LeadDetails({ lead }: { lead: Lead }) {
  const guide = STAGE_GUIDE[lead.stage];
  const facts: [string, string][] = [
    ['Email', lead.email],
    ['Registered', formatDateTime(lead.registeredAt)],
    ['Last activity', formatDateTime(lead.lastActivityAt)],
    ...(lead.profile
      ? ([
          ['Name on application', lead.profile.fullName],
          ['Monthly salary', formatRupees(lead.profile.monthlySalary)],
          ['Employment', EMPLOYMENT_LABELS[lead.profile.employmentMode]],
          ['Eligibility checks run', String(lead.profile.eligibilityAttempts)],
          ['Salary slip', lead.profile.salarySlipUploaded ? 'Uploaded' : 'Not uploaded'],
        ] as [string, string][])
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-900">{guide.summary}</p>
        <p className="mt-1 text-sm text-slate-600">{guide.nextStep}</p>
      </div>

      {lead.profile && lead.profile.rejectionReasons.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Why they were not eligible</h3>
          <ul className="space-y-2">
            {lead.profile.rejectionReasons.map((reason) => (
              <li key={reason.rule} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {reason.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Details</h3>
        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="shrink-0 text-slate-500">{label}</dt>
              <dd className="truncate text-right font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
