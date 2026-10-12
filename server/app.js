const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

// Import Router
const userRouter = require('./routes/userRoutes');
const roundRouter = require('./routes/roundRoutes');
const orderRouter = require('./routes/orderRoutes');
const stockItemRouter = require('./routes/stockItemRoutes');
const restockRouter = require('./routes/restockRoutes');
const expenseRouter = require('./routes/expenseRoutes');
const financeRouter = require('./routes/financeRoutes');
// const signatureRatioRouter = require('./routes/signatureRatioRoutes');

// Standard security headers (nosniff, no X-Powered-By, …)
app.use(helmet());

// On the host the app sits behind one proxy, so the visitor's IP is in
// X-Forwarded-For — the login rate limit needs it, or everyone would share
// the proxy's IP. Only in production: with no proxy in front (development),
// trusting that header would let anyone fake their IP past the limit.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Only the app itself may call the API. No fallback on purpose: an unset
// CLIENT_ORIGIN would make cors() allow every website. Comma-separate to
// allow more than one address.
if (!process.env.CLIENT_ORIGIN) {
  throw new Error('CLIENT_ORIGIN is not set (see config.env)');
}
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()),
  }),
);
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/rounds', roundRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/stock-items', stockItemRouter);
app.use('/api/v1/restocks', restockRouter);
app.use('/api/v1/expenses', expenseRouter);
app.use('/api/v1/finances', financeRouter);
// app.use('/api/v1/signatureRatio', signatureRatioRouter);

app.all('/{*splat}', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
