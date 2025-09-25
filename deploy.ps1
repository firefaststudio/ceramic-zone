Write-Host "🚀 Installazione OCR tools..."
# Reuse existing install helper if present
if (Test-Path ".\install-tools.ps1") {
  Write-Host "Eseguo install-tools.ps1"
  & .\install-tools.ps1
}
else {
  Write-Host "⚠️ install-tools.ps1 non trovato. Segui la documentazione per installare Poppler e Tesseract su Windows."
}

Write-Host "📂 Preparazione env..."
if (-Not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️ Copiato .env.example -> .env. Compila SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY"
  }
  else {
    Write-Host "⚠️ .env.example non trovato: crea .env manualmente con le variabili richieste"
  }
}

Write-Host "🗄️ Esecuzione migrazioni..."
Write-Host "⚠️ Le migrazioni devono essere eseguite nel Supabase SQL Editor o con la supabase CLI se disponibile."

Write-Host "▶️ Avvio worker in background..."
# Start worker in new process; logs to worker.log
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "scripts/pdf-ocr-worker.mjs" -RedirectStandardOutput "logs\worker.log" -RedirectStandardError "logs\worker.log"

Write-Host "✅ Script Windows completato. Controlla logs\worker.log per output."
