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
  // What the menu row shows under its section heading: "Plain", "นมข้น".
  // Unique per category, not overall (index below).
  name: {
    type: String,
    trim: true,
    required: [true, 'Please name this menu item'],
  },
  category: {
    type: String,
    required: [true, 'Please choose a category'],
    enum: {
      values: MENU_CATEGORIES,
      message: `Category must be one of: ${MENU_CATEGORIES.join(', ')}`,
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

// Classic and Churro Hug both have a "Plain", "Choco Pops" and "Choco Berry",
// so a name is only unique within its category. The cart and staff pages
// show "Classic · Plain" by putting the category's label in front (every order
// line keeps its category). The seed script matches on this pair, which is
// what makes running it again safe.
// Replaced a unique index on name alone (2026-11-08): Mongoose never drops an
// index, so the old name_1 was dropped from the dev database by hand;
// production never had it.
menuItemSchema.index({ category: 1, name: 1 }, { unique: true });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
module.exports = MenuItem;
