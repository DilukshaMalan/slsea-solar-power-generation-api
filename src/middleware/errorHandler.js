const ApiError = require('../utils/ApiError');

// Central error handler — every client error across the whole API
// returns this same shape: { code, message, detail }.
// This satisfies the brief's "one consistent error-body schema" requirement.
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      detail: err.detail,
    });
  }

  // Fallback for unexpected errors (e.g. Mongoose validation errors, bugs)
  console.error(err);
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    detail: null,
  });
}

module.exports = errorHandler;
