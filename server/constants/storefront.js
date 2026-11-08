// Shared by the storefront models and (later) their controllers / routes, so
// the lists live in one place — like units.js and staffMembers.js.

// One section each on the customer menu, in this order (DESIGN §3.1)
const MENU_CATEGORIES = ['classic', 'churro-hug', 'topping'];

// pending_payment → cooking (staff confirmed the payment, queue number given)
// → ready (made, waiting for the customer) → picked_up (closed).
// cancelled = staff cancelled an order that was never paid.
const ORDER_STATUSES = [
  'pending_payment',
  'cooking',
  'ready',
  'picked_up',
  'cancelled',
];

module.exports = { MENU_CATEGORIES, ORDER_STATUSES };
