const RestockLog = require('../models/restockLogModel');
const StockItem = require('../models/stockItemModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// The item with this name (trimmed, any case), or a new one in `unit` with
// threshold 0 and no auto-deduction (the schema defaults). Shared by Restock
// and by Edit restock entry when an entry is moved to a name not seen before.
async function findOrCreateItem(name, unit) {
  const item = await StockItem.findByName(name);
  if (item && item.isDeleted) return bringBack(item, unit);
  if (item) return item;
  try {
    return await StockItem.create({ name, unit });
  } catch (err) {
    // E11000: the other phone created this same name a moment ago, and the
    // unique index let only theirs through — use that item instead
    if (err.code !== 11000) throw err;
    return StockItem.findByName(name);
  }
}

// Restocking a deleted item's name brings that item back (Jui, 2026-10-03),
// so its old restocks and the new ones stay one history. Its count restarts
// at 0 (the restock adds to it next) in the unit of this restock: with
// nothing in stock no old number can be misread, so the Restock form leaves
// the unit open. Threshold and usedPer* are kept.
// `isDeleted: true` in the filter makes it a one-time switch: if both phones
// do this at once, the second finds nothing to bring back and so can't reset
// the count the first one just added to.
// Restock and Edit restock entry load deleted items too
// (GET /stock-items?includeDeleted=true), so typing one's name says it comes
// back — with its settings — instead of "New item" (fixed 2026-10-05).
async function bringBack(item, unit) {
  const revived = await StockItem.findOneAndUpdate(
    { _id: item._id, isDeleted: true },
    { isDeleted: false, quantity: 0, unit },
    { returnDocument: 'after' },
  );
  return revived ?? StockItem.findById(item._id);
}

// The Stock page shows only the newest entries (decided 2026-09-30). Limiting
// here, not in the browser, keeps each 7s poll from re-sending the whole history.
const RECENT_LIMIT = 20;

exports.getRecentRestocks = catchAsync(async (req, res, next) => {
  // populate swaps each stockItem id for { _id, name, isDeleted } — not the
  // unit, since the entry keeps its own copy. isDeleted lets the Stock page
  // mark entries whose item was deleted (they keep its real name).
  const restocks = await RestockLog.find()
    .sort('-createdAt')
    .limit(RECENT_LIMIT)
    .populate('stockItem', 'name isDeleted');

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

  // Existing name (trimmed, any case) = top up; new name = start tracking it
  const item = await findOrCreateItem(name, restock.unit);

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

// One entry for the Edit restock entry page, with its item's current name
exports.getRestock = catchAsync(async (req, res, next) => {
  const restock = await RestockLog.findById(req.params.id).populate(
    'stockItem',
    'name unit isDeleted',
  );

  if (!restock) {
    return next(new AppError('No restock entry found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { restock },
  });
});

// Edit restock entry: { name?, quantity? }. The name says which item this
// restock belongs to — changing it MOVES the entry to that item, it never
// renames an item (Jui, 2026-10-01; renaming belongs on Edit stock item).
// A name not seen before starts a new item, as on Restock. Moving to an item
// counted in another unit is allowed: the entry takes that unit, and the
// page warns that the quantity must be in it. staffMember and the logged
// time stay as they were.
//
// Known limit: if both phones edit the same entry at the same moment, the
// second one works from the old values. Optimistic concurrency would catch
// that, but it isn't worth it for two people who rarely correct one entry.
exports.updateRestock = catchAsync(async (req, res, next) => {
  const restock = await RestockLog.findById(req.params.id);
  if (!restock) {
    return next(new AppError('No restock entry found with that ID', 404));
  }

  const { name } = req.body;
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return next(new AppError('Please name this item', 400));
  }

  const oldItemId = restock.stockItem;
  const oldQuantity = restock.quantity;

  // Check the new quantity (> 0) before anything is written, so a bad one
  // can't leave a brand-new item behind
  if (req.body.quantity !== undefined) restock.quantity = req.body.quantity;
  await restock.validate(['quantity']);

  // Where the entry belongs now: the same item, another existing one, or a
  // new one (in the entry's current unit)
  // A name that still points at this entry's own item is not a move — even
  // when that item was deleted, so correcting an old entry's amount doesn't
  // quietly bring a deleted item back. Any other name goes through
  // findOrCreateItem (existing, deleted-and-revived, or new).
  const sameItem =
    name === undefined
      ? await StockItem.findById(oldItemId)
      : await StockItem.findByName(name);
  let target = null;
  if (sameItem && sameItem._id.equals(oldItemId)) target = sameItem;
  else if (name !== undefined) {
    target = await findOrCreateItem(name, restock.unit);
  }
  if (!target) {
    return next(new AppError("This entry's item was deleted", 400));
  }
  const isMove = !target._id.equals(oldItemId);

  // Log first, as in createRestock: if the counts below never got updated,
  // the entry still shows what it should have done
  restock.stockItem = target._id;
  restock.unit = target.unit;
  await restock.save();

  if (isMove) {
    // Take it all back off the old item (if it still exists) and add the
    // (possibly changed) amount to the new one
    await StockItem.findByIdAndUpdate(oldItemId, {
      $inc: { quantity: -oldQuantity },
    });
    await StockItem.findByIdAndUpdate(target._id, {
      $inc: { quantity: restock.quantity },
    });
  } else if (restock.quantity !== oldQuantity) {
    await StockItem.findByIdAndUpdate(target._id, {
      $inc: { quantity: restock.quantity - oldQuantity },
    });
  }

  const [updated, stockItem] = await Promise.all([
    RestockLog.findById(restock._id).populate(
      'stockItem',
      'name unit isDeleted',
    ),
    StockItem.findById(target._id),
  ]);

  res.status(200).json({
    status: 'success',
    data: { restock: updated, stockItem },
  });
});

// Delete entry: takes its amount back off the item, then removes the entry.
// The reverse order of createRestock, for the same reason: if the server died
// in between, the entry is still there to explain the number. Deleting it
// first could leave a count that's too high with nothing on record.
exports.deleteRestock = catchAsync(async (req, res, next) => {
  const restock = await RestockLog.findById(req.params.id);
  if (!restock) {
    return next(new AppError('No restock entry found with that ID', 404));
  }

  // The count may go below 0 (no min on purpose) — the Stock page shows Out
  await StockItem.findByIdAndUpdate(restock.stockItem, {
    $inc: { quantity: -restock.quantity },
  });
  await restock.deleteOne();

  // 200 with a JSON body, not 204: the client's getJson parses every response
  res.status(200).json({
    status: 'success',
    data: null,
  });
});
