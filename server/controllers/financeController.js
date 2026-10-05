const Order = require('../models/orderModel');
const Expense = require('../models/expenseModel');
const catchAsync = require('../utils/catchAsync');

// $group with _id: null folds every matching document into one result.
// An empty collection gives [] — no group at all — so read it as 0.
const totalOf = (result) => result[0]?.total ?? 0;

// All-time totals for the Finances page's three cards (Jui, 2026-10-05: all
// three use the same range, so Profit is real). Summed by MongoDB rather than
// by loading every document into Node.
exports.getSummary = catchAsync(async (req, res, next) => {
  const [orderTotals, expenseTotals] = await Promise.all([
    // Same filter as getAllOrders: cancelled orders never count, and
    // $ne: true also matches orders saved before isCancelled existed.
    // totalPrice includes the delivery fee.
    Order.aggregate([
      { $match: { isCancelled: { $ne: true } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
    Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const revenue = totalOf(orderTotals);
  const expenses = totalOf(expenseTotals);

  res.status(200).json({
    status: 'success',
    data: { revenue, expenses, profit: revenue - expenses },
  });
});
