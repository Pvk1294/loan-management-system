import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`));
}

/** Translates anything thrown in a handler into the API's single error shape. */
function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.map(String).join('.'),
      message: issue.message,
    }));
    return ApiError.badRequest('Some fields are missing or invalid.', details);
  }

  if (err instanceof MulterError) {
    return err.code === 'LIMIT_FILE_SIZE'
      ? new ApiError(413, 'FILE_TOO_LARGE', 'The file is larger than the 5 MB limit.')
      : ApiError.badRequest('Upload exactly one file in the "file" field.', undefined, 'INVALID_UPLOAD');
  }

  if (err instanceof mongoose.Error.CastError) {
    return ApiError.badRequest('The identifier in the request is not valid.');
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return ApiError.badRequest(err.message);
  }

  // Errors raised by express.json() for a malformed or oversized body.
  const bodyError = err as { type?: string };
  if (bodyError?.type === 'entity.parse.failed') {
    return ApiError.badRequest('The request body is not valid JSON.', undefined, 'INVALID_JSON');
  }
  if (bodyError?.type === 'entity.too.large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  }

  return new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong on our side. Please try again.');
}

// Express recognises an error handler by its four arguments, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const apiError = toApiError(err);

  if (apiError.statusCode >= 500 && !env.isTest) {
    console.error(err);
  }

  res.status(apiError.statusCode).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details !== undefined && { details: apiError.details }),
    },
  });
};
