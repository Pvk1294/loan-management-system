import { type Request, type Response, Router } from 'express';
import { toLoanDTO } from '../../dto/loan.dto';
import { currentUser } from '../../middleware/authenticate';
import { moduleLoanQuerySchema } from '../../services/loanQueries';
import { objectIdSchema } from '../../utils/validation';
import * as disbursementService from './disbursement.service';

/** Disbursement module. Mounted behind `authenticate` + `authorizeModule(DISBURSEMENT)` in routes.ts. */
export const disbursementRouter = Router();

disbursementRouter.get('/loans', async (req: Request, res: Response) => {
  const { loans, meta } = await disbursementService.listLoans(moduleLoanQuerySchema.parse(req.query));
  res.json({ data: { loans: loans.map((loan) => toLoanDTO(loan, { includeActors: true })) }, meta });
});

disbursementRouter.post('/loans/:id/disburse', async (req: Request, res: Response) => {
  const loan = await disbursementService.disburseLoan(objectIdSchema.parse(req.params.id), currentUser(req).id);
  res.json({ data: { loan } });
});
