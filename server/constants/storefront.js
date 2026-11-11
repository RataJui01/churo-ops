// Shared by the storefront models and (later) their controllers / routes, so
// the lists live in one place — like units.js and staffMembers.js.

// One section each on the customer menu, in this order (DESIGN §3.1).
// Strawberry Nutella Bites had its own 'bites' section from 2026-11-08 until
// Jui stopped selling it on the storefront (2026-11-11); the LINE dashboard
// keeps its own Bites flavor for its orders and stock.
const MENU_CATEGORIES = ['churro-hug', 'classic', 'topping'];

// Lines the customer may ask to have the topping in a separate cup: Classic
// only. Churro Hug comes with its topping on, and a topping line is the topping
// itself. A list (not a single value) so another category can be added in one
// place, as Bites was until 2026-11-11.
const SEPARATE_TOPPING_CATEGORIES = ['classic'];

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

// Orders still being worked on — what the staff page shows, one tab each
const ACTIVE_ORDER_STATUSES = ['pending_payment', 'cooking', 'ready'];

// Menu order: sections as in MENU_CATEGORIES, then sortOrder within each.
// Shared by the customer and staff menus so both list items the same way.
// Sorts the array in place and returns it.
const sortMenu = (items) => {
  const section = (item) => MENU_CATEGORIES.indexOf(item.category);
  return items.sort(
    (a, b) => section(a) - section(b) || a.sortOrder - b.sortOrder,
  );
};

module.exports = {
  MENU_CATEGORIES,
  SEPARATE_TOPPING_CATEGORIES,
  ORDER_STATUSES,
  ACTIVE_ORDER_STATUSES,
  sortMenu,
};
