// Everything about an order's status in one place — shared by OrderRow (the
// badge), RoundOrderGroup (counts and filter chips) and EditOrder (the radio).

// isDone/isDelivered are independent booleans in the model, but the UI shows
// one status — delivered wins even if isDone is still false, since a courier
// can mark an order delivered before someone marks it done.
export function orderStatus(order) {
  if (order.isDelivered) return 'delivered';
  if (order.isDone) return 'done';
  return 'pending';
}

// What EditOrder's radio sends for each choice. Delivered also sets isDone:
// an order that reached the customer was obviously made, and a one-choice
// radio can't express "delivered but not done" anyway.
export const STATUS_FLAGS = {
  pending: { isDone: false, isDelivered: false },
  done: { isDone: true, isDelivered: false },
  delivered: { isDone: true, isDelivered: true },
};

export const STATUS_META = {
  pending: {
    label: 'Pending',
    badgeClass: 'bg-surface-peach text-status-pending',
    icon: (
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </>
    ),
  },
  done: {
    label: 'Done',
    badgeClass: 'bg-status-done-bg text-status-done',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8.5 12.5l2.5 2.5 5-5" />
      </>
    ),
  },
  delivered: {
    label: 'Delivered',
    badgeClass: 'bg-status-delivered-bg text-status-delivered',
    icon: (
      <>
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </>
    ),
  },
};
