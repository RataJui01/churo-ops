const mongoose = require('mongoose');
const {
  MENU_CATEGORIES,
  SEPARATE_TOPPING_CATEGORIES,
  ORDER_STATUSES,
} = require('../constants/storefront');

// One line of a customer's order. name / variantName / unitPrice / category
// are copied from the MenuItem when the order is placed (a snapshot): changing
// a price or a name later must not rewrite orders already placed, and the
// staff and status pages can show the line without looking up the menu.
// category also tells the staff page which lines are toppings (DESIGN §4.3).
const orderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.ObjectId,
      ref: 'MenuItem',
      required: [true, 'An order line must point to a menu item'],
    },
    category: {
      type: String,
      required: true,
      enum: MENU_CATEGORIES,
    },
    name: {
      type: String,
      required: true,
    },
    variantName: {
      type: String,
      required: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    // Capped because anyone can place an order — a typo of 200 shouldn't reach
    // the staff page as a real order
    qty: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
      max: [20, 'Quantity can be at most 20'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },
    // "Dip / topping in a separate cup" — only Classic Churros offer it
    // (SEPARATE_TOPPING_CATEGORIES). A normal function (not an arrow)
    // because Mongoose passes the line as `this`, like the size rule in
    // orderModel.js.
    separateToppings: {
      type: Boolean,
      default: false,
      validate: {
        validator: function (value) {
          return !value || SEPARATE_TOPPING_CATEGORIES.includes(this.category);
        },
        message: 'Only Classic Churros can have the topping served separately',
      },
    },
  },
  { _id: false },
);

// Orders placed by customers through the storefront. A separate collection
// from churo-ops' Order on purpose (REQUIREMENTS §4): different fields,
// different flow, and nothing here can break the existing app's data.
const storefrontOrderSchema = new mongoose.Schema(
  {
    items: {
      type: [orderItemSchema],
      validate: [
        {
          validator: (items) => items.length > 0,
          message: 'An order needs at least one item',
        },
        {
          validator: (items) => items.length <= 30,
          message: 'An order can have at most 30 lines',
        },
      ],
    },
    // What staff call out at pickup. Length capped: this comes from a public
    // form.
    customerName: {
      type: String,
      trim: true,
      required: [true, 'Please enter your name'],
      maxlength: [40, 'Name can be at most 40 characters'],
    },
    // Only for contacting the customer about a problem with the order.
    // The setter keeps digits only, so "081-234-5678" and "081 234 5678" are
    // both stored as "0812345678". 9–10 digits starting with 0: mobiles and
    // landlines (Jui, 2026-11-08).
    // select: false (like User.password): no query returns it unless it asks
    // with .select('+customerPhone'), so the public status API can't leak it
    // by accident — only the staff controllers ask for it.
    customerPhone: {
      type: String,
      required: [true, 'Please enter your phone number'],
      set: (value) =>
        typeof value === 'string' ? value.replace(/\D/g, '') : value,
      match: [/^0\d{8,9}$/, 'Phone number must be 9–10 digits starting with 0'],
      select: false,
    },
    // Worked out by the server from the menu's prices, never sent by the
    // customer. The check below is a second line of defence: a total that
    // doesn't match the lines can't be saved, whatever the controller did.
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
      validate: {
        validator: function (total) {
          const sum = this.items.reduce(
            (acc, item) => acc + item.unitPrice * item.qty,
            0,
          );
          return total === sum;
        },
        message: 'Total does not match the order lines',
      },
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending_payment',
    },
    // Given when staff confirm the payment (Counter.nextQueueNumber), so an
    // unpaid order has none. Starts again at 1 every day (Thai time).
    queueNumber: Number,
    // Who confirmed the payment — one of the existing accounts (Jui, 2026-11-08:
    // no separate Staff model)
    confirmedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    confirmedAt: Date,
    readyAt: Date,
    pickedUpAt: Date,
  },
  { timestamps: true },
);

// The staff tabs ask for one status at a time, oldest first
storefrontOrderSchema.index({ status: 1, createdAt: 1 });

const StorefrontOrder = mongoose.model(
  'StorefrontOrder',
  storefrontOrderSchema,
);
module.exports = StorefrontOrder;
