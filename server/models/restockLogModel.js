const mongoose = require('mongoose');
const UNITS = require('../constants/units');
const STAFF_MEMBERS = require('../constants/staffMembers');

// One entry per restock, for the Stock page's "Restock log"
// ("Flour +5 kg · Today, 9:12 AM · Jui"). Creating one also raises the item's
// quantity — that happens in the controller, not here.
const restockLogSchema = new mongoose.Schema(
  {
    // A reference, not a copy of the name: the log should show the item's
    // current name, so renaming "Cups M" to "Cups (M)" updates old entries too
    stockItem: {
      type: mongoose.Schema.ObjectId,
      ref: 'StockItem',
      required: [true, 'A restock must belong to a stock item'],
    },
    // More than 0 (min: 0 would still let 0 through). Lowering a count, e.g.
    // after a miscount, is done on the Edit stock item page, not here.
    quantity: {
      type: Number,
      required: [true, 'Please enter how much was added'],
      validate: {
        validator: (value) => value > 0,
        message: 'Restock quantity must be more than 0',
      },
    },
    // A copy, unlike the name: if the item's unit later changes from kg to g,
    // an old "+5 kg" entry must not turn into "+5 g"
    unit: {
      type: String,
      required: [true, 'Please choose a unit'],
      enum: {
        values: UNITS,
        message: 'Unit must be kg, L or pcs',
      },
    },
    // Set by the server from the logged-in account, like Order's staffMember
    staffMember: {
      type: String,
      enum: STAFF_MEMBERS,
      required: [true, 'Please say who restocked'],
    },
  },
  // createdAt shows "Today, 9:12 AM" and sorts the 20 newest entries;
  // updatedAt comes free for the future Edit restock entry page
  { timestamps: true },
);

const RestockLog = mongoose.model('RestockLog', restockLogSchema);
module.exports = RestockLog;
