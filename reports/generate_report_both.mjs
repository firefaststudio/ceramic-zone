import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';

// This wrapper will read an existing JSON/CSV run (if JSON exists it will convert to CSV),
// or just rename the existing CSV into the output folder with standard name, then call the PDF generator.

// Usage: node reports/generate_report_both.mjs <input-csv-or-json> [--logo logo.png]

const argv = process.argv.slice(2);
if (argv.length < 1) {
  console.error('Usage: node generate_report_both.mjs <input-json-or-csv> [--logo logo.png]');
  process.exit(2);
}

const input = argv[0];
const logoFlagIndex = argv.indexOf('--logo');
let logoPath = null;
if (logoFlagIndex !== -1 && argv[logoFlagIndex + 1]) logoPath = argv[logoFlagIndex + 1];

if (!fs.existsSync(input)) {
  console.error('Input not found:', input);
  process.exit(2);
}

const outDir = path.join(process.cwd(), 'reports', 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const runId = uuidv4();
const date = new Date().toISOString().slice(0, 10);
const baseName = `collaudo_${date}_${runId}`;

let csvPath = input;
if (path.extname(input).toLowerCase() === '.json') {
  // try convert JSON to CSV using simple converter (assume array of objects)
  const data = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (!Array.isArray(data)) {
    console.error('JSON input must be an array of rows');
    process.exit(2);
  }
  const headers = Object.keys(data[0] || {});
  const lines = [headers.join(',')];
  data.forEach((row) => {
    const cols = headers.map((h) => {
      const v = row[h] ?? '';
      // escape
      if (String(v).includes(',') || String(v).includes('"')) return `"${String(v).replace(/"/g, '""')}"`;
      return String(v);
    });
    lines.push(cols.join(','));
  });
  csvPath = path.join(outDir, `${baseName}.csv`);
  fs.writeFileSync(csvPath, lines.join('\n'));
} else {
  // copy csv to outDir with standard name
  const ext = path.extname(input) || '.csv';
  csvPath = path.join(outDir, `${baseName}${ext}`);
  fs.copyFileSync(input, csvPath);
}

// add run metadata to first row if possible: prepend a row with run_id, generated_at
// We'll prepend a simple metadata file next to CSV
const meta = { run_id: runId, generated_at: new Date().toISOString() };
fs.writeFileSync(path.join(outDir, `${baseName}.meta.json`), JSON.stringify(meta, null, 2));

// call PDF generator
const pdfScript = path.join(process.cwd(), 'reports', 'generate_pdf_from_csv.mjs');
const logoArg = logoPath ? `--logo "${logoPath}"` : '';
const cmd = `node "${pdfScript}" "${csvPath}" "${path.join(outDir, `${baseName}.pdf`)}" ${logoArg}`;
console.log('Running:', cmd);
try {
  const out = execSync(cmd, { stdio: 'inherit' });
} catch (e) {
  console.error('PDF generation failed', e.message);
  process.exit(2);
}

console.log('Generated:', csvPath, path.join(outDir, `${baseName}.pdf`));
