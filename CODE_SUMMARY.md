Ceramic Zone — Project Code Summary
=================================

Purpose
-------
This file is a compact, self-contained report you can paste to another AI to convey project state, key files, endpoints, how to run, and artifacts.

Repository root: marketplace-backend

Environment
-----------
- Node.js project (ESM, package.json present)
- Server entry: `index.js` (Express)
- Port: default 8080 (override with PORT env)
- Test flag: `TEST_HZ=1` to serve root `index.html` for deterministic tests

High-level overview
-------------------
- Server: `index.js` — static server + file-backed mock APIs + SPA fallback
- UI: `index.html` — Amazon-inspired Ceramic Zone landing page (current)
- Tests: Puppeteer scripts under `scripts/visual` and `scripts/smoke`
- Data: `data/` folder for file-backed mocks (`products.json`, `orders.json`)
- Artifacts: `artifacts/` (visual screenshots + `visual-report.json`), `smoke-report.json`

Key files and responsibilities
------------------------------
- `index.js` — Express server with these routes:
  - GET `/api/products` — serves `data/products.json` (array)
  - GET `/api/products/:id` — returns single product or 404
  - POST `/api/checkout` — accepts { items: [{productId, quantity}], email } and appends to `data/orders.json`
  - GET `/api/news` — returns mock NEWS_ITEMS (in-memory)
  - Static middleware serves `public/` with long cache by default; SPA fallback to `public/index.html` unless `TEST_HZ=1` then uses repo root `index.html`

- `index.html` — current landing page (Amazon-like):
  - Header: logo, location, central search, account, orders, cart
  - Hero carousel: JS functions `previousSlide()` / `nextSlide()`
  - Product grid and featured rows: initial demo cards; client can fetch `/api/products` to populate dynamically
  - Cart sidebar: `toggleCart()` and `proceedToCheckout()` stubs
  - Minimal interactive behavior in inline script

- `data/` — file-backed mock data (may be missing initially):
  - `products.json` — array of product objects (id, name, price, images, stock, description)
  - `orders.json` — created by POST `/api/checkout`

- `scripts/visual/inspect-browser.mjs` — Puppeteer script that:
  - Captures desktop/mobile screenshots
  - Saves page HTML snapshots
  - Writes `artifacts/visual-report.json` with selector presence

- `scripts/smoke/header-smoke.mjs` — header smoke test (supports `--force-hz`, `--headless`) that writes `smoke-report.json`

- `.github/workflows/smoke.yml` — GitHub Actions workflow that:
  - Checks out code, installs dependencies
  - Starts server with `TEST_HZ=1`
  - Runs smoke tests headless
  - Uploads `smoke-report.json` as artifact

How to run locally (quick)
--------------------------
1. Install deps:

   npm ci

2. Start server:

   npm start

   - To force root `index.html` for tests (local/CI):
     - Unix: TEST_HZ=1 node index.js
     - Windows (cmd): cmd /c "set TEST_HZ=1 && node index.js"

3. Visual inspection (creates screenshots & JSON report):

   node ./scripts/visual/inspect-browser.mjs

   Output: `artifacts/visual-desktop.png`, `artifacts/visual-mobile.png`, `artifacts/visual-report.json`

4. Header smoke test (Puppeteer):

   node ./scripts/smoke/header-smoke.mjs --force-hz --headless

   Output: `smoke-report.json`

5. API smoke test (if present):

   npm run smoke:api

Notes & caveats
----------------
- The server includes a test-only behavior to prefer root `index.html` when `TEST_HZ=1` — keep this guarded to avoid production surprises.
- Mock persistence is file-backed under `data/`; in production migrate to DB (SQLite/Postgres + Prisma recommended).
- Puppeteer scripts are already present; ensure CI runners provide Chrome (workflow uses ubuntu-latest with puppeteer installed).

Artifacts to provide to external AI
----------------------------------
- `index.js`, `index.html`
- `data/` folder (products.json, orders.json if present)
- `scripts/visual/*` and `scripts/smoke/*`
- `artifacts/visual-report.json` and `smoke-report.json`
- `package.json`

Suggested next steps for the AI
------------------------------
- Analyze `index.html` markup and list selectors used by smoke tests; map which selectors are currently present vs expected.
- If migrating to a DB, propose Prisma schema and migration plan to replace `data/` file mocks.
- Implement `/api/search?q=` endpoint to support front-end search.
- Wire cart actions to backend (POST /api/cart, GET /api/cart/:id) and persist sessions.
- Add failing CI job if smoke tests fail (currently workflow uploads artifact regardless).

Contact & execution notes
-------------------------
- Server: `index.js` (run with Node 20+)
- Puppeteer scripts assume Chrome available; adjust flags for CI non-root environments (`--no-sandbox` etc.)

---
End of report
