const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema(
  {
    district_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    province_id: { type: String, required: true, ref: 'Province' },
  },
  { collection: 'districts', versionKey: false }
);

districtSchema.index({ province_id: 1 });

module.exports = mongoose.model('District', districtSchema);
