const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const authController = require('../controllers/authController');
const AppError = require('../utils/appError');

const router = express.Router();

// Railway's edge puts the visitor's address in X-Real-IP (clients can't set
// it), while the number of proxies in front of the app varies — so req.ip with
// trust proxy 1 could be a Railway proxy, and everyone would share one limit.
// Production only: in development nothing sets the header, so anyone could.
const clientIp = (req) =>
  (process.env.NODE_ENV === 'production' && req.get('x-real-ip')) || req.ip;

// Without a limit, passwords could be guessed as fast as requests can be
// sent. Only failed tries count, so someone logging in correctly is never
// locked out. Per visitor IP (see clientIp above).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  // ipKeyGenerator counts an IPv6 address by its /56 block, so hopping
  // between addresses of one connection can't reset the count
  keyGenerator: (req) => ipKeyGenerator(clientIp(req)),
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
