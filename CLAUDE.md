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
- Sync is intentionally simple: polling every 5–10s, not WebSockets. Upgrading to Socket.io
  is an explicit stretch goal, not a requirement.
- Churros are bought pre-made and only flavored via topping/dusting at sale time — there is
  no ingredient-level recipe tracking. This is why finished-churro stock is a single unified
  pool (`Stock`), not tracked per flavor.

## Project state

**Verify against the working tree, not just this file.** The last commit (`af86b78`) contains
the 5 Mongoose models, controllers, and routes (CRUD for `Expense` and `RestockLog`, stub
`GET` for the rest), but in the current working tree those files are **deleted** —
`server/models/`, `server/controllers/`, `server/routes/`, `server/constants/` are empty
directories, and every router import/mount in `server/app.js` is commented out. `server/scripts/`
does not exist (it was gitignored). So right now the server is just `app.js` (cors, json,
morgan) + `server.js` (Mongoose connect + listen). Recover old code with `git show
HEAD:server/<path>` / `git restore` if needed, but ask before assuming the deletion was an
accident — a rewrite (possibly with auth first, see `todo.TODO`) may be underway.

The client is still the Vite scaffold (`App.jsx` renders "Hello React"). A full design pass
has been done and lives in `client/` as reference material (see below); none of it is built.
Treat anything marked "not yet implemented" literally.

## Structure

Two independent npm projects, no root package.json or workspace tooling tying them together:

- `client/` — Vite + React 19 + Tailwind CSS v4 frontend. Currently plain JS/JSX with no
  state library. TypeScript and Zustand (for shared stock/user state) are the intended
  direction (per early planning) but neither is installed yet — don't assume `.tsx` files or
  a Zustand store exist until they're actually added.
- `server/` — Express 5 + Mongoose 9 (MongoDB Atlas) backend. `server.js` loads
  `./config.env` (relative to cwd, so run from `server/`), builds the Atlas URI by
  substituting `DATABASE_PASSWORD` into `<db_password>` in `DATABASE`, then listens on `PORT`.
  `app.js` only mounts morgan (when `NODE_ENV === 'development'`), cors, and `express.json()`.

`.claude/skills/` and `.agents/skills/` hold the same 3 UI skills (frontend-design,
ui-ux-pro-max, web-design-guidelines); `skills-lock.json` pins them. `todo.TODO` is the
personal task log (currently: implement authentication).

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

No lint, build, or automated test runner is configured yet. Manual verification used to live in
gitignored `server/scripts/` scripts (see below); that folder doesn't currently exist.

## Client architecture notes

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
  Orders / Stock / Finances), not a hamburger menu; menu is 3 flavors (Original, Cinnamon
  sugar, Chocolate dip) × 2 sizes (S/M); **Signature/`SignatureRatio` is intentionally not
  built**; orders belong to an ad-hoc **Round** (name, open date, delivery date) chosen from
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
- `server/constants/stockTypes.js` exports the shared `['churro', 'stick', 'box']` enum. Only
  `StockModel.js` imports it so far — `RestockLogModel.js` still has the enum duplicated
  inline. If a new stock type is ever added, update both, and remember a new type also needs
  a manually-seeded `Stock` doc (nothing auto-creates them) plus new stock-deduction logic
  wherever that's implemented, since deduction rules aren't generic per type.
- The `constants/stockTypes.js` note above, the (former) `RestockLogModel.js` unused
  `Timestamp` import, and the old `server/scripts/` pattern (`testExpense.js`, `seedStock.js`, etc.: load
  `../config.env`, connect to Atlas, run valid/invalid cases, log ✅/❌, disconnect; writes
  real docs with no cleanup) describe the code at commit `af86b78` — check `git show
  HEAD:server/...` before relying on them, since those files are absent from the working tree.

## Domain model

The 5 original Mongoose schemas (`server/models/`; `Round` was added later as a 6th) were
deliberately kept at 5, not more — a
`FinishedStock`/`PackagingStock` split was merged into one generic `Stock` schema since
churro/stick/box share the same shape, and a churro-only `ProductionLog` was generalized into
`RestockLog` to give stick/box restocks an audit trail too. There's no ingredient-level stock
tracking — that was in an earlier design, dropped once it came out that churros are bought
pre-made with flavor applied only at sale time.

- **`StockItem`** (`server/models/stockItemModel.js`, built 2026-10-01 — **replaces** the old
  fixed 3-type `Stock` from commit `af86b78`): `name` (user-defined, unique case-insensitively
  via a collation-strength-2 index; always look up with the `findByName` /
  `findSortedByName` statics so the collation can't be forgotten),
  `unit` (`kg | L | pcs`), `quantity`, `lowStockThreshold`, plus `usedPerPiece` /
  `usedPerOrder` (default `0`). `quantity` has no min on purpose (deduction may push it
  below 0). Unit and staff enums are shared via `server/constants/units.js` /
  `staffMembers.js`. Auto-deduction rules are **data on each item, not code**:
  creating an order takes `usedPerPiece × churro pieces in the order + usedPerOrder` from
  every item; `0`/`0` = never auto-deducted (for things too hard to count, e.g. dips). So a
  new item can start auto-deducting by editing two numbers, no code change. Churro / Stick /
  Box are seeded (`server/scripts/seedStock.js`) with usedPerPiece 1/1/0 and usedPerOrder
  0/0/1; they have no special key and are ordinary, deletable items. Only two rule shapes
  exist (per churro piece, per order) — anything else (per flavor, per add-on) needs code.
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
- **`SignatureRatio`** (`size`, `flavor`, `pieceCount`) — **not** used for stock deduction.
  Since finished-churro stock is one unified pool, this exists purely to auto-fill the UI
  when staff pick flavor `signature` on an order (e.g. size M → 3 docs telling staff how many
  of each topping to apply). One document per (size, flavor) combo.
- **`Expense`** — records purchases as a lump sum, deliberately *not* linked to any specific
  `RestockLog` entry even when the same real purchase triggers both (two separate writes from
  two separate forms). Intentional: some expenses (gas, rent, delivery costs) aren't tied to
  any of the 3 stock types, so `Expense` has to stand alone rather than being keyed to `type`.
- **`Round`** (`server/models/roundModel.js`; `name`, `openDate`, `deliveryDate` ≥
  `openDate`, `isActive` default `true`) — a batch of orders; orders reference it by `_id`,
  and names are deliberately **not** unique (names like "Friday batch" repeat; dates tell
  them apart). Any number of rounds may be active at once, so the model must **not** carry
  a unique index on `isActive`: the current file still has a partial unique index
  (`{ isActive: 1 }`, `partialFilterExpression: { isActive: true }`) that enforces a single
  active round — remove it from the schema **and** drop `isActive_1` from the Atlas
  collection (Mongoose never drops indexes itself, so E11000 keeps firing otherwise).
  `roundController.getActiveRound` uses `findOne({ isActive: true })` and must become a
  list query (`find({ isActive: true })`, empty array = 200, not 404). `POST /` and
  `PATCH /:id` in `roundRoutes.js` only have `protect`, no handlers yet; "end round" is
  `PATCH` setting `isActive: false`.
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
  `OrderRow` and the future EditOrder page — **the live `Orders.dc.html`/`NewOrder.dc.html`
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

## Not yet implemented (the actual next steps)

- **Auto stock deduction on orders** — the hardest remaining piece. Churro pieces in an
  order = `Σ (size === 'S' ? 4 : 8) × quantity` over its items; then every `StockItem`
  loses `usedPerPiece × pieces + usedPerOrder` (so Churro and Stick lose one per piece, Box
  one per order, with the seeded values). Still to decide: whether editing an order's items
  or cancelling it gives the stock back. **Open question for Jui:** how many churro/stick pieces a
  `strawberry_nutella_bite` uses — it has no size, so the `S ? 4 : 8` rule can't apply to it.
  `isDone`/`isDelivered` should toggle via a separate
  `PATCH /api/v1/orders/:id`, not by re-saving the whole order.
- Low-stock alerts + a daily/cumulative summary (MongoDB aggregation), and wiring the
  frontend's polling loop.
- Auth is in place (JWT + bcrypt, `protect` on every order/round route): **one account per
  person** (`name` = `Jui` / `Impact`, created with `server/scripts/seedAccount.js`), both
  with the same permissions — no roles. Centralized error handling still needs a review
  before any real internet-facing deploy.

## Formatting

Root `.prettierrc`: single quotes, `endOfLine: auto`. Applies repo-wide (no per-package
override observed).
