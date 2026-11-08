const mongoose = require('mongoose');
const MenuItem = require('../models/menuItemModel');
const StorefrontOrder = require('../models/storefrontOrderModel');
const StoreSetting = require('../models/storeSettingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { paymentQr } = require('../utils/promptPay');
const { MENU_CATEGORIES } = require('../constants/storefront');

// The public storefront API: what customers' phones call, with no login
// (routes/storefrontRoutes.js). Error messages are in English like the rest of
// the API; the customer pages check the form themselves and show Thai text,
// and react to status codes rather than messages: 403 = store closed,
// 409 = something in the cart has sold out (Jui, 2026-11-09).

// Exactly what a customer may see of an order. A whitelist rather than
// deleting fields: select: false only hides the phone number from queries — a
// document that was just created still has it — and a field added to the
// model later stays private until it's added here on purpose. confirmedBy
// (which staff account) is internal too.
const PUBLIC_ORDER_FIELDS = [
  '_id',
  'status',
  'queueNumber',
  'customerName',
  'items',
  'totalPrice',
  'createdAt',
  'confirmedAt',
  'readyAt',
  'pickedUpAt',
];

const toPublicOrder = (order) => {
  const plain = order.toObject();
  return Object.fromEntries(
    PUBLIC_ORDER_FIELDS.filter((field) => plain[field] !== undefined).map(
      (field) => [field, plain[field]],
    ),
  );
};

// GET /api/storefront/menu
// Closed store: no menu at all, so the page shows only the closed screen
// (REQUIREMENTS §5). Open: every item, sold-out ones included — the design
// shows them as "sold out" rows. One list in menu order (sections as in
// MENU_CATEGORIES, then sortOrder); the page groups it by category.
exports.getMenu = catchAsync(async (req, res, next) => {
  const store = await StoreSetting.getStore();
  if (!store.isOpen) {
    return res.status(200).json({ status: 'success', data: { isOpen: false } });
  }

  const items = await MenuItem.find().select(
    'category name variants isAvailable sortOrder',
  );
  const section = (item) => MENU_CATEGORIES.indexOf(item.category);
  items.sort(
    (a, b) => section(a) - section(b) || a.sortOrder - b.sortOrder,
  );

  res.status(200).json({
    status: 'success',
    results: items.length,
    data: { isOpen: true, items },
  });
});

// POST /api/storefront/orders
// Body: { customerName, customerPhone,
//         items: [{ menuItemId, variantName?, qty, separateToppings? }] }
// Only those fields are read. Names, prices and the total always come from the
// database — a price, total or status sent by the client is ignored.
exports.createOrder = catchAsync(async (req, res, next) => {
  // Checked here, not trusted from the page: a menu left open on a phone
  // after the store closed must not be able to order
  const store = await StoreSetting.getStore();
  if (!store.isOpen) {
    return next(new AppError('The store is not taking orders right now', 403));
  }

  const lines = req.body.items;
  if (!Array.isArray(lines) || lines.length === 0) {
    return next(new AppError('An order needs at least one item', 400));
  }
  if (lines.length > 30) {
    return next(new AppError('An order can have at most 30 lines', 400));
  }
  for (const [index, line] of lines.entries()) {
    // isObjectIdOrHexString, not isValidObjectId: the latter also accepts
    // any 12-character string
    if (!line || !mongoose.isObjectIdOrHexString(line.menuItemId)) {
      return next(new AppError(`Line ${index + 1}: invalid menu item`, 400));
    }
  }

  // Every item on the order in one query
  const ids = lines.map((line) => line.menuItemId);
  const menuItems = await MenuItem.find({ _id: { $in: ids } });
  const byId = new Map(menuItems.map((item) => [item.id, item]));

  const items = [];
  const soldOut = new Set();
  for (const [index, line] of lines.entries()) {
    const menuItem = byId.get(String(line.menuItemId));
    if (!menuItem) {
      return next(
        new AppError(`Line ${index + 1}: that menu item doesn't exist`, 400),
      );
    }
    if (!menuItem.isAvailable) {
      soldOut.add(menuItem.id);
      continue;
    }

    // A single-variant item (Hug, Bites, toppings) needs no choice; Classic
    // must say S or M
    const variant =
      menuItem.variants.length === 1 && line.variantName === undefined
        ? menuItem.variants[0]
        : menuItem.variants.find((v) => v.name === line.variantName);
    if (!variant) {
      return next(
        new AppError(
          `Line ${index + 1}: please choose ${menuItem.variants
            .map((v) => v.name)
            .join(' or ')} for ${menuItem.name}`,
          400,
        ),
      );
    }

    items.push({
      menuItem: menuItem._id,
      category: menuItem.category,
      name: menuItem.name,
      variantName: variant.name,
      unitPrice: variant.price,
      qty: line.qty,
      // === true on purpose: Mongoose would also read "yes" or 1 as true
      separateToppings: line.separateToppings === true,
    });
  }

  // Sent from here rather than through AppError, which only carries a
  // message: the page needs the ids to mark those cart rows
  if (soldOut.size) {
    return res.status(409).json({
      status: 'fail',
      message: 'Some items have just sold out',
      data: { soldOut: [...soldOut] },
    });
  }

  // status, queueNumber and confirmedBy are left out on purpose: a new order
  // always starts as pending_payment, with no queue number
  const newOrder = new StorefrontOrder({
    items,
    customerName: req.body.customerName,
    customerPhone: req.body.customerPhone,
  });
  // The total is worked out from the lines after Mongoose has cast them (a qty
  // of "2" becomes 2); bad quantities are then reported by validation
  newOrder.totalPrice = newOrder.items.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0,
  );
  await newOrder.save();

  res.status(201).json({
    status: 'success',
    data: { order: toPublicOrder(newOrder) },
  });
});

// GET /api/storefront/orders/:id
// The status page polls this. Works while the store is closed, so an order
// placed before closing can still be followed. The id is the order's
// unguessable ObjectId, and nothing private is returned (REQUIREMENTS §7).
// While the order waits for payment it also carries `payment` — the PromptPay
// QR for its total (null if PromptPay isn't set up). Only then: once paid or
// cancelled there must be nothing left to scan. A new QR is drawn on every
// poll (a few ms) — no cache needed at this volume.
exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await StorefrontOrder.findById(req.params.id);
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  const publicOrder = toPublicOrder(order);
  if (order.status === 'pending_payment') {
    publicOrder.payment = await paymentQr(order.totalPrice);
  }

  res.status(200).json({
    status: 'success',
    data: { order: publicOrder },
  });
});
