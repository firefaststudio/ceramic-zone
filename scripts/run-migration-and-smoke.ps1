# scripts/run-migration-and-smoke.ps1

# 1. Imposta la variabile d'ambiente DATABASE_URL
# Sostituisci i placeholder con la tua connection string completa
$env:DATABASE_URL = 'postgresql://postgres:YOUR_PASSWORD@db.mkdgdlmfmwarvhlqjzfb.supabase.co:5432/postgres'

# 2. Verifica che i file esistano
if (-Not (Test-Path "..\db\migrations\001_create_tables.sql")) {
  if (-Not (Test-Path ".\db\migrations\001_create_tables.sql")) {
    Write-Error "File db\migrations\001_create_tables.sql mancante"
    exit 1
  }
}
if (-Not (Test-Path ".\scripts\migrate-products.js")) {
  Write-Error "File scripts\migrate-products.js mancante"
  exit 1
}

# 3. Applica la migration SQL
Write-Host "Applicazione migration SQL..."
psql $env:DATABASE_URL -f .\db\migrations\001_create_tables.sql
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

# 7. Verifica ordini nel database (opzionale)
Write-Host "Verifica ordini creati..."
psql $env:DATABASE_URL -c "SELECT count(*) AS products_count FROM products;"
psql $env:DATABASE_URL -c "SELECT * FROM orders LIMIT 10;"
psql $env:DATABASE_URL -c "SELECT * FROM order_items LIMIT 20;"

Write-Host "Migrazione e smoke tests completati con successo."

# 8. Pulizia variabile d'ambiente
Remove-Item Env:DATABASE_URL
Write-Host "Variabile DATABASE_URL rimossa dalla sessione."

exit 0
