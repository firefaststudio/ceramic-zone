#!/usr/bin/env bash
set -e

echo "🚀 Installazione dipendenze OCR..."
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  sudo apt update
  sudo apt install -y poppler-utils tesseract-ocr
elif [[ "$OSTYPE" == "darwin"* ]]; then
  brew install poppler tesseract
else
  echo "⚠️ OS non riconosciuto: installa poppler e tesseract manualmente"
fi

echo "📂 Preparazione env..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "⚠️ Copiato .env.example -> .env. Ricordati di impostare SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY"
  else
    echo "⚠️ .env.example non trovato: crea .env con le variabili necessarie"
  fi
fi

echo "🗄️ Esecuzione migration SQL..."
if command -v supabase >/dev/null 2>&1; then
  echo "✴️ supabase CLI rilevato, eseguo 'supabase db push'"
  supabase db push || echo "⚠️ 'supabase db push' fallito; esegui manualmente le migrazioni nel Supabase SQL Editor"
else
  echo "⚠️ supabase CLI non trovata: esegui le migrazioni manualmente nel Supabase SQL Editor"
fi

echo "▶️ Avvio worker..."
# Log file
mkdir -p logs
nohup node ./scripts/pdf-ocr-worker.mjs > logs/worker.log 2>&1 &

echo "✅ Deploy script completato. Controlla logs/worker.log per output del worker."
