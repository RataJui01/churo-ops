const express = require('express');
const authController = require('../controllers/authController');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.get('/', authController.protect, orderController.getAllOrders);
router.post('/', authController.protect, orderController.createOrder);

module.exports = router;
