const express = require('express');
const { rateLimit } = require('express-rate-limit');
const authController = require('../controllers/authController');
const AppError = require('../utils/appError');
const { ipKey } = require('../utils/clientIp');

const router = express.Router();

// Without a limit, passwords could be guessed as fast as requests can be
// sent. Only failed tries count, so someone logging in correctly is never
// locked out. Per visitor IP (utils/clientIp.js).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: ipKey,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // Through errorController, so it's the same JSON shape as every other error
  handler: (req, res, next) =>
    next(
      new AppError(
        'Too many login attempts. Please try again in 15 minutes.',
        429,
      ),
    ),
});

router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.protect, authController.logout);
router.get('/me', authController.protect, authController.getMe);

module.exports = router;
