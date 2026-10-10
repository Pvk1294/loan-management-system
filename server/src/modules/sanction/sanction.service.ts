import { z } from 'zod';
import { LoanStatus } from '../../constants/loan';
import { type LoanDTO, toLoanDTO } from '../../dto/loan.dto';
import { transitionLoan } from '../../services/loanLifecycle';
import { DASHBOARD_POPULATE, type ModuleLoanQuery, type ModuleViews, listModuleLoans } from '../../services/loanQueries';
import { toObjectId } from '../../utils/mongo';

/** Sanction reviews applied loans; everything it has decided moves to its history. */
const VIEWS: ModuleViews = {
  queue: [LoanStatus.APPLIED],
  history: [LoanStatus.SANCTIONED, LoanStatus.REJECTED, LoanStatus.DISBURSED, LoanStatus.CLOSED],
};

export const rejectSchema = z.object({
  reason: z
    .string('A rejection reason is required.')
    .trim()
    .min(5, 'Give a reason of at least 5 characters.')
    .max(500, 'Keep the reason under 500 characters.'),
});

export const listLoans = (query: ModuleLoanQuery) => listModuleLoans(VIEWS, query);

/** APPLIED → SANCTIONED */
export async function approveLoan(loanId: string, actorId: string): Promise<LoanDTO> {
  const loan = await transitionLoan({
    loanId,
    to: LoanStatus.SANCTIONED,
    actorId,
    set: { sanctionedAt: new Date(), sanctionedBy: toObjectId(actorId) },
  });
  return toLoanDTO(await loan.populate(DASHBOARD_POPULATE), { includeActors: true });
}

/** APPLIED → REJECTED. Terminal: the borrower may submit a fresh application afterwards. */
export async function rejectLoan(loanId: string, actorId: string, reason: string): Promise<LoanDTO> {
  const loan = await transitionLoan({
    loanId,
    to: LoanStatus.REJECTED,
    actorId,
    set: { rejectedAt: new Date(), rejectedBy: toObjectId(actorId), rejectionReason: reason },
    note: reason,
  });
  return toLoanDTO(await loan.populate(DASHBOARD_POPULATE), { includeActors: true });
}
