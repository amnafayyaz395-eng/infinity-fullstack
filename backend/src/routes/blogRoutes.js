const express = require('express');
const router = express.Router();
const blog = require('../controllers/blogController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', blog.list);
router.get('/admin/all', requireAuth, requireAdmin, blog.listAllAdmin);
router.get('/:slug', blog.getBySlug);
router.post('/', requireAuth, requireAdmin, blog.create);
router.put('/:id', requireAuth, requireAdmin, blog.update);
router.delete('/:id', requireAuth, requireAdmin, blog.remove);

module.exports = router;
