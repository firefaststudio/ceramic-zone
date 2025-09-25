Ceramic Zone — Handoff Payload
===============================

Purpose
-------
This single-file payload is optimized to be copy/pasted to another AI or shared with a stakeholder. It bundles the project summary, key files, endpoints, artifacts, and exact run steps.

Project summary (condensed)
----------------------------
- Repository root: marketplace-backend
- Server entry: `index.js` (Express, ESM)
- Frontend entry (test scaffold): `index.html` (Amazon-like Ceramic Zone landing)
- Data mocks: `data/products.json`, `data/orders.json` (file-backed)
- Tests: Puppeteer smoke & visual scripts under `scripts/smoke` and `scripts/visual`
- Artifacts: `artifacts/visual-report.json`, `artifacts/visual-desktop.png`, `artifacts/visual-mobile.png`, `smoke-report.json`

Endpoints (quick)
------------------
- GET /api/products -> returns array from `data/products.json` (or [] if missing)
- GET /api/products/:id -> returns a single product or 404
- POST /api/checkout -> accepts { items, email } and appends to `data/orders.json`
- GET /api/news -> returns in-memory NEWS_ITEMS (supports q, limit, offset, category, sort)

Files to attach to analysis (absolute paths in this repo)
------------------------------------------------------
- `index.js` (server entry)
- `index.html` (root landing page)
- `public/` (SPA shell)
- `data/products.json` (if present)
- `data/orders.json` (if present)
- `scripts/visual/inspect-browser.mjs`
- `scripts/smoke/header-smoke.mjs` and other smoke scripts
- `artifacts/visual-report.json`
- `artifacts/visual-desktop.png`
- `artifacts/visual-mobile.png`
- `smoke-report.json`
- `package.json`
- `CODE_SUMMARY.md`

Exact run steps (copy/paste)
----------------------------
1) Install deps:

   npm ci

2) Start server (force HZ scaffold for deterministic tests):

   Windows PowerShell:

   $env:TEST_HZ='1'; node index.js

3) Run visual inspection (screenshots + JSON):

   node ./scripts/visual/inspect-browser.mjs

4) Run header smoke tests (Puppeteer):

   node ./scripts/smoke/header-smoke.mjs --force-hz --headless

Notes & recommendations
-----------------------
- Keep `TEST_HZ=1` guarded to avoid serving the root scaffold in production.
- Seed `data/products.json` with representative products before running integration tests to exercise the client-side product loader.
- If you plan to run in CI, ensure Chrome is available or use the official Puppeteer package which downloads Chromium; add `--no-sandbox` to Puppeteer flags if needed on Linux runners.

Contact
-------
This payload was generated from the repo state and the project's `CODE_SUMMARY.md`.

End of payload
