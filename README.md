<<<<<<< HEAD
=======
<<<<<<< HEAD
# ceramic-zone
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/firefaststudio/ceramic-zone)
=======
>>>>>>> eeee9f2 (chore: remove CommonJS test-supabase.cjs after migration to ESM)
# marketplace-backend

Backend Node.js per marketplace con Supabase e Framer.

## Come usare

1. Crea un file `.env` partendo da `.env.example` e inserisci le tue chiavi Supabase.
2. Installa le dipendenze:
   ```bash
   npm install
   ```
3. Avvia il server in locale:
   ```bash
   npm run dev
   ```
4. Per testare la connessione Supabase:
   ```bash
   npm run test-supabase
   ```

## Deploy su Render

- Build Command: `npm install`
- Start Command: `npm start`
- Imposta le variabili d'ambiente come nel file `.env`

## Badge Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## File utili
- `.env.example` (da compilare)
- `test-supabase.cjs` (test connessione Supabase)
- `logger.js` (log colorati)

## Struttura repo
- `index.js` → entrypoint backend
- `test-supabase.cjs` → test Supabase
- `logger.js` → log colorati
- `package.json` → config progetto

---

Per domande o supporto, apri una issue su GitHub.
<<<<<<< HEAD
=======
>>>>>>> e606d8b (Aggiunta render.yaml, README, logger, test Supabase e file env example)
>>>>>>> eeee9f2 (chore: remove CommonJS test-supabase.cjs after migration to ESM)
