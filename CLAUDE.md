# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Churo Bites Operations Dashboard** — an internal order-management and inventory-tracking
tool for Churo Bites, a small churro business Jui co-runs with a partner (orders are
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
the app (Jui's job), a deploy (needs the error-handling review first), a README, automated
tests, and the stretch goals (TypeScript, Socket.io). React Query was added 2026-10-08
(see Client architecture notes).

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
- `npm start` — run via nodemon (`server.js`)

No lint, build, or automated test runner is configured yet. `server/scripts/` is gitignored
and holds the one-off seed scripts (`seedAccount.js`, `seedStock.js`; run with `node` from
`server/`). Features have been verified with throwaway scripts that call the controllers
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
  `gcTime 0` so a revisit loads fresh). Edit pages are split into a loader + `…Form`
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
  a `motion-reduce:` off switch. More animations may follow from Jui's design on
  the `feat/animations` branch.
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
- Form inputs must be ≥16px font (iOS Safari zooms on focus otherwise); the mockups' 15px is a
  known bug. Primary buttons 48px/16px text vs secondary 44px/14px is intentional.

## Server architecture notes

- `server/config.env` holds environment variables (Mongo Atlas connection string, port,
  etc.), loaded via `dotenv.config({ path: ... })`. It's covered by `.gitignore` (alongside
  bare `.env`).
- Every route except `POST /users/login` is behind `authController.protect`. Handlers are
  wrapped in `catchAsync` and report expected failures with `AppError` (404 / 400).
- Patterns used throughout: edits are `findById` + `set` + `save()` with a whitelist of
  editable fields (full validation, only changed paths written); counts change with atomic
  `$inc`, never read-modify-write, because two phones write at once; the record (order,
  restock log) is saved before the `$inc` it causes; `staffMember` always comes from
  `req.user.name`, never the body; soft deletes filter with `{ $ne: true }` so documents
  saved before the flag existed still match; Mongoose 9 uses `returnDocument: 'after'`, not
  `{ new: true }`.
- `errorController` only converts Mongoose `ValidationError` / `CastError` to 400 in
  production; in development they reach the client as 500 with the raw message, and with
  `NODE_ENV` unset no response is sent. Left as is on purpose (Jui, 2026-10-05: dev-only,
  the raw error helps debugging) — review before any real deploy. Add / Edit expense check
  their own input first so their users never see it; the other forms show the server's
  message as-is.

## Domain model

Six Mongoose models in `server/models/`: `User`, `Round`, `Order`, `StockItem`,
`RestockLog`, `Expense` (file names are camelCase, e.g. `stockItemModel.js`). History: an
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
  - The `errorController` dev-environment behaviour (see Server architecture notes).
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
  with the same permissions — no roles. Centralized error handling still needs a review
  before any real internet-facing deploy. **Log out** (built 2026-10-05) is a button in
  Home's header only (`AppShell`'s `showLogout` prop, as in the design; no confirmation).
  It is client-side only — `logout()` in `client/src/api.js` removes the token and does a
  full `location.replace('/login')`; there's no server endpoint, so the JWT itself stays
  valid until `JWT_EXPIRES_IN`. `apiFetch`'s 401 branch calls the same `logout()`.

## Formatting

Root `.prettierrc`: single quotes, `endOfLine: auto`. Applies repo-wide (no per-package
override observed).
