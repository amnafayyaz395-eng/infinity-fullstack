const express = require('express');
const router = express.Router();
const cs = require('../controllers/caseStudiesController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', cs.list);
router.post('/', requireAuth, requireAdmin, cs.create);
router.put('/:id', requireAuth, requireAdmin, cs.update);
router.delete('/:id', requireAuth, requireAdmin, cs.remove);

module.exports = router;
