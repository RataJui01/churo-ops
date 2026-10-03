import { Link } from 'react-router';

// Header for form screens (New order, New round, ...): back arrow + page title,
// no brand name or tab nav, per the design's sub-page header. Kept separate from
// AppShell because the two headers share nothing but the outer frame.
// backTo is a fixed route rather than navigate(-1): opened directly (refresh,
// shared link) there's no previous page in history, and -1 would leave the app.
// subtitle (optional): a small line under the title, e.g. Edit restock
// entry's "Logged Today, 9:12 AM · Jui"
function SubPageShell({ title, subtitle, backTo, children }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface">
      <header className="flex items-center gap-3 border-b border-border bg-surface-raised p-5">
        <Link
          to={backTo}
          aria-label="Back"
          className="flex min-h-11 min-w-11 items-center justify-center text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-col gap-px">
          <h1 className="font-heading text-page-title">{title}</h1>
          {subtitle && (
            <p className="text-label text-ink-muted">{subtitle}</p>
          )}
        </div>
      </header>

      <main className="flex-1 p-5">{children}</main>
    </div>
  );
}

export default SubPageShell;
