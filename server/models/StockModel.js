const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['churro', 'stick', 'box'],
    required: true,
    unique: true,
  },
  currentQty: {
    type: Number,
    default: 0,
  },
  lowStockThreshold: {
    type: Number,
    required: true,
  },
});

const Stock = mongoose.model('Stock', stockSchema);

module.exports = Stock;
