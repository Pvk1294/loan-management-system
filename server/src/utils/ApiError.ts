/**
 * An error that maps to a specific HTTP response. Anything thrown that is not
 * an ApiError is treated as an unexpected failure and reported as a 500.
 *
 * Every error leaves the API in the same shape:
 *   { "error": { "code": "...", "message": "...", "details": ... } }
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** 400: the request itself is malformed (missing or badly typed fields). */
  static badRequest(message: string, details?: unknown, code = 'VALIDATION_ERROR'): ApiError {
    return new ApiError(400, code, message, details);
  }

  /** 401: we do not know who is calling (no token, bad token, bad credentials). */
  static unauthorized(message = 'Authentication required.', code = 'UNAUTHENTICATED'): ApiError {
    return new ApiError(401, code, message);
  }

  /** 403: we know who is calling, and their role is not allowed to do this. */
  static forbidden(message = 'You do not have access to this resource.'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found.'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  /** 409: the request is valid but clashes with the current state of the data. */
  static conflict(code: string, message: string, details?: unknown): ApiError {
    return new ApiError(409, code, message, details);
  }

  /** 422: well-formed input that a business rule turns down. */
  static unprocessable(code: string, message: string, details?: unknown): ApiError {
    return new ApiError(422, code, message, details);
  }
}
