const express = require('express');
const router = express.Router();
const controller = require('../controllers/substations.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * @openapi
 * /substations:
 *   get:
 *     summary: List all grid substations
 *     tags: [Substations]
 *     responses:
 *       200: { description: Array of substations }
 */
router.get('/', controller.list);

/**
 * @openapi
 * /substations/{id}:
 *   get:
 *     summary: Get one substation by ID
 *     tags: [Substations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Substation found }
 *       404: { description: Not found }
 */
router.get('/:id', controller.getOne);

/**
 * @openapi
 * /substations/{id}/installations:
 *   get:
 *     summary: List installations under a substation (scoped sub-collection)
 *     tags: [Substations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Array of installations (api_key never included) }
 *       404: { description: Substation not found }
 */
router.get('/:id/installations', controller.listInstallations);

/**
 * @openapi
 * /substations:
 *   post:
 *     summary: Register a new grid substation
 *     description: Requires an SLSEA admin (national role) token.
 *     tags: [Substations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [substation_id, name, district_id]
 *             properties:
 *               substation_id: { type: string, example: SUB-0099 }
 *               name: { type: string }
 *               district_id: { type: string }
 *               capacity_mva: { type: number }
 *     responses:
 *       201: { description: Created, headers: { Location: { schema: { type: string } } } }
 *       400: { description: Validation error / unknown district_id }
 *       401: { description: Missing/invalid token }
 *       403: { description: Not a national-role token }
 *       409: { description: substation_id already exists }
 */
router.post('/', requireAuth, requireRole('national'), controller.create);

/**
 * @openapi
 * /substations/{id}:
 *   patch:
 *     summary: Partially update a substation
 *     tags: [Substations]
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
 *               name: { type: string }
 *               capacity_mva: { type: number }
 *     responses:
 *       200: { description: Updated substation }
 *       401: { description: Missing/invalid token }
 *       403: { description: Not a national-role token }
 *       404: { description: Not found }
 */
router.patch('/:id', requireAuth, requireRole('national'), controller.update);

/**
 * @openapi
 * /substations/{id}:
 *   delete:
 *     summary: Delete a substation
 *     description: >
 *       Blocked (409) if any installation still references this substation —
 *       deleting it would orphan independently-managed assets.
 *     tags: [Substations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       401: { description: Missing/invalid token }
 *       403: { description: Not a national-role token }
 *       404: { description: Not found }
 *       409: { description: Substation still has installations attached }
 */
router.delete('/:id', requireAuth, requireRole('national'), controller.remove);

module.exports = router;