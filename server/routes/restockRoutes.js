const express = require('express');
const authController = require('../controllers/authController');
const restockController = require('../controllers/restockController');

const router = express.Router();

router
  .route('/')
  .get(authController.protect, restockController.getRecentRestocks)
  .post(authController.protect, restockController.createRestock);
router
  .route('/:id')
  .get(authController.protect, restockController.getRestock)
  .patch(authController.protect, restockController.updateRestock)
  .delete(authController.protect, restockController.deleteRestock);

module.exports = router;
