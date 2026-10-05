const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');

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

app.use(cors());
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
