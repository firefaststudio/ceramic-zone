#!/usr/bin/env node
// Usage: node reports/append-collaudo.mjs "Fase" "Obiettivo" "Esito atteso" "Esito reale" "Note/Anomalie" [ID_sessione]
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
if (args.length < 5) {
  console.error('Usage: node reports/append-collaudo.mjs "Fase" "Obiettivo" "Esito atteso" "Esito reale" "Note/Anomalie" [ID_sessione]');
  process.exit(2);
}
const [fase, obiettivo, esito_atteso, esito_reale, note] = args;
let idSessione = args[5] || args[4] || null; // optional last arg
if (!idSessione) {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  idSessione = `TEST-${datePart}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
}

const now = new Date();
const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;

const row = [fase, obiettivo, esito_atteso, esito_reale, note || '', timestamp, idSessione]
  .map(s => `"${String(s).replace(/"/g, '""')}"`).join(',') + '\n';

const outPath = path.join('reports', 'collaudo_finale.csv');
if (!fs.existsSync(outPath)) {
  // write header
  fs.writeFileSync(outPath, 'Fase,Obiettivo,Esito atteso,Esito reale,Note/Anomalie,Timestamp,ID_sessione\n', 'utf8');
}
fs.appendFileSync(outPath, row, 'utf8');
console.log('Appended row to', outPath);
