# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is an early-stage project (initial scaffold commit only). The client is the stock Vite + React template; the server is an Express/Mongoose skeleton with `server.js` currently only importing `mongoose` and `dotenv` (no app, routes, or DB connection wired up yet). `server/models/` and `server/routes/` exist but are empty. Expect to be building this out from near-zero rather than navigating established patterns.

## Structure

Two independent npm projects, no root package.json or workspace tooling tying them together:

- `client/` — Vite + React 19 + Tailwind CSS v4 frontend
- `server/` — Express 5 + Mongoose 9 (MongoDB Atlas) backend

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

No lint, build, or test scripts are configured yet.

## Client architecture notes

- Vite config (`client/vite.config.js`) wires together `@tailwindcss/vite`, a Vite ESLint plugin (lint errors surface in dev), `@vitejs/plugin-react`, and Babel with `reactCompilerPreset` — the React Compiler is active, so avoid manual memoization (`useMemo`/`useCallback`/`React.memo`) unless there's a specific reason the compiler can't handle it.
- Tailwind is imported via a single `@import "tailwindcss";` in `client/src/index.css` (Tailwind v4 CSS-first config, no `tailwind.config.js`).
- ESLint (`client/eslint.config.js`) flat config: `js.configs.recommended` + React Hooks + React Refresh rules. Unused vars/args prefixed with `_` are allowed.

## Server architecture notes

- `server/config.env` holds environment variables (Mongo Atlas connection string, port, etc.) and is loaded via `dotenv`. This file is **not** covered by `.gitignore` (only bare `.env` is ignored) — treat any secrets in it as needing a rename to `.env` or an explicit `.gitignore` entry before they're safe to leave in the working tree.
- Dependencies already installed but not yet used in code: `cors`, `express`, `morgan`, `mongodb` — the actual Express app/middleware/routing setup is still to be written.

## Formatting

Root `.prettierrc`: single quotes, `endOfLine: auto`. Applies repo-wide (no per-package override observed).
