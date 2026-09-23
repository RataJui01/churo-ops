import { Link } from 'react-router';
import SectionLabel from './SectionLabel.jsx';

function QuickActions() {
  return (
    <div className="flex flex-col gap-2.5">
      <SectionLabel>Quick actions</SectionLabel>
      <Link
        to="/orders/new"
        className="flex min-h-11 items-center gap-3 rounded-md bg-brand px-4 py-3.5 text-on-brand"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span className="text-[15px] font-medium">New order</span>
      </Link>
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          to="/restock"
          className="flex min-h-11 flex-col gap-2 rounded-md bg-surface-peach p-3.5 text-ink"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 7l9-4 9 4-9 4-9-4z" />
            <path d="M3 7v10l9 4 9-4V7" />
          </svg>
          <span className="text-body">Restock</span>
        </Link>
        <Link
          to="/expenses/new"
          className="flex min-h-11 flex-col gap-2 rounded-md bg-surface-apricot p-3.5 text-ink"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="7" width="18" height="12" rx="2" />
            <path d="M3 11h18" />
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span className="text-body">Add expense</span>
        </Link>
      </div>
    </div>
  );
}

export default QuickActions;
