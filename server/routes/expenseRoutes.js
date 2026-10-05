const express = require('express');
const authController = require('../controllers/authController');
const expenseController = require('../controllers/expenseController');

const router = express.Router();

router
  .route('/')
  .get(authController.protect, expenseController.getRecentExpenses)
  .post(authController.protect, expenseController.createExpense);
router
  .route('/:id')
  .get(authController.protect, expenseController.getExpense)
  .patch(authController.protect, expenseController.updateExpense)
  .delete(authController.protect, expenseController.deleteExpense);

module.exports = router;
