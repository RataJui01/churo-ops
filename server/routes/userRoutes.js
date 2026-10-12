const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const AppError = require('../utils/appError');

const router = express.Router();

// Without a limit, passwords could be guessed as fast as requests can be
// sent. Only failed tries count, so someone logging in correctly is never
// locked out. Per IP — on the host that needs `trust proxy` (see app.js).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
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

module.exports = router;
