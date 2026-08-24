const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    flavor: {
      type: String,
      enum: ['plain', 'choco_pops', 'choco_berry', 'signature'],
      required: true,
    },
    size: {
      type: String,
      enum: ['S', 'M'],
      required: true,
    },
    addOns: [
      {
        type: String,
        enum: ['choco_dip', 'choco_pops', 'strawberry_freeze_dried'],
      },
    ],
    quantity: { type: Number, default: 1 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
    },
    customerPhone: {
      type: String,
    },
    deliveryLocation: {
      type: String,
    },
    items: [orderItemSchema],
    totalPrice: {
      type: Number,
      required: true,
    },
    staffMember: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now(),
    },
    isDone: {
      type: Boolean,
      default: false,
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
