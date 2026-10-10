import { type Request, type Response, Router } from 'express';
import { toLoanDTO } from '../../dto/loan.dto';
import { currentUser } from '../../middleware/authenticate';
import { moduleLoanQuerySchema } from '../../services/loanQueries';
import { objectIdSchema } from '../../utils/validation';
import * as collectionService from './collection.service';

/** Collection module. Mounted behind `authenticate` + `authorizeModule(COLLECTION)` in routes.ts. */
export const collectionRouter = Router();

collectionRouter.get('/loans', async (req: Request, res: Response) => {
  const { loans, meta } = await collectionService.listLoans(moduleLoanQuerySchema.parse(req.query));
  res.json({ data: { loans: loans.map((loan) => toLoanDTO(loan, { includeActors: true })) }, meta });
});

collectionRouter.get('/loans/:id/payments', async (req: Request, res: Response) => {
  const payments = await collectionService.listPayments(objectIdSchema.parse(req.params.id));
  res.json({ data: { payments } });
});

collectionRouter.post('/loans/:id/payments', async (req: Request, res: Response) => {
  const result = await collectionService.recordPayment(
    objectIdSchema.parse(req.params.id),
    collectionService.paymentSchema.parse(req.body),
    currentUser(req).id,
  );
  res.status(201).json({ data: result });
});
