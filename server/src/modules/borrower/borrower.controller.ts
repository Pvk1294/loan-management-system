import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate';
import { objectIdSchema } from '../../utils/validation';
import { loanApplicationSchema, profileSchema } from './borrower.schema';
import * as borrowerService from './borrower.service';

export async function getApplication(req: Request, res: Response): Promise<void> {
  res.json({ data: await borrowerService.getApplication(currentUser(req).id) });
}

export async function submitProfile(req: Request, res: Response): Promise<void> {
  const profile = await borrowerService.submitProfile(currentUser(req).id, profileSchema.parse(req.body));
  res.json({ data: { profile } });
}

export async function uploadSalarySlip(req: Request, res: Response): Promise<void> {
  const salarySlip = await borrowerService.uploadSalarySlip(currentUser(req).id, req.file);
  res.status(201).json({ data: { salarySlip } });
}

export async function applyForLoan(req: Request, res: Response): Promise<void> {
  const loan = await borrowerService.applyForLoan(currentUser(req).id, loanApplicationSchema.parse(req.body));
  res.status(201).json({ data: { loan } });
}

export async function recordReapplyIntent(req: Request, res: Response): Promise<void> {
  res.json({ data: await borrowerService.recordReapplyIntent(currentUser(req).id) });
}

export async function listLoans(req: Request, res: Response): Promise<void> {
  res.json({ data: { loans: await borrowerService.listOwnLoans(currentUser(req).id) } });
}

export async function getLoan(req: Request, res: Response): Promise<void> {
  const loanId = objectIdSchema.parse(req.params.id);
  res.json({ data: await borrowerService.getOwnLoan(currentUser(req).id, loanId) });
}
