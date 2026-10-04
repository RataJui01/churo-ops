const Order = require('../models/orderModel');
const Round = require('../models/roundModel');
const StockItem = require('../models/stockItemModel');
const catchAsync = require('../utils/catchAsync');
const {
  planDeductions,
  diffDeductions,
  applyStockChanges,
} = require('../utils/stockDeduction');
const AppError = require('../utils/appError');

exports.getAllOrders = catchAsync(async (req, res, next) => {
  // Cancelled orders are hidden everywhere in the app, so filtering them here
  // keeps every total (Home earnings, Orders counts) right in one place.
  // $ne: true rather than false: orders saved before isCancelled existed don't
  // have the field at all, and { isCancelled: false } wouldn't match them.
  const filter = { isCancelled: { $ne: true } };
  if (req.query.round) filter.round = req.query.round;

  const orders = await Order.find(filter).sort('deliveryTime createdAt');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

exports.createOrder = catchAsync(async (req, res, next) => {
  const round = await Round.findById(req.body.round);

  if (!round) {
    return next(new AppError('Please choose an existing round', 400));
  }
  if (!round.isActive) {
    return next(new AppError('This round has already ended', 400));
  }

  // isDone/isDelivered are left out on purpose: a new order always starts pending
  const newOrder = new Order({
    round: round._id,
    items: req.body.items,
    deliveryFee: req.body.deliveryFee,
    totalPrice: req.body.totalPrice,
    deliveryTime: req.body.deliveryTime,
    // Whoever is logged in added the order — taken from the token (protect sets
    // req.user), never from the body, so it can't be picked wrong or faked.
    // Works because each account's name is exactly 'Jui' or 'Impact' (the enum).
    staffMember: req.user.name,
    customerName: req.body.customerName,
    note: req.body.note,
  });

  // Stock is taken when the order is placed (Jui, 2026-10-03). Validate
  // first so the amounts are worked out from checked, cast items. Deleted
  // stock items are left out.
  await newOrder.validate();
  const stockItems = await StockItem.find({ isDeleted: { $ne: true } });
  newOrder.stockDeductions = planDeductions(newOrder.items, stockItems);
  newOrder.stockDeducted = true;

  // Order first, then stock — the order is the record, as with restocks: if
  // the server died in between, it still shows what should have been taken
  await newOrder.save();
  await applyStockChanges(newOrder.stockDeductions, -1);

  res.status(201).json({
    status: 'success',
    data: {
      order: newOrder,
    },
  });
});

// Also returns cancelled orders, so the Edit page can say "This order was
// cancelled" instead of a confusing "not found"
exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { order },
  });
});

// Fields the Edit page may change. Not staffMember (set from the logged-in
// account at creation) and not round (the design has no way to move an order).
const EDITABLE_FIELDS = [
  'isDone',
  'isDelivered',
  'isCancelled',
  'items',
  'deliveryFee',
  'deliveryTime',
  'customerName',
  'note',
  'totalPrice',
];

// Partial update: only the fields sent are touched. findById + save() rather
// than findByIdAndUpdate (as in closeRound) for two reasons:
// 1. save() runs the full schema validation. findByIdAndUpdate skips it unless
//    runValidators is set, and even then the item `size` rule reads
//    this.flavor, which isn't the document inside an update validator.
// 2. save() only writes the paths that changed, so a status tap on one phone
//    and "Save changes" on the other don't overwrite each other's fields.
exports.updateOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }
  if (order.isCancelled) {
    return next(new AppError('This order was cancelled', 400));
  }

  // What this order took from stock before this edit
  const oldDeductions = order.stockDeductions.map(({ stockItem, quantity }) => ({
    stockItem,
    quantity,
  }));

  EDITABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) order.set(field, req.body[field]);
  });

  // Stock only moves for orders that took stock when placed (stockDeducted) —
  // older orders never did, so there's nothing to give back or adjust.
  // Status, delivery and note edits never touch stock.
  let stockChanges = [];
  let sign = -1;
  if (order.stockDeducted && order.isCancelled) {
    // Cancelling gives back exactly what was taken (Jui, 2026-10-03). Can't
    // happen twice: an already-cancelled order is refused above.
    stockChanges = oldDeductions;
    sign = 1;
  } else if (order.stockDeducted && order.isModified('items')) {
    // Items edited: work out what the order takes now (current rules) and
    // move stock by the difference only, e.g. S → M takes 4 more per serving
    await order.validate();
    const stockItems = await StockItem.find({ isDeleted: { $ne: true } });
    const newDeductions = planDeductions(order.items, stockItems);
    stockChanges = diffDeductions(oldDeductions, newDeductions);
    order.stockDeductions = newDeductions;
  }

  // Order first, then stock, as in createOrder
  await order.save();
  await applyStockChanges(stockChanges, sign);

  res.status(200).json({
    status: 'success',
    data: { order },
  });
});
