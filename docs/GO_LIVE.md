GO LIVE - Collaudo Automation

Scopo
-----
Procedura operativa per attivare in produzione lo script di automazione `scripts/auto_export.mjs`, il monitoraggio e il backup degli output (CSV + PDF).

Prerequisiti
-------------
- Node.js 18+ installato sul server
- Poppler (`pdftoppm`) e Tesseract (`tesseract`) installati se si usa OCR
- Variabili d'ambiente impostate (vedi sotto)
- Cartelle di destinazione con permessi di scrittura per l'utente che esegue lo script
- (Opzionale) Supabase/Resend/Slack credenziali per upload, email e notifiche

Variabili d'ambiente richieste
------------------------------
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY (opzionale)
- REPORT_FROM (opzionale, e.g. no-reply@azienda.com)
- SLACK_WEBHOOK_URL (opzionale)
- METRICS_PORT (opzionale, default 8080)

Distribuzione e avvio
---------------------
1. Copiare il repository sul server di produzione o configurare la pipeline CI/CD per check-out su ogni deploy.
2. Installare dipendenze:

```powershell
cd 'Z:\CERMIC ZONE PROJECT\SITO WEB CON FRAMER\marketplace-backend'
npm ci --production
```

3. Impostare le variabili d'ambiente nel servizio di runtime o nel file di unit systemd.
4. Avviare manualmente un run di prova (da account con permessi):

```powershell
node scripts/auto_export.mjs path\to\sample.csv --project Prod --out-dir C:\reports\archive --email ops@azienda.com --upload-bucket prod-reports
```

Esecuzione continua (systemd esempio Linux)
-------------------------------------------
Creare un'unit systemd (esempio su Linux) `/etc/systemd/system/collaudo.service`:

```
[Unit]
Description=Collaudo Auto Export
After=network.target

[Service]
Type=simple
User=collaudo
WorkingDirectory=/srv/collaudo
Environment=SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... RESEND_API_KEY=... SLACK_WEBHOOK_URL=...
ExecStart=/usr/bin/node /srv/collaudo/scripts/auto_export.mjs /srv/collaudo/input/latest.csv --project Prod --out-dir /srv/collaudo/reports/archive
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

Abilitare e avviare:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now collaudo.service
```

Backup automatico
-----------------
Esempio cron giornaliero (Linux):

```
0 2 * * * tar -czf /backups/collaudo-$(date +\%F).tar.gz -C /srv/collaudo/reports archive
```

Su Windows si può usare Task Scheduler per eseguire uno script PowerShell che comprime la cartella `reports/archive` e la copia su un network share.

Monitoraggio e alert
--------------------
- Lo script scrive `reports/export.log` con una riga per START/OK/ERROR per ogni run.
- Installare un piccolo servizio di monitor (es. `scripts/metrics_server.mjs`) che espone metriche base su `/metrics`.
- Configurare un job Prometheus o un semplice cron che chiama `/health` o `/metrics` e manda alert su Slack/Email se:
  - non vengono prodotti nuovi report da più di X ore
  - percentuale di successi scende sotto la soglia (es. 95%)

Alerting via Slack/Email
------------------------
- Usare `SLACK_WEBHOOK_URL` per notifiche immediate al canale #ops.
- Per email critiche, usare RESEND_API_KEY per inviare un avviso a una lista di distribuzione.

Archiviazione e retention
-------------------------
- Gli output sono salvati in `reports/archive/YYYY/MM/DD/<project>/` per facilità di ricerca.
- Policy di retention: mantenere 90 giorni su disco, spostare i file più vecchi in cold storage (S3 Glacier o NAS) mensilmente.

Documentazione e contatti
-------------------------
- Questa guida: `docs/GO_LIVE.md`
- Contatti: IT Operations, Team QA, Responsabile Privacy

Prossimi upgrade
----------------
- Dashboard web interna che indica KPI (tempo medio, percentuale successo, ultimi report) e permette download rapido.
- Collegare i log `reports/export.log` a un log aggregator (ELK/Datadog) per query e alert più sofisticati.

