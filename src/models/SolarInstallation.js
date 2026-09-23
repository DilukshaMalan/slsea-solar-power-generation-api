const mongoose = require('mongoose');

const solarInstallationSchema = new mongoose.Schema(
  {
    installation_id: { type: String, required: true, unique: true },
    substation_id: { type: String, required: true, ref: 'GridSubstation' },
    meter_id: { type: String, required: true },
    owner_name: { type: String },
    capacity_kw: { type: Number, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    installed_date: { type: String },
    api_key: { type: String, required: true, select: false }, // never returned by default
  },
  { collection: 'solar_installations', versionKey: false }
);

solarInstallationSchema.index({ substation_id: 1 });

module.exports = mongoose.model('SolarInstallation', solarInstallationSchema);
