const mongoose = require('mongoose');

const generationReadingSchema = new mongoose.Schema(
  {
    reading_id: { type: String, required: true, unique: true },
    installation_id: { type: String, required: true, ref: 'SolarInstallation' },
    timestamp: { type: Date, required: true },
    power_kw: { type: Number, required: true },
    energy_kwh: { type: Number, required: true },
    voltage: { type: Number, required: true },
  },
  { collection: 'generation_readings', versionKey: false }
);

// Compound index: powers "readings for installation X sorted by time"
// AND the last-known-reading query (sort timestamp desc, limit 1).
generationReadingSchema.index({ installation_id: 1, timestamp: -1 });
// Supports time-window filtering across installations (e.g. district summary).
generationReadingSchema.index({ timestamp: -1 });

module.exports = mongoose.model('GenerationReading', generationReadingSchema);
