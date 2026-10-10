import type { NextFunction, Request, Response } from 'express';
import { User } from '../models/user.model';
import { verifyAccessToken } from '../services/token';
import type { AuthUser } from '../types/auth';
import { ApiError } from '../utils/ApiError';

/**
 * Verifies the `Authorization: Bearer <jwt>` header and attaches the caller to
 * `req.user`. Responds 401 when the token is missing, invalid or expired.
 *
 * The user is re-read from the database on every request instead of trusting
 * the role inside the token, so deleting an account or changing its role takes
 * effect immediately rather than when the token expires.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized();
  }

  let userId: string;
  try {
    userId = verifyAccessToken(header.slice('Bearer '.length).trim()).sub;
  } catch {
    throw ApiError.unauthorized('Your session is invalid or has expired. Please log in again.', 'INVALID_TOKEN');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('This account no longer exists.', 'INVALID_TOKEN');
  }

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
}

/** Returns the authenticated caller, for use in handlers that run after `authenticate`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
