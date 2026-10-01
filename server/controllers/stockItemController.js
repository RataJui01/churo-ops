const StockItem = require('../models/stockItemModel');
const catchAsync = require('../utils/catchAsync');

// Every stock item, A–Z — for the Stock page and the Restock form's
// list of existing names
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
