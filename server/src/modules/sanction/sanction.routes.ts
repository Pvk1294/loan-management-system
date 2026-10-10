import { type Request, type Response, Router } from 'express';
import { toLoanDTO } from '../../dto/loan.dto';
import { currentUser } from '../../middleware/authenticate';
import { moduleLoanQuerySchema } from '../../services/loanQueries';
import { objectIdSchema } from '../../utils/validation';
import * as sanctionService from './sanction.service';

/** Sanction module. Mounted behind `authenticate` + `authorizeModule(SANCTION)` in routes.ts. */
export const sanctionRouter = Router();

sanctionRouter.get('/loans', async (req: Request, res: Response) => {
  const { loans, meta } = await sanctionService.listLoans(moduleLoanQuerySchema.parse(req.query));
  res.json({ data: { loans: loans.map((loan) => toLoanDTO(loan, { includeActors: true })) }, meta });
});

sanctionRouter.post('/loans/:id/approve', async (req: Request, res: Response) => {
  const loan = await sanctionService.approveLoan(objectIdSchema.parse(req.params.id), currentUser(req).id);
  res.json({ data: { loan } });
});

sanctionRouter.post('/loans/:id/reject', async (req: Request, res: Response) => {
  const { reason } = sanctionService.rejectSchema.parse(req.body);
  const loan = await sanctionService.rejectLoan(objectIdSchema.parse(req.params.id), currentUser(req).id, reason);
  res.json({ data: { loan } });
});
