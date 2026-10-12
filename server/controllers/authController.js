const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { promisify } = require('util');

// v is the account's tokenVersion: bumping it (Log out) makes every token
// signed before unusable, which a JWT on its own can't do
const signToken = (user) =>
  jwt.sign({ id: user._id, v: user.tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user);

  res.status(statusCode).json({
    status: 'Success',
    token,
    data: {
      user,
    },
  });
};

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Strings only: a JSON body can carry an object, and { "$gt": "" } as the
  // email would be read by MongoDB as an operator and match the first
  // account without knowing any address (found in the 2026-10-12 review)
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email ||
    !password
  ) {
    return next(new AppError('Please provide email and password', 400));
  }

  // The model stores emails lower-case, so "Jui@…" has to match too
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    '+password',
  );

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user beloging to this token does no longer exist.',
        401,
      ),
    );
  }

  // Logged out since this token was signed (on this phone or another one).
  // No extra query: the user was loaded above anyway.
  if (decoded.v !== currentUser.tokenVersion) {
    return next(
      new AppError('Your session has ended. Please log in again.', 401),
    );
  }

  req.user = currentUser;
  next();
});

// Log out on the server too (Jui, 2026-10-12): every token this account has —
// on every phone — stops working. $inc is atomic and also works on an
// account saved before tokenVersion existed (it starts counting from 1).
exports.logout = catchAsync(async (req, res, next) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });

  // 200 with a JSON body, like the other endpoints
  res.status(200).json({
    status: 'success',
    data: null,
  });
});
