const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    flavor: {
      type: String,
      enum: [
        'plain',
        'chocolate',
        'strawberry',
        'signature',
        'strawberry_nutella_bite',
      ],
      required: [true, 'Please choose a flavor'],
    },
    size: {
      type: String,
      enum: ['S', 'M'],
      // strawberry_nutella_bite comes in one size only, so it has no size.
      // A normal function (not an arrow) because Mongoose passes the item as `this`
      required: [
        function () {
          return this.flavor !== 'strawberry_nutella_bite';
        },
        'Please choose a size',
      ],
    },
    // Empty array = no add-on
    addOns: [
      {
        type: String,
        enum: ['choc_dip', 'choc_pops', 'strawberry_freeze_dried'],
      },
    ],
    // Customer wants the dip/topping in a separate cup instead of on the churros
    separateAddOns: {
      type: Boolean,
      default: false,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    round: {
      type: mongoose.Schema.ObjectId,
      ref: 'Round',
      required: [true, 'An order must belong to a round'],
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: 'An order needs at least one item',
      },
    },
    deliveryFee: {
      type: Number,
      enum: [0, 5, 10, 15],
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: [true, 'An order must have a total price'],
    },
    // Time of day on the round's delivery date, e.g. "15:00"
    deliveryTime: {
      type: String,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Delivery time must be HH:mm'],
      required: [true, 'Please choose a delivery time'],
    },
    // Set by the server from the logged-in account's name, not sent by the client
    staffMember: {
      type: String,
      enum: ['Jui', 'Impact'],
      required: [true, 'Please say who added this order'],
    },
    // Name or LINE ID — required so whoever delivers knows whose order it is
    customerName: {
      type: String,
      trim: true,
      required: [true, "Please enter the customer's name"],
    },
    // Delivery address, allergy notes, etc.
    note: {
      type: String,
      trim: true,
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
  { timestamps: true },
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
