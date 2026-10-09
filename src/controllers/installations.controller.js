const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const SolarInstallation = require('../models/SolarInstallation');
const GridSubstation = require('../models/GridSubstation');
const GenerationReading = require('../models/GenerationReading');
const crypto = require('crypto');
const { enforceJurisdictionScope, resolveInstallationIds, assertInstallationInScope } = require('../utils/jurisdiction');

// GET /installations  (requireAuth + jurisdiction scope + pagination)
exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);

  // No query-string jurisdiction params on this endpoint — just resolve
  // the caller's OWN default scope (national = unrestricted, provincial/
  // district = their own province/district).
  const scoped = await enforceJurisdictionScope(req.auth, {});
  const installationIds = await resolveInstallationIds(scoped);

  const filter = {};
  if (installationIds !== null) {
    filter.installation_id = { $in: installationIds };
  }

  const total = await SolarInstallation.countDocuments(filter);
  const installations = await SolarInstallation.find(filter)
    .skip((page - 1) * limit)
    .limit(limit);

  const totalPages = Math.ceil(total / limit);
  res.json({
    total,
    page,
    limit,
    next: page < totalPages ? `/installations?page=${page + 1}&limit=${limit}` : null,
    prev: page > 1 ? `/installations?page=${page - 1}&limit=${limit}` : null,
    data: installations,
  });
});

// GET /installations/:id  — COMPOSITE resource (requireAuth + jurisdiction scope)
exports.getOne = asyncHandler(async (req, res) => {
  const installation = await SolarInstallation.findOne({ installation_id: req.params.id });
  if (!installation) {
    throw new ApiError(404, 'NOT_FOUND', `Installation ${req.params.id} not found.`);
  }

  await assertInstallationInScope(req.auth, req.params.id);

  const substation = await GridSubstation.findOne({ substation_id: installation.substation_id });
  const latestReading = await GenerationReading
    .findOne({ installation_id: installation.installation_id })
    .sort({ timestamp: -1 });

  res.json({
    ...installation.toObject(),
    substation: substation ? { substation_id: substation.substation_id, name: substation.name } : null,
    latest_reading: latestReading || null,
  });
});

// POST /installations  (requires: national role) — unchanged
exports.create = asyncHandler(async (req, res) => {
  const { installation_id, substation_id, meter_id, owner_name, capacity_kw, latitude, longitude, installed_date } = req.body;

  if (!installation_id || !substation_id || !meter_id || !capacity_kw) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'installation_id, substation_id, meter_id, and capacity_kw are required.');
  }

  const substation = await GridSubstation.findOne({ substation_id });
  if (!substation) {
    throw new ApiError(400, 'VALIDATION_ERROR', `substation_id ${substation_id} does not exist.`);
  }

  const existing = await SolarInstallation.findOne({ installation_id });
  if (existing) {
    throw new ApiError(409, 'CONFLICT', `Installation ${installation_id} already exists.`);
  }

  const api_key = `key_${crypto.randomBytes(24).toString('hex')}`;

  const installation = await SolarInstallation.create({
    installation_id, substation_id, meter_id, owner_name, capacity_kw,
    latitude, longitude, installed_date, api_key,
  });

  res.status(201).location(`/installations/${installation.installation_id}`).json({ ...installation.toObject(), api_key });
});

// PATCH /installations/:id  (requires: national role) — unchanged
exports.update = asyncHandler(async (req, res) => {
  const installation = await SolarInstallation.findOneAndUpdate(
    { installation_id: req.params.id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!installation) {
    throw new ApiError(404, 'NOT_FOUND', `Installation ${req.params.id} not found.`);
  }
  res.json(installation);
});

// DELETE /installations/:id  (requires: national role) — unchanged, cascade
exports.remove = asyncHandler(async (req, res) => {
  const installation = await SolarInstallation.findOne({ installation_id: req.params.id });
  if (!installation) {
    throw new ApiError(404, 'NOT_FOUND', `Installation ${req.params.id} not found.`);
  }

  await GenerationReading.deleteMany({ installation_id: req.params.id });
  await SolarInstallation.deleteOne({ installation_id: req.params.id });

  res.status(204).send();
});