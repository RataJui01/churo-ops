const Round = require('../models/roundModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getActiveRounds = catchAsync(async (req, res, next) => {
  const activeRounds = await Round.find({ isActive: true }).sort(
    'deliveryDate',
  );

  res.status(200).json({
    status: 'success',
    results: activeRounds.length,
    data: {
      activeRounds,
    },
  });
});

exports.createRound = catchAsync(async (req, res, next) => {
  const newRound = await Round.create({
    name: req.body.name,
    openDate: req.body.openDate,
    deliveryDate: req.body.deliveryDate,
  });

  res.status(201).json({
    status: 'success',
    data: {
      round: newRound,
    },
  });
});

exports.closeRound = catchAsync(async (req, res, next) => {
  const round = await Round.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true },
  );

  if (!round) {
    return next(new AppError('No round found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { round },
  });
});
