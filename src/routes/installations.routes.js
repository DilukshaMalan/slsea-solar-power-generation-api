const express = require('express');
const router = express.Router();
const controller = require('../controllers/installations.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', controller.list);
router.get('/:id', controller.getOne);                      // composite resource (#8)
router.get('/:id/latest-reading', controller.getLatestReading); // processing resource (#13)

router.post('/', requireAuth, requireRole('national'), controller.create);
router.patch('/:id', requireAuth, requireRole('national'), controller.update);
router.delete('/:id', requireAuth, requireRole('national'), controller.remove);

module.exports = router;