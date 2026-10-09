import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { logout } from '../api.js';

const TABS = [
  { to: '/', label: 'Home', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/stock', label: 'Stock' },
  { to: '/finances', label: 'Finances' },
];

// The tab that was active on the last page that had this nav. Every page
// renders its own AppShell, so the nav is brand new on each tab switch and
// has no old position to slide from; a module-level variable outlives it.
// null until the first page, so opening a page directly doesn't slide.
const lastTab = { index: null };

function tabIndex(pathname) {
  return TABS.findIndex(({ to, end }) =>
    end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`),
  );
}

// showLogout: only Home has the Log out button, as in the design (Jui,
// 2026-10-05)
function AppShell({ subtitle, showLogout = false, children }) {
  const activeIndex = tabIndex(useLocation().pathname);
  // The brown pill behind the active tab (Jui, 2026-10-08: it slides to the
  // new tab, not in the design). It's drawn at the previous tab first, then
  // moved on the next frame — the browser has to paint the old position
  // before the CSS transition has anything to animate from.
  const [pillIndex, setPillIndex] = useState(lastTab.index ?? activeIndex);

  useEffect(() => {
    lastTab.index = activeIndex;
    const frame = requestAnimationFrame(() => setPillIndex(activeIndex));
    return () => cancelAnimationFrame(frame);
  }, [activeIndex]);

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

        <nav className="relative mt-3.5 flex rounded-pill bg-surface p-1">
          {/* One pill for the whole nav, sized to one tab (the nav's width
              minus its p-1 padding, split four ways) and moved a whole tab
              width at a time */}
          {pillIndex >= 0 && (
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 rounded-pill bg-brand transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={{
                width: `calc((100% - 0.5rem) / ${TABS.length})`,
                transform: `translateX(${pillIndex * 100}%)`,
              }}
            />
          )}
          {TABS.map(({ to, label, end }, index) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              // Coloured by where the pill is, not by the route, so a label
              // turns white as the pill arrives rather than before it.
              // aria-current still comes from the route.
              className={`relative flex min-h-10 flex-1 items-center justify-center rounded-pill px-0.5 py-1 text-body-small transition-colors duration-200 motion-reduce:transition-none ${
                index === pillIndex
                  ? 'font-semibold text-on-brand'
                  : 'text-ink-muted'
              }`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Mounted afresh on every tab switch (each page has its own
          AppShell), so the fade plays exactly then */}
      <main className="flex-1 animate-fade-in p-5 motion-reduce:animate-none">
        {children}
      </main>
    </div>
  );
}

export default AppShell;
