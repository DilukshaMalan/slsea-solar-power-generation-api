const express = require('express');
const router = express.Router();
const controller = require('../controllers/provinces.controller');

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.get('/:id/districts', controller.listDistricts); // scoped sub-collection, from our resource map (#3)

module.exports = router;