const express = require('express');
const authController = require('../controllers/authController');
const restockController = require('../controllers/restockController');

const router = express.Router();

router
  .route('/')
  .get(authController.protect, restockController.getRecentRestocks)
  .post(authController.protect, restockController.createRestock);

module.exports = router;
