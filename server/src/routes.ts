import { Router } from 'express';
import { Role } from './constants/roles';
import { authenticate } from './middleware/authenticate';
import { authorize, authorizeModule } from './middleware/authorize';
import { authRouter } from './modules/auth/auth.routes';
import { borrowerRouter } from './modules/borrower/borrower.routes';
import { collectionRouter } from './modules/collection/collection.routes';
import { disbursementRouter } from './modules/disbursement/disbursement.routes';
import { filesRouter } from './modules/files/files.routes';
import { salesRouter } from './modules/sales/sales.routes';
import { sanctionRouter } from './modules/sanction/sanction.routes';

/**
 * The whole access-control policy of the API, in one place.
 *
 * Each dashboard module lives under its own prefix and is guarded once, here,
 * so a new route added to a module is protected by default: nobody has to
 * remember to add a role check to an individual handler.
 *
 *   borrower      → borrowers only (staff have no reason to use the portal)
 *   sales         → Sales + Admin
 *   sanction      → Sanction + Admin
 *   disbursement  → Disbursement + Admin
 *   collection    → Collection + Admin
 */
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok' } });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/borrower', authenticate, authorize(Role.BORROWER), borrowerRouter);
apiRouter.use('/sales', authenticate, authorizeModule(Role.SALES), salesRouter);
apiRouter.use('/sanction', authenticate, authorizeModule(Role.SANCTION), sanctionRouter);
apiRouter.use('/disbursement', authenticate, authorizeModule(Role.DISBURSEMENT), disbursementRouter);
apiRouter.use('/collection', authenticate, authorizeModule(Role.COLLECTION), collectionRouter);
apiRouter.use('/files', authenticate, filesRouter);
