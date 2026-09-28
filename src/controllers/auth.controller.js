const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

// POST /auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'email and password are required.');
  }

  // password_hash has select: false in the schema, so we must explicitly
  // request it here — it's hidden from every other query by default.
  const user = await User.findOne({ email }).select('+password_hash');

  if (!user) {
    // Deliberately the same error as a wrong password — never reveal
    // whether an email exists in the system.
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  const payload = {
    type: 'user',
    user_id: user.user_id,
    role: user.role,
    province_id: user.province_id,
    district_id: user.district_id,
    scope: 'analyst-read-by-district',
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

  res.json({
    token,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      province_id: user.province_id,
      district_id: user.district_id,
    },
  });
});