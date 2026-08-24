const mongoose = require('mongoose');

const restockLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['churro', 'stick', 'box'],
    required: true,
  },
  qtyAdded: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const RestockLog = mongoose.model('RestockLog', restockLogSchema);

module.exports = RestockLog;
