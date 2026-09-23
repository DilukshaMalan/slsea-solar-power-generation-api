const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

// Verifies a JWT bearer token and attaches its decoded payload to req.auth.
// Expected payload shape (finalised in Phase 6):
//   device token:  { type: 'installation', installation_id, scope: 'installation-write' }
//   user token:    { type: 'user', user_id, role, province_id, district_id, scope: 'analyst-read-by-district' }
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing bearer token.'));
  }

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token.'));
  }
}

// Restricts a route to a specific token scope (e.g. 'installation-write').
function requireScope(scope) {
  return (req, res, next) => {
    if (!req.auth || req.auth.scope !== scope) {
      return next(new ApiError(403, 'FORBIDDEN', `Requires scope: ${scope}`));
    }
    next();
  };
}

// TODO (Phase 6): jurisdiction filter — given req.auth (role/province_id/district_id),
// build a Mongo filter restricting readable districts/installations to the user's scope.
function jurisdictionFilter(req) {
  // placeholder — implemented alongside the read-path controllers
  return {};
}

module.exports = { requireAuth, requireScope, jurisdictionFilter };
