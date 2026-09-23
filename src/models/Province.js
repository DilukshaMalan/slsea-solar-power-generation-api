const mongoose = require('mongoose');

const provinceSchema = new mongoose.Schema(
  {
    province_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { collection: 'provinces', versionKey: false }
);

module.exports = mongoose.model('Province', provinceSchema);
