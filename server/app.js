const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');

// Import Router
const expenseRouter = require('./routes/expenseRoutes');
const orderRouter = require('./routes/orderRoutes');
const restockLogRouter = require('./routes/restockLogRoutes');
const signatureRatioRouter = require('./routes/signatureRatioRoutes');
const stockRouter = require('./routes/stockRoutes');

app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/v1/expenses', expenseRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/restockLogs', restockLogRouter);
app.use('/api/v1/signatureRatio', signatureRatioRouter);
app.use('/api/v1/stocks', stockRouter);

module.exports = app;
