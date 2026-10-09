const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const GridSubstation = require('../models/GridSubstation');
const SolarInstallation = require('../models/SolarInstallation');
const { assertDistrictInScope } = require('../utils/jurisdiction');

// GET /substations  (requireAuth only — any logged-in user, no scope filter)
exports.list = asyncHandler(async (req, res) => {
  const substations = await GridSubstation.find();
  res.json(substations);
});

// GET /substations/:id  (requireAuth only — any logged-in user, no scope filter)
exports.getOne = asyncHandler(async (req, res) => {
  const substation = await GridSubstation.findOne({ substation_id: req.params.id });
  if (!substation) {
    throw new ApiError(404, 'NOT_FOUND', `Substation ${req.params.id} not found.`);
  }
  res.json(substation);
});

// GET /substations/:id/installations  (requireAuth + jurisdiction scope)
exports.listInstallations = asyncHandler(async (req, res) => {
  const substation = await GridSubstation.findOne({ substation_id: req.params.id });
  if (!substation) {
    throw new ApiError(404, 'NOT_FOUND', `Substation ${req.params.id} not found.`);
  }

  // Scope check is at the DISTRICT level, since that's the grain our
  // scoping rules are defined at — a substation belongs to one district.
  await assertDistrictInScope(req.auth, substation.district_id);

  const installations = await SolarInstallation.find({ substation_id: req.params.id });
  res.json(installations);
});

// POST /substations  (requires: national role) — unchanged
exports.create = asyncHandler(async (req, res) => {
  const District = require('../models/District');
  const { substation_id, name, district_id, capacity_mva } = req.body;

  if (!substation_id || !name || !district_id) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'substation_id, name, and district_id are required.');
  }

  const district = await District.findOne({ district_id });
  if (!district) {
    throw new ApiError(400, 'VALIDATION_ERROR', `district_id ${district_id} does not exist.`);
  }

  const existing = await GridSubstation.findOne({ substation_id });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', `Substation ${substation_id} already exists.`);
  }

  const substation = await GridSubstation.create({ substation_id, name, district_id, capacity_mva });
  res.status(201).location(`/substations/${substation.substation_id}`).json(substation);
});

// PATCH /substations/:id  (requires: national role) — unchanged
exports.update = asyncHandler(async (req, res) => {
  const substation = await GridSubstation.findOneAndUpdate(
    { substation_id: req.params.id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!substation) {
    throw new ApiError(404, 'NOT_FOUND', `Substation ${req.params.id} not found.`);
  }
  res.json(substation);
});

// DELETE /substations/:id  (requires: national role) — unchanged
exports.remove = asyncHandler(async (req, res) => {
  const substation = await GridSubstation.findOne({ substation_id: req.params.id });
  if (!substation) {
    throw new ApiError(404, 'NOT_FOUND', `Substation ${req.params.id} not found.`);
  }

  const installationCount = await SolarInstallation.countDocuments({ substation_id: req.params.id });
  if (installationCount > 0) {
    throw new ApiError(409, 'CONFLICT', 'Cannot delete substation with active installations.', { installation_count: installationCount });
  }

  await GridSubstation.deleteOne({ substation_id: req.params.id });
  res.status(204).send();
});