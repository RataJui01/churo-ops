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
  // (or stop) being deducted by editing numbers (utils/stockDeduction.js).
  // Each order takes, from every item:
  //   usedPerPiece   × its regular churro pieces (S 4 / M 8 per serving)
  // + usedPerServing × its regular churro servings (quantity)
  // + usedPerBite    × its Strawberry Nutella Bite servings (quantity)
  // + usedPerOrder   once
  // All 0 = never deducted, for things too hard to count. min 0: a negative
  // rule would add stock. Seeded: Churro piece 1; Stick piece 1 + bite 1;
  // Box serving 1; Bite churro bite 10; Bite box bite 1 (Jui, 2026-10-03).
  usedPerPiece: {
    type: Number,
    default: 0,
    min: [0, 'Amount used per churro piece cannot be negative'],
  },
  usedPerServing: {
    type: Number,
    default: 0,
    min: [0, 'Amount used per churro serving cannot be negative'],
  },
  usedPerBite: {
    type: Number,
    default: 0,
    min: [0, 'Amount used per Nutella bite serving cannot be negative'],
  },
  // Kept for things used once per order whatever is in it (e.g. a bag) —
  // nothing uses it yet
  usedPerOrder: {
    type: Number,
    default: 0,
    min: [0, 'Amount used per order cannot be negative'],
  },
  // Soft delete (Jui, 2026-10-03): the restock log is a permanent record of
  // what was bought, so a deleted item stays in the database and its old log
  // entries still show its name. It's hidden from every list; restocking the
  // same name later brings it back (see restockController.findOrCreateItem).
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

// Deleted items still count here on purpose: the name still belongs to the
// old item, which is what lets a restock bring it back.
// The database, not our code, keeps names unique: if both phones create
// "Flour" and "flour" at the same moment, a find-then-create check in code
// could miss both, but the index lets only the first insert through (E11000).
stockItemSchema.index({ name: 1 }, { unique: true, collation: NAME_COLLATION });

// Lookups must use the same collation as the index to be case-insensitive —
// wrapping it here means no caller can forget it. trim() matches how
// `trim: true` stores the name. Finds deleted items too (to bring them back
// and to explain a taken name).
stockItemSchema.statics.findByName = function (name) {
  return this.findOne({ name: name.trim() }).collation(NAME_COLLATION);
};

// MongoDB's default sort is binary, so every capitalized name would come
// before every lowercase one ("Stick" before "cooking oil"). The same
// collation gives a normal A–Z order, and can use the name index to do it.
// Leaves deleted items out — this one filter hides them from the Stock page,
// Home and the name suggestions at once ($ne: true so items saved before the
// field existed still match, like Order's isCancelled). includeDeleted is for
// Restock / Edit restock entry, which must know a typed name belongs to a
// deleted item: restocking it brings that item back rather than starting one.
stockItemSchema.statics.findSortedByName = function (includeDeleted = false) {
  return this.find(includeDeleted ? {} : { isDeleted: { $ne: true } })
    .sort('name')
    .collation(NAME_COLLATION);
};

const StockItem = mongoose.model('StockItem', stockItemSchema);
module.exports = StockItem;
