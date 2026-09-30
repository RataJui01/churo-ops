import { Link } from 'react-router';
import { formatItemName } from '../constants/flavors.js';
import { STATUS_META, orderStatus } from '../constants/orderStatus.jsx';

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
