const express = require('express');
const router = express.Router();
const controller = require('../controllers/readings.controller');

router.get('/', controller.queryReadings);  // resource map #18
router.get('/:id', controller.getOne);

module.exports = router;