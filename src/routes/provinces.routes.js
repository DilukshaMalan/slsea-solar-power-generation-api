const express = require('express');
const router = express.Router();
const controller = require('../controllers/provinces.controller');

/**
 * @openapi
 * /provinces:
 *   get:
 *     summary: List all provinces
 *     tags: [Provinces]
 *     responses:
 *       200:
 *         description: Array of provinces
 */
router.get('/', controller.list);

/**
 * @openapi
 * /provinces/{id}:
 *   get:
 *     summary: Get one province by ID
 *     tags: [Provinces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: PRV-0001
 *     responses:
 *       200: { description: Province found }
 *       404: { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.get('/:id', controller.getOne);

/**
 * @openapi
 * /provinces/{id}/districts:
 *   get:
 *     summary: List districts within a province (scoped sub-collection)
 *     tags: [Provinces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         example: PRV-0001
 *     responses:
 *       200: { description: Array of districts in this province }
 *       404: { description: Province not found }
 */
router.get('/:id/districts', controller.listDistricts);

module.exports = router;