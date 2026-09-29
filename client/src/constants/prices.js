// Real prices from Jui, 2026-09-25. Keys match server/models/orderModel.js's
// flavor enum. strawberry_nutella_bite has no size, so it's a single number
// instead of { S, M }.
export const BASE_PRICES = {
  plain: { S: 59, M: 99 },
  chocolate: { S: 69, M: 119 },
  strawberry: { S: 89, M: 149 },
  signature: { S: 79, M: 129 },
  strawberry_nutella_bite: 129,
};

// Every add-on costs the same
export const ADD_ON_PRICE = 10;

// strawberry_nutella_bite is the only flavor without S/M
export function hasSize(flavor) {
  return typeof BASE_PRICES[flavor] === 'object';
}

// Each piece gets its own add-ons, so add-ons are multiplied by quantity too.
// Shared by the item builder, the items list, the Total footer and EditOrder so
// the formula only lives here.
export function getLinePrice({ flavor, size, addOns = [], quantity = 1 }) {
  const base = BASE_PRICES[flavor];
  const unitPrice = hasSize(flavor) ? base[size] : base;
  return (unitPrice + addOns.length * ADD_ON_PRICE) * quantity;
}
