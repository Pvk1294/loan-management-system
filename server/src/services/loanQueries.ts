import { z } from 'zod';
import type { LoanStatus } from '../constants/loan';
import { Loan, type LoanDocument } from '../models/loan.model';
import { escapeRegex } from '../utils/mongo';
import { type PageMeta, buildPageMeta, paginationSchema } from '../utils/pagination';

/**
 * Every dashboard module shows two lists: the work waiting for that team
 * (`queue`) and what the team has already dealt with (`history`).
 */
export const moduleLoanQuerySchema = paginationSchema.extend({
  view: z.enum(['queue', 'history']).default('queue'),
});

export type ModuleLoanQuery = z.infer<typeof moduleLoanQuerySchema>;

export interface ModuleViews {
  queue: readonly LoanStatus[];
  history: readonly LoanStatus[];
}

export interface ModuleTotals {
  /** Rupees the loans in the queue add up to. */
  queuePrincipal: number;
  /** Rupees still to be collected across the loans in the queue. */
  queueOutstanding: number;
}

export interface ModuleLoanPage {
  loans: LoanDocument[];
  meta: PageMeta & { counts: { queue: number; history: number }; totals: ModuleTotals };
}

/** Sums over the queue, for the figures at the top of a module. */
async function queueTotals(statuses: readonly LoanStatus[]): Promise<ModuleTotals> {
  const [row] = await Loan.aggregate<{ principal: number; outstanding: number }>([
    { $match: { status: { $in: [...statuses] } } },
    {
      $group: {
        _id: null,
        principal: { $sum: '$principal' },
        outstanding: { $sum: { $subtract: ['$totalRepayment', '$amountPaid'] } },
      },
    },
  ]);
  return {
    queuePrincipal: Math.round((row?.principal ?? 0) * 100) / 100,
    queueOutstanding: Math.round((row?.outstanding ?? 0) * 100) / 100,
  };
}

/** References shown on the dashboard: the borrower's account and who changed each status. */
export const DASHBOARD_POPULATE = [
  { path: 'borrower', select: 'name email' },
  { path: 'statusHistory.changedBy', select: 'name role' },
];

export async function listModuleLoans(views: ModuleViews, query: ModuleLoanQuery): Promise<ModuleLoanPage> {
  const { view, page, limit, search } = query;

  const filter: Record<string, unknown> = { status: { $in: views[view] } };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ 'applicant.fullName': pattern }, { 'applicant.pan': pattern }];
  }

  // The queue is worked oldest first; history shows the latest activity first.
  const sort: Record<string, 1 | -1> = view === 'queue' ? { appliedAt: 1 } : { updatedAt: -1 };

  const [loans, total, queueCount, historyCount, totals] = await Promise.all([
    Loan.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(DASHBOARD_POPULATE),
    Loan.countDocuments(filter),
    Loan.countDocuments({ status: { $in: views.queue } }),
    Loan.countDocuments({ status: { $in: views.history } }),
    queueTotals(views.queue),
  ]);

  return {
    loans,
    meta: { ...buildPageMeta(page, limit, total), counts: { queue: queueCount, history: historyCount }, totals },
  };
}
