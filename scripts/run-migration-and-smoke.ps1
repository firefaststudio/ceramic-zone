# scripts/run-migration-and-smoke.ps1

# 1. Imposta la variabile d'ambiente DATABASE_URL
# La password è gestita tramite il secret GitHub ACTIONS_SECRET DATABASE_URL
# Non inserirla inline nello script
if (-Not $env:DATABASE_URL) {
    Write-Error "Variabile d'ambiente DATABASE_URL non impostata"
    exit 1
}

# 2. Verifica che i file di migration esistano
if (-Not (Test-Path ".\001_create_tables.sql")) {
    Write-Error "File 001_create_tables.sql mancante"
    exit 1
}
if (-Not (Test-Path ".\scripts\migrate-products.js")) {
    Write-Error "File migrate-products.js mancante"
    exit 1
}

# 3. Applica la migration SQL
Write-Host "Applicazione migration SQL..."
psql $env:DATABASE_URL -f .\001_create_tables.sql
if ($LASTEXITCODE -ne 0) {
    Write-Error "Errore applicazione migration SQL"
    exit 1
}

# 4. Migra i prodotti nel database
Write-Host "Migrazione prodotti..."
node .\scripts\migrate-products.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "Errore migrazione prodotti"
    exit 1
}

# 5. Avvia il server in background
Write-Host "Avvio del server..."
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "index.js"
Start-Sleep -Seconds 5

# 6. Esegui smoke tests
Write-Host "Esecuzione smoke tests..."
npm run smoke
if ($LASTEXITCODE -ne 0) {
    Write-Error "Smoke tests falliti"
    exit 1
}

# 7. Esporta dump e conteggi da database
Write-Host "Esportazione dump e conteggi..."
psql $env:DATABASE_URL -c "SELECT count(*) AS products_count FROM products;" > dump-products-count.txt
psql $env:DATABASE_URL -c "COPY (SELECT * FROM orders) TO STDOUT WITH CSV HEADER;" > dump-orders.txt
psql $env:DATABASE_URL -c "COPY (SELECT * FROM order_items) TO STDOUT WITH CSV HEADER;" > dump-order_items.txt

# 8. Log di completamento
Write-Host "Migrazione e smoke tests completati con successo."
Write-Host "Dump e conteggi esportati in dump-*.txt"

exit 0