const mongoose = require('mongoose');
const STAFF_MEMBERS = require('../constants/staffMembers');

// One entry per money spent, for the Finances page's "Recent expenses"
// ("Propane gas refill · ฿450 · Sep 13 · Jui"). Deliberately not linked to a
// RestockLog entry: gas, rent and delivery aren't stock items.
const expenseSchema = new mongoose.Schema(
  {
    // trim: a title of only spaces becomes "" and fails required
    title: {
      type: String,
      required: [true, 'Please enter what the expense was for'],
      trim: true,
    },
    // More than 0 (min: 0 would still let 0 through); decimals are fine
    amount: {
      type: Number,
      required: [true, 'Please enter the amount'],
      validate: {
        validator: (value) => value > 0,
        message: 'Expense amount must be more than 0',
      },
    },
    // Set by the server from the logged-in account, like Order and RestockLog
    staffMember: {
      type: String,
      enum: STAFF_MEMBERS,
      required: [true, 'Please say who logged the expense'],
    },
  },
  // createdAt is the expense's date ("Logged Sep 16 · Jui") and sorts the 20
  // newest; there's no date field in the design (Jui, 2026-10-05). timestamps
  // also fixes the old model's `default: Date.now()`, which ran once at server
  // start and gave every expense the same time.
  { timestamps: true },
);

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;
