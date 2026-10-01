const District = require('../models/District');
const GridSubstation = require('../models/GridSubstation');
const SolarInstallation = require('../models/SolarInstallation');

// Resolves a jurisdiction filter (province_id, district_id, or
// substation_id — most specific wins if more than one is given) down to
// a concrete list of installation_ids. MongoDB has no joins, so this
// walks the hierarchy manually: province -> districts -> substations -> installations.
// Returns null if no jurisdiction filter was given (meaning: no restriction).
async function resolveInstallationIds({ province_id, district_id, substation_id }) {
  if (substation_id) {
    const installations = await SolarInstallation.find({ substation_id }).select('installation_id');
    return installations.map((i) => i.installation_id);
  }

  if (district_id) {
    const substations = await GridSubstation.find({ district_id }).select('substation_id');
    const substationIds = substations.map((s) => s.substation_id);
    const installations = await SolarInstallation.find({ substation_id: { $in: substationIds } }).select('installation_id');
    return installations.map((i) => i.installation_id);
  }

  if (province_id) {
    const districts = await District.find({ province_id }).select('district_id');
    const districtIds = districts.map((d) => d.district_id);
    const substations = await GridSubstation.find({ district_id: { $in: districtIds } }).select('substation_id');
    const substationIds = substations.map((s) => s.substation_id);
    const installations = await SolarInstallation.find({ substation_id: { $in: substationIds } }).select('installation_id');
    return installations.map((i) => i.installation_id);
  }

  return null; // no jurisdiction filter applied
}

module.exports = { resolveInstallationIds };