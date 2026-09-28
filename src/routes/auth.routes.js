const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');

router.post('/login', controller.login);

// No device login endpoint — a metering device isn't a human logging in.
// Each installation authenticates on every write using its own pre-issued
// api_key (set at registration, POST /installations), sent as a bearer
// token directly. See middleware/auth.js.

module.exports = router;