// The loading state everywhere a page or section waits for its first data
// (Jui, 2026-11-11 — replaces the "Loading…" lines): a 32px brand-coloured
// arc turning on a border-coloured ring, centred in the space it's given.
//
// label is what a screen reader hears ("Loading stock"); nothing is shown.
// role="status" announces it politely without moving focus.
//
// With reduced motion it turns slowly instead of stopping: a ring that stands
// still looks like the page has frozen.
function Spinner({ label }) {
  return (
    <div role="status" className="flex justify-center py-12">
      <span
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-[3px] border-border border-t-brand motion-reduce:animate-[spin_3s_linear_infinite]"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default Spinner;
