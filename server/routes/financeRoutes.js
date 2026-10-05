const express = require('express');
const authController = require('../controllers/authController');
const financeController = require('../controllers/financeController');

const router = express.Router();

router.get('/summary', authController.protect, financeController.getSummary);

module.exports = router;
