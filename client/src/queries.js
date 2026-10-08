import { getJson } from './api.js';

// Every React Query key, fetch function and shared option set (Jui,
// 2026-10-08). Keys live here so a key can't be typed two ways — a page
// reading ['stock-items'] while a save refreshes ['stockItems'] would just
// never update.
//
// Lists use a plural root ('rounds', 'stock-items'…) and single documents a
// singular one ('order', 'stock-item'…). Refreshing a list by its root then
// can't refetch the edit page that's in the middle of deleting that document
// (which would flash "This item was deleted." before leaving the page).

// Two phones work at once with no websockets, so lists ask again every 7s
// (the middle of the agreed 5–10s range). React Query pauses this while the
// app is in the background and refetches as soon as it's back.
const POLL_INTERVAL_MS = 7000;

export const POLLED = { refetchInterval: POLL_INTERVAL_MS };

// Option lists on a form (New order's rounds, Restock's names): shown from
// the cache at once, but not changed under someone halfway through a form
export const FORM_LIST = { refetchOnWindowFocus: false };

// Edit pages fill their form from the data once. Never refetched while open,
// so nothing can overwrite what's being typed; gcTime 0 drops it on leaving,
// so the next visit loads fresh data instead of an old cached copy.
export const LOAD_ONCE = {
  staleTime: Infinity,
  gcTime: 0,
  refetchOnWindowFocus: false,
};

// Home: every active round with its earnings (sum of its orders' totalPrice).
// Still one request per round, as before React Query.
export const activeRoundsWithEarningsQuery = {
  queryKey: ['rounds', 'active', 'earnings'],
  queryFn: async () => {
    const { data } = await getJson('/api/v1/rounds/active');
    return Promise.all(
      data.activeRounds.map(async (round) => {
        const { data } = await getJson(`/api/v1/orders?round=${round._id}`);
        const earnings = data.orders.reduce((sum, o) => sum + o.totalPrice, 0);
        return { ...round, earnings };
      }),
    );
  },
};

// Orders: every round (active and ended, newest first) with its orders
export const roundsWithOrdersQuery = {
  queryKey: ['rounds', 'with-orders'],
  queryFn: async () => {
    const { data } = await getJson('/api/v1/rounds');
    return Promise.all(
      data.rounds.map(async (round) => {
        const { data } = await getJson(`/api/v1/orders?round=${round._id}`);
        return { round, orders: data.orders };
      }),
    );
  },
};

// New order's Round select
export const activeRoundsQuery = {
  queryKey: ['rounds', 'active'],
  queryFn: async () =>
    (await getJson('/api/v1/rounds/active')).data.activeRounds,
};

export const orderQuery = (id) => ({
  queryKey: ['order', id],
  queryFn: async () => (await getJson(`/api/v1/orders/${id}`)).data.order,
});

// Every stock item that isn't deleted — shared by Stock, Home and Edit stock
// item, so moving between them shows the same cached list
export const stockItemsQuery = {
  queryKey: ['stock-items'],
  queryFn: async () => (await getJson('/api/v1/stock-items')).data.stockItems,
};

// Deleted items too, for Restock / Edit restock entry's "brings it back"
export const stockItemsWithDeletedQuery = {
  queryKey: ['stock-items', 'with-deleted'],
  queryFn: async () =>
    (await getJson('/api/v1/stock-items?includeDeleted=true')).data
      .stockItems,
};

export const stockItemQuery = (id) => ({
  queryKey: ['stock-item', id],
  queryFn: async () =>
    (await getJson(`/api/v1/stock-items/${id}`)).data.stockItem,
});

// The 20 newest restocks
export const restocksQuery = {
  queryKey: ['restocks'],
  queryFn: async () => (await getJson('/api/v1/restocks')).data.restocks,
};

export const restockQuery = (id) => ({
  queryKey: ['restock', id],
  queryFn: async () => (await getJson(`/api/v1/restocks/${id}`)).data.restock,
});

// Finances: the all-time totals plus the 20 newest expenses, together
export const financesQuery = {
  queryKey: ['finances'],
  queryFn: async () => {
    const [summary, list] = await Promise.all([
      getJson('/api/v1/finances/summary'),
      getJson('/api/v1/expenses'),
    ]);
    return { summary: summary.data, expenses: list.data.expenses };
  },
};

export const expenseQuery = (id) => ({
  queryKey: ['expense', id],
  queryFn: async () => (await getJson(`/api/v1/expenses/${id}`)).data.expense,
});

// What each kind of save changes, by list root. A new order also deducts
// stock and adds revenue, so it refreshes those lists too.
export const AFFECTED_BY = {
  order: [['rounds'], ['stock-items'], ['finances']],
  round: [['rounds']],
  restock: [['restocks'], ['stock-items']],
  // The restock log shows item names and "(deleted)"
  stockItem: [['stock-items'], ['restocks']],
  expense: [['finances']],
};

// Called after a save, before leaving the page. refetchType 'all' also
// refetches lists that aren't on screen right now (the page we're about to
// go to), and waiting for it means that page shows the change on arrival
// instead of old data for a second. Lists never opened aren't in the cache,
// so they cost nothing.
export function refreshAfterSave(queryClient, keys) {
  return Promise.all(
    keys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: 'all' }),
    ),
  );
}
