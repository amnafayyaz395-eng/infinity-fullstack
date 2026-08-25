const express = require('express');
const router = express.Router();
const dash = require('../controllers/dashboardController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/reports', requireAuth, dash.myReports);
router.post('/reports', requireAuth, requireAdmin, dash.addReport);

module.exports = router;
