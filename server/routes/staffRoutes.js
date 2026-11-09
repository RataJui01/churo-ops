const express = require('express');
const authController = require('../controllers/authController');
const staffController = require('../controllers/staffController');

// The staff side of the storefront. Every route has `protect`, written on each
// line like the other routers rather than router.use(), so reading any single
// route shows it's logged-in only.
const router = express.Router();

router.get('/store', authController.protect, staffController.getStore);
router.patch('/store', authController.protect, staffController.updateStore);

router.get('/orders', authController.protect, staffController.getOrders);
router.patch(
  '/orders/:id/confirm',
  authController.protect,
  staffController.confirmOrder,
);
router.patch(
  '/orders/:id/ready',
  authController.protect,
  staffController.markReady,
);
router.patch(
  '/orders/:id/pickup',
  authController.protect,
  staffController.markPickedUp,
);
router.patch(
  '/orders/:id/cancel',
  authController.protect,
  staffController.cancelOrder,
);

router.get('/menu', authController.protect, staffController.getMenu);
router.patch(
  '/menu/:itemId',
  authController.protect,
  staffController.updateMenuItem,
);

module.exports = router;
