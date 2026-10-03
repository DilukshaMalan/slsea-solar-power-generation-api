const express = require('express');
const router = express.Router();
const controller = require('../controllers/readings.controller');
const { requireAuth } = require('../middleware/auth');

/**
 * @openapi
 * /readings:
 *   get:
 *     summary: Cross-jurisdiction reading query (analytical)
 *     description: >
 *       Paginated, filterable by jurisdiction (province_id / district_id /
 *       substation_id — most specific wins) and time window, sortable,
 *       supports conditional GET. Jurisdiction-scoped — district/provincial
 *       users are restricted to their own scope (403 if they request outside it).
 *     tags: [Readings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: province_id
 *         schema: { type: string }
 *       - in: query
 *         name: district_id
 *         schema: { type: string }
 *       - in: query
 *         name: substation_id
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: sort
 *         schema: { type: string, example: "-timestamp" }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 500 }
 *       - in: header
 *         name: If-None-Match
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated readings with total/next/prev }
 *       304: { description: Not modified }
 *       401: { description: Missing/invalid token }
 *       403: { description: Requested jurisdiction outside caller's scope }
 */
router.get('/', requireAuth, controller.queryReadings);

/**
 * @openapi
 * /readings/{id}:
 *   get:
 *     summary: Get a single reading by ID
 *     description: Target of the Location header returned by POST /installations/{id}/readings. Public.
 *     tags: [Readings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Reading found }
 *       404: { description: Not found }
 */
router.get('/:id', controller.getOne);

module.exports = router;