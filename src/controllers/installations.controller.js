const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const SolarInstallation = require('../models/SolarInstallation');
const GridSubstation = require('../models/GridSubstation');
const GenerationReading = require('../models/GenerationReading');
const crypto = require('crypto');

// GET /installations  (flat list — not in original map but useful for admin views/testing)
exports.list = asyncHandler(async (req, res) => {
  const installations = await SolarInstallation.find();
  res.json(installations);
});

// GET /installations/:id  — COMPOSITE resource (resource map #8)
// Combines the installation with its parent substation and its latest
// reading, embedded in one response, rather than three separate calls.
exports.getOne = asyncHandler(async (req, res) => {
  const installation = await SolarInstallation.findOne({ installation_id: req.params.id });
  if (!installation) {
    throw new ApiError(404, 'NOT_FOUND', `Installation ${req.params.id} not found.`);
  }

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

// GET /installations/:id/latest-reading  — PROCESSING resource (resource map #13)
// Computed live via sort+limit(1); never stored anywhere.
exports.getLatestReading = asyncHandler(async (req, res) => {
  const installation = await SolarInstallation.findOne({ installation_id: req.params.id });
  if (!installation) {
    throw new ApiError(404, 'NOT_FOUND', `Installation ${req.params.id} not found.`);
  }

  const latestReading = await GenerationReading
    .findOne({ installation_id: req.params.id })
    .sort({ timestamp: -1 });

  if (!latestReading) {
    throw new ApiError(404, 'NOT_FOUND', `No readings yet for installation ${req.params.id}.`);
  }

  res.json(latestReading);
});

// POST /installations  (requires: national role)
// Provisions a new installation and issues its device api_key.
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

  // api_key is normally hidden (select: false) — but we return it ONCE,
  // here, at creation time, since this is the only chance the caller
  // gets to see it (the device needs it to authenticate its writes).
  res.status(201)
     .location(`/installations/${installation.installation_id}`)
     .json({ ...installation.toObject(), api_key });
});

// PATCH /installations/:id  (requires: national role)
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

// DELETE /installations/:id  (requires: national role)
// Cascade: an installation's readings belong exclusively to it, so they
// are deleted together (unlike substations, which block deletion because
// multiple independent installations would otherwise be orphaned).
exports.remove = asyncHandler(async (req, res) => {
  const installation = await SolarInstallation.findOne({ installation_id: req.params.id });
  if (!installation) {
    throw new ApiError(404, 'NOT_FOUND', `Installation ${req.params.id} not found.`);
  }

  const deletedReadings = await GenerationReading.deleteMany({ installation_id: req.params.id });
  await SolarInstallation.deleteOne({ installation_id: req.params.id });

  res.status(204).send();
  // (204 has no body by spec — deletedReadings.deletedCount is available
  // here if you want to log it server-side for an audit trail.)
});