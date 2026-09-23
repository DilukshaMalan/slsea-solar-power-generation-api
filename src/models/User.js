const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ['national', 'provincial', 'district'] },
    province_id: { type: String, default: null, ref: 'Province' },
    district_id: { type: String, default: null, ref: 'District' },
  },
  { collection: 'users', versionKey: false }
);

userSchema.index({ district_id: 1 });
userSchema.index({ province_id: 1 });

module.exports = mongoose.model('User', userSchema);
