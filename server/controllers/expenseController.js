const Expense = require('../models/expenseModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// The Finances page lists only the newest expenses (Jui, 2026-10-05), like the
// restock log. Limiting here, not in the browser, keeps each 7s poll from
// re-sending the whole history. The all-time totals come from the summary.
const RECENT_LIMIT = 20;

exports.getRecentExpenses = catchAsync(async (req, res, next) => {
  const expenses = await Expense.find().sort('-createdAt').limit(RECENT_LIMIT);

  res.status(200).json({
    status: 'success',
    results: expenses.length,
    data: {
      expenses,
    },
  });
});

// Only title and amount come from the body: whoever is logged in added it
// (from the token, like createRestock), and the date is when it was logged
exports.createExpense = catchAsync(async (req, res, next) => {
  const expense = await Expense.create({
    title: req.body.title,
    amount: req.body.amount,
    staffMember: req.user.name,
  });

  res.status(201).json({
    status: 'success',
    data: { expense },
  });
});

// One expense for the Edit expense page
exports.getExpense = catchAsync(async (req, res, next) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    return next(new AppError('No expense found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { expense },
  });
});

// Fields the Edit expense page may change. staffMember and the logged date
// stay as they were.
const EDITABLE_FIELDS = ['title', 'amount'];

// findById + set + save() rather than findByIdAndUpdate, as in
// updateStockItem: save() runs the full schema validation (amount > 0, no
// blank title) and writes only the paths that changed
exports.updateExpense = catchAsync(async (req, res, next) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    return next(new AppError('No expense found with that ID', 404));
  }

  EDITABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) expense.set(field, req.body[field]);
  });
  await expense.save();

  res.status(200).json({
    status: 'success',
    data: { expense },
  });
});

// A real delete (Jui, 2026-10-05): a wrong or duplicate entry should be gone,
// not kept and filtered out everywhere
exports.deleteExpense = catchAsync(async (req, res, next) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) {
    return next(new AppError('No expense found with that ID', 404));
  }

  // 200 with a JSON body, not 204: the client's getJson parses every response
  res.status(200).json({
    status: 'success',
    data: null,
  });
});
