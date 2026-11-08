const mongoose = require('mongoose');
const { MENU_CATEGORIES } = require('../constants/storefront');

// The variants of one menu row: S / M for a Classic flavor, a single
// "Regular" for Churro Hug and toppings (the customer pages don't show the
// name when there's only one). Only names and prices — whether the row can be
// ordered is the item's isAvailable, not per variant.
const variantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, 'Please name this variant'],
    },
    price: {
      type: Number,
      required: [true, 'Please give this variant a price'],
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: false },
);

// One document = one row on the customer menu (Jui, 2026-11-08): each Classic
// flavor, each Churro Hug flavor and each topping is its own item. That way the
// staff's "sold out" switch (one per flavor, turning S and M off together —
// DESIGN §4.7) is exactly one field, and the database can't hold a state the
// screens can't show, like "S sold out but M still on sale".
// Prices live here, not in the client: the server works out every order's
// total from these (REQUIREMENTS §7).
const menuItemSchema = new mongoose.Schema({
  // Unique so the seed script can be run again safely (it matches on name)
  name: {
    type: String,
    trim: true,
    required: [true, 'Please name this menu item'],
    unique: true,
  },
  category: {
    type: String,
    required: [true, 'Please choose a category'],
    enum: {
      values: MENU_CATEGORIES,
      message: 'Category must be classic, churro-hug or topping',
    },
  },
  // The staff's sold-out switch. No soft delete: there's no page for deleting
  // menu items — a flavor that's no longer sold is just switched off.
  isAvailable: {
    type: Boolean,
    default: true,
  },
  variants: {
    type: [variantSchema],
    validate: [
      {
        validator: (variants) => variants.length > 0,
        message: 'A menu item needs at least one variant',
      },
      {
        // An order line names its variant ("S"), so two with the same name
        // would make it ambiguous which price applies
        validator: (variants) =>
          new Set(variants.map((variant) => variant.name)).size ===
          variants.length,
        message: 'Variant names must be different from each other',
      },
    ],
  },
  // Order within its category on the menu (lowest first)
  sortOrder: {
    type: Number,
    default: 0,
  },
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
module.exports = MenuItem;
