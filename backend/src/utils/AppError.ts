/** Operational error with an HTTP status code. Safe to expose its message. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new AppError(message, 400, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new AppError(message, 401);
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new AppError(message, 403);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }
  static conflict(message = 'Conflict') {
    return new AppError(message, 409);
  }
  static serviceUnavailable(message = 'Service unavailable') {
    return new AppError(message, 503);
  }
}
