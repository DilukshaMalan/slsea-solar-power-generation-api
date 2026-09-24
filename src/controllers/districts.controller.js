const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const District = require('../models/District');
const GridSubstation = require('../models/GridSubstation');

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

// GET /districts/:id/generation-summary — stretch feature, built in Phase 7
exports.getGenerationSummary = asyncHandler(async (req, res) => {
  throw new ApiError(501, 'NOT_IMPLEMENTED', 'Generation summary coming in a later phase.');
});