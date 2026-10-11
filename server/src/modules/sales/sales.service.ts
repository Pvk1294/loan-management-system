import type { PipelineStage } from 'mongoose';
import { z } from 'zod';
import type { EmploymentMode } from '../../constants/loan';
import { ACTIVE_LOAN_STATUSES } from '../../constants/loan';
import { Role } from '../../constants/roles';
import { BorrowerProfile, BreStatus } from '../../models/borrowerProfile.model';
import { Loan } from '../../models/loan.model';
import { User } from '../../models/user.model';
import type { BreFailure } from '../../services/bre';
import { escapeRegex } from '../../utils/mongo';
import { type PageMeta, buildPageMeta, paginationSchema } from '../../utils/pagination';

/**
 * A lead is a borrower Sales can help towards an application: someone who has
 * registered but never requested a loan, or a past borrower who has started a
 * new application and not submitted it yet. The stage says where they stand.
 */
export const LeadStage = {
  /** Signed up, has not submitted personal details. */
  REGISTERED: 'REGISTERED',
  /** Submitted details and was turned down by the eligibility rules. */
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  /** Passed eligibility, salary slip still to upload. */
  ELIGIBLE: 'ELIGIBLE',
  /** Salary slip uploaded, only the loan request itself is missing. */
  READY_TO_APPLY: 'READY_TO_APPLY',
  /** Borrowed before, nothing in progress, and has clicked "Apply again". */
  RETURNING: 'RETURNING',
} as const;

export type LeadStage = (typeof LeadStage)[keyof typeof LeadStage];

const LEAD_STAGES = Object.values(LeadStage);

export const leadQuerySchema = paginationSchema.extend({
  stage: z.enum(LEAD_STAGES).optional(),
});

export type LeadQuery = z.infer<typeof leadQuerySchema>;

export interface LeadDTO {
  id: string;
  name: string;
  email: string;
  stage: LeadStage;
  registeredAt: string;
  lastActivityAt: string;
  /** Loans this person has had before. Zero for a first-time lead. */
  previousLoans: number;
  profile: {
    fullName: string;
    monthlySalary: number;
    employmentMode: EmploymentMode;
    eligibilityAttempts: number;
    rejectionReasons: BreFailure[];
    salarySlipUploaded: boolean;
  } | null;
}

export interface LeadPage {
  leads: LeadDTO[];
  meta: PageMeta & { counts: Record<LeadStage, number> & { total: number } };
}

interface LeadRow {
  _id: { toString(): string };
  name: string;
  email: string;
  stage: LeadStage;
  createdAt: Date;
  loans: unknown[];
  profile?: {
    fullName: string;
    monthlySalary: number;
    employmentMode: EmploymentMode;
    bre: { attempts: number; failures: BreFailure[] };
    salarySlip?: unknown;
    updatedAt: Date;
    reapplyRequestedAt?: Date;
  };
}

const isMissing = (field: string) => ({ $eq: [{ $type: field }, 'missing'] });

export async function listLeads({ page, limit, search, stage }: LeadQuery): Promise<LeadPage> {
  const userFilter: Record<string, unknown> = { role: Role.BORROWER };
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    userFilter.$or = [{ name: pattern }, { email: pattern }];
  }
  const stageFilter: PipelineStage.FacetPipelineStage[] = stage ? [{ $match: { stage } }] : [];

  const pipeline: PipelineStage[] = [
    { $match: userFilter },
    {
      $lookup: {
        from: Loan.collection.name,
        localField: '_id',
        foreignField: 'borrower',
        pipeline: [{ $project: { status: 1 } }],
        as: 'loans',
      },
    },
    {
      $lookup: {
        from: BorrowerProfile.collection.name,
        localField: '_id',
        foreignField: 'user',
        as: 'profile',
      },
    },
    { $addFields: { profile: { $first: '$profile' } } },
    {
      $addFields: {
        // A past borrower who has started again: has loans, none in progress, and asked to re-apply.
        returning: {
          $and: [
            { $gt: [{ $size: '$loans' }, 0] },
            { $not: [isMissing('$profile.reapplyRequestedAt')] },
            {
              $eq: [
                { $size: { $filter: { input: '$loans', cond: { $in: ['$$this.status', [...ACTIVE_LOAN_STATUSES]] } } } },
                0,
              ],
            },
          ],
        },
      },
    },
    // Everyone else with a loan belongs to Sanction, Disbursement or Collection, not Sales.
    { $match: { $or: [{ loans: { $size: 0 } }, { returning: true }] } },
    {
      $addFields: {
        stage: {
          $switch: {
            branches: [
              { case: '$returning', then: LeadStage.RETURNING },
              { case: isMissing('$profile'), then: LeadStage.REGISTERED },
              { case: { $eq: ['$profile.bre.status', BreStatus.REJECTED] }, then: LeadStage.NOT_ELIGIBLE },
              { case: isMissing('$profile.salarySlip'), then: LeadStage.ELIGIBLE },
            ],
            default: LeadStage.READY_TO_APPLY,
          },
        },
      },
    },
    {
      $facet: {
        // Counts ignore the stage filter so the summary cards always show the whole funnel.
        counts: [{ $group: { _id: '$stage', count: { $sum: 1 } } }],
        total: [...stageFilter, { $count: 'value' }],
        rows: [...stageFilter, { $sort: { createdAt: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }],
      },
    },
  ];

  const [result] = await User.aggregate<{
    counts: { _id: LeadStage; count: number }[];
    total: { value: number }[];
    rows: LeadRow[];
  }>(pipeline);

  const counts = { REGISTERED: 0, NOT_ELIGIBLE: 0, ELIGIBLE: 0, READY_TO_APPLY: 0, RETURNING: 0, total: 0 };
  for (const { _id, count } of result?.counts ?? []) {
    counts[_id] = count;
    counts.total += count;
  }

  const leads = (result?.rows ?? []).map((row): LeadDTO => ({
    id: row._id.toString(),
    name: row.name,
    email: row.email,
    stage: row.stage,
    registeredAt: row.createdAt.toISOString(),
    lastActivityAt: (row.profile?.reapplyRequestedAt ?? row.profile?.updatedAt ?? row.createdAt).toISOString(),
    previousLoans: row.loans.length,
    profile: row.profile
      ? {
          fullName: row.profile.fullName,
          monthlySalary: row.profile.monthlySalary,
          employmentMode: row.profile.employmentMode,
          eligibilityAttempts: row.profile.bre.attempts,
          rejectionReasons: row.profile.bre.failures,
          salarySlipUploaded: Boolean(row.profile.salarySlip),
        }
      : null,
  }));

  return { leads, meta: { ...buildPageMeta(page, limit, result?.total[0]?.value ?? 0), counts } };
}
