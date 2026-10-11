import path from 'node:path';
import { ACTIVE_LOAN_STATUSES, BRE_LIMITS, LOAN_RULES, LoanStatus, SALARY_SLIP } from '../../constants/loan';
import { type LoanDTO, type PaymentDTO, toLoanDTO, toPaymentDTO } from '../../dto/loan.dto';
import { type ProfileDTO, type SalarySlipDTO, toProfileDTO, toSalarySlipDTO } from '../../dto/profile.dto';
import { detectFileType } from '../../middleware/upload';
import {
  BorrowerProfile,
  type BorrowerProfileDocument,
  BreStatus,
  type ISalarySlip,
} from '../../models/borrowerProfile.model';
import { Loan } from '../../models/loan.model';
import { Payment } from '../../models/payment.model';
import { evaluateBre } from '../../services/bre';
import { deleteFile, saveFile } from '../../services/fileStorage';
import { buildLoanQuote } from '../../services/loanMath';
import { ApiError } from '../../utils/ApiError';
import { isDuplicateKeyError } from '../../utils/mongo';
import type { LoanApplicationInput, ProfileInput } from './borrower.schema';

/** Where the borrower is in the application journey, as decided by the server. */
export type ApplicationStep = 'PERSONAL_DETAILS' | 'SALARY_SLIP' | 'LOAN_CONFIG' | 'TRACKING';

export interface ApplicationOverview {
  nextStep: ApplicationStep;
  profile: ProfileDTO | null;
  /** The loan currently in progress, if any. */
  activeLoan: LoanDTO | null;
  /** Every loan the borrower has ever requested, newest first. */
  loans: LoanDTO[];
  /** The limits the forms must respect, sent so the frontend never hard-codes them. */
  rules: {
    loan: typeof LOAN_RULES;
    eligibility: typeof BRE_LIMITS;
    salarySlip: { maxSizeBytes: number; allowedMimeTypes: readonly string[] };
  };
}

const activeLoanConflict = () =>
  ApiError.conflict('ACTIVE_LOAN_EXISTS', 'You already have a loan in progress. A new one can be requested once it is closed.');

async function assertNoActiveLoan(userId: string): Promise<void> {
  if (await Loan.exists({ borrower: userId, status: { $in: ACTIVE_LOAN_STATUSES } })) {
    throw activeLoanConflict();
  }
}

function resolveNextStep(profile: BorrowerProfileDocument | null, hasActiveLoan: boolean): ApplicationStep {
  if (hasActiveLoan) return 'TRACKING';
  if (!profile || profile.bre.status !== BreStatus.PASSED) return 'PERSONAL_DETAILS';
  if (!profile.salarySlip) return 'SALARY_SLIP';
  return 'LOAN_CONFIG';
}

export async function getApplication(userId: string): Promise<ApplicationOverview> {
  const [profile, loans] = await Promise.all([
    BorrowerProfile.findOne({ user: userId }),
    Loan.find({ borrower: userId }).sort({ appliedAt: -1 }),
  ]);
  const activeLoan = loans.find((loan) => ACTIVE_LOAN_STATUSES.includes(loan.status)) ?? null;

  return {
    nextStep: resolveNextStep(profile, activeLoan !== null),
    profile: profile ? toProfileDTO(profile) : null,
    activeLoan: activeLoan ? toLoanDTO(activeLoan) : null,
    loans: loans.map((loan) => toLoanDTO(loan)),
    rules: {
      loan: LOAN_RULES,
      eligibility: BRE_LIMITS,
      salarySlip: {
        maxSizeBytes: SALARY_SLIP.MAX_SIZE_BYTES,
        allowedMimeTypes: SALARY_SLIP.ALLOWED_MIME_TYPES,
      },
    },
  };
}

/**
 * Step 2: saves the personal details and runs the eligibility rules.
 *
 * The attempt is stored whether it passes or not, so the Sales team can see
 * leads that were turned down and why. A rejected borrower may correct their
 * details and submit again.
 */
export async function submitProfile(userId: string, input: ProfileInput): Promise<ProfileDTO> {
  await assertNoActiveLoan(userId);

  const result = evaluateBre(input);
  const existing = await BorrowerProfile.findOne({ user: userId });
  const bre = {
    status: result.eligible ? BreStatus.PASSED : BreStatus.REJECTED,
    failures: result.failures,
    evaluatedAt: new Date(),
    attempts: (existing?.bre.attempts ?? 0) + 1,
  };

  const profile = existing ?? new BorrowerProfile({ user: userId });
  profile.set({ ...input, bre });
  try {
    await profile.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw ApiError.conflict('PROFILE_CONFLICT', 'Your details were submitted twice at once. Please try again.');
    }
    throw err;
  }

  if (!result.eligible) {
    throw ApiError.unprocessable(
      'BRE_REJECTED',
      'Based on the details provided, you are not eligible for a loan.',
      { failures: result.failures },
    );
  }
  return toProfileDTO(profile);
}

const safeFilename = (original: string): string =>
  path.basename(original).replace(/[^\w.\- ]+/g, '_').slice(-120) || 'salary-slip';

/** Step 3: stores the salary slip and links it to the borrower's application. */
export async function uploadSalarySlip(
  userId: string,
  file: Express.Multer.File | undefined,
): Promise<SalarySlipDTO> {
  if (!file) {
    throw ApiError.badRequest('Attach the salary slip in the "file" field.', undefined, 'FILE_REQUIRED');
  }
  const mimeType = detectFileType(file.buffer);
  if (!mimeType) {
    throw new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'The file is not a valid PDF, JPG or PNG.');
  }

  const profile = await BorrowerProfile.findOne({ user: userId });
  if (!profile || profile.bre.status !== BreStatus.PASSED) {
    throw ApiError.conflict(
      'ELIGIBILITY_REQUIRED',
      'Complete your personal details and pass the eligibility check before uploading a salary slip.',
    );
  }
  await assertNoActiveLoan(userId);

  const previous = profile.salarySlip;
  const filename = safeFilename(file.originalname);
  const fileId = await saveFile(file.buffer, filename, { owner: profile.user, contentType: mimeType });

  const salarySlip: ISalarySlip = { fileId, filename, mimeType, size: file.size, uploadedAt: new Date() };
  profile.salarySlip = salarySlip;
  await profile.save();

  // A replaced slip is removed unless an earlier loan still points at it.
  if (previous && !(await Loan.exists({ 'salarySlip.fileId': previous.fileId }))) {
    await deleteFile(previous.fileId);
  }
  return toSalarySlipDTO(salarySlip);
}

/**
 * Step 4: creates the loan. Nothing the browser calculated is trusted: the
 * eligibility rules are run again and the interest is worked out here.
 */
export async function applyForLoan(userId: string, { amount, tenureDays }: LoanApplicationInput): Promise<LoanDTO> {
  const profile = await BorrowerProfile.findOne({ user: userId });
  if (!profile) {
    throw ApiError.conflict('ELIGIBILITY_REQUIRED', 'Complete your personal details before applying for a loan.');
  }

  const eligibility = evaluateBre(profile);
  if (!eligibility.eligible) {
    throw ApiError.unprocessable('BRE_REJECTED', 'Based on your details, you are not eligible for a loan.', {
      failures: eligibility.failures,
    });
  }
  if (!profile.salarySlip) {
    throw ApiError.conflict('SALARY_SLIP_REQUIRED', 'Upload your salary slip before applying for a loan.');
  }
  await assertNoActiveLoan(userId);

  const quote = buildLoanQuote(amount, tenureDays);
  const now = new Date();
  const { fileId, filename, mimeType, size, uploadedAt } = profile.salarySlip;

  try {
    const loan = await Loan.create({
      borrower: userId,
      applicant: {
        fullName: profile.fullName,
        pan: profile.pan,
        dateOfBirth: profile.dateOfBirth,
        monthlySalary: profile.monthlySalary,
        employmentMode: profile.employmentMode,
      },
      salarySlip: { fileId, filename, mimeType, size, uploadedAt },
      principal: quote.principal,
      tenureDays: quote.tenureDays,
      interestRate: quote.interestRate,
      interest: quote.interest,
      totalRepayment: quote.totalRepayment,
      amountPaid: 0,
      status: LoanStatus.APPLIED,
      appliedAt: now,
      statusHistory: [{ status: LoanStatus.APPLIED, changedAt: now, changedBy: userId }],
    });
    // They have applied, so they are no longer a returning lead for Sales.
    if (profile.reapplyRequestedAt) {
      profile.reapplyRequestedAt = undefined;
      await profile.save();
    }
    return toLoanDTO(loan);
  } catch (err) {
    // Two "Apply" requests at once: the partial unique index lets only one through.
    if (isDuplicateKeyError(err)) throw activeLoanConflict();
    throw err;
  }
}

/**
 * Notes that a past borrower has started a new application, so Sales can
 * follow up if they do not finish it. Only meaningful for someone who has
 * borrowed before and has nothing in progress; otherwise it does nothing.
 */
export async function recordReapplyIntent(userId: string): Promise<{ recorded: boolean }> {
  const [hasPastLoan, hasActiveLoan] = await Promise.all([
    Loan.exists({ borrower: userId }),
    Loan.exists({ borrower: userId, status: { $in: ACTIVE_LOAN_STATUSES } }),
  ]);
  if (!hasPastLoan || hasActiveLoan) return { recorded: false };

  const updated = await BorrowerProfile.updateOne({ user: userId }, { $set: { reapplyRequestedAt: new Date() } });
  return { recorded: updated.matchedCount === 1 };
}

export async function listOwnLoans(userId: string): Promise<LoanDTO[]> {
  const loans = await Loan.find({ borrower: userId }).sort({ appliedAt: -1 });
  return loans.map((loan) => toLoanDTO(loan));
}

/** A borrower can only ever read their own loan; anyone else's looks like it does not exist. */
export async function getOwnLoan(userId: string, loanId: string): Promise<{ loan: LoanDTO; payments: PaymentDTO[] }> {
  const loan = await Loan.findOne({ _id: loanId, borrower: userId });
  if (!loan) throw ApiError.notFound('Loan not found.');

  const payments = await Payment.find({ loan: loan._id }).sort({ paidAt: 1, createdAt: 1 });
  return { loan: toLoanDTO(loan), payments: payments.map((payment) => toPaymentDTO(payment)) };
}
