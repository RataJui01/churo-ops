const express = require('express');
const { rateLimit } = require('express-rate-limit');
const storefrontController = require('../controllers/storefrontController');
const AppError = require('../utils/appError');
const { ipKey } = require('../utils/clientIp');

// The customer side of the storefront: no `protect` on purpose — customers
// order from their own phones without an account. What keeps this safe is in
// the controller: the store must be open to order, prices come from the
// database, and no customer's phone number is ever sent back.
const router = express.Router();

// Placing an order is the one public route that creates something, so it's
// limited: without it one person could fill the staff's "awaiting payment" tab
// with fake orders (REQUIREMENTS §7). 10 orders per 15 minutes per IP (Jui,
// 2026-11-11) — a customer rarely places more than 2–3, but many customers
// can share one IP: mobile networks put many phones behind one public address
// (CGNAT), and so does the stall's Wi-Fi. Only orders actually created count
// (skipFailedRequests): a mistyped phone number, a closed store or a sold-out
// item doesn't use up a try. The count lives in memory, like the login limit,
// so a server restart resets it.
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipFailedRequests: true,
  keyGenerator: ipKey,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // Through errorController, so it's the same JSON shape as every other error;
  // the page reacts to 429 with its own Thai message
  handler: (req, res, next) =>
    next(
      new AppError(
        'Too many orders from this network. Please try again in a few minutes.',
        429,
      ),
    ),
});

// Reading the menu and polling an order's status aren't limited: they only read
router.get('/menu', storefrontController.getMenu);
router.post('/orders', orderLimiter, storefrontController.createOrder);
router.get('/orders/:id', storefrontController.getOrder);

module.exports = router;
