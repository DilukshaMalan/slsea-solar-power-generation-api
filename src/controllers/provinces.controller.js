const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Province = require('../models/Province');
const District = require('../models/District');

// GET /provinces
exports.list = asyncHandler(async (req, res) => {
  const provinces = await Province.find();
  res.json(provinces);
});

// GET /provinces/:id
exports.getOne = asyncHandler(async (req, res) => {
  const province = await Province.findOne({ province_id: req.params.id });
  if (!province) {
    throw new ApiError(404, 'NOT_FOUND', `Province ${req.params.id} not found.`);
  }
  res.json(province);
});

// GET /provinces/:id/districts  (scoped sub-collection)
exports.listDistricts = asyncHandler(async (req, res) => {
  const province = await Province.findOne({ province_id: req.params.id });
  if (!province) {
    throw new ApiError(404, 'NOT_FOUND', `Province ${req.params.id} not found.`);
  }
  const districts = await District.find({ province_id: req.params.id });
  res.json(districts);
});