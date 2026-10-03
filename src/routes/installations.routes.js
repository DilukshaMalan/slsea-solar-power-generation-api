const express = require('express');
const router = express.Router();
const controller = require('../controllers/installations.controller');
const readingsController = require('../controllers/readings.controller');
const { requireAuth, requireRole, requireDeviceAuth } = require('../middleware/auth');

/**
 * @openapi
 * /installations:
 *   get:
 *     summary: List all solar installations
 *     tags: [Installations]
 *     responses:
 *       200: { description: Array of installations (api_key never included) }
 */
router.get('/', controller.list);

/**
 * @openapi
 * /installations/{id}:
 *   get:
 *     summary: Get installation composite resource
 *     description: >
 *       Returns the installation together with its parent substation and
 *       its latest reading embedded in one response. Public — no auth
 *       required (metadata only, not readings history).
 *     tags: [Installations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Composite installation view }
 *       404: { description: Not found }
 */
router.get('/:id', controller.getOne);

/**
 * @openapi
 * /installations/{id}/latest-reading:
 *   get:
 *     summary: Last-known reading for one installation (operational view, processing resource)
 *     description: Computed live via sort+limit(1) — never stored. Jurisdiction-scoped.
 *     tags: [Installations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Latest reading }
 *       401: { description: Missing/invalid token }
 *       403: { description: Installation outside caller's jurisdiction }
 *       404: { description: Installation not found, or no readings yet }
 */
router.get('/:id/latest-reading', requireAuth, readingsController.getLatestReadingScoped);

/**
 * @openapi
 * /installations/{id}/readings:
 *   get:
 *     summary: Reading history for one installation (analytical view)
 *     description: Paginated, filterable by time window, sortable, supports conditional GET. Jurisdiction-scoped.
 *     tags: [Installations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
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
 *         description: "timestamp (ascending) or -timestamp (descending, default)"
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 500 }
 *       - in: header
 *         name: If-None-Match
 *         schema: { type: string }
 *         description: ETag from a previous response — returns 304 if unchanged.
 *     responses:
 *       200: { description: Paginated readings with total/next/prev }
 *       304: { description: Not modified — client's cached copy is current }
 *       401: { description: Missing/invalid token }
 *       403: { description: Installation outside caller's jurisdiction }
 *       404: { description: Installation not found }
 */
router.get('/:id/readings', requireAuth, readingsController.getHistoryForInstallation);

/**
 * @openapi
 * /installations:
 *   post:
 *     summary: Register a new solar installation
 *     description: Requires national role. Issues and returns a one-time-visible device api_key.
 *     tags: [Installations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [installation_id, substation_id, meter_id, capacity_kw]
 *             properties:
 *               installation_id: { type: string }
 *               substation_id: { type: string }
 *               meter_id: { type: string }
 *               owner_name: { type: string }
 *               capacity_kw: { type: number }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               installed_date: { type: string, format: date }
 *     responses:
 *       201: { description: Created — includes api_key once, never retrievable again }
 *       400: { description: Validation error / unknown substation_id }
 *       401: { description: Missing/invalid token }
 *       403: { description: Not a national-role token }
 *       409: { description: installation_id already exists }
 */
router.post('/', requireAuth, requireRole('national'), controller.create);

/**
 * @openapi
 * /installations/{id}:
 *   patch:
 *     summary: Partially update an installation
 *     tags: [Installations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               capacity_kw: { type: number }
 *               owner_name: { type: string }
 *     responses:
 *       200: { description: Updated installation }
 *       401: { description: Missing/invalid token }
 *       403: { description: Not a national-role token }
 *       404: { description: Not found }
 */
router.patch('/:id', requireAuth, requireRole('national'), controller.update);

/**
 * @openapi
 * /installations/{id}:
 *   delete:
 *     summary: Decommission an installation
 *     description: Cascades — deletes this installation's own readings too (they have no meaning without it).
 *     tags: [Installations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted (and its readings cascaded) }
 *       401: { description: Missing/invalid token }
 *       403: { description: Not a national-role token }
 *       404: { description: Not found }
 */
router.delete('/:id', requireAuth, requireRole('national'), controller.remove);

/**
 * @openapi
 * /installations/{id}/readings:
 *   post:
 *     summary: Device submits a new generation reading
 *     description: >
 *       Authenticated by the installation's own api_key as a bearer token
 *       (NOT a user JWT) — a device can only write to its own installation.
 *     tags: [Installations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [power_kw, energy_kwh, voltage]
 *             properties:
 *               timestamp: { type: string, format: date-time, description: "Defaults to now if omitted" }
 *               power_kw: { type: number }
 *               energy_kwh: { type: number }
 *               voltage: { type: number }
 *     responses:
 *       201:
 *         description: Reading created
 *         headers:
 *           Location: { schema: { type: string }, description: "/readings/{reading_id}" }
 *       400: { description: Validation error, or power_kw exceeds installation capacity }
 *       401: { description: Missing api_key }
 *       403: { description: api_key does not match this installation }
 *       404: { description: Installation not found }
 */
router.post('/:id/readings', requireDeviceAuth, readingsController.submitReading);

module.exports = router;