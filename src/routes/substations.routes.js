const express = require('express');
const router = express.Router();
const controller = require('../controllers/substations.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', controller.list);
router.get('/:id', controller.getOne);
router.get('/:id/installations', controller.listInstallations);

router.post('/', requireAuth, requireRole('national'), controller.create);
router.patch('/:id', requireAuth, requireRole('national'), controller.update);
router.delete('/:id', requireAuth, requireRole('national'), controller.remove);

module.exports = router;