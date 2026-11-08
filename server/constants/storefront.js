// Shared by the storefront models and (later) their controllers / routes, so
// the lists live in one place — like units.js and staffMembers.js.

// One section each on the customer menu, in this order: the design's three
// (DESIGN §3.1) plus Strawberry Nutella Bites after Classic — one size only,
// so it fits neither Classic nor Churro Hug (Jui, 2026-11-08; not in the
// design yet)
const MENU_CATEGORIES = ['churro-hug', 'classic', 'bites', 'topping'];

// Lines the customer may ask to have the topping in a separate cup:
// Classic and Bites. Churro Hug comes with its topping on, and a topping line
// is the topping itself.
const SEPARATE_TOPPING_CATEGORIES = ['classic', 'bites'];

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

module.exports = {
  MENU_CATEGORIES,
  SEPARATE_TOPPING_CATEGORIES,
  ORDER_STATUSES,
};
