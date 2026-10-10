import { LoanStatus } from '../../constants/loan';
import { type LoanDTO, toLoanDTO } from '../../dto/loan.dto';
import { Loan } from '../../models/loan.model';
import { transitionLoan } from '../../services/loanLifecycle';
import { DASHBOARD_POPULATE, type ModuleLoanQuery, type ModuleViews, listModuleLoans } from '../../services/loanQueries';
import { ApiError } from '../../utils/ApiError';
import { addDays } from '../../utils/dates';
import { toObjectId } from '../../utils/mongo';

/** Disbursement releases funds for sanctioned loans. */
const VIEWS: ModuleViews = {
  queue: [LoanStatus.SANCTIONED],
  history: [LoanStatus.DISBURSED, LoanStatus.CLOSED],
};

export const listLoans = (query: ModuleLoanQuery) => listModuleLoans(VIEWS, query);

/**
 * SANCTIONED → DISBURSED. The repayment clock starts here: the due date is the
 * disbursement date plus the tenure the borrower chose.
 */
export async function disburseLoan(loanId: string, actorId: string): Promise<LoanDTO> {
  const existing = await Loan.findById(loanId).select('tenureDays');
  if (!existing) throw ApiError.notFound('Loan not found.');

  const disbursedAt = new Date();
  const loan = await transitionLoan({
    loanId,
    to: LoanStatus.DISBURSED,
    actorId,
    set: {
      disbursedAt,
      disbursedBy: toObjectId(actorId),
      dueDate: addDays(disbursedAt, existing.tenureDays),
    },
  });
  return toLoanDTO(await loan.populate(DASHBOARD_POPULATE), { includeActors: true });
}
