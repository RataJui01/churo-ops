const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// keyValue isn't on every E11000 (e.g. from a bulk write) — without the
// guard the error handler itself would throw
const handleDuplicateFields = (err) => {
  const field = Object.keys(err.keyValue ?? {})[0];
  const message = field
    ? `Duplicate field value: ${err.keyValue[field]}. Please use another value!`
    : 'That value is already taken. Please use another value!';
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please login again', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again', 401);

// Errors we know how to explain become an AppError with the right status, in
// every environment — before 2026-10-12 only production did this, so in
// development a bad amount came back as a 500 with Mongoose's raw message.
// express.json() flags a broken or oversized body with err.type.
const toKnownError = (err) => {
  if (err.name === 'JsonWebTokenError') return handleJWTError();
  if (err.name === 'TokenExpiredError') return handleJWTExpiredError();
  if (err.name === 'CastError') return handleCastErrorDB(err);
  if (err.code === 11000) return handleDuplicateFields(err);
  if (err.name === 'ValidationError') return handleValidationErrorDB(err);
  if (err.type === 'entity.parse.failed') {
    return new AppError('Invalid JSON in request body', 400);
  }
  if (err.type === 'entity.too.large') {
    return new AppError('Request body is too large', 413);
  }
  return err;
};

module.exports = (err, req, res, next) => {
  const error = toKnownError(err);
  // Development adds the stack (and an unknown error's own message) for
  // debugging. Anything else — production, or NODE_ENV not set at all — is
  // treated as production, so a request can never be left without a response.
  const isDev = process.env.NODE_ENV === 'development';

  // Expected, explained failures: say what went wrong
  if (error.isOperational) {
    res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      ...(isDev && { stack: err.stack }),
    });
    return;
  }

  // A bug or something unexpected: log it, but don't tell the client how the
  // server works inside
  console.error('ERROR 💥', err);
  res.status(500).json({
    status: 'error',
    message: 'Something went very wrong',
    ...(isDev && { error: err.message, stack: err.stack }),
  });
};
