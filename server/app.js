const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

// Import Router
const userRouter = require('./routes/userRoutes');
const roundRouter = require('./routes/roundRoutes');
// const expenseRouter = require('./routes/expenseRoutes');
const orderRouter = require('./routes/orderRoutes');
// const restockLogRouter = require('./routes/restockLogRoutes');
// const signatureRatioRouter = require('./routes/signatureRatioRoutes');
// const stockRouter = require('./routes/stockRoutes');

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/v1/users', userRouter);
app.use('/api/v1/rounds', roundRouter);
// app.use('/api/v1/expenses', expenseRouter);
app.use('/api/v1/orders', orderRouter);
// app.use('/api/v1/restock', restockLogRouter);
// app.use('/api/v1/signatureRatio', signatureRatioRouter);
// app.use('/api/v1/stocks', stockRouter);

app.all('/{*splat}', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
