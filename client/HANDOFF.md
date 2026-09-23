# Churo Bites Ops Dashboard — Handoff to Claude Code

This package is the output of a design/UX pass done in Claude chat, before any real code was written. It's meant to be a **reference for building the real app**, not code to copy in directly.

## What's in this folder

- `design-system/tokens.json` — every color, font, spacing, radius, and shadow value actually used. Port this into `tailwind.config` first.
- `design-system/README.md` — principles, voice, and the UI patterns established (buttons, badges, cards, the segmented nav, collapsible sections, chip/tile selection, list rows, task-screen headers). Read this before building any component.
- `screens/*.dc.html` — one file per screen, in a Claude-specific mockup format (custom `<x-dc>` wrapper, `{{accent}}` template placeholders, a `<script type="text/x-dc">` logic block, a `./support.js` reference). **These will not render correctly if opened directly in a browser or dev server** — that runtime doesn't exist outside Claude's canvas. Read them as a precise reference for exact colors, spacing, copy, and layout structure (they're just HTML + inline CSS underneath the wrapper), then rebuild as real React/TSX components using the design tokens above — don't try to execute them as-is.

## Screens included

| File | Screen | Notes |
|---|---|---|
| `Main.dc.html` | Home | Pending orders + earnings stat cards, round status control (interactive: toggles between "Round active" and "Start a new round"), quick actions, stock preview |
| `Orders.dc.html` | Orders list | Grouped by round (collapsible sections), sorted by delivery time within each round, order # as tiebreaker. Status filter chips (All/Pending/Done/Delivered) only appear on the active round's section — not on closed rounds |
| `NewOrder.dc.html` | New order | Single scrollable form (see decision below) |
| `EditOrder.dc.html` | Edit order | Same fields as New order, pre-filled, plus Save/Cancel |
| `Stock.dc.html` | Stock | **Known to not match the real business model — see decision below** |
| `Restock.dc.html` | Restock | Free-text item name + quantity + unit |
| `EditRestock.dc.html` | Edit/delete a restock log entry | |
| `Expenses.dc.html` | Finances | Revenue/Expenses/Profit summary (all "this month") + expense list |
| `AddExpense.dc.html` / `EditExpense.dc.html` | Expense forms | Simple 2-field form |
| `DefineRound.dc.html` | New round | Open date, delivery date, round name |

## Decisions made during this process (not obvious from the screens alone)

**Order creation flow:** Originally planned as a 3-step wizard (items → review → confirm). Changed to **one scrollable form** instead — flavor, size, quantity, add-on, "Add to order," a running item list (editable/removable), delivery fee, round, delivery time, staff, customer name + note, total, submit. Reasoning: fewer taps for a 2-person team doing this repeatedly all shift.

**Menu:**
- 3 flavors: Original, Cinnamon sugar, Chocolate dip
- **2 sizes: S/M** (not 3 — an earlier S/M/L version was corrected)
- Add-ons: Choc dip ฿10, Choc pops ฿10, Strawberry freeze dried ฿10 — "None" is default. Shown as full-width rows (name left, price right), not a 2-column grid — a grid caused "Strawberry freeze dried" to wrap awkwardly.
- **Signature item** (multi-flavor ratio, backed by a `SignatureRatio` schema) — intentionally **not built**. Deferred by choice, not an oversight.

**Delivery fee:** Free / ฿5 / ฿10 / ฿15, default Free.

**Rounds:** No fixed schedule — created ad-hoc, each with a name (e.g. "Round 5"), an open date, and a delivery date. Orders are assigned to an existing round via a dropdown at order-creation time (rounds are created first, separately, via the "New round" screen). Home shows the current round's status with a single control that flips between "Round active · End round" and "No active round · Start a new round" — never both at once.

**Order status:** The backend models this as two independent booleans (`isDone`, `isDelivered`). The UI intentionally uses a **single exclusive Pending/Done/Delivered choice** (radio group) instead of two checkboxes — decided that the visual result is equivalent for how the team actually works, and simpler to build. If that assumption turns out wrong in practice (e.g. "done but not delivered" needs to be independently trackable in a way three radio states can't express), revisit this.

**Stock — flagged as inaccurate, deferred:** The mockup tracks raw ingredients (flour, sugar, cooking oil, etc.), but the real business **buys pre-made churros in packs of 50** — nothing is produced from ingredients. This was caught but intentionally not fixed in the mockup; the person wants to customize Stock's structure themselves rather than have it rebuilt sight-unseen. **Don't build Stock's data model directly from `Stock.dc.html` — confirm the real item list first.**

**Staff:** Two people — "Jui" and "Partner" — used in "Added by" dropdowns and restock/expense logs.

**Known bug, not yet fixed in the mockup:** every text input/select uses 15px font. iOS Safari zooms in on any input under 16px on focus. Fix this in the real build.

**Button sizing (intentional):** primary buttons run 16px text / 48px min-height; secondary and destructive-outline buttons run 14px text / 44px min-height. This is a deliberate two-tier system, not an inconsistency to normalize away.

**Not designed yet:** a responsive data table (all lists currently use stacked card rows, only tested at one mobile width) and any modal/confirmation dialog (every action, including destructive ones, is a full page right now).
