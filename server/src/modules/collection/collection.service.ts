import { z } from 'zod';
import { LOAN_TRANSITIONS, LoanStatus } from '../../constants/loan';
import { type LoanDTO, type PaymentDTO, toLoanDTO, toPaymentDTO } from '../../dto/loan.dto';
import { Loan } from '../../models/loan.model';
import { Payment } from '../../models/payment.model';
import { DASHBOARD_POPULATE, type ModuleLoanQuery, type ModuleViews, listModuleLoans } from '../../services/loanQueries';
import { ApiError } from '../../utils/ApiError';
import { compareCalendarDates, istCalendarDate, parseDateOnly, utcCalendarDate } from '../../utils/dates';
import { fromPaise, hasAtMostTwoDecimals, toPaise } from '../../utils/money';
import { isDuplicateKeyError } from '../../utils/mongo';

/** Collection works disbursed loans until they are repaid in full. */
const VIEWS: ModuleViews = {
  queue: [LoanStatus.DISBURSED],
  history: [LoanStatus.CLOSED],
};

/**
 * A UTR (Unique Transaction Reference) is the bank's id for a transfer:
 * 12 digits for UPI, 16 characters for NEFT, 22 for RTGS.
 */
const UTR_REGEX = /^[A-Z0-9]{12,22}$/;

export const paymentSchema = z.object({
  utr: z.string('UTR is required.').trim().toUpperCase().regex(UTR_REGEX, 'UTR must be 12 to 22 letters and digits.'),
  amount: z
    .number('Amount must be a number.')
    .positive('Amount must be greater than zero.')
    .refine(hasAtMostTwoDecimals, 'Amount can have at most two decimal places.'),
  paidAt: z.string('Payment date is required.').transform((value, ctx) => {
    const date = parseDateOnly(value);
    if (!date) {
      ctx.addIssue({ code: 'custom', message: 'Payment date must be a real date in YYYY-MM-DD format.' });
      return z.NEVER;
    }
    return date;
  }),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export const listLoans = (query: ModuleLoanQuery) => listModuleLoans(VIEWS, query);

export async function listPayments(loanId: string): Promise<PaymentDTO[]> {
  if (!(await Loan.exists({ _id: loanId }))) throw ApiError.notFound('Loan not found.');

  const payments = await Payment.find({ loan: loanId })
    .sort({ paidAt: 1, createdAt: 1 })
    .populate('recordedBy', 'name');
  return payments.map((payment) => toPaymentDTO(payment));
}

const formatRupees = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Records a repayment and closes the loan when it has been repaid in full.
 *
 * Two writes are involved, the payment row and the loan's running total, and
 * they must agree even when two executives record payments on the same loan at
 * the same moment. Without transactions (which need a replica set) that is
 * achieved in two steps:
 *
 *  1. Insert the payment. The unique index on `utr` rejects duplicates.
 *  2. Update the loan with a filter on the `amountPaid` value this request
 *     read. If another payment landed in between, the filter no longer matches,
 *     nothing is written, the payment from step 1 is removed and the caller
 *     gets a 409 to retry. The loan can therefore never be overpaid.
 *
 * Reaching the full repayment amount flips the status to CLOSED in that same
 * guarded write, so "fully paid" and "closed" can never drift apart.
 */
export async function recordPayment(
  loanId: string,
  { utr, amount, paidAt }: PaymentInput,
  actorId: string,
): Promise<{ payment: PaymentDTO; loan: LoanDTO }> {
  const loan = await Loan.findById(loanId);
  if (!loan) throw ApiError.notFound('Loan not found.');
  if (loan.status !== LoanStatus.DISBURSED) {
    throw ApiError.conflict(
      'LOAN_NOT_ACTIVE',
      `Payments can only be recorded against a disbursed loan. This loan is ${loan.status}.`,
      { currentStatus: loan.status },
    );
  }

  const paidOn = utcCalendarDate(paidAt);
  if (compareCalendarDates(paidOn, istCalendarDate(new Date())) > 0) {
    throw ApiError.unprocessable('PAYMENT_DATE_IN_FUTURE', 'The payment date cannot be in the future.');
  }
  if (loan.disbursedAt && compareCalendarDates(paidOn, istCalendarDate(loan.disbursedAt)) < 0) {
    throw ApiError.unprocessable(
      'PAYMENT_BEFORE_DISBURSEMENT',
      'The payment date cannot be earlier than the day the loan was disbursed.',
    );
  }

  const paidBeforePaise = toPaise(loan.amountPaid);
  const totalPaise = toPaise(loan.totalRepayment);
  const amountPaise = toPaise(amount);
  const outstandingPaise = totalPaise - paidBeforePaise;
  if (amountPaise > outstandingPaise) {
    throw ApiError.unprocessable(
      'AMOUNT_EXCEEDS_OUTSTANDING',
      `The amount is more than the outstanding balance of ${formatRupees(fromPaise(outstandingPaise))}.`,
      { outstanding: fromPaise(outstandingPaise) },
    );
  }

  // Step 1: the ledger entry.
  const payment = await Payment.create({ loan: loan._id, utr, amount, paidAt, recordedBy: actorId }).catch(
    (err: unknown) => {
      if (isDuplicateKeyError(err)) {
        throw ApiError.conflict('DUPLICATE_UTR', `A payment with UTR ${utr} has already been recorded.`);
      }
      throw err;
    },
  );

  // Step 2: the running total, guarded against concurrent payments.
  const paidAfterPaise = paidBeforePaise + amountPaise;
  const repaidInFull = paidAfterPaise === totalPaise && LOAN_TRANSITIONS[loan.status].includes(LoanStatus.CLOSED);
  const now = new Date();

  const updated = await Loan.findOneAndUpdate(
    { _id: loan._id, status: LoanStatus.DISBURSED, amountPaid: loan.amountPaid },
    repaidInFull
      ? {
          $set: { amountPaid: fromPaise(paidAfterPaise), status: LoanStatus.CLOSED, closedAt: now },
          $push: {
            statusHistory: {
              status: LoanStatus.CLOSED,
              changedAt: now,
              changedBy: actorId,
              note: 'Closed automatically: repaid in full.',
            },
          },
        }
      : { $set: { amountPaid: fromPaise(paidAfterPaise) } },
    { returnDocument: 'after' },
  );

  if (!updated) {
    await Payment.deleteOne({ _id: payment._id });
    throw ApiError.conflict(
      'CONCURRENT_UPDATE',
      'This loan was updated by someone else at the same moment. Refresh and try again.',
    );
  }

  return {
    payment: toPaymentDTO(payment),
    loan: toLoanDTO(await updated.populate(DASHBOARD_POPULATE), { includeActors: true }),
  };
}
