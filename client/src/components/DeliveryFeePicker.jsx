import { useId } from 'react';
import { legendClass, optionClass } from './formClasses.js';

// Matches orderModel.js's deliveryFee enum
const DELIVERY_FEES = [0, 5, 10, 15];

// The Free/฿5/฿10/฿15 pills, shared by NewOrder and EditOrder
function DeliveryFeePicker({ value, onChange }) {
  const id = useId();

  return (
    <fieldset className="min-w-0">
      <legend className={legendClass}>Delivery</legend>
      <div className="flex flex-wrap gap-2">
        {DELIVERY_FEES.map((fee) => (
          <span key={fee}>
            <input
              type="radio"
              id={`${id}-${fee}`}
              name={id}
              checked={value === fee}
              onChange={() => onChange(fee)}
              className="peer sr-only"
            />
            <label
              htmlFor={`${id}-${fee}`}
              className={`${optionClass} justify-center rounded-pill px-4 py-2`}
            >
              {fee === 0 ? 'Free' : `฿${fee}`}
            </label>
          </span>
        ))}
      </div>
    </fieldset>
  );
}

export default DeliveryFeePicker;
