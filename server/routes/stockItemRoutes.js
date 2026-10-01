const express = require('express');
const authController = require('../controllers/authController');
const stockItemController = require('../controllers/stockItemController');

const router = express.Router();

router.get('/', authController.protect, stockItemController.getAllStockItems);

module.exports = router;
