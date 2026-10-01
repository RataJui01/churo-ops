const mongoose = require('mongoose');
const UNITS = require('../constants/units');

// Case-insensitive but accent-sensitive comparison (strength 2), so "flour" and
// "Flour" count as the same item. Thai has no upper/lower case, so it's unaffected.
const NAME_COLLATION = { locale: 'en', strength: 2 };

// One document per thing being tracked. Items are user-defined: Restock creates
// a new one when it gets a name it hasn't seen. Churro / Stick / Box are just
// seeded items with auto-deduction numbers filled in (scripts/seedStock.js).
const stockItemSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'Please name this item'],
  },
  unit: {
    type: String,
    required: [true, 'Please choose a unit'],
    enum: {
      values: UNITS,
      message: 'Unit must be kg, L or pcs',
    },
  },
  // Decimals allowed (1.5 kg). No min on purpose: auto-deduction from orders
  // may take more than was counted, and a later save() of this item shouldn't
  // fail because of that — the Stock page shows "Out" at 0 or below instead.
  quantity: {
    type: Number,
    default: 0,
  },
  // Shows "Low" when quantity drops below this. 0 = never Low (items created
  // from Restock start here); an item at 0 or below shows "Out" regardless.
  lowStockThreshold: {
    type: Number,
    default: 0,
    min: [0, 'Low-stock alert cannot be negative'],
  },
  // Auto-deduction rules, kept as data instead of code so an item can start
  // (or stop) being deducted by editing numbers. Each order takes
  // usedPerPiece × its churro pieces + usedPerOrder. 0 and 0 = never deducted,
  // for things too hard to count. min 0: a negative rule would add stock.
  usedPerPiece: {
    type: Number,
    default: 0,
    min: [0, 'Amount used per churro piece cannot be negative'],
  },
  usedPerOrder: {
    type: Number,
    default: 0,
    min: [0, 'Amount used per order cannot be negative'],
  },
});

// The database, not our code, keeps names unique: if both phones create
// "Flour" and "flour" at the same moment, a find-then-create check in code
// could miss both, but the index lets only the first insert through (E11000).
stockItemSchema.index({ name: 1 }, { unique: true, collation: NAME_COLLATION });

// Lookups must use the same collation as the index to be case-insensitive —
// wrapping it here means no caller can forget it. trim() matches how
// `trim: true` stores the name.
stockItemSchema.statics.findByName = function (name) {
  return this.findOne({ name: name.trim() }).collation(NAME_COLLATION);
};

// MongoDB's default sort is binary, so every capitalized name would come
// before every lowercase one ("Stick" before "cooking oil"). The same
// collation gives a normal A–Z order, and can use the name index to do it.
stockItemSchema.statics.findSortedByName = function () {
  return this.find().sort('name').collation(NAME_COLLATION);
};

const StockItem = mongoose.model('StockItem', stockItemSchema);
module.exports = StockItem;
