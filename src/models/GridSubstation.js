const mongoose = require('mongoose');

const gridSubstationSchema = new mongoose.Schema(
  {
    substation_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    district_id: { type: String, required: true, ref: 'District' },
    capacity_mva: { type: Number },
  },
  { collection: 'grid_substations', versionKey: false }
);

gridSubstationSchema.index({ district_id: 1 });

module.exports = mongoose.model('GridSubstation', gridSubstationSchema);
