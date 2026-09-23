/**
 * Standard error shape used across the whole API.
 * Thrown from controllers, caught by errorHandler middleware.
 *
 * Response body shape (see middleware/errorHandler.js):
 * { "code": "NOT_FOUND", "message": "Installation not found.", "detail": {...} }
 */
class ApiError extends Error {
  constructor(statusCode, code, message, detail = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.detail = detail;
  }
}

module.exports = ApiError;
