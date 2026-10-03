const express = require('express');
const authController = require('../controllers/authController');
const stockItemController = require('../controllers/stockItemController');

const router = express.Router();

router.get('/', authController.protect, stockItemController.getAllStockItems);
router
  .route('/:id')
  .get(authController.protect, stockItemController.getStockItem)
  .patch(authController.protect, stockItemController.updateStockItem)
  .delete(authController.protect, stockItemController.deleteStockItem);

module.exports = router;
