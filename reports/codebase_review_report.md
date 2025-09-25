# Codebase Review Report — ceramic-zone

Generated: 2025-08-22

Obiettivo
---
Fornire al reviewer (senior web designer & developer) un report completo del codice del sito, con: struttura del progetto, tecnologie usate, punti di attenzione (security, performance, UX, accessibilità), elementi che richiedono revisione prioritaria, istruzioni per eseguire e testare il progetto, e una checklist finale per le modifiche suggerite.

Come usare questo report
---
- Invia questo file al reviewer come contesto iniziale.
- Allegare (opzionale) l'archivio contenente le cartelle essenziali: `frontend/`, `public/`, `reporting/`, `scripts/`, `docs/`, `.vscode/`.
- Richiedere commenti per ogni sezione: design, front-end, backend, UX, performance, sicurezza, CI/CD.

Sommario del progetto
---
- Stack: Node.js (ESM), Express, Supabase (Postgres), PDF generation (pdfkit / Python fallback), OCR worker (pdftoppm + tesseract fallback), reporting (Node + Python), GitHub Actions.
- Scope: backend marketplace con endpoint prodotti/ordini/checkout, ingestione PDF + OCR + review queue, reportistica automatica (CSV+PDF), notifiche email/Slack, monitoraggio.

Struttura principale (cartelle rilevanti)
---
- `index.js` — server Express bootstrap (API + static `public/`).
- `routes/` — endpoint Express (products, orders, checkout, reviews, admin-pdf, search, auth).
- `app/api/` — API routes per Next-style (TypeScript, compatibilità con Next/Edge handlers).
- `lib/` — helper (ocr, supabaseAdmin, mailer, server db client).
- `scripts/` — automazioni: OCR worker, auto export, monitor, backup, run_report wrapper.
- `reporting/` — report generator (Python original + new Node rewrite `export_report.mjs`).
- `reports/` — PDF generator scripts (Node), templates, archive samples.
- `frontend/` & `public/` — static frontend demo and preview.
- `.vscode/` — editor config (Live Server, launch)
- `.github/workflows/` — CI smoke tests (report smoke runner and others)

Dipendenze rilevanti
---
- Runtime: Node 18+
- Key libs: `@supabase/supabase-js`, `express`, `pdfkit` (node), `chartjs-node-canvas` (optional), `resend` (email), `tesseract`/`pdftoppm` (system binaries) per OCR.
- Dev: `nodemon`.

Ambiente richiesto per esecuzione completa
---
- Node.js 18+
- (Opzionale per Python-based report) Python 3.11+ and venv
- System binaries for OCR: `pdftoppm` (Poppler) and `tesseract` if OCR worker used
- Supabase credentials (SUPABASE_URL, SERVICE_ROLE_KEY) for admin scripts
- Optional: Docker for isolated runs / CI

Punti di attenzione tecnici (da rivedere prioritariamente)
---
1. Security & secrets
   - Alcuni helper creano client Supabase all'import-time; ho introdotto factory lazy per evitare errori in ambienti privi di env vars. Ma è importante che in produzione le chiavi sensibili siano in Secret Manager (Render, Vercel, GitHub Actions Secrets).
   - Admin endpoints (e.g., `/routes/admin-pdf.js`) usano basic tokens; raccomando: HTTPS obbligatorio, limitazione IP e rotazione token.

2. Pagamenti
   - Code paths di `checkout` e `webhooks/stripe` usano Stripe; attualmente i moduli sono importati dinamicamente per evitare crash su ambienti privi di Stripe key.
   - Verificare idempotency keys e gestione degli errori per evitare stati incoerenti degli ordini.

3. DB & queries
   - Uso misto di Supabase client e raw SQL/pg client. Standardizzare: preferire Supabase client o pool pg per coerenza e transazioni.
   - Migrazioni non incluse (sono in `scripts/`); aggiungere script/migration runner (e.g. pg-migrate, supabase CLI) per deploy ripetibili.

4. OCR pipeline
   - Il worker usa fallback a `tesseract` e `pdftoppm`; assicurarsi che i binari siano installati e i percorsi siano gestiti nella documentazione.
   - Considerare controllo qualità OCR e punteggi di confidenza per routing alla review queue anziché un semplice fallback.

5. Reporting & grafici
   - Ho aggiunto `reporting/export_report.mjs` (Node). Chart generation dipende da `chartjs-node-canvas`/`canvas`: su Windows richiede build tools e Python per `node-gyp`. Per CI, usare runner Ubuntu per generare i chart.

6. Accessibility & Frontend design
   - Frontend attuale è una demo static con `frontend/index.html` + `public/` preview. Raccomandazione: audit con Lighthouse (accessibility, performance, best practices).
   - Far eseguire al reviewer test di contrasto, tab navigation, ARIA roles e responsive behaviour su mobile.

7. Tests & CI
   - CI contiene smoke workflows; mancano test unitari/integrazione per le API critiche (checkout, webhooks, order flows). Priorità: creare test che mockino Supabase e Stripe.

8. Observability & Logging
   - `logger.js` è presente; suggerisco centralizzare log su un servizio (Papertrail, Loggly, or Supabase logs) e aggiungere correlation IDs per tracing delle richieste.

Suggerimenti UX / Design (da passare al designer)
---
- Visual: coerentare tipografia, spacing e palette; creare file di design tokens (color, spacing, type scale) e fornire theming CSS/variables.
- Homepage: aggiungere hero chiaro, CTA, microcopy per trust (spedizione, resi), e prova sociale (testimonials).
- Product listing: migliorare filtri e sorting (categoria, price, popularity) e layout delle cards (immagini ottimizzate, lazy-loading).
- Checkout flow: semplificare in 1-2 step, mostrare costi in tempo reale (iva, spedizione), supporto guest checkout.
- Mobile: navbar sticky, collapsible filters, interazioni con tap target >=44px.

Priorità tecnica e roadmap proposta (primi 8 punti)
---
1. Hardening pagamenti (idempotency + webhooks) — MUST
2. Test automatici per API critiche + CI — MUST
3. Migrazioni e deploy step ripetibili (supabase CLI) — MUST
4. Audit sicurezza (secret management, admin endpoints) — HIGH
5. Accessibility audit (Lighthouse, keyboard nav, ARIA) — HIGH
6. Implementare Sentry o simile per error tracking — MEDIUM
7. Migliorare UX/product pages con designer — MEDIUM
8. Ottimizzazione performance (image CDN, SSR caching) — MEDIUM

Checklist operativa da inviare al reviewer
---
- [ ] Revisionare struttura file `frontend/` e `public/` per coerenza CSS/JS
- [ ] Fornire design tokens (palette, fonts, spacing) e mockups per product & checkout
- [ ] Review accessibilità: fornire elenco di issue prioritari
- [ ] Suggerire miglioramenti UX specifici per mobile
- [ ] Revisionare flow di checkout e proposte per ridurre attrito
- [ ] Liste di test automatizzati raccomandati per ogni area critica

Istruzioni per fare la review (per l'esperto)
---
1. Clona il repo o ricevi l'archivio. Apri root in VS Code.
2. Requisiti locali: Node.js 18+, (opzionale) Python 3 se vuole eseguire lo script Python, ma il report Node è disponibile.
3. Installare le dipendenze:
   ```powershell
   npm install
   ```
4. Avviare server di sviluppo (Express):
   ```powershell
   npm run dev
   ```
   oppure aprire `frontend/index.html` con Live Server (impostazione root `public/`).
5. Eseguire report Node (genera CSV+PDF+meta):
   ```powershell
   npm run report:node
   ```
6. Per eseguire test del checkout webhook: impostare le chiavi Stripe (TEST) e simulare PaymentIntent + webhook post.

Deliverables attesi dall'esperto
---
- Documento con note sul design (mockups e priorità)
- Lista di issue con severità (blocker/high/medium/low) per codice e UX
- Patch/PR suggeriti (o branch con prototipo) per le modifiche più importanti
- Lista di test e script di verifica (snippets di cURL o test code)

Allegati consigliati da inviare insieme al report
---
- `reports/codebase_review_report.md` (questo file)
- `reporting/output/*` artifact (opzionale) — esempio di PDF generato
- `reports/export.log` (storico export) per dare idea dei run
- eventuale branch contenente le modifiche proposte dal reviewer

Contatti e modo di lavorare
---
- Consiglio workflow: reviewer invia commenti incrementali via PR o issue; ogni PR dovrebbe includere:
  - descrizione problema e soluzione proposta
  - screenshot / prototype per modifiche di design
  - test case e passi per la verifica

Appendice: file chiave per il reviewer (punti di partenza rapida)
---
- API e server
  - `index.js`
  - `routes/checkout.js`, `routes/orders.js`, `app/api/webhooks/stripe/route.ts`
- OCR & worker
  - `scripts/pdf-ocr-worker.mjs`, `lib/ocr.mjs`
- Reporting / PDF
  - `reporting/export_report.mjs`, `reports/generate_pdf_from_csv.mjs`
- Frontend
  - `frontend/index.html`, `frontend/scripts.js`, `public/` files
- Dev tooling & CI
  - `.github/workflows/*`, `.vscode/launch.json`

Fine del report
---
Se vuoi, posso:
- esportare questo file in PDF e allegare gli artifact (zip) pronti per l'invio al reviewer;
- aprire una Pull Request che aggiunge questo report e gli artifact a `reports/review_package.zip` (se vuoi che generi lo zip qui);
- contattare il reviewer fornitomi (se hai i contatti) e inviare il pacchetto via email (serve API key Resend o altro).

Indica il prossimo passo: creare ZIP degli elementi essenziali, convertire questo report in PDF, o procedere a creare issue/PR delle priorità individuate. 
