const RestockLog = require('../models/restockLogModel');
const StockItem = require('../models/stockItemModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// The Stock page shows only the newest entries (decided 2026-09-30). Limiting
// here, not in the browser, keeps each 7s poll from re-sending the whole history.
const RECENT_LIMIT = 20;

exports.getRecentRestocks = catchAsync(async (req, res, next) => {
  // populate swaps each stockItem id for { _id, name } — just the name, since
  // the entry keeps its own copy of the unit. A deleted item comes back null.
  const restocks = await RestockLog.find()
    .sort('-createdAt')
    .limit(RECENT_LIMIT)
    .populate('stockItem', 'name');

  res.status(200).json({
    status: 'success',
    results: restocks.length,
    data: {
      restocks,
    },
  });
});

// Restock form: { name, quantity, unit }. Tops up the item with that name, or
// starts tracking a new one, and logs who restocked what.
exports.createRestock = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  if (typeof name !== 'string' || !name.trim()) {
    return next(new AppError('Please name this item', 400));
  }

  // Check quantity (> 0) and unit (kg/L/pcs) with the schema's own rules
  // before touching the database — otherwise a quantity of 0 could still
  // leave a brand-new, empty item behind before the error shows up
  const restock = new RestockLog({
    quantity: req.body.quantity,
    unit: req.body.unit,
    // Whoever is logged in restocked — from the token, like createOrder
    staffMember: req.user.name,
  });
  await restock.validate(['quantity', 'unit', 'staffMember']);

  // Existing name (trimmed, any case) = top up; new name = start tracking it,
  // with threshold 0 and no auto-deduction (the schema defaults)
  let item = await StockItem.findByName(name);
  if (!item) {
    try {
      item = await StockItem.create({ name, unit: restock.unit });
    } catch (err) {
      // E11000: the other phone created this same name a moment ago, and the
      // unique index let only theirs through — use that item instead
      if (err.code !== 11000) throw err;
      item = await StockItem.findByName(name);
    }
  }

  // The form locks the unit to the item's own, so this is just a backstop
  if (item.unit !== restock.unit) {
    return next(
      new AppError(
        `${item.name} is counted in ${item.unit} — restock it in ${item.unit}`,
        400,
      ),
    );
  }

  // Two separate writes, log first: if the server died in between, a log
  // entry whose amount wasn't added is visible on the Stock page and fixable,
  // while a count that changed with no log would be a mystery. (A MongoDB
  // transaction would close this gap; not worth it at this scale.)
  restock.stockItem = item._id;
  await restock.save();

  // $inc adds inside the database in one step, so two phones restocking the
  // same item at once both count. Reading the quantity, adding in JS and
  // writing it back would let one overwrite the other. restock.quantity is
  // already cast to a Number — $inc would reject a "5" string from the body.
  const stockItem = await StockItem.findByIdAndUpdate(
    item._id,
    { $inc: { quantity: restock.quantity } },
    // Return the item after the $inc (Mongoose 9 replaced { new: true } with this)
    { returnDocument: 'after' },
  );

  // Deleted between the lookup and now (possible once items can be deleted):
  // drop the log entry too, so it doesn't point at nothing
  if (!stockItem) {
    await restock.deleteOne();
    return next(new AppError('This item was just deleted', 404));
  }

  res.status(201).json({
    status: 'success',
    data: {
      restock,
      stockItem,
    },
  });
});
