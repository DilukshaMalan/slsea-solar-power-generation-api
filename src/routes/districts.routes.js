const express = require('express');
const router = express.Router();
const controller = require('../controllers/districts.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.get('/:id/substations', controller.listSubstations);
router.get('/:id/generation-summary', requireAuth, controller.getGenerationSummary); // #14 — jurisdiction-scoped

module.exports = router;