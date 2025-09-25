#!/usr/bin/env node
// Usage: node reports/generate-evaluation-report.mjs reports/template.json
import fs from 'fs';
import path from 'path';

const input = process.argv[2] || './reports/template.json';
if (!fs.existsSync(input)) {
  console.error('Input JSON not found:', input);
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
const rows = raw.report || [];

const outCsv = rows.map(r => [r.phase, r.objective, r.expected, r.result || '', r.notes || ''].map(s => `"${String(s).replace(/"/g, '""')}"`).join(',')).join('\n');

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = path.join('./reports', `evaluation-${ts}.csv`);
fs.writeFileSync(outPath, 'Fase,Obiettivo,Esito atteso,Esito reale,Note/Anomalie\n' + outCsv);
console.log('Report written to', outPath);
