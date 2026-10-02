const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const GenerationReading = require('../models/GenerationReading');
const SolarInstallation = require('../models/SolarInstallation');
const { resolveInstallationIds, enforceJurisdictionScope, assertInstallationInScope } = require('../utils/jurisdiction');
const crypto = require('crypto');

let counter = 0;
function generateReadingId() {
  counter += 1;
  return `RDG-${Date.now()}-${counter}`;
}

function parseQueryOptions(req) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
  const sortDir = (req.query.sort || '-timestamp').startsWith('-') ? -1 : 1;
  const sortObj = { timestamp: sortDir };

  const timeFilter = {};
  if (req.query.from) timeFilter.$gte = new Date(req.query.from);
  if (req.query.to) timeFilter.$lte = new Date(req.query.to);

  return { page, limit, sortObj, timeFilter };
}

async function applyConditionalGet(req, res, filter) {
  const newest = await GenerationReading.findOne(filter).sort({ timestamp: -1 }).select('timestamp');
  const total = await GenerationReading.countDocuments(filter);

  const basis = `${total}-${newest ? newest.timestamp.toISOString() : 'none'}`;
  const etag = `"${crypto.createHash('md5').update(basis).digest('hex')}"`;

  res.set('ETag', etag);
  if (newest) res.set('Last-Modified', newest.timestamp.toUTCString());

  const clientETag = req.headers['if-none-match'];
  if (clientETag && clientETag === etag) {
    res.status(304).send();
    return { shortCircuited: true, total };
  }
  return { shortCircuited: false, total };
}

// GET /installations/:id/readings  (requires: logged-in user, own jurisdiction only)
exports.getHistoryForInstallation = asyncHandler(async (req, res) => {
  const installation = await SolarInstallation.findOne({ installation_id: req.params.id });
  if (!installation) {
    throw new ApiError(404, 'NOT_FOUND', `Installation ${req.params.id} not found.`);
  }

  await assertInstallationInScope(req.auth, req.params.id);

  const { page, limit, sortObj, timeFilter } = parseQueryOptions(req);
  const filter = { installation_id: req.params.id };
  if (Object.keys(timeFilter).length) filter.timestamp = timeFilter;

  const { shortCircuited, total } = await applyConditionalGet(req, res, filter);
  if (shortCircuited) return;

  const data = await GenerationReading.find(filter).sort(sortObj).skip((page - 1) * limit).limit(limit);
  const totalPages = Math.ceil(total / limit);

  res.json({
    total, page, limit,
    next: page < totalPages ? `/installations/${req.params.id}/readings?page=${page + 1}&limit=${limit}` : null,
    prev: page > 1 ? `/installations/${req.params.id}/readings?page=${page - 1}&limit=${limit}` : null,
    data,
  });
});

// GET /installations/:id/latest-reading  (requires: logged-in user, own jurisdiction only)
exports.getLatestReadingScoped = asyncHandler(async (req, res) => {
  const installation = await SolarInstallation.findOne({ installation_id: req.params.id });
  if (!installation) {
    throw new ApiError(404, 'NOT_FOUND', `Installation ${req.params.id} not found.`);
  }
  await assertInstallationInScope(req.auth, req.params.id);

  const latestReading = await GenerationReading.findOne({ installation_id: req.params.id }).sort({ timestamp: -1 });
  if (!latestReading) {
    throw new ApiError(404, 'NOT_FOUND', `No readings yet for installation ${req.params.id}.`);
  }
  res.json(latestReading);
});

// GET /readings  (requires: logged-in user, own jurisdiction only)
exports.queryReadings = asyncHandler(async (req, res) => {
  const { province_id, district_id, substation_id } = req.query;
  const { page, limit, sortObj, timeFilter } = parseQueryOptions(req);

  const scoped = await enforceJurisdictionScope(req.auth, { province_id, district_id, substation_id });

  const filter = {};
  if (Object.keys(timeFilter).length) filter.timestamp = timeFilter;

  const installationIds = await resolveInstallationIds(scoped);
  if (installationIds !== null) {
    if (installationIds.length === 0) {
      return res.json({ total: 0, page, limit, next: null, prev: null, data: [] });
    }
    filter.installation_id = { $in: installationIds };
  }

  const { shortCircuited, total } = await applyConditionalGet(req, res, filter);
  if (shortCircuited) return;

  const data = await GenerationReading.find(filter).sort(sortObj).skip((page - 1) * limit).limit(limit);
  const totalPages = Math.ceil(total / limit);

  const nextQs = new URLSearchParams(req.query); nextQs.set('page', page + 1);
  const prevQs = new URLSearchParams(req.query); prevQs.set('page', page - 1);

  res.json({
    total, page, limit,
    next: page < totalPages ? `/readings?${nextQs.toString()}` : null,
    prev: page > 1 ? `/readings?${prevQs.toString()}` : null,
    data,
  });
});

// POST /installations/:id/readings  (requires: device api_key auth — unchanged)
exports.submitReading = asyncHandler(async (req, res) => {
  const { timestamp, power_kw, energy_kwh, voltage } = req.body;

  if (power_kw == null || energy_kwh == null || voltage == null) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'power_kw, energy_kwh, and voltage are required.');
  }
  if (power_kw > req.installation.capacity_kw) {
    throw new ApiError(400, 'VALIDATION_ERROR', `power_kw (${power_kw}) exceeds installation capacity (${req.installation.capacity_kw} kW).`);
  }

  const reading = await GenerationReading.create({
    reading_id: generateReadingId(),
    installation_id: req.params.id,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    power_kw, energy_kwh, voltage,
  });

  res.status(201).location(`/readings/${reading.reading_id}`).json(reading);
});

// GET /readings/:id  (unchanged — not jurisdiction-scoped per our Option A decision)
exports.getOne = asyncHandler(async (req, res) => {
  const reading = await GenerationReading.findOne({ reading_id: req.params.id });
  if (!reading) {
    throw new ApiError(404, 'NOT_FOUND', `Reading ${req.params.id} not found.`);
  }
  res.json(reading);
});