# Churo Bites — Design System

Churo Bites is a small churro business run by two operators taking orders over LINE. This design system is for the **Churo Bites Operations Dashboard** — the internal tool used to manage orders, stock, and expenses, built in React + TypeScript + Tailwind (frontend) with a Node/Express/MongoDB backend.

## Principles

The dashboard should feel **warm, clear, and efficient**.

- **Warm** — a hint of the food brand (caramel/cinnamon tones), not a cold generic admin panel.
- **Clear** — order status must be readable at a glance; two people juggling orders on separate devices can't afford ambiguity.
- **Efficient** — this is a working tool for two people, not a marketing surface. No decoration that doesn't help someone finish a task.

## Voice

- Do: plain, direct labels ("Mark as delivered", not "Fulfillment complete").
- Do: Thai-first copy where the team actually works in Thai; keep code and token names in English.
- Don't: icon-only controls without a label, decorative animation, unnecessary confirmation dialogs.

## Using this system

**Color** is one theme for now (Light) — dark mode is a planned v2. `surface` is a warm cream page background; `surface-pink` / `surface-peach` / `surface-apricot` are soft pastel fills for cards, chips and secondary action tiles — decorative only, never for text (too light to hit contrast). `brand` (a burnt-caramel orange, kept from v1) carries primary actions and links, with `brand-hover` as its hover state; it and every status color meet 4.5:1 contrast against white, so they're safe as text, not just fills. The three order-status colors (`status-pending`, `status-done`, `status-delivered`) stay deliberately far apart in hue (amber / green / blue) — the pastel palette doesn't have enough hue separation for this job, so these are kept as functional colors outside the decorative palette. `status-done-bg` / `status-delivered-bg` are the light tint fills behind those two badges (`status-pending` reuses `surface-peach` as its fill; `status-done` doubles as the color for a positive quantity delta, e.g. a restock log's "+5 kg"). Pair each with a text label too, never color alone. `danger` covers destructive actions and error states; `danger-border` is its light outline for secondary/outline-style destructive buttons — there is currently no filled-danger button anywhere in the app, so an `on-danger` token isn't defined yet; add it if one gets built. `divider` is a lighter hairline than `border`, used between rows inside a card rather than around the card itself.

**Type** pairs `heading` (Poppins, falling back to Kanit) for titles, page headers, and stat numbers with `sans` (Poppins, falling back to IBM Plex Sans Thai) for everything else — body copy, labels, controls. Poppins doesn't cover Thai glyphs, so Thai copy renders in the fallback automatically — both fallbacks are geometric sans faces chosen to sit close to Poppins so the two scripts don't feel mismatched. All three are Google Fonts; load them via a standard `<link>` or `@font-face` in the app — no font files are bundled here. The type scale in `tokens.json` (`display` / `display-compact`, `heading` / `page-title`, `body` / `body-small` / `label` / `badge` / `caption` / `button-primary` / `button-secondary`) reflects the actual sizes and weights used across every screen — not an aspirational scale to grow into.

**Spacing** has four real steps (`space-1`…`space-4`, 4/8/16/24px) plus a range of finer ad-hoc gaps used between them for tighter fits — see the `note` field on the spacing tokens for exactly which values and where. **Radius** runs `radius-sm` (inputs) → `radius-md` (buttons, cards, tiles) → `radius-lg` (reserved for the not-yet-built Modal), plus `radius-pill` (badges, chips, tile groups, the segmented nav) and `radius-full` (circular icon buttons). **Shadow** has three steps — `shadow-sm` for resting cards (the only one actually in use right now), `shadow-md` for dropdowns, `shadow-lg` for modals and sheets — all tinted with `ink` instead of pure black, so elevation stays warm instead of turning grey.

This system is built **mobile-first**: base styles assume a touch screen (44px minimum touch targets, no hover-dependent affordances, tap feedback via `:active`), and any pointer-only enhancement (hover states) is added on top with `@media (hover: hover)` rather than assumed.

## Patterns used so far

Nothing below is packaged as reusable component code yet — this file is tokens + guidance only. What's listed here is what the mockup has actually established by hand-styling the same way each time, mobile-first (touch targets ≥44px, hover gated to `@media (hover: hover)`, no custom control where a native one works as well):

- **Button** — primary (`brand` fill, `button-primary` type, 48px min-height), secondary (`surface-peach` / `surface-apricot` fill), and danger (outline, `danger-border` + `danger` text, `button-secondary` type, 44px min-height) all appear across the app. Primary buttons run visibly larger than secondary/danger ones — an intentional two-tier sizing, not an inconsistency. All restyled per instance rather than sharing one implementation.
- **Badge** — a colored pill (`radius-pill`) with an icon and a text label for order/stock status (pending / done / delivered / low) — never color alone, consistent everywhere it's used.
- **Card** — one number, one fact (stat cards on Home and Finances, using `display` type — or `display-compact` when three sit in a row) or a stacked list of rows (Orders, Stock, Finances) — laid out with plain inline CSS grid or flex each time; no shared grid class exists.
- **Single-select chip/tile group** — a visually hidden native radio paired with a styled `<label>`, so it stays keyboard/screen-reader accessible without looking like a default radio button. Two shapes: a fully-rounded pill (`radius-pill`) for short single-line choices (flavor, delivery fee, status), or a `radius-md` tile for options that carry a second line (size, add-ons with a price beneath the name). Selected = `brand` fill with white text; unselected = `border` outline.
- **Segmented nav control** — the 4-item pill track (Home / Orders / Stock / Finances) in the header on every list-style page: a `surface`-colored track (`radius-pill`) holding one `brand`-filled active tab, identical markup on every page it appears, just with a different tab active.
- **Collapsible section** — a full-width button header (label + a right-aligned summary + a chevron that rotates open/closed) sharing one `radius-md` card with its body, divider shown only when expanded. Used for the round-grouped sections on Orders.
- **List row** — name on the left (with optional sub-lines beneath it: an itemized breakdown, a chosen add-on, a delivery time), a value or status badge on the right, `divider` between rows except the last one in a card. The one recurring layout for every list in the app.
- **Task-screen header** — a back arrow plus `page-title`, with an optional subtitle line (e.g. "Logged Today, 9:12 AM · Jui"). Used on every form/detail screen (New order, Edit order, Restock, Add/Edit expense, New round) instead of the segmented nav, since these are single-purpose screens, not one of the four main destinations.
- **TextField / SelectField** — labeled native `<input>` / `<select>` / `<textarea>`, `radius-sm`, `border` colored. **Known gap:** every instance currently uses 15px font, not 16px — on real iOS Safari that triggers zoom-on-focus. Worth fixing when this becomes real component code; the mockup hasn't been corrected yet.
- **Table** — not designed. Every list in the mockup (Orders, Stock, Finances) uses stacked rows inside a card, at a single mobile width. A responsive table (stacked below 720px, sticky-header above it) hasn't been needed yet.
- **Modal** — not designed. Every action, including destructive ones (Cancel order, Delete entry), is its own full page with no confirmation step in front of it.

## Scope: what this system is not

This is the component layer, not the assembled app. The restock form, the expense form, and the order-creation flow (one scrollable form — flavor, size, quantity, add-on, round, delivery, staff, customer, then submit — not the earlier-planned 3-step items → review → confirm) are built by composing TextField, SelectField, Button, and Modal — that wiring (state, validation rules, what gets submitted where) belongs in the app's own code, not in a design-system component, the same way the schemas it submits to live in the backend, not here.

---

## Consuming this system

There is no compiled component bundle yet — no `bundle.js`, no `api/` folder, no `components/` folder. This artifact currently contains exactly two files: this README and `tokens.json`. Consume it directly: pull color/type/spacing/radius/shadow values from `tokens.json`, and follow the principles and patterns documented above. If a generated bundle-consumption section reappears here later, verify it against the actual file listing before trusting it — the previous one described components (Badge as a neutral dot-chip, a responsive Table, a bottom-sheet Modal) that were never built and contradicted what's in "Patterns used so far" above.
