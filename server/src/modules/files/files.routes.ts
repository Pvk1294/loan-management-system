import { type NextFunction, type Request, type Response, Router } from 'express';
import { Role } from '../../constants/roles';
import { currentUser } from '../../middleware/authenticate';
import { findFile, openDownloadStream } from '../../services/fileStorage';
import { ApiError } from '../../utils/ApiError';
import { objectIdSchema } from '../../utils/validation';

/** Staff who need to read a borrower's salary slip to do their job. */
const REVIEWER_ROLES: readonly Role[] = [Role.ADMIN, Role.SANCTION];

/** Uploaded documents. Mounted behind `authenticate` in routes.ts. */
export const filesRouter = Router();

/**
 * Streams a salary slip. Salary slips are personal financial documents, so
 * there is no public URL: only the borrower who uploaded the file and the
 * teams that review applications may read it.
 */
filesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const user = currentUser(req);
  const file = await findFile(objectIdSchema.parse(req.params.id));
  if (!file) throw ApiError.notFound('File not found.');

  const isOwner = file.metadata.owner.toString() === user.id;
  if (!isOwner && !REVIEWER_ROLES.includes(user.role)) {
    throw ApiError.forbidden('You do not have access to this document.');
  }

  res.set({
    'Content-Type': file.metadata.contentType,
    'Content-Length': String(file.length),
    'Content-Disposition': `inline; filename="${file.filename}"`,
    'Cache-Control': 'private, no-store',
  });
  openDownloadStream(file.id).on('error', next).pipe(res);
});
