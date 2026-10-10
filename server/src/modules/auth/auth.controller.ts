import type { Request, Response } from 'express';
import { toUserDTO } from '../../dto/user.dto';
import { currentUser } from '../../middleware/authenticate';
import { loginSchema, signupSchema } from './auth.schema';
import * as authService from './auth.service';

export async function signup(req: Request, res: Response): Promise<void> {
  const result = await authService.registerBorrower(signupSchema.parse(req.body));
  res.status(201).json({ data: result });
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(loginSchema.parse(req.body));
  res.json({ data: result });
}

export function me(req: Request, res: Response): void {
  res.json({ data: { user: toUserDTO(currentUser(req)) } });
}
