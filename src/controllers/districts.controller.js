const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const District = require('../models/District');
const GridSubstation = require('../models/GridSubstation');
const SolarInstallation = require('../models/SolarInstallation');
const GenerationReading = require('../models/GenerationReading');
const { assertDistrictInScope } = require('../utils/jurisdiction');

// GET /districts
exports.list = asyncHandler(async (req, res) => {
  const districts = await District.find();
  res.json(districts);
});

// GET /districts/:id
exports.getOne = asyncHandler(async (req, res) => {
  const district = await District.findOne({ district_id: req.params.id });
  if (!district) {
    throw new ApiError(404, 'NOT_FOUND', `District ${req.params.id} not found.`);
  }
  res.json(district);
});

// GET /districts/:id/substations
exports.listSubstations = asyncHandler(async (req, res) => {
  const district = await District.findOne({ district_id: req.params.id });
  if (!district) {
    throw new ApiError(404, 'NOT_FOUND', `District ${req.params.id} not found.`);
  }
  const substations = await GridSubstation.find({ district_id: req.params.id });
  res.json(substations);
});

// GET /districts/:id/generation-summary  (requires: logged-in user, own jurisdiction only)
// PROCESSING resource — aggregated live from generation_readings, never stored.
exports.getGenerationSummary = asyncHandler(async (req, res) => {
  const district = await District.findOne({ district_id: req.params.id });
  if (!district) {
    throw new ApiError(404, 'NOT_FOUND', `District ${req.params.id} not found.`);
  }

  await assertDistrictInScope(req.auth, req.params.id);

  const substations = await GridSubstation.find({ district_id: req.params.id }).select('substation_id');
  const substationIds = substations.map((s) => s.substation_id);

  const installations = await SolarInstallation.find({ substation_id: { $in: substationIds } }).select('installation_id');
  const installationIds = installations.map((i) => i.installation_id);

  if (installationIds.length === 0) {
    return res.json({
      district_id: district.district_id,
      installation_count: 0,
      current_total_power_kw: 0,
      todays_total_energy_kwh: 0,
      generated_at: new Date().toISOString(),
    });
  }

  // Current total power = sum of EACH installation's own latest reading.
  // Done via aggregation: group by installation, take the most recent
  // reading per group, then sum power_kw across those.
  const currentPowerResult = await GenerationReading.aggregate([
    { $match: { installation_id: { $in: installationIds } } },
    { $sort: { installation_id: 1, timestamp: -1 } },
    { $group: { _id: '$installation_id', latestPower: { $first: '$power_kw' } } },
    { $group: { _id: null, totalPower: { $sum: '$latestPower' } } },
  ]);
  const currentTotalPowerKw = currentPowerResult.length ? currentPowerResult[0].totalPower : 0;

  // Today's total energy = sum of energy_kwh generated since UTC midnight,
  // approximated as (latest reading today - first reading today) per
  // installation, since energy_kwh is cumulative, not a per-step delta.
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const todaysEnergyResult = await GenerationReading.aggregate([
    { $match: { installation_id: { $in: installationIds }, timestamp: { $gte: startOfToday } } },
    { $sort: { installation_id: 1, timestamp: 1 } },
    {
      $group: {
        _id: '$installation_id',
        firstEnergyToday: { $first: '$energy_kwh' },
        lastEnergyToday: { $last: '$energy_kwh' },
      },
    },
    {
      $project: {
        energyToday: { $subtract: ['$lastEnergyToday', '$firstEnergyToday'] },
      },
    },
    { $group: { _id: null, totalEnergyToday: { $sum: '$energyToday' } } },
  ]);
  const todaysTotalEnergyKwh = todaysEnergyResult.length ? todaysEnergyResult[0].totalEnergyToday : 0;

  res.json({
    district_id: district.district_id,
    installation_count: installationIds.length,
    current_total_power_kw: Math.round(currentTotalPowerKw * 1000) / 1000,
    todays_total_energy_kwh: Math.round(todaysTotalEnergyKwh * 1000) / 1000,
    generated_at: new Date().toISOString(),
  });
});