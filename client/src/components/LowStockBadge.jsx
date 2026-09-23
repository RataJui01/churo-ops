function LowStockBadge({ children }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.25 rounded-pill bg-surface-peach py-1 pl-2 pr-2.5 text-badge text-status-pending">
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
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
      {children}
    </span>
  );
}

export default LowStockBadge;
