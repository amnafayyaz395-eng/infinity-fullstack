const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Prevent brute-force login/signup attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

router.post('/signup', authLimiter, auth.signup);
router.post('/login', authLimiter, auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);
router.post('/forgot-password', authLimiter, auth.forgotPassword);
router.post('/reset-password', authLimiter, auth.resetPassword);

module.exports = router;
