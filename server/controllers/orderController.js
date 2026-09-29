const Order = require('../models/orderModel');
const Round = require('../models/roundModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllOrders = catchAsync(async (req, res, next) => {
  const filter = {};
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
  const newOrder = await Order.create({
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

  res.status(201).json({
    status: 'success',
    data: {
      order: newOrder,
    },
  });
});
