import type { NextFunction, Request, Response } from 'express';
import { Role } from '../constants/roles';
import { ApiError } from '../utils/ApiError';

/**
 * Role-based access control. Must run after `authenticate`.
 *
 *   router.use(authenticate, authorize(Role.SANCTION))
 *
 * Responds 403 when the caller is logged in but their role is not in the list.
 * (A missing or invalid token is a 401 and is handled by `authenticate`.)
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw ApiError.unauthorized();
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(`Your role (${req.user.role}) does not have access to this resource.`);
    }
    next();
  };
}

/** Guard for a dashboard module: its own executive role, plus Admin who can access every module. */
export const authorizeModule = (moduleRole: Role) => authorize(Role.ADMIN, moduleRole);
