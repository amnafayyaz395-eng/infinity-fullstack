const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const chat = require('../controllers/chatController');

const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

router.post('/', chatLimiter, chat.chat);
router.post('/lead', chat.captureLead);

module.exports = router;
