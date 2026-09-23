const ApiError = require('../utils/ApiError');

// Catches any request that didn't match a defined route.
function notFound(req, res, next) {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
