import { NavLink } from 'react-router';

const TABS = [
  { to: '/', label: 'Home', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/stock', label: 'Stock' },
  { to: '/finances', label: 'Finances' },
];

function AppShell({ subtitle, children }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-surface">
      <header className="border-b border-border bg-surface-raised px-5 pb-4 pt-5">
        <h1 className="font-heading text-heading">Churo Bites</h1>
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
