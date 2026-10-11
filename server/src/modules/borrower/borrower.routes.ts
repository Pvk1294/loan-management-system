import { Router } from 'express';
import { salarySlipUpload } from '../../middleware/upload';
import * as borrowerController from './borrower.controller';

/** Borrower portal. Mounted behind `authenticate` + `authorize(BORROWER)` in routes.ts. */
export const borrowerRouter = Router();

borrowerRouter.get('/application', borrowerController.getApplication);
borrowerRouter.put('/profile', borrowerController.submitProfile);
borrowerRouter.post('/salary-slip', salarySlipUpload, borrowerController.uploadSalarySlip);
borrowerRouter.post('/loans', borrowerController.applyForLoan);
borrowerRouter.post('/reapply-intent', borrowerController.recordReapplyIntent);
borrowerRouter.get('/loans', borrowerController.listLoans);
borrowerRouter.get('/loans/:id', borrowerController.getLoan);
