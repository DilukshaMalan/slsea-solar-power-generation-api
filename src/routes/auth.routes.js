const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: SLSEA user login
 *     description: >
 *       For human SLSEA analysts only — devices never log in; they
 *       authenticate per-request using their own pre-issued api_key
 *       (see POST /installations/{id}/readings).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login successful — returns JWT and user profile
 *       400: { description: Missing email/password }
 *       401: { description: Incorrect email or password }
 */
router.post('/login', controller.login);

module.exports = router;