const express = require('express');
const router = express.Router();
const controller = require('../controllers/readings.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, controller.queryReadings); // #18 — jurisdiction-scoped
router.get('/:id', controller.getOne);                  // public — Location-header target only

module.exports = router;