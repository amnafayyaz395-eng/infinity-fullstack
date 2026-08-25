const express = require('express');
const router = express.Router();
const leads = require('../controllers/leadsController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/', leads.createLead); // public
router.get('/', requireAuth, requireAdmin, leads.listLeads);
router.patch('/:id', requireAuth, requireAdmin, leads.updateLeadStatus);

module.exports = router;
