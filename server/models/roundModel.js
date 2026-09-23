const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'Please name this round'],
  },
  openDate: {
    type: Date,
    required: [true, 'Please set the opening date'],
  },
  deliveryDate: {
    type: Date,
    required: [true, 'Please set the delivery date'],
    validate: {
      validator: function (value) {
        if (!this.openDate) return true;
        return value >= this.openDate;
      },
      message: 'Delivery date cannot be before the opening date',
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const Round = mongoose.model('Round', roundSchema);
module.exports = Round;
