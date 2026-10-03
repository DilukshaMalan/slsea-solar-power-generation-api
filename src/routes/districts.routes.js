const express = require('express');
const router = express.Router();
const controller = require('../controllers/districts.controller');
const { requireAuth } = require('../middleware/auth');

/**
 * @openapi
 * /districts:
 *   get:
 *     summary: List all districts
 *     tags: [Districts]
 *     responses:
 *       200: { description: Array of districts }
 */
router.get('/', controller.list);

/**
 * @openapi
 * /districts/{id}:
 *   get:
 *     summary: Get one district by ID
 *     tags: [Districts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: DIS-0001
 *     responses:
 *       200: { description: District found }
 *       404: { description: Not found }
 */
router.get('/:id', controller.getOne);

/**
 * @openapi
 * /districts/{id}/substations:
 *   get:
 *     summary: List grid substations within a district (scoped sub-collection)
 *     tags: [Districts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of substations }
 *       404: { description: District not found }
 */
router.get('/:id/substations', controller.listSubstations);

/**
 * @openapi
 * /districts/{id}/generation-summary:
 *   get:
 *     summary: Aggregate generation summary for a district (processing resource)
 *     description: >
 *       Current total power (sum of each installation's latest reading) and
 *       today's total energy, computed live — never stored.
 *       Jurisdiction-scoped: district/provincial users may only query their own scope.
 *     tags: [Districts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Aggregated summary }
 *       401: { description: Missing/invalid token }
 *       403: { description: District outside caller's jurisdiction }
 *       404: { description: District not found }
 */
router.get('/:id/generation-summary', requireAuth, controller.getGenerationSummary);

module.exports = router;