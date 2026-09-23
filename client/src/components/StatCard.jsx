function StatCard({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-surface-raised p-4 shadow-sm">
      <div className="text-label font-medium text-ink-muted">{label}</div>
      <div className="font-heading text-display">{value}</div>
    </div>
  );
}

export default StatCard;
