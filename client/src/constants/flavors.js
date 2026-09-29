// Matches server/models/orderModel.js's flavor enum — shared by OrderRow and
// the future EditOrder page so the label list isn't duplicated.
export const FLAVOR_LABELS = {
  plain: 'Plain',
  chocolate: 'Chocolate',
  strawberry: 'Strawberry',
  signature: 'Signature',
  strawberry_nutella_bite: 'Strawberry Nutella Bite',
};

// Matches orderModel.js's addOns enum — shared by ItemBuilder and the
// "Items in this order" list.
export const ADD_ON_LABELS = {
  choc_dip: 'Choc dip',
  choc_pops: 'Choc pops',
  strawberry_freeze_dried: 'Strawberry freeze dried',
};

// "2x Plain (S)" — no "(size)" for strawberry_nutella_bite, which has none.
// Shared by OrderRow and OrderItemList so the wording lives in one place.
export function formatItemName({ quantity, flavor, size }) {
  return `${quantity}x ${FLAVOR_LABELS[flavor]}${size ? ` (${size})` : ''}`;
}

// The line under the item name: "+ Choc dip, Choc pops · Dip/topping on the side",
// either half alone, or null when there's neither. "On the side" stands on its own
// because every flavor already comes with its dip/topping — separateAddOns applies
// to that too, not only to paid add-ons (Jui, 2026-09-25).
export function formatExtras({ addOns, separateAddOns }) {
  const parts = [];
  if (addOns.length > 0) {
    parts.push(`+ ${addOns.map((a) => ADD_ON_LABELS[a]).join(', ')}`);
  }
  if (separateAddOns) parts.push('Dip/topping on the side');
  return parts.length > 0 ? parts.join(' · ') : null;
}
