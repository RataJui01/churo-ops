import { NavLink } from 'react-router';
import { logout } from '../api.js';

const TABS = [
  { to: '/', label: 'Home', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/stock', label: 'Stock' },
  { to: '/finances', label: 'Finances' },
];

// showLogout: only Home has the Log out button, as in the design (Jui,
// 2026-10-05)
function AppShell({ subtitle, showLogout = false, children }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface">
      <header className="border-b border-border bg-surface-raised px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-2.5">
          <h1 className="font-heading text-heading">Churo Bites</h1>
          {/* A button, not a link: it ends the session, not just a page
              change. The outer box is the 44px tap area (-my-2 keeps the
              header from growing); the span is the visible outline. No
              confirmation, as in the design — a wrong tap only means
              logging in again. */}
          {showLogout && (
            <button
              type="button"
              onClick={logout}
              className="-my-2 flex min-h-11 min-w-11 items-center justify-end pl-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="rounded-md border border-border px-3.5 py-1.5 text-body-small text-ink-muted">
                Log out
              </span>
            </button>
          )}
        </div>
        <p className="text-body-small text-ink-muted">{subtitle}</p>

        <nav className="mt-3.5 flex rounded-pill bg-surface p-1">
          {TABS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-10 flex-1 items-center justify-center rounded-pill px-0.5 py-1 text-body-small ${
                  isActive
                    ? 'bg-brand font-semibold text-on-brand'
                    : 'text-ink-muted'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-5">{children}</main>
    </div>
  );
}

export default AppShell;
