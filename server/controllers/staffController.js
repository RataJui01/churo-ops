const MenuItem = require('../models/menuItemModel');
const StorefrontOrder = require('../models/storefrontOrderModel');
const StoreSetting = require('../models/storeSettingModel');
const Counter = require('../models/counterModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { paymentPayload } = require('../utils/promptPay');
const {
  ACTIVE_ORDER_STATUSES,
  sortMenu,
} = require('../constants/storefront');

// The staff side of the storefront (/api/staff, every route behind
// `protect`): the store switch, the three order tabs and the sold-out
// switches. Staff are the existing Jui / Impact accounts (Jui, 2026-11-08),
// so "who did it" always comes from req.user, never from the body.

// ---------- Store ----------

// { isOpen, updatedBy: { name } | null, updatedAt } — "Opened by Jui 17:02"
const storeView = (store) => ({
  isOpen: store.isOpen,
  updatedBy: store.updatedBy?.name ? { name: store.updatedBy.name } : null,
  updatedAt: store.updatedAt ?? null,
});

// GET /api/staff/store — no document yet counts as closed
exports.getStore = catchAsync(async (req, res, next) => {
  const store = await StoreSetting.findById(StoreSetting.STORE_ID).populate(
    'updatedBy',
    'name',
  );
  res.status(200).json({
    status: 'success',
    data: { store: storeView(store ?? { isOpen: false }) },
  });
});

// PATCH /api/staff/store  { isOpen }
// Opening needs a working payment QR (Jui, 2026-11-09): otherwise customers
// could order but not pay. Closing always works. updatedAt (automatic
// timestamps) is when the switch was flipped.
exports.updateStore = catchAsync(async (req, res, next) => {
  const { isOpen } = req.body;
  if (typeof isOpen !== 'boolean') {
    return next(new AppError('isOpen must be true or false', 400));
  }
  if (isOpen && !paymentPayload(1)) {
    return next(
      new AppError('Set up the payment QR before opening the store', 400),
    );
  }

  const store = await StoreSetting.findOneAndUpdate(
    { _id: StoreSetting.STORE_ID },
    { $set: { isOpen, updatedBy: req.user._id } },
    { upsert: true, returnDocument: 'after' },
  ).populate('updatedBy', 'name');

  res.status(200).json({ status: 'success', data: { store: storeView(store) } });
});

// ---------- Orders ----------

// GET /api/staff/orders[?status=pending_payment|cooking|ready]
// Every order still being worked on, in one request: the tabs show all three
// counts at once, so one poll every 5 s instead of three. The page splits them
// into tabs and sorts each (queue number, time ready). Phone numbers included
// — staff call customers from the cooking / ready tabs.
exports.getOrders = catchAsync(async (req, res, next) => {
  let statuses = ACTIVE_ORDER_STATUSES;
  if (req.query.status !== undefined) {
    if (!ACTIVE_ORDER_STATUSES.includes(req.query.status)) {
      return next(
        new AppError(
          `status must be one of: ${ACTIVE_ORDER_STATUSES.join(', ')}`,
          400,
        ),
      );
    }
    statuses = [req.query.status];
  }

  const orders = await StorefrontOrder.find({ status: { $in: statuses } })
    .select('+customerPhone')
    .sort('createdAt');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { orders },
  });
});

// Moves an order one step, but only from the status it's expected to be in.
// The status is part of the filter, so the check and the write are one atomic
// step: if the other phone already moved it (or the button was tapped twice),
// nothing matches and the answer is 409 — never a second confirmation.
const moveOrder = async (id, fromStatus, changes) => {
  const order = await StorefrontOrder.findOneAndUpdate(
    { _id: id, status: fromStatus },
    { $set: changes },
    { returnDocument: 'after' },
  ).select('+customerPhone');
  if (order) return order;

  // Told apart only after the update failed: a missing order is a 404
  if (!(await StorefrontOrder.exists({ _id: id }))) {
    throw new AppError('No order found with that ID', 404);
  }
  throw new AppError(
    "This order's status has already changed (maybe on the other phone)",
    409,
  );
};

const sendOrder = (res, order) =>
  res.status(200).json({ status: 'success', data: { order } });

// PATCH /api/staff/orders/:id/confirm — payment seen in K SHOP
// The order is claimed first (pending_payment → cooking), and only then does it
// take a queue number. The other way round, a double tap or both phones
// confirming at once would use up a number for nothing and the queue would
// skip. If the server died between the two steps, the order would be cooking
// with no number; the page shows "—" for that.
exports.confirmOrder = catchAsync(async (req, res, next) => {
  const order = await moveOrder(req.params.id, 'pending_payment', {
    status: 'cooking',
    confirmedBy: req.user._id,
    confirmedAt: new Date(),
  });
  order.queueNumber = await Counter.nextQueueNumber();
  await StorefrontOrder.updateOne(
    { _id: order._id },
    { $set: { queueNumber: order.queueNumber } },
  );
  sendOrder(res, order);
});

// PATCH /api/staff/orders/:id/ready — made, the customer's page says "ready"
exports.markReady = catchAsync(async (req, res, next) => {
  sendOrder(
    res,
    await moveOrder(req.params.id, 'cooking', {
      status: 'ready',
      readyAt: new Date(),
    }),
  );
});

// PATCH /api/staff/orders/:id/pickup — handed over, the order is closed
exports.markPickedUp = catchAsync(async (req, res, next) => {
  sendOrder(
    res,
    await moveOrder(req.params.id, 'ready', {
      status: 'picked_up',
      pickedUpAt: new Date(),
    }),
  );
});

// PATCH /api/staff/orders/:id/cancel — only orders that were never paid
// (Jui, 2026-11-09): a paid order is refunded outside the app, so it isn't
// cancelled with one tap. There's no undo for any step yet (Jui, 2026-11-09).
exports.cancelOrder = catchAsync(async (req, res, next) => {
  sendOrder(
    res,
    await moveOrder(req.params.id, 'pending_payment', { status: 'cancelled' }),
  );
});

// ---------- Menu ----------

// GET /api/staff/menu — the whole menu even while the store is closed (the
// public /menu sends none then), so items can be switched off before opening
exports.getMenu = catchAsync(async (req, res, next) => {
  const items = sortMenu(
    await MenuItem.find().select('category name variants isAvailable sortOrder'),
  );
  res.status(200).json({
    status: 'success',
    results: items.length,
    data: { items },
  });
});

// PATCH /api/staff/menu/:itemId  { isAvailable } — the sold-out switch.
// Only this one field: prices change through scripts/seedMenu.js.
exports.updateMenuItem = catchAsync(async (req, res, next) => {
  const { isAvailable } = req.body;
  if (typeof isAvailable !== 'boolean') {
    return next(new AppError('isAvailable must be true or false', 400));
  }

  const item = await MenuItem.findByIdAndUpdate(
    req.params.itemId,
    { $set: { isAvailable } },
    { returnDocument: 'after' },
  );
  if (!item) {
    return next(new AppError('No menu item found with that ID', 404));
  }

  res.status(200).json({ status: 'success', data: { item } });
});
