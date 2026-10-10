import type { Types } from 'mongoose';
import { LOAN_TRANSITIONS, type LoanStatus } from '../constants/loan';
import { type ILoan, Loan, type LoanDocument } from '../models/loan.model';
import { ApiError } from '../utils/ApiError';

interface TransitionInput {
  loanId: string;
  to: LoanStatus;
  /** The user making the change. */
  actorId: string | Types.ObjectId;
  /** Extra fields to store with the new status, for example who sanctioned and when. */
  set?: Partial<ILoan>;
  note?: string;
}

/**
 * Moves a loan to a new status, and is the only way a status is ever changed
 * by an executive. It refuses anything the state machine does not allow.
 *
 * The check and the write are a single `findOneAndUpdate` whose filter includes
 * the statuses the loan is allowed to come from. If two executives act on the
 * same loan at once, only the first request matches; the second finds the loan
 * already moved and gets a 409 instead of silently overwriting the first.
 */
export async function transitionLoan({ loanId, to, actorId, set = {}, note }: TransitionInput): Promise<LoanDocument> {
  const allowedFrom = (Object.keys(LOAN_TRANSITIONS) as LoanStatus[]).filter((from) =>
    LOAN_TRANSITIONS[from].includes(to),
  );
  const now = new Date();

  const loan = await Loan.findOneAndUpdate(
    { _id: loanId, status: { $in: allowedFrom } },
    {
      $set: { ...set, status: to },
      $push: { statusHistory: { status: to, changedAt: now, changedBy: actorId, ...(note && { note }) } },
    },
    { returnDocument: 'after', runValidators: true },
  );
  if (loan) return loan;

  const existing = await Loan.findById(loanId).select('status');
  if (!existing) throw ApiError.notFound('Loan not found.');

  throw ApiError.conflict(
    'INVALID_STATUS_TRANSITION',
    `A loan that is ${existing.status} cannot be moved to ${to}. Allowed from: ${allowedFrom.join(', ')}.`,
    { currentStatus: existing.status, requestedStatus: to },
  );
}
