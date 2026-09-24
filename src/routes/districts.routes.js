const express = require('express');
const router = express.Router();
const controller = require('../controllers/districts.controller');

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.get('/:id/substations', controller.listSubstations); // resource map #5
router.get('/:id/generation-summary', controller.getGenerationSummary); // resource map #14 — stretch, we'll fill this in later

module.exports = router;