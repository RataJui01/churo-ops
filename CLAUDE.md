# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Churo Bites Operations Dashboard** — an internal order-management and inventory-tracking
tool for Churo Bites, a small churro business Jui co-runs with their partner, Impact (orders are
currently taken over LINE). It's also a portfolio/internship piece for Jui, a university
student learning Node.js aiming for a Junior full-stack role.

**Collaboration style**: explain the *why* behind suggestions rather than silently handing
over finished code, and keep solutions at a learning-appropriate level of complexity — this
is explicitly not meant to reach for enterprise patterns it doesn't need. Jui wants to stay
the one making UX/flow decisions (needs to be able to explain *why* something looks the way
it does in an interview); AI-generated scaffolding and design-system basics are fine, but
layout/flow calls should be explained, not just delivered.

**Business context driving the architecture**:
- Two operators take orders concurrently on separate phones — this is why there's a shared
  Node/Express/MongoDB backend rather than a purely client-side app; both devices need to
  see the same stock numbers and order list.
- Sync is intentionally simple: polling every 7s (React Query's `refetchInterval`), not
  WebSockets. Upgrading to Socket.io
  is an explicit stretch goal, not a requirement.
- Churros are bought pre-made and only flavored via topping/dusting at sale time — there is
  no ingredient-level recipe tracking. This is why finished churros are a single stock item
  ("Churro"), not tracked per flavor.

## Project state

**Verify against the working tree, not just this file.** As of 2026-10-05 every screen in
the live design is built and merged to `main` (PRs #1–#10): Login / Log out, Home, Orders,
New / Edit order, New round, Stock, Restock, Edit restock entry, Edit stock item, Finances,
Add / Edit expense — plus auto stock deduction on orders. `todo.TODO` has no open items.
The server was rebuilt from the live design rather than restored from the old commit
`af86b78` (its 5 models / stub controllers are history only — don't `git restore` them).

What's left is optional; ask Jui before starting any of it: the known gaps listed under
"Status and what's left" at the end of this file, updating the live design artifact to match
the app (Jui's job), a README, automated tests, and the
stretch goals (TypeScript, Socket.io). React Query was added 2026-10-08
(see Client architecture notes).

**Deployed 2026-10-14** (`todo.TODO` 10-13-26, PR #15) — see "Production" below.

**New work since 2026-11-08: the customer storefront.** See "Storefront" near the end of
this file and read `docs/storefront-design/` before working on it.

## Production

- **Frontend: Vercel**, project root `client/`, `VITE_API_URL` = the Railway address
  (baked in at build time — changing it needs a Vercel redeploy). `client/vercel.json` sends
  every path to `index.html` so React Router routes survive a refresh. The frontend is
  static files, so it can move to another static host without code changes.
- **Backend: Railway**, root `server/`, runs `npm start` (`node server.js`). Variables:
  `NODE_ENV=production`, `DATABASE`, `DATABASE_PASSWORD`, `JWT_SECRET` (its own, not dev's),
  `JWT_EXPIRES_IN=30d`, `CLIENT_ORIGIN` = the Vercel address; no `PORT` (Railway sets it).
  Storefront (2026-11-09): `PROMPTPAY_MERCHANT_QR` (the shop's K SHOP QR text) and
  `PROMPTPAY_NAME` must be set **before the store is opened**. Without them the server
  still runs, but payment pages have no QR.
  `config.env` isn't in git, so Railway's variables are the only source there.
- **Database: `churo-ops-prod`** on its own Atlas project / free cluster (dev's `churo-ops`
  is a different project), a database user with readWrite on that database only; Network
  Access `0.0.0.0/0` because Railway has no fixed IP. Seeded with both accounts and the 5
  starting items. `server/config.prod.env` (gitignored) holds the same values for running
  the scripts against production with `ENV_FILE=config.prod.env`.
- **Deploy order** if it's ever redone: backend first (with `CLIENT_ORIGIN` set to the
  expected Vercel address — the server won't start without one, and fixing it is just a
  restart), then the frontend with the real `VITE_API_URL`.
- **Backups** (free Atlas has none): Jui runs `backupDb.js` by hand once a week — see the
  scripts under Commands. Backup files hold both accounts' emails and password hashes:
  never in the repo, never anywhere public.
- **Touching production data**: read-only checks are fine; anything that writes or deletes
  needs Jui's explicit OK first, and cleanup scripts must refuse unless each match is
  exactly what was approved (as with the 2026-10-14 test data).

### Merging to `main` is deploying

Vercel and Railway both deploy `main` automatically within minutes of a merge. Local work,
branches and PRs never touch production (Vercel's PR previews can't log in — their address
isn't in `CLIENT_ORIGIN`, on purpose — so test locally, not on a preview). Before every
merge (Jui, 2026-10-14):

1. **Tested locally first** — against the dev database (throwaway scripts + Playwright, as
   for every feature so far); a broken merge reaches both phones at once.
2. **Know the way back** — Vercel: Deployments → the previous one → Instant Rollback;
   Railway: Deployments → the previous one → Rollback. Then fix on a new branch.
3. **Model changes** — a rollback only undoes code, never data. Back up production
   (`backupDb.js`) before merging anything that changes a model, and handle documents that
   predate a new field (the `{ $ne: true }` pattern; no new `required` field without a
   default or a plan for old documents).
4. **Keep the API compatible** — a phone with the app open keeps the old JavaScript until
   it reloads, so the new backend should still accept the old requests.
5. **New environment variables** — set them in Railway's / Vercel's dashboard before (or
   with) the merge; otherwise it works locally and breaks in production. A changed
   `VITE_*` variable needs a Vercel redeploy.
6. **Timing** — Railway restarts the server (about a minute, and the login rate limit's
   memory resets), so don't merge while orders are being taken.

## Structure

Two independent npm projects, no root package.json or workspace tooling tying them together:

- `client/` — Vite + React 19 + Tailwind CSS v4 frontend, plain JS/JSX. Server data goes
  through **TanStack Query v5** (React Query) — nearly all the app's state is server data,
  so there's no other state library; Zustand was dropped from the plan (Jui, 2026-10-08)
  unless a real client-only need shows up. TypeScript is still only a stretch goal — don't
  assume `.tsx` files exist.
- `server/` — Express 5 + Mongoose 9 (MongoDB Atlas) backend. `server.js` loads
  `./config.env` (relative to cwd, so run from `server/`), builds the Atlas URI by
  substituting `DATABASE_PASSWORD` into `<db_password>` in `DATABASE`, then listens on `PORT`.
  `app.js` mounts morgan (when `NODE_ENV === 'development'`), cors, `express.json()`, the
  routers under `/api/v1/` (`users`, `rounds`, `orders`, `stock-items`, `restocks`,
  `expenses`, `finances`), a 404 catch-all and `errorController`. Layout: `models/`,
  `controllers/`, `routes/`, `constants/` (shared `units` / `staffMembers` enums),
  `utils/` (`catchAsync`, `AppError`, `stockDeduction`).
- Client layout: page components live in `client/pages/` (not `src/`); shared code in
  `client/src/` — `api.js` (`apiFetch` / `getJson` / `errorMessage` / `logout`),
  `queries.js` (every React Query key, fetch function and preset), `components/`,
  `constants/`.

`.claude/skills/` and `.agents/skills/` hold the same 3 UI skills (frontend-design,
ui-ux-pro-max, web-design-guidelines); `skills-lock.json` pins them. `todo.TODO` is the
personal task log — each task's decisions and test results are recorded in its line.

Run commands from within each subdirectory.

## Commands

### client/
- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — ESLint
- `npm run lint:fix` — ESLint with autofix

No test runner is configured yet.

### server/
- `npm run dev` — run with `node --watch` (restarts on file changes; replaced the globally
  installed nodemon on 2026-10-13 — nodemon's dependencies had 3 high audit warnings)
- `npm start` — plain `node server.js`; what Railway runs (`engines.node` is `24.x`)

No lint, build, or automated test runner is configured yet. `server/config.env.example`
lists every variable (copy it to `config.env`). Optional `DNS_SERVERS` (local only; e.g.
`8.8.8.8,1.1.1.1`): fixes `querySrv ECONNREFUSED` on machines where Node's DNS falls back
to 127.0.0.1. `utils/dnsServers.js` applies it in `server.js` and `scripts/scriptEnv.js`,
and does nothing when the variable is unset (as on Railway). `server/scripts/` (in git since 2026-10-19,
when the repo went public — the scripts hold no secrets, they read the env file) holds the
one-off seed scripts, run with `node` from `server/`: `seedAccount.js <name>
<email>` (asks for the password twice, hidden, 12+ characters — never on the command line)
and `seedStock.js`, plus `seedMenu.js` for the storefront (2026-11-08):
- It writes the 11 menu items and the closed store setting. **Running it again is safe and
  is how prices change**, since there's no menu-editing page; change `client/src/constants/
  prices.js` too.
- What a re-run does:
  - creates missing items;
  - brings `variants` / `sortOrder` back in line and prints each change;
  - **never touches `isAvailable`** (the staff's sold-out switch) and never deletes: items
    not in its list are only reported;
  - creates the store setting closed **only if it doesn't exist**, with hand-set
    timestamps, so a re-run neither closes an open store nor changes its "Opened at"
    time.

All three read the env file named in `ENV_FILE` (default `config.env`;
`ENV_FILE=config.prod.env` for production — `server/config.*.env` is gitignored), print
which database they're about to write to and need a "y" (shared `scripts/scriptEnv.js`).
On a machine that needs `DNS_SERVERS`, the env file has to have it too: `config.prod.env`
didn't on 2026-11-08, so it was passed on the command line.
There's no sign-up page on purpose: accounts are only made with this script.
`backupDb.js` (2026-10-14, read-only, no y/N) saves every collection as canonical EJSON
(keeps ObjectId / Date types) plus `_meta.json` (counts, indexes) to
`D:\Backups\churo-ops\<date-time>-<db>\` (`BACKUP_DIR` to change; refuses a folder inside
the repo) and reads the files back to check them. `restoreDb.js <folder> [--db <name>]`
restores only into an empty database — it never overwrites or deletes — asks y/N and
creates the indexes before inserting. A practice restore into a throwaway database on the
dev cluster matched the backup exactly. Features have been verified with throwaway scripts that call the controllers
directly against Atlas (test data named "ZZ …", removed afterwards, real counts snapshotted
and restored when stock is touched) plus Playwright for the UI — Jui logs in for Playwright;
never mint a JWT.

## Client architecture notes

- **React Query** (added 2026-10-08, decisions in `todo.TODO` 10-8-26): one `QueryClient`
  in `src/main.jsx` (`staleTime 0`, `gcTime 5 min`, `retry 1` — Atlas is slow enough that 3
  retries would hide errors for ~10 s — `refetchOnWindowFocus` on; Devtools in dev only).
  Every key, fetch function and preset lives in `src/queries.js` — add new ones there, never
  inline. Lists use plural roots (`['stock-items']`, `['rounds', …]`), single documents
  singular roots (`['stock-item', id]`), so refreshing a list can't refetch an edit page
  that's deleting its document. Presets: `POLLED` (list pages, `refetchInterval` 7 s,
  paused in the background), `FORM_LIST` (New order's rounds, Restock's names: cached but
  not refetched on focus mid-form), `LOAD_ONCE` (edit pages: never refetched while open,
  `gcTime 0` so a revisit loads fresh). Storefront (2026-11-11): a fourth preset, `STOREFRONT_POLLED` (5 s: a customer is
  waiting at the counter; the dashboard keeps 7 s), and the staff queries `staffOrdersQuery`
  (`['staff-orders']`, every active order in one request), `staffStoreQuery`
  (`['staff-store']`) and `staffMenuQuery` (`['staff-menu']`), with `AFFECTED_BY.staffOrder` /
  `store` / `menuItem`; none of them touch the dashboard's lists. `getJson`'s errors carry
  `err.status` so a page can react to a status (409 → refresh quietly; the storefront's Thai
  text for 403 / 409 / 429) instead of the English message; `errorMessage(err)` is unchanged. Edit pages are split into a loader + `…Form`
  component that seeds its fields with `useState(data.x)` — no effects copying data into
  state. Every save is a `useMutation` that saves, then awaits `refreshAfterSave(queryClient,
  AFFECTED_BY.<kind>)` (refetches the affected lists, inactive ones too) before navigating,
  so the destination page shows the change on arrival. A full-page error shows only while a
  query has no data yet. Result: tab switches show cached data in ~10–20 ms instead of
  "Loading…" for 180–575 ms; request count and latency are unchanged (still one
  `GET /orders` per round on Home / Orders). Testing note: React Router updates the URL
  before the new page renders — wait for page content, not `location.pathname`.
- **Tab switch animation** (Jui, 2026-10-08, not in the design): `AppShell`'s brown pill
  slides to the new tab and `<main>` fades in (`animate-fade-in`, defined in `@theme` in
  `index.css`, 200ms). Plain CSS, not View Transitions (they'd draw the pill above the tab
  labels). Every page renders its own `AppShell`, so the last tab is remembered in a
  module-level `lastTab` object and the pill moves one frame after mounting there; labels
  are coloured by the pill's position, `aria-current` still by the route. Orders'
  `RoundOrderGroup` panels slide open / shut (200ms) with a one-row grid going
  `grid-rows-[0fr]` ↔ `grid-rows-[1fr]` (CSS can't animate `height: auto`): the panel is
  always rendered and `inert` while closed; the header has `aria-expanded`. Home's End round
  (Jui, 2026-10-09): the button reads "Ending…" during the PATCH, then the card slides out
  left + fades while its row closes up (same grid trick, 200ms); `RoundRow` calls `onGone`
  after the slide, and only then does Home drop it from the cache and refresh — a failed
  PATCH still leaves the row. Tailwind v4's `translate-*` utilities use the CSS `translate`
  property, so transitions must list `translate`, not `transform`. Every animation must have
  a `motion-reduce:` off switch.
- Vite config (`client/vite.config.js`) wires together `@tailwindcss/vite`, a Vite ESLint
  plugin (lint errors surface in dev), `@vitejs/plugin-react`, and Babel with
  `reactCompilerPreset` — the React Compiler is active, so avoid manual memoization
  (`useMemo`/`useCallback`/`React.memo`) unless there's a specific reason the compiler can't
  handle it.
- Tailwind is imported via a single `@import "tailwindcss";` in `client/src/index.css`
  (Tailwind v4 CSS-first config, no `tailwind.config.js`).
- ESLint (`client/eslint.config.js`) flat config: `js.configs.recommended` + React Hooks +
  React Refresh rules. Unused vars/args prefixed with `_` are allowed.
- **Live design (source of truth):** https://claude.ai/artifact/1a3fc521-4534-4327-b9c7-63522a5b05e9
  is Jui's current design. Before building or changing any UI/feature, open it and sync with
  it. Use the `Artifact` tool (don't web-fetch it): a plain `action: "read"` only returns
  metadata, so run `action: "list"` with `scope: "files"`, then `action: "read"` with `path`
  (or `paths`) on `project/canvas.json` (index of artboards) and the relevant
  `project/<Screen>.dc.html`. Colors/spacing/copy are in those files and
  `project/ds/churo-bites/tokens.json`. Ignore `artifact-type/` and `SKILL.md` (editor internals).
  Jui sometimes forgets to update the local files or to mention a screen/feature, so when the
  live design and the local reference files below disagree, the live design wins. If it adds
  or changes something not covered in this file, tell Jui and ask before treating it as
  settled.
- **Design reference (not runnable):** `client/design-system/tokens.json` +
  `design-system/README.md` (principles, patterns) and `client/screens/*.dc.html` (one mockup
  per screen) come from a Claude-chat design pass; read `client/HANDOFF.md` first. The
  `.dc.html` files use a Claude-canvas-only runtime and won't render in a browser — read them
  for exact colors/spacing/copy and rebuild as real components. Port tokens into Tailwind v4
  CSS (`@theme` in `index.css`) since there's no `tailwind.config`. The design README says
  React + TypeScript, but TS isn't installed.
- **Design decisions that supersede earlier planning** (from HANDOFF.md): order creation is
  **one scrollable form**, not the 3-step wizard; nav is a 4-item segmented control (Home /
  Orders / Stock / Finances), not a hamburger menu; the mockups' 3-flavor menu is out of
  date — the real menu is the code's 5 flavors (see the Order bullet); the `SignatureRatio`
  helper is intentionally not built (`signature` is just a flavor); orders belong to an
  ad-hoc **Round** (name, open date, delivery date) chosen from
  a dropdown; the UI shows status as one exclusive Pending/Done/Delivered radio group even
  though the backend keeps `isDone`/`isDelivered` as two booleans; staff are "Jui" /
  "Impact" (the mockups still say "Partner"; the code's enum is the one in use, confirmed
  2026-09-23).
- **Multiple rounds can be active at once** (design update, supersedes the old "one active
  round" assumption). Consequences in the design: Home has no single-round bar or
  pending/earnings stat cards anymore — it shows an **Active rounds** list (one row per
  round: green dot, name, that round's earnings in ฿), swipe left on a row to reveal a 96px
  "End round" action, and a "Start a new round" button below the list. Orders groups
  orders under collapsible per-round headers (name + "N orders · M pending", or
  "N orders · ฿X sold" for finished rounds) with All/Pending/Done/Delivered filter chips
  inside each open round. The New order form's Round `<select>` lists the active rounds.
  New round form (`DefineRound`) field order is Open date, Delivery date, Round name.
  Built so far: Home's `ActiveRounds`, fed by live `GET /rounds/active` + per-round
  `GET /orders?round=<id>` (earnings = sum of `totalPrice`) with loading/error/empty states,
  polling every 7s; "End round" is wired to `PATCH /rounds/:id` (no confirmation step, by
  design — confirmed with Jui), with a failed PATCH leaving the round list on screen and
  showing a small inline error instead of the full-page error state. Also built: the
  New round form (`NewRound.jsx`), the grouped Orders page (`RoundOrderGroup`), and the
  New order form (`NewOrder.jsx` = `ItemBuilder` + `OrderItemList` + round/delivery/customer
  fields + Subtotal/Total footer → `POST /orders`, then `/orders` with that round expanded
  via router state `openRoundId`). Form screens use `SubPageShell` (back arrow + title, no
  tab nav) instead of `AppShell`; shared form class strings live in
  `src/components/formClasses.js`. `ItemBuilder` has a "Clear selection" button that isn't
  in the design — NewOrder refuses to submit while a flavor is picked but not added, and a
  radio can't be unticked, so it's the only way out (Jui, 2026-09-29). The Edit order page
  (`EditOrder.jsx`, `/orders/:id`) is built too: status radio saves on tap (optimistic,
  reverted on failure), "Add another item" opens `ItemBuilder` inline, "Save changes" PATCHes
  items/delivery/customer/note/totalPrice, and "Cancel order" needs two taps (Jui's call —
  unlike End round, it sits right under Save); both return to `/orders` with the round
  expanded. `DeliveryFeePicker` is shared by NewOrder and EditOrder.
- Swipe-to-end has no keyboard/screen-reader path other than tabbing to the (visually
  hidden) button, and no confirmation step — neither is in the design; raise with Jui
  before adding either.
- Stock follows the live design's **user-defined items** (Jui, 2026-09-30): Restock takes a
  free-text item name (existing name = top up, new name = start tracking it) with a kg/L/pcs
  unit. The design's example items (Flour, Sugar…) are just placeholders. See the
  `StockItem` bullet under Domain model; the plan lives in `todo.TODO` (9-30-26).
- **Loading states use `<Spinner label="…" />`** (`src/components/Spinner.jsx`, Jui 2026-11-11),
  not "Loading…" text: a 32px brand arc on a border-coloured ring, centred with `py-12`,
  `role="status"` + a screen-reader-only label (the old text without "…"). Reduced motion
  slows it to 3 s a turn rather than stopping it, because a still ring looks frozen. The one
  exception is New order's Round `<select>`: an `<option>` can only hold text. Home shows two
  spinners (rounds and stock), since its two sections load separately.
- Form inputs must be ≥16px font (iOS Safari zooms on focus otherwise); the mockups' 15px is a
  known bug. Primary buttons 48px/16px text vs secondary 44px/14px is intentional.

## Server architecture notes

- `server/config.env` holds environment variables (Mongo Atlas connection string, port,
  etc.), loaded via `dotenv.config({ path: ... })`. It's covered by `.gitignore` (alongside
  bare `.env`).
- Every route except `POST /users/login` and the public storefront routes
  (`/api/storefront/*`, see Storefront) is behind `authController.protect`. Handlers are
  wrapped in `catchAsync` and report expected failures with `AppError` (404 / 400).
- Hardening (2026-10-12, from the security review): `helmet()`; CORS only for
  `CLIENT_ORIGIN` (comma-separated, required — `app.js` throws at start without it, since
  an unset origin would make `cors()` allow every site); `trust proxy` 1 only when
  `NODE_ENV=production` (the host's proxy; in development it would let anyone fake their IP);
  login refuses non-string email / password (a `{ "$gt": "" }` email used to match the first
  account) and lower-cases the email; `express-rate-limit` on login — 10 failed requests per
  15 min per IP, successful ones don't count, 429 through `errorController`. In production
  the limiter keys on `X-Real-IP` (2026-10-13): Railway's edge sets it to the visitor's
  address, while the number of proxies in front of the app varies, so `req.ip` could be a
  Railway proxy's and everyone would share one limit; development ignores the header. `clientIp` / `ipKey` live in `utils/clientIp.js` (2026-11-11), shared by the login
  and storefront-order limiters so both count visitors the same way.
- Patterns used throughout: edits are `findById` + `set` + `save()` with a whitelist of
  editable fields (full validation, only changed paths written); counts change with atomic
  `$inc`, never read-modify-write, because two phones write at once; the record (order,
  restock log) is saved before the `$inc` it causes; `staffMember` always comes from
  `req.user.name`, never the body; soft deletes filter with `{ $ne: true }` so documents
  saved before the flag existed still match; Mongoose 9 uses `returnDocument: 'after'`, not
  `{ new: true }`.
- `errorController` (reworked 2026-10-12 before deploy): `toKnownError()` turns JWT errors
  into 401 and `CastError` / duplicate key / `ValidationError` / broken JSON into 400
  (oversized body 413) in **every** environment; operational errors send their message,
  anything else is logged and answered with a generic 500. Development adds the stack (and
  an unknown error's message); every other value of `NODE_ENV`, including none, behaves like
  production, so no request is left hanging.

## Domain model

Six Mongoose models in `server/models/`: `User`, `Round`, `Order`, `StockItem`,
`RestockLog`, `Expense` (file names are camelCase, e.g. `stockItemModel.js`), plus four
storefront models (`MenuItem`, `StorefrontOrder`, `StoreSetting`, `Counter`) described
under "Storefront". History: an
early `FinishedStock`/`PackagingStock` split became one `Stock` schema, which in turn became
the user-defined `StockItem`; a churro-only `ProductionLog` became `RestockLog`. There's no
ingredient-level stock tracking — that was in an earlier design, dropped once it came out
that churros are bought pre-made with flavor applied only at sale time.

- **`StockItem`** (`server/models/stockItemModel.js`, built 2026-10-01 — **replaces** the old
  fixed 3-type `Stock` from commit `af86b78`): `name` (user-defined, unique case-insensitively
  via a collation-strength-2 index; always look up with the `findByName` /
  `findSortedByName` statics so the collation can't be forgotten),
  `unit` (`kg | L | pcs`), `quantity`, `lowStockThreshold`, plus four auto-deduction rules
  (default `0`). `quantity` has no min on purpose (deduction may push it below 0). Unit and
  staff enums are shared via `server/constants/units.js` / `staffMembers.js`.
  Auto-deduction rules are **data on each item, not code** — and **per serving
  (quantity), not per order** (Jui, 2026-10-03): placing an order takes from every
  non-deleted item `usedPerPiece × regular churro pieces (S 4 / M 8 per serving)
  + usedPerServing × regular servings + usedPerBite × Strawberry Nutella Bite servings
  + usedPerOrder` (once per order — kept for things like bags, unused now); all 0 = never
  auto-deducted (things too hard to count, e.g. dips). A Nutella bite serving is a box of 10
  using its own churros and box. Seeded (`server/scripts/seedStock.js`): Churro piece 1;
  Stick piece 1 + bite 1; Box serving 1; Bite churro bite 10; Bite box bite 1 — ordinary,
  deletable items with no special key. Rules per flavor or per add-on would need code. The
  maths lives in `server/utils/stockDeduction.js` (pure functions + one `bulkWrite` of
  `$inc`s); see the Order bullet for how orders record and give back what they took.
  **Deleting is a soft delete** (`isDeleted`, Jui 2026-10-03): the restock log is a
  permanent record of what was bought, so a deleted item stays in Atlas — hidden from every
  list by `findSortedByName`'s filter, while `findByName` still finds it and its log entries
  keep its name (shown with "(deleted)"). Restocking its name brings the same item back
  (`restockController.bringBack`: count reset to 0 in the new unit, atomic via
  `isDeleted: true` in the filter). Restock and Edit restock entry fetch
  `GET /stock-items?includeDeleted=true` (only they do; `findSortedByName(true)`) so
  typing a deleted item's name says it comes back — with its threshold and auto-deduct
  rules — rather than "New item"; deleted names stay out of the suggestions. Edit stock item (`EditStockItem.jsx`,
  `GET/PATCH/DELETE /stock-items/:id`) also sets "In stock now" (counted amount, not
  logged) and the `usedPer*` rules (neither is in the design), and **sends only changed
  fields** so a threshold edit can't overwrite a restock made on the other phone.
- **`RestockLog`** (`server/models/restockLogModel.js`, built 2026-10-01) — one entry per
  restock: `stockItem` ref (name shown via populate), `quantity` (> 0), `unit` copied at the
  time, `staffMember` from `req.user.name`, timestamps. `POST /api/v1/restocks`
  (`restockController.createRestock`) validates quantity/unit first, finds or creates the
  item (an E11000 from a simultaneous create falls back to the other phone's item), writes
  the log, **then** raises the item's `quantity` with `findByIdAndUpdate` + `$inc` (atomic,
  since both phones can restock at once — not read-modify-write; no transaction, log-first
  so a failure leaves a visible entry rather than an unlogged change). Client side: Restock
  form (`Restock.jsx`), Stock page (`Stock.jsx`, polled 7s), Home's `StockPreview` (max 5,
  Out → Low → rest); shared helpers in `client/src/constants/stock.js` and the
  `StockLevel` / `StockBadge` components. Edit restock entry (`EditRestock.jsx`,
  `GET/PATCH/DELETE /restocks/:id`, built 2026-10-03): editing the entry's Item name
  **moves the entry** to that item (old item −amount, new item +amount; a new name creates
  the item via the shared `findOrCreateItem`), it **never renames an item** — renaming
  belongs on Edit stock item; moving to an item in another unit gives the entry that unit;
  delete takes the amount back off the item before removing the entry; Delete needs two
  taps. The Stock page shows only the 20 newest
  entries (server-side limit). Decided 2026-09-30: restock names match trimmed +
  case-insensitively (collation strength 2); an existing item's unit locks the Restock
  form's Unit select, and the server rejects a mismatched unit; new items start at
  `lowStockThreshold: 0`; churro restocks are free amounts like any item (the old
  "packs of 50" rule is dropped). Badge rule, shared by Stock and Home: `quantity ≤ 0` →
  red **Out** (not in the design — the design's "Low when quantity < threshold" never
  fires at threshold 0), else `quantity < lowStockThreshold` → peach **Low**.
- **`SignatureRatio`** — planned early as a helper telling staff how many of each topping a
  `signature` order gets; **not built, on purpose** (the design dropped it). `signature` is
  just one of the Order flavors; the leftover commented-out router line in `app.js` is
  from that plan.
- **`Expense`** — records purchases as a lump sum, deliberately *not* linked to any specific
  `RestockLog` entry even when the same real purchase triggers both (two separate writes from
  two separate forms). Intentional: some expenses (gas, rent, delivery costs) aren't tied to
  any of the 3 stock types, so `Expense` has to stand alone rather than being keyed to `type`.
  Model rebuilt 2026-10-05 (`server/models/expenseModel.js`, not the old `ExpenseModel.js`
  from `af86b78`, whose `default: Date.now()` gave every expense the server's start time):
  `title` (required, trimmed — the design's "Expense title"), `amount` (> 0 validator,
  decimals allowed), `staffMember` (set from `req.user.name`, shared enum), `timestamps:
  true` — `createdAt` is the expense's date, since the design has no date field.
  `/api/v1/expenses` (`expenseController`, all behind `protect`): `GET /` = the 20 newest,
  `POST /` (only `title` / `amount` from the body, `staffMember` from the token), `GET /
  PATCH / DELETE /:id` (PATCH whitelists `title` / `amount` and uses `findById` + `set` +
  `save()`; DELETE is a real delete, 200 with `data: null`). `GET /api/v1/finances/summary`
  (`financeController.getSummary`, the project's first aggregation) returns all-time
  `{ revenue, expenses, profit }`: revenue = `$sum` of `totalPrice` over orders matching
  `{ isCancelled: { $ne: true } }` (same filter as `getAllOrders`), expenses = `$sum` of
  `amount`; an empty collection aggregates to `[]`, read as 0. Add expense
  (`NewExpense.jsx`, `/expenses/new`, built 2026-10-05) back → `/finances`, checks a blank
  title / amount ≤ 0 itself before POSTing, then goes to `/finances` with `replace`.
  Finances (`Finances.jsx`, built 2026-10-05, polled 7s): subtitle "Finances · All time"
  (the design says "This month" — Jui chose all-time for all three cards so Profit is
  real), three `StatCard`s (Profit green, **red when negative**, written "-฿3,868"), Add
  expense button, "Recent expenses" = the 20 newest. Edit expense (`EditExpense.jsx`,
  `/expenses/:id`, built 2026-10-05): loaded once, subtitle "Logged … · Jui", Save sends
  only the changed fields (like EditStockItem), Delete entry is a real delete that needs
  two taps; both go to `/finances` with `replace`.
- **`Round`** (`server/models/roundModel.js`; `name`, `openDate`, `deliveryDate` ≥
  `openDate`, `isActive` default `true`) — a batch of orders; orders reference it by `_id`,
  and names are deliberately **not** unique (names like "Friday batch" repeat; dates tell
  them apart). Any number of rounds may be active at once, so there's **no** unique index
  on `isActive` (the old single-active-round index was removed from the schema and
  `isActive_1` dropped from Atlas — only `_id_` remains; Mongoose never drops indexes
  itself, so keep it that way). Routes (all `protect`): `GET /rounds` (every round,
  newest delivery first, for Orders), `GET /rounds/active` (`getActiveRounds`, a list —
  empty array = 200), `POST /rounds` (`createRound`), `PATCH /rounds/:id` (`closeRound`,
  "End round": sets `isActive: false`).
- **`Order`** (`server/models/orderModel.js`, rebuilt from the live design, not the old
  commit) — `round` is a required `ObjectId` ref to `Round`. `items` is a non-empty array of
  `{ flavor, size, addOns, separateAddOns, quantity }` subdocuments (`_id: false`): `flavor` is
  `plain | chocolate | strawberry | signature | strawberry_nutella_bite`, `size` is `S | M`
  and required for every flavor **except `strawberry_nutella_bite`, which has no size** (one
  size only, stored with no `size` field, not a fake `S` — decided 2026-09-25), and `addOns`
  is an array of `choc_dip | choc_pops | strawberry_freeze_dried` (empty = none; a line can
  have several, so the New Order picker is checkboxes, not the design's radio group).
  `separateAddOns` (default `false`) is the "Serve dip/topping separately" checkbox — despite
  the name it is **not** only about add-ons: every flavor already comes with its own
  dip/topping, so it means "put the flavor's topping (and any add-ons) in a separate cup" and
  is meaningful even with an empty `addOns` (Jui, 2026-09-25). Add-ons are just paid extras. Prices
  live in `client/src/constants/prices.js` (real prices from Jui, 2026-09-25): use its
  `getLinePrice(item)` — `(base + ฿10 × addOns.length) × quantity` — rather than
  recomputing a line total anywhere else. Labels
  for the flavor enum live in `client/src/constants/flavors.js` (`FLAVOR_LABELS`), shared by
  `OrderRow`, `ItemBuilder` and `OrderItemList` — **the live `Orders.dc.html`/`NewOrder.dc.html`
  mockups still show the older 3-flavor menu (Original/Cinnamon sugar/Chocolate dip, no
  `signature`) and need a manual update from Jui**; the code's enum is the one actually in
  use, confirmed 2026-09-23.
  `deliveryFee` (enum `[0, 5, 10, 15]`, default `0`), `deliveryTime` (`"HH:mm"` string — a
  time of day on the round's `deliveryDate`, **required**), `staffMember` (`Jui | Impact`),
  `customerName` (name or LINE ID, **required**) and `note` (optional) are the rest.
  `staffMember` is **set by the server** from the logged-in account (`req.user.name` in
  `createOrder`), never taken from the request body, so the New order form has no "Added by"
  field (dropped from the design, Jui 2026-09-25). This relies on each account's `name`
  being exactly `Jui` or `Impact` — renaming an account or adding a third person means
  updating the enum too. The old `customerPhone`/`deliveryLocation` are
  gone (the design has one free-text note for address/allergies). `isDone`/`isDelivered` are
  independent booleans, not a sequential state machine (a courier can mark delivered
  before someone marks done) — but EditOrder's one-choice status radio sends
  `STATUS_FLAGS` from `client/src/constants/orderStatus.jsx`, where Delivered sets
  **both** to `true`. `isCancelled` (default `false`) is a soft-cancel: the document stays in
  Atlas, but `getAllOrders` filters `{ isCancelled: { $ne: true } }` so cancelled orders
  vanish from every list and total in the app (`$ne: true`, not `false`, so orders saved
  before the field existed still match). `GET /orders/:id` returns cancelled orders too
  (EditOrder shows "This order was cancelled."). `PATCH /orders/:id` (`updateOrder`)
  whitelists `EDITABLE_FIELDS` (no `staffMember`, no `round`), refuses an already-cancelled
  order, and uses `findById` + `set` + `save()` rather than `findByIdAndUpdate`, so the full
  schema validation runs (incl. the `size` rule, which reads `this.flavor`) and only changed
  paths are written. Timestamps come from `timestamps: true` (`createdAt`).
  `totalPrice` should conceptually be `itemsSubtotal + deliveryFee`, but nothing computes
  it automatically; it's just a required field set directly.

## Status and what's left

- **Known gaps** (recorded, not fixed — ask Jui before touching):
  - Swipe-to-end-round has no real keyboard / screen-reader path and no confirmation step
    (see Client architecture notes).
  - A 7-digit amount ("-฿1,234,567") overflows its Finances card by ~8px at 390px; 6 digits
    fit.
  - `totalPrice` is trusted from the client — any logged-in person can set an order's total
    (Jui, 2026-10-12: fine while only Jui and Impact have accounts; recheck before adding a
    third).
  - The live design artifact lags the app: old 3-flavor menu, "Partner" instead of
    "Impact", Finances "This month", and app-only additions (Out badge, Clear selection,
    In stock now, auto-deduct rules, red negative Profit). Updating it is Jui's job.
- **Auto stock deduction is built** (2026-10-03): `createOrder` takes stock when the order is
  placed; `updateOrder` gives it all back on cancel and moves it by the difference when
  items change; status/note/delivery edits never touch stock. Each order stores
  `stockDeductions` (what it took) so cancel/edit give back exactly that even if rules
  change later, and `stockDeducted` marks orders placed after this feature — orders from
  before it never took stock, so editing or cancelling them leaves stock alone. Order is
  saved before the stock `$inc`s, like restocks (the record first).
- **Not planned** (Jui, 2026-10-05): low-stock alerts and a daily summary. The Low / Out
  badges on Stock and Home are the low-stock warning — both people open the app for every
  order anyway, so nothing pushes a notification. Finances shows all-time totals
  (`GET /finances/summary`) only; there's no per-day breakdown. Polling is wired
  (`refetchInterval`, 7s). Don't build either unless Jui asks again.
- Auth is in place (JWT + bcrypt, `protect` on every route except login): **one account per
  person** (`name` = `Jui` / `Impact`, created with `server/scripts/seedAccount.js`), both
  with the same permissions — no roles. Tokens last 30 days (`JWT_EXPIRES_IN`, was 90) and
  carry the account's `tokenVersion` (`{ id, v }`); `protect` refuses a token whose version
  no longer matches (401 "Your session has ended"), with no extra query since it loads the
  user anyway. **Log out** (button in Home's header only, `AppShell`'s `showLogout`, no
  confirmation) calls `POST /users/logout`, which `$inc`s `tokenVersion` — every token of
  that account, on every phone, stops working (Jui, 2026-10-12). Client side,
  `client/src/api.js` has `logout()` (server call, 5 s timeout, then always ends the session
  locally so nobody is stuck offline) and `endSession()` (remove the token, full
  `location.replace('/login')`), which `apiFetch` uses on any 401. The dev `JWT_SECRET` was
  replaced with 512 random bits on 2026-10-12; production has its own (see Production).

## Storefront (customer ordering — in progress, started 2026-11-08)

A second app on the same backend: customers scan a QR at the stall, order and pay by
PromptPay themselves, and follow their order's status; staff confirm payment, mark it ready
and picked up, and open/close the store. **Before building or changing anything for the
storefront, read the design in `docs/storefront-design/`** (written in Thai):

1. `README.md`: what's in the folder, plus the **route → screen file** table (links inside
   the `.dc.html` files still use the old names in its right-hand column).
2. `DESIGN.md`: the spec for every screen, the shared components (`Card`, `QtyStepper`,
   `ChoiceTile`, `StatusStepper`, `StaffOrderCard`…), what each status colour means, the
   placeholders to replace (§5) and what hasn't been designed yet (§6). §0 explains how to read
   `.dc.html` (`{{ }}`, `<sc-for>`, `<sc-if>`; values in `renderVals()`). They're
   canvas-only, like `client/screens/`: read them for colours/spacing/copy, rebuild as
   real components.
3. `REQUIREMENTS.md`: flow, scope (in / out), Mongoose models, API, security, §8 "don't
   break churo-ops", and the 2-day plan.
4. The matching `screens/customer/0N-….dc.html` or `screens/staff/0N-….dc.html`.

Which wins: a screen file beats `DESIGN.md` if they disagree (DESIGN.md says so; tell Jui).
The folder is a one-off export of https://claude.ai/artifact/Dhrznc3JcveHsfHeJqnyQK and
does not update itself.
- **The artifact is the source of truth for screens** (Jui, 2026-11-11: don't re-export,
  read the artifact). The local `screens/` files may lag behind it: for example
  `05-store-and-menu.dc.html` lacks the Dashboard button added on 2026-11-11.
- Before building a storefront screen, read its file in the artifact. Use the
  claude-artifacts tools: `list_files` (slug `Dhrznc3JcveHsfHeJqnyQK`), then `read_file`
  with **one `path` per call** (`paths` is refused for this artifact type). The files are
  `project/<Name>.dc.html`; README's table maps them to routes. `project/canvas.json`
  lists the boards. Compare with the local export to see what changed. `tokens.json` is the same token set as
`client/design-system/tokens.json` (only line endings differ), already in `@theme` in
`client/src/index.css`, so use those existing utilities (`bg-surface-raised`,
`text-ink-muted`…) and never hard-code a new hex.

**Where the docs don't match this repo**: they were written against an older idea of
churo-ops. Follow the code, and ask Jui where a decision is needed:
- They say React + TypeScript and a `tailwind.config`. The project is plain JS/JSX with
  Tailwind v4 `@theme` (DESIGN.md §1 itself says to move to `@theme` for v4).
- REQUIREMENTS §3 lists the churo-ops models as Stock / SignatureRatio / …; the real ones
  are the six under Domain model.
- **Decided (Jui, 2026-11-08): no `Staff` model, no `requireStaff`.** Staff use the
  existing `User` accounts (Jui / Impact: email login with rate limit, 30-day JWT,
  `tokenVersion` log-out) and `authController.protect`. So don't build
  `POST /api/staff/login`: logging in stays `POST /api/v1/users/login`. Refs the docs
  point at `Staff` (`confirmedBy`, `updatedBy`) point at `User`, and the `Staff` /
  seed-account steps of the 2-day plan are already done. `protect` is added per route, not
  with `app.use`, so public storefront routes just leave it off.
- **Decided (Jui, 2026-11-08): route prefixes as in the docs.** Customer routes go under
  `/api/storefront` (public), staff routes under `/api/staff` (each one behind `protect`),
  not under `/api/v1/`.
- **Decided (Jui, 2026-11-08): the storefront frontend lives inside `client/`.** New
  routes in the same Vite app and Vercel project, not a separate app. Why: staff use the
  same accounts, so one app means one token and one login for the dashboard and `/staff`.
  It also reuses tokens / `api.js` / React Query, and needs no new `CLIENT_ORIGIN` or Vercel
  setup. Big systems (Shopify, Toast) split their storefront and admin because of scale,
  teams and branding; a two-person shop has none of those problems. Splitting later stays
  easy because customer pages only call `/api/storefront`. Consequences:
  - Load the customer routes with `React.lazy` so a customer on mobile data doesn't
    download the dashboard.
  - Customer `/order`, `/order/:id` vs the dashboard's `/orders`, `/orders/:id`: only an
    "s" apart, so check every link.
  - Customer pages are public: they call the API without a token and must not be caught by
    the 401 → `/login` redirect in `apiFetch`.
- **Decided (Jui, 2026-11-08): no `/staff/login` page.** Staff log in at the existing
  `/login` (email, not the design's "username"), so `screens/staff/01-login.dc.html` is
  not built. `/staff` and `/staff/menu` are logged-in pages like the rest of the
  dashboard.
- **Decided (Jui, 2026-11-11): moving between the dashboard and the staff pages.**
  - **Into `/staff`:** a card on the dashboard's **Home** showing how many orders are
    waiting for payment confirmation (e.g. "ออเดอร์หน้าร้าน · 3 รอยืนยันจ่าย"). Why: the
    4-item nav and its sliding-pill animation stay as they are, and the count works as a
    notification when the app opens. This card **isn't in the dashboard design artifact**:
    it's an app-only addition, and updating the design is Jui's job.
  - **Back to the dashboard:** only the **"Dashboard" button in `/staff/menu`'s header**,
    as the artifact shows (Jui chose to follow the design). From the order tabs that's two
    taps (ร้าน / เมนู → Dashboard), which keeps the tab page focused on the counter work.
- The menu is different from churo-ops: Classic (Plain / Choco Pops / Choco Berry /
  Signature, S/M, on top or separate cup), Churro Hug (3 flavours, one size), toppings ฿10
  as their own line items, including condensed milk (new). **Strawberry Nutella Bites is
  not sold on the storefront** (Jui, 2026-11-11). It was added on 2026-11-08 with its own
  `bites` section, then removed from the categories, the seed and the dev DB when Jui
  stopped selling it. The LINE dashboard is untouched: its `strawberry_nutella_bite`
  flavor still covers past orders and the Bite churro / Bite box stock rules. It's a new
  `MenuItem`
  collection with server-side prices. Don't change churo-ops' flavour / add-on enums or
  `prices.js` to fit it. Real Classic prices (Jui, 2026-11-08; the design's ฿35/฿55 are
  placeholders): S: Plain 59, Choco Pops 69, Choco Berry 89, Signature 79; M: Plain 99,
  Choco Pops 119, Choco Berry 149, Signature 129. They equal churo-ops' `BASE_PRICES`
  (`plain`, `chocolate`, `strawberry`, `signature`), so a price change means editing both
  `prices.js` and the `MenuItem` seed (REQUIREMENTS §8). Churro Hug: Plain 59, Choco Pops
  69, Choco Berry 79; toppings ฿10.
- Spec values that differ from churo-ops on purpose: polling **every 5 s** (not 7), no
  auto stock deduction for storefront orders (out of scope), `totalPrice` computed on the
  server (unlike churo-ops' `Order`), and the customer status API never returns the phone
  number.
- **PromptPay QR** (decided 2026-11-08, built 2026-11-09 in `server/utils/promptPay.js`):
  the **server** builds it, so the amount always comes from the DB and the number never
  ends up in the frontend bundle.
  - **Churo Bites uses its K SHOP merchant QR** (Jui, 2026-11-09).
    - **What it is:** the shop's printed K SHOP QR has **no amount**. Decoded, it's
      Thai QR / EMVCo with PromptPay bill payment (tag 30: K SHOP biller + the shop's
      reference `KB000002367061`), card tags (02 / 04 / 15 / 51) and the name
      `CHURO.BITES`.
    - **How each order's QR is made:** a copy of that text with tag 01 → `12` (single use)
      and tag 54 → the amount, plus a **new CRC**; every other tag is untouched.
    - **Verified:** Jui paid a real ฿1 one on 2026-11-09, and it arrived in K SHOP. The
      code produces that ฿1 QR character for character.
    - **Matching payments:** every order carries the same shop reference, so staff still
      match payments by amount + name + time.
    - **Fallback:** `PROMPTPAY_ID` (plain PromptPay mobile / national ID via
      `generate.anyId`) is only used when `PROMPTPAY_MERCHANT_QR` isn't set. A merchant
      QR that's set but broken (bad CRC / no tag 30) is an error, **never** a silent
      fallback, because the ID could be a different account.
  - **Library:** `promptparse` builds / edits the payload (`parse`, `encode`, `tag`,
    `withCrcTag`, `generate.anyId`) and `qrcode@1.5` (`toDataURL`, 480 px) draws the PNG. This is **not** the docs' `promptpay-qr` (Jui,
    2026-11-09): that one has been unmaintained since 2022 and pulls in `qrcode@0.9`, which
    depends on any version of `colors`, the package its author sabotaged in 2022.
    `promptparse` is maintained, MIT, has no dependencies, and also parses / checks CRCs,
    which the tests use.
  - **Response:** `GET /api/storefront/orders/:id` adds `payment: { qr, accountName,
    amount }` **only while `pending_payment`**: once paid or cancelled there's nothing to
    scan. A fresh QR is drawn per poll, which takes a few ms, so there's no cache.
    `createOrder` doesn't build one; the page goes to the status page and gets it from
    there.
  - **Variables:**
    - `PROMPTPAY_MERCHANT_QR`: the K SHOP QR's text, starting `000201`. Decode it once from
      the QR image.
    - `PROMPTPAY_ID` (fallback): a mobile number (10 digits → `MSISDN`) or a national /
      tax ID (13 → `NATID`); dashes are fine.
    - `PROMPTPAY_NAME`: printed under the QR, so customers can compare it with their bank
      app. Leaving it unset means no name line.
    - None of these is secret (anyone can decode a QR, and the K SHOP one is printed at the
      stall), but the repo is public and they're the shop's, so they stay out of git.
  - **Missing or malformed setup doesn't stop the server** (unlike `CLIENT_ORIGIN`): a
    variable forgotten on Railway would otherwise take the whole dashboard down. It logs
    an error and returns `payment: null`, and the page tells the customer to ask the staff.
  - The client shows the QR as an `<img>`, not a canvas or SVG, so a long press can save it.
    Customers can't scan their own screen; that's why the design has a "Save QR image"
    button.
  - The QR never talks to a bank, so the app can't know a payment arrived: staff confirm
    by hand. **No added satang** to make amounts unique: staff match amount + name, oldest
    first, as the design shows.
- **Storefront models** (built 2026-11-08, `storeFront.TODO` step 2). They sit next to the
  six churo-ops models but share no collections with them. The shared enums
  (`MENU_CATEGORIES` in menu-section order `churro-hug, classic, topping`;
  `SEPARATE_TOPPING_CATEGORIES`; `ORDER_STATUSES`) live in
  `server/constants/storefront.js`.
  - **`MenuItem`**: **one document = one row on the customer menu** (Jui): each Classic
    flavor, each Churro Hug flavor and each topping, so 11 items. `isAvailable` (the
    sold-out switch) is on the item, so one switch = one row = one field, and the database
    can't hold a state the screens can't show, like "S sold out, M on sale". This is why
    the switch API is `PATCH /api/staff/menu/:itemId`, not the docs'
    `/variants/:variantId`.
    - `variants: [{ name, price }]`: at least one, names unique within the item. Classic
      has `S` / `M`; Hug and toppings have one `Regular`, whose name the pages
      don't show.
    - `name` is what the menu row shows under its section heading ("Plain", "นมข้น";
      English except นมข้น — Jui). It's unique **per category**: index
      `{ category, name }`, since Classic and Hug share flavor names. The cart and staff
      pages show "Classic · Plain (M)" / "Churro Hug · Choco Pops" by putting a category
      label in front, as the design does. Toppings show just their name. It
      replaced a unique index on `name` alone (2026-11-08): `name_1` was dropped from dev
      by hand, and production never had it. `sortOrder` orders items within their
      category.
    - No soft delete: there's no page that deletes menu items.
  - **`StorefrontOrder`**: a separate collection from `Order`.
    - Each line is `menuItem` ref + a **snapshot** of `category` / `name` / `variantName` /
      `unitPrice`. A later price or name change can't rewrite placed orders, and no
      populate is needed; `category` lets the staff page colour topping lines.
    - Each line has `qty` (whole number, 1–20) and `separateToppings`, which may only be
      true on a `classic` line (`SEPARATE_TOPPING_CATEGORIES`).
    - Limits, because the form is public: 1–30 lines, `customerName` ≤ 40 characters.
    - `customerPhone`: a setter keeps only digits, then it must match `/^0\d{8,9}$/`
      (9–10 digits, landlines too — Jui). It's **`select: false`** like
      `User.password`, so only `.select('+customerPhone')` (staff controllers) ever sees
      it.
    - `totalPrice` must equal Σ `unitPrice × qty` (validator), a second check behind the
      controller's own sum.
    - `status` defaults to `pending_payment`. `queueNumber`, `confirmedBy` (ref `User`),
      `confirmedAt`, `readyAt` and `pickedUpAt` are set as the order moves on.
      `timestamps` on, plus an index `{ status, createdAt }` for the staff tabs.
  - **`StoreSetting`**: one document, `_id: 'storefront'`, with `isOpen` (default
    `false`) and `updatedBy`. `getStore()` treats a missing document as closed and doesn't
    create one.
  - **`Counter`**: `{ _id: 'queue-YYYY-MM-DD', seq }`. `nextQueueNumber(now)` is one
    `findOneAndUpdate` with `$inc` + upsert, keyed on the **Thai** date (`Intl`,
    `Asia/Bangkok`; Railway runs in UTC). It's atomic across both phones and starts at 1
    each day with no scheduled job.
- **Public API** (built 2026-11-09, `storeFront.TODO` step 4):
  `controllers/storefrontController.js` + `routes/storefrontRoutes.js`, mounted at
  `/api/storefront` with **no `protect`**.
  - Error messages are in English like the rest of the API (Jui). The customer pages check
    the form themselves and show Thai text, and react to **status codes**: 403 = store
    closed, 409 = sold out.
  - `GET /menu`: when closed, `{ isOpen: false }` and no menu. When open,
    `{ isOpen: true, items }`, one list in menu order (`MENU_CATEGORIES`, then
    `sortOrder`). It **includes** sold-out items (`isAvailable: false`), because the
    design shows them.
  - `POST /orders`: body `{ customerName, customerPhone, items: [{ menuItemId,
    variantName?, qty, separateToppings? }] }`, and nothing else is read.
    - The store must be open, otherwise 403 (checked on the server).
    - Items must be 1–30 lines, and each `menuItemId` must pass
      `mongoose.isObjectIdOrHexString` (not `isValidObjectId`, which accepts any
      12-character string); otherwise 400 "Line N: …".
    - All items are loaded in one `$in` query. Unknown id → 400.
    - `variantName` may be left out only when the item has a single variant; Classic must
      send S / M (400).
    - Name, category, variant and price are **copied from the database**.
      `separateToppings` must be exactly `=== true` (Mongoose would read "yes" as true).
      `totalPrice` is summed from the cast lines, and the model validates it again.
      `status` / `queueNumber` / `confirmedBy` / prices from the body are ignored.
    - If any item is sold out: **409** `{ data: { soldOut: [ids] } }`, sent by the
      controller itself (`AppError` only carries a message), and no order is created.
    - 201 with the public order.
  - `GET /orders/:id`: works while the store is closed. 404 if unknown, 400 if malformed.
  - Every order sent back goes through **`toPublicOrder`**, a whitelist (`_id, status,
    queueNumber, customerName, items, totalPrice, createdAt, confirmedAt, readyAt,
    pickedUpAt`). `select: false` only hides the phone from queries; a freshly created
    document still has it. A whitelist also keeps fields added later private by default.
    `confirmedBy` is left out as internal.
- **Staff API** (built 2026-11-09, `storeFront.TODO` step 6): `controllers/staffController.js`
  + `routes/staffRoutes.js`, mounted at `/api/staff`. **Every route has `protect`**, written
  per line like the other routers. "Who did it" (`updatedBy`, `confirmedBy`) always comes
  from `req.user`.
  - `GET /store` → `{ isOpen, updatedBy: { name } | null, updatedAt }` for "Opened by Jui
    17:02". A missing document reads as closed.
  - `PATCH /store` `{ isOpen }`: must be a boolean (400). **Opening is refused (400) when no
    payment QR is set up** (`paymentPayload(1)` is null; Jui, 2026-11-09), because customers
    could order but not pay. Closing always works. It's an upsert, and the automatic
    `updatedAt` is when the switch was flipped.
  - `GET /orders` → **every active order (`pending_payment`, `cooking`, `ready`) in one
    request**, with phone numbers, oldest first. The tabs show all three counts at once:
    one poll instead of three. `?status=` (one of those three, else 400) still filters. The
    page splits orders into tabs and sorts within each (queue number, time ready).
  - Status moves go through `moveOrder(id, fromStatus, changes)`: `findOneAndUpdate` with
    **the expected status in the filter**, so check + write is one atomic step. If the other
    phone already moved the order, or the button was tapped twice, nothing matches → **409**;
    an unknown id → 404.
    - `confirm`: `pending_payment` → `cooking` + `confirmedBy` / `confirmedAt` **first**,
      then `Counter.nextQueueNumber()`. Claiming first means a double tap never uses up a
      number, so the queue never skips. A crash between the two steps would leave a
      cooking order with no number, which the page shows as "—".
    - `ready`: `cooking` → `ready` + `readyAt`.
    - `pickup`: `ready` → `picked_up` + `pickedUpAt`.
    - `cancel`: **only from `pending_payment`** (Jui: a paid order is refunded outside the
      app).
    - **No undo for any step yet** (Jui, 2026-11-09; not in the design): a known gap.
  - `GET /menu` → the full menu **even while closed**, so items can be switched off before
    opening. This route isn't in the docs; the public one sends nothing while closed. Both
    controllers sort with `sortMenu` from `constants/storefront.js`.
  - `PATCH /menu/:itemId` `{ isAvailable }`: boolean only (400), unknown id → 404. It touches
    only that one field; prices change via `seedMenu.js`.
- **Rate limit on placing orders** (built 2026-11-11, `storeFront.TODO` step 7):
  `orderLimiter` in `routes/storefrontRoutes.js`, on `POST /api/storefront/orders` only.
  - **10 orders per 15 minutes per IP** (Jui). A customer rarely places more than 2–3, but
    many customers can share one IP: mobile networks put many phones behind one public
    address (CGNAT), and so does the stall's Wi-Fi. A spammer gets at most ~40 / hour per
    IP, which staff can cancel.
  - `skipFailedRequests`: only orders actually created count, so a mistyped phone, a
    closed store or a sold-out item doesn't use up a try.
  - **429** goes through `errorController` (same JSON as other errors), and the page shows
    its own Thai message.
  - `GET /menu` and `GET /orders/:id` (polled every 5 s) aren't limited: they only read.
  - It keys on the same `ipKey` as the login limiter (`utils/clientIp.js`). The count
    lives in memory, so a Railway restart resets it.
- **Staff page `/staff`** (built 2026-11-11, `storeFront.TODO` step 10): `pages/Staff.jsx` +
  `components/StaffOrderCard.jsx`, a logged-in route like the dashboard (no lazy loading:
  only staff open it). Built from the artifact's StaffOrders / StaffCooking / StaffPickup /
  StaffClosed boards.
  - **Data:** one `staffOrdersQuery` + `staffStoreQuery`, both `STOREFRONT_POLLED` (5 s),
    and `meQuery` for the name in the header. **The tab is in the URL** (`/staff`,
    `?tab=cooking`, `?tab=ready`, switched with `replace`; Jui), so a refresh or coming
    back from ร้าน / เมนู keeps it. All three tabs come from the one cached list.
  - **Sorting per tab:** awaiting payment by `createdAt`, cooking by `queueNumber` (none
    → last, shown "—"), ready by `readyAt`.
  - **Header dot:** green "อัปเดตทุก 5 วิ · name"; red "ร้านปิดอยู่ · name" while closed;
    orange "เชื่อมต่อไม่ได้ · กำลังลองใหม่" when a poll fails but old data is shown (DESIGN
    §6). A full-page error only appears before the first load.
  - **Cards:** the same card for all three statuses.
    - Awaiting payment: big amount + name, wait badge (orange border after 5 min), masked
      phone "••• 1234", **Cancel needs two taps** (Jui; it sits next to Confirm and can't be
      undone).
    - Cooking / ready: queue box (blue / green), full phone as a `tel:` link, toppings in
      brand colour, the separate-cup badge; ready turns orange after 10 min.
    - Waits read "8 นาที" / "2 ชม." / "3 วัน" (`durationText`; minutes alone gave
      "3402 นาที" for an old order).
  - **After a successful tap the card slides out and its row closes up**, like Home's End
    round (Jui): `idle → working → leaving`, the 200 ms timer, `motion-reduce`. Then it's
    dropped from the cache and the list refetches. Only the tapped button says
    "กำลังยืนยัน…" / "กำลังยกเลิก…".
  - **409** (the other phone moved the order first): no red error, just a refetch; the
    card moves on by itself. Other errors stay on the card.
  - **Store closed** (artifact StaffClosed): a red card with "ปิดโดย {name} {HH:mm}", a
    green **"เปิดร้าน"** button (a 400 from the server, i.e. no payment QR, shows "ยังไม่ได้
    ตั้ง QR รับเงิน เปิดร้านไม่ได้") and "เช็กเมนูที่หมดก่อนเปิด" → `/staff/menu`. A green
    "ยังมีออเดอร์รอลูกค้ามารับ" shortcut to the ready tab appears when there are ready
    orders. Existing orders stay workable.
  - **Empty tabs:** a dashed box (from StaffClosed); the wording per tab is ours.
  - **Helpers:** `client/src/constants/storefront.js` (`lineLabel` → "2× Classic · Choco
    Berry (S)", `formatPhone`, `maskPhone`, `minutesSince`, `durationText`, `formatClock`, the
    5 / 10-minute thresholds), shared with the customer pages later. `client/src/useNow.js`
    holds the clock in state (15 s), so renders stay pure for the React Compiler.
  - **`GET /api/v1/users/me`** (`authController.getMe`, `protect`) returns `{ name }` for the
    header. It asks the server rather than saving the name at login, because tokens last
    30 days and phones already logged in would have no name.
- **Staff menu page `/staff/menu`** (built 2026-11-11, `storeFront.TODO` step 11):
  `pages/StaffMenu.jsx` + `components/Switch.jsx` + `src/useStoreSwitch.js`. Built from the
  artifact's StaffMenu / StaffMenuClosed boards.
  - **Header:** a back arrow → `/staff` **on the tab it came from**. `/staff` passes
    `state={{ tab }}` on its "ร้าน / เมนู" and "เช็กเมนูที่หมดก่อนเปิด" links; opened
    directly, the arrow goes to the first tab. Then the title, and the **"Dashboard" button →
    `/`**, the only way back to the dashboard (Jui).
  - **Store card:** green (open) or red (closed) border, "เปิดโดย / ปิดโดย {name} {HH:mm}",
    the design's note strip, and a 60×36 switch. The switch **waits for the server** (not
    optimistic): opening can be refused (no payment QR → "ยังไม่ได้ตั้ง QR รับเงิน เปิด
    ร้านไม่ได้"), and a switch that showed "open" and then jumped back could mislead.
    `useStoreSwitch()` holds that rule and message; `/staff`'s closed card uses it too.
  - **Sold-out switches**, in 3 sections (Churro Hug, Classic Churros "· ปิดรสเดียวได้ทั้ง S
    และ M", ท็อปปิ้ง): **optimistic** (Jui). `onMutate` cancels the running poll and flips
    the cached item; `onError` flips it back and shows "บันทึกไม่ได้ ลองอีกครั้ง" in that row;
    `onSettled` refetches. Off rows are pink-tinted with a grey name and "หมด · ลูกค้าสั่ง
    ไม่ได้".
  - **`Switch`**: a real `<input type="checkbox" role="switch">` (`sr-only`, `peer`) inside
    the row's `<label>`, so the whole ≥ 60px row is the tap target, Space toggles it, and
    the drawn track gets a brand focus ring via `peer-focus-visible`. The knob moves with
    `translate` (200 ms, `motion-reduce` off).
  - **Colours outside the tokens:** the design's #8C7F72 (off track), #FFF7F7 (off row,
    closed strip) and #F2FBF5 (open strip) aren't tokens, so the nearest token at an opacity
    is used: `bg-ink-muted/70`, `bg-surface-pink/30` and `bg-status-done-bg/40`.
  - Both queries are polled every 5 s, so a change on the other phone shows within 5 s.
- **Testing notes:**
  - **On Windows, two servers can both listen on port 3000.** On 2026-11-09 a test hit an
    older server Jui had running (`npm run start` from `main`) instead of the branch's. The
    giveaway was 404s, with a stack trace pointing at `main`'s `app.js` line numbers. Run
    test servers on another port (`PORT=3999 node server.js`) and don't stop Jui's
    processes.
  - `node --watch` also restarts on any file change, including a `git switch`. That likely
    explains an earlier "restart by itself" mid-test. Use plain `node server.js` for API
    tests.
  - Staff controllers are tested by calling them directly with `req.user` = an account
    loaded from the DB (no JWT is minted), plus HTTP checks that every `/api/staff` route
    answers 401 without a token.

**How it ships (Jui, 2026-11-08): one small branch + PR per step, merged straight into
`main`.** That's continuous deployment; there's no long-lived `feat/storefront` branch.
It's safe while the work is unfinished because:
- the new models and routes have no callers in the existing app;
- `StoreSetting.isOpen` starts `false`, so it acts as the feature flag: anyone who finds
  `/order` only sees the store-closed screen;
- `/staff` gets no link from the dashboard until it's finished.

Chosen because the shop isn't taking orders right now, so a Railway restart on each merge
costs nothing, and each step gets tested on real phones against production while the change
is still small. **If the shop starts taking orders again before the storefront is done,
go back to the timing rule (checklist item 6)** or switch to a `feat/storefront` branch
merged at milestones. Each merge still follows the whole "Merging to `main` is deploying"
checklist:
- back up production before a PR that adds a model;
- set new variables (e.g. `PROMPTPAY_ID`) in Railway before the PR that needs them;
- get Jui's OK before seeding production;
- tell Impact the app may restart often.

**Merge method: squash and merge** (Jui, 2026-11-11, from PR #27 on; #20–#26 used merge
commits). Each PR lands on `main` as one commit, so `main` reads as one line per step and a
step can be reverted as a whole; the individual commits stay visible on the PR page. The
repo's squash message keeps the commits' messages, `Co-Authored-By` included.
Consequence for cleanup: after a squash the branch's own commits are not ancestors of
`main`, so `git branch -d` refuses. First confirm the PR is merged
(`gh pr view <n> --json state`) and that `git diff main <branch>` is empty, then
delete with `git branch -D` and `git push origin --delete <branch>`. GitHub's
"Automatically delete head branches" is off, so the remote branch has to be deleted too.

Jui makes the UX/flow calls (explain the why).

## Formatting

Root `.prettierrc`: single quotes, `endOfLine: auto`. Applies repo-wide (no per-package
override observed).
