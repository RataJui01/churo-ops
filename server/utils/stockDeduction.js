const StockItem = require('../models/stockItemModel');

// Strawberry Nutella Bite comes in its own box with its own churros (Bite
// churro / Bite box), so it's counted apart from regular churros
const BITE_FLAVOR = 'strawberry_nutella_bite';
const PIECES_PER_SERVING = { S: 4, M: 8 };

// What an order's items use: regular churro pieces and servings, and Nutella
// bite servings. Everything is per serving (quantity), not per order
// (Jui, 2026-10-03): each serving gets its own box.
function countUsage(items) {
  const usage = { pieces: 0, servings: 0, bites: 0 };
  items.forEach(({ flavor, size, quantity }) => {
    if (flavor === BITE_FLAVOR) {
      usage.bites += quantity;
    } else {
      usage.servings += quantity;
      usage.pieces += PIECES_PER_SERVING[size] * quantity;
    }
  });
  return usage;
}

// How much of each stock item this order takes — only items that lose > 0.
// The rules are data on each item (see stockItemModel), so this has no list
// of item names in it.
function planDeductions(items, stockItems) {
  const { pieces, servings, bites } = countUsage(items);
  return stockItems
    .map((item) => ({
      stockItem: item._id,
      quantity:
        item.usedPerPiece * pieces +
        (item.usedPerServing ?? 0) * servings +
        (item.usedPerBite ?? 0) * bites +
        item.usedPerOrder,
    }))
    .filter((d) => d.quantity > 0);
}

// new − old for every item in either list, leaving out the ones that didn't
// change — what an edit adds to (positive) or gives back (negative) per item
function diffDeductions(oldList, newList) {
  const totals = new Map();
  oldList.forEach(({ stockItem, quantity }) => {
    const id = String(stockItem);
    totals.set(id, (totals.get(id) ?? 0) - quantity);
  });
  newList.forEach(({ stockItem, quantity }) => {
    const id = String(stockItem);
    totals.set(id, (totals.get(id) ?? 0) + quantity);
  });
  return [...totals]
    .filter(([, quantity]) => quantity !== 0)
    .map(([stockItem, quantity]) => ({ stockItem, quantity }));
}

// Takes (sign -1) or gives back (sign +1) the given amounts. One bulkWrite for
// all items — an order can touch five at once — and each update is an atomic
// $inc, as for restocks, so the two phones can't overwrite each other.
// Counts may go below 0 on purpose: the Stock page shows Out.
async function applyStockChanges(changes, sign) {
  if (changes.length === 0) return;
  await StockItem.bulkWrite(
    changes.map(({ stockItem, quantity }) => ({
      updateOne: {
        filter: { _id: stockItem },
        update: { $inc: { quantity: sign * quantity } },
      },
    })),
  );
}

module.exports = {
  countUsage,
  planDeductions,
  diffDeductions,
  applyStockChanges,
};
