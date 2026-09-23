const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');

// TODO (Phase 6): login endpoint issuing JWT for users; device token
// issuance/verification for installations (design: pre-issued vs login).
// router.post('/login', controller.login);

module.exports = router;
