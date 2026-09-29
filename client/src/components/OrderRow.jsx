import { Link } from 'react-router';
import { formatItemName } from '../constants/flavors.js';

// isDone/isDelivered are independent booleans in the model, but the UI shows
// one badge — delivered wins even if isDone is still false, since a courier
// can mark an order delivered before someone marks it done.
function orderStatus(order) {
  if (order.isDelivered) return 'delivered';
  if (order.isDone) return 'done';
  return 'pending';
}

const STATUS_META = {
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

// Builds "4:00 PM" from a "16:00" HH:mm string
function formatDeliveryTime(deliveryTime) {
  const [hours, minutes] = deliveryTime.split(':');
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// order: an Order document ({ _id, items, totalPrice, deliveryTime,
// customerName, isDone, isDelivered })
function OrderRow({ order }) {
  const status = STATUS_META[orderStatus(order)];

  return (
    <Link
      to={`/orders/${order._id}`}
      className="flex items-center justify-between gap-2.5"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="text-body">
          ฿{order.totalPrice.toLocaleString()}
          {order.customerName && ` · ${order.customerName}`}
        </div>
        {order.deliveryTime && (
          <div className="text-label text-ink-muted">
            Delivers {formatDeliveryTime(order.deliveryTime)}
          </div>
        )}
        <div className="flex flex-col">
          {order.items.map((item, i) => (
            <div key={i} className="text-label text-ink-muted">
              {formatItemName(item)}
            </div>
          ))}
        </div>
      </div>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-pill py-1 pl-2 pr-2.5 text-badge ${status.badgeClass}`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {status.icon}
        </svg>
        {status.label}
      </span>
    </Link>
  );
}

export default OrderRow;
