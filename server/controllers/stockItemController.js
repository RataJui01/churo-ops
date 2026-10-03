const StockItem = require('../models/stockItemModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Every stock item that isn't deleted, A–Z — for the Stock page, Home and the
// Restock form's list of existing names
exports.getAllStockItems = catchAsync(async (req, res, next) => {
  const stockItems = await StockItem.findSortedByName();

  res.status(200).json({
    status: 'success',
    results: stockItems.length,
    data: {
      stockItems,
    },
  });
});

// One item for the Edit stock item page. Deleted items are returned too, so
// the page can say "This item was deleted." instead of a bare "not found".
exports.getStockItem = catchAsync(async (req, res, next) => {
  const stockItem = await StockItem.findById(req.params.id);
  if (!stockItem) {
    return next(new AppError('No stock item found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { stockItem },
  });
});

// Fields the Edit stock item page may change. Not isDeleted (that's DELETE).
// The page only sends the fields that were actually changed — so saving a new
// threshold can't write back an old quantity over a restock the other phone
// made in the meantime.
const EDITABLE_FIELDS = [
  'name',
  'unit',
  'quantity',
  'lowStockThreshold',
  'usedPerPiece',
  'usedPerOrder',
];

// findById + set + save() rather than findByIdAndUpdate, as in updateOrder:
// save() runs the full schema validation (unit enum, no negative threshold or
// usage) and writes only the paths that changed. A quantity set here is the
// counted amount and replaces the old one — it isn't logged as a restock.
exports.updateStockItem = catchAsync(async (req, res, next) => {
  const stockItem = await StockItem.findById(req.params.id);
  if (!stockItem) {
    return next(new AppError('No stock item found with that ID', 404));
  }
  if (stockItem.isDeleted) {
    return next(new AppError('This item was deleted', 400));
  }

  EDITABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) stockItem.set(field, req.body[field]);
  });

  try {
    await stockItem.save();
  } catch (err) {
    if (err.code !== 11000) throw err;
    // The case-insensitive unique name index: say who has the name — a
    // deleted item still owns it (that's what lets a restock bring it back)
    const owner = await StockItem.findByName(stockItem.name);
    return next(
      new AppError(
        owner?.isDeleted
          ? `"${owner.name}" was deleted earlier — restock it to bring it back, or pick another name`
          : `There's already an item called "${owner?.name ?? stockItem.name}"`,
        400,
      ),
    );
  }

  res.status(200).json({
    status: 'success',
    data: { stockItem },
  });
});

// Soft delete (Jui, 2026-10-03): the item is hidden everywhere but stays in
// the database, so its restock-log entries keep showing its name
exports.deleteStockItem = catchAsync(async (req, res, next) => {
  const stockItem = await StockItem.findByIdAndUpdate(req.params.id, {
    isDeleted: true,
  });
  if (!stockItem) {
    return next(new AppError('No stock item found with that ID', 404));
  }

  // 200 with a JSON body, not 204: the client's getJson parses every response
  res.status(200).json({
    status: 'success',
    data: null,
  });
});
