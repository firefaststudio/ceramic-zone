import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { parse } from 'csv-parse/sync';

// Usage: node reports/generate_pdf_from_csv.mjs <input-csv> [output-pdf] [--logo path/to/logo.png] [--chart path/to/chart.png] [--attach path/to/images]

const argv = process.argv.slice(2);
if (argv.length < 1) {
  console.error('Usage: node generate_pdf_from_csv.mjs <input-csv> [output-pdf] [--logo logo.png] [--chart chart.png] [--attach imagesFolder]');
  process.exit(2);
}

const inputCsv = argv[0];
let outputPdf = argv[1] || null;
const logoFlagIndex = argv.indexOf('--logo');
let logoPath = null;
if (logoFlagIndex !== -1 && argv[logoFlagIndex + 1]) {
  logoPath = argv[logoFlagIndex + 1];
}

if (!fs.existsSync(inputCsv)) {
  console.error('Input CSV not found:', inputCsv);
  process.exit(2);
}

// read raw buffer and detect common BOM/encodings (PowerShell often emits UTF-16LE)
const buf = fs.readFileSync(inputCsv);
let csvContent;
if (buf[0] === 0xff && buf[1] === 0xfe) {
  // UTF-16 LE BOM
  csvContent = buf.toString('utf16le');
} else if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
  csvContent = buf.toString('utf8').slice(1);
} else {
  // default attempt utf8
  csvContent = buf.toString('utf8');
}

const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

// Determine output filename
if (!outputPdf) {
  const { name } = path.parse(inputCsv);
  outputPdf = path.join(path.dirname(inputCsv), `${name}.pdf`);
}

// Ensure directory exists
const outDir = path.dirname(outputPdf);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Layout settings
const doc = new PDFDocument({ margin: 40, size: 'A4', autoFirstPage: true });
const writeStream = fs.createWriteStream(outputPdf);
doc.pipe(writeStream);

// Header (logo + title)
const logoArgIndex = process.argv.indexOf('--logo');
if (logoArgIndex !== -1 && process.argv[logoArgIndex + 1]) {
  logoPath = process.argv[logoArgIndex + 1];
}
if (logoPath && fs.existsSync(logoPath)) {
  try { doc.image(logoPath, 40, 40, { fit: [120, 60] }); } catch (e) { }
}

doc.fontSize(20).text('Collaudo Report', { align: 'center' });
doc.moveDown(0.5);

// read metadata if exists
const baseName = path.parse(inputCsv).name;
const metaPath = path.join(path.dirname(inputCsv), `${baseName}.meta.json`);
let runMeta = {};
if (fs.existsSync(metaPath)) {
  try { runMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { runMeta = {}; }
}

// Compute stats
function computeStats(rows) {
  let pass = 0, warn = 0, fail = 0;
  rows.forEach(r => {
    const s = (r.result || r.esito || r.status || '').toString().toLowerCase();
    if (s.includes('ok') || s.includes('pass') || s.includes('✅')) pass++;
    else if (s.includes('warn') || s.includes('⚠')) warn++;
    else if (s.includes('fail') || s.includes('error') || s.includes('❌')) fail++;
    else warn++;
  });
  return { pass, warn, fail, total: rows.length };
}

const stats = computeStats(records);
const pct = n => (stats.total === 0 ? 0 : Math.round((n / stats.total) * 100));

// KPI box
const kboxX = doc.page.margins.left;
const kboxY = doc.y;
const kboxW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const kboxH = 70;

doc.save();
doc.rect(kboxX, kboxY, kboxW, kboxH).fill('#f9f9f9');

doc.fillColor('black').fontSize(12).text(`Totale test: ${stats.total}`, kboxX + 10, kboxY + 8);

doc.fillColor('#2e8b57').text(`Passati: ${stats.pass} (${pct(stats.pass)}%)`, kboxX + 10, kboxY + 26);
doc.fillColor('#ff8c00').text(`Warning: ${stats.warn} (${pct(stats.warn)}%)`, kboxX + 200, kboxY + 26);
doc.fillColor('#d9534f').text(`Falliti: ${stats.fail} (${pct(stats.fail)}%)`, kboxX + 360, kboxY + 26);

// execution time if timestamps present
let execTimeText = 'Tempo esecuzione: N/A';
const tsFields = ['timestamp', 'generated_at', 'time', 'started_at', 'ended_at', 'ts', 'Timestamp', 'generatedAt'];
const timestamps = [];
records.forEach(r => {
  for (const f of tsFields) {
    if (r[f]) {
      const d = new Date(r[f]);
      if (!isNaN(d)) timestamps.push(d);
    }
  }
});
if (timestamps.length > 0) {
  const min = new Date(Math.min(...timestamps.map(d => d.getTime())));
  const max = new Date(Math.max(...timestamps.map(d => d.getTime())));
  const diffMs = max - min;
  const minutes = Math.floor(diffMs / 60000);
  execTimeText = `Tempo esecuzione: ${minutes} min (${min.toISOString()} → ${max.toISOString()})`;
}

doc.fillColor('black').fontSize(10).text(execTimeText, kboxX + 10, kboxY + 44);

doc.restore();

// Move cursor after KPI box
doc.moveDown(5);

// Draw a simple bar-chart showing distribution (no external deps)
function drawBarChart(x, y, w, h, stats) {
  const labels = [
    { name: 'Passati', value: stats.pass, color: '#2e8b57' },
    { name: 'Warning', value: stats.warn, color: '#ff8c00' },
    { name: 'Falliti', value: stats.fail, color: '#d9534f' }
  ];
  const total = Math.max(1, stats.total);
  const barH = Math.floor(h / labels.length) - 8;
  labels.forEach((lbl, i) => {
    const by = y + i * (barH + 8);
    // label
    doc.fontSize(9).fillColor('black').text(`${lbl.name} (${Math.round((lbl.value / total) * 100)}%)`, x, by);
    // bar background
    const bx = x + 120;
    const bw = w - 140;
    doc.rect(bx, by, bw, barH).fill('#eee');
    // bar fill
    const fillW = Math.round((lbl.value / total) * bw);
    doc.rect(bx, by, fillW, barH).fill(lbl.color);
  });
}

// where to draw chart: right of KPI box if space
try {
  const chartX = doc.page.margins.left;
  const chartY = kboxY + kboxH + 10;
  drawBarChart(chartX, chartY, doc.page.width - doc.page.margins.left - doc.page.margins.right, 80, stats);
  doc.moveDown(6);
} catch (e) {
  // ignore drawing errors
}

// Index page (simple TOC placeholder) if many rows
let tocEntries = [];
if (records.length > 10) {
  doc.addPage();
  doc.fontSize(14).text('Indice', { underline: true });
  doc.moveDown(0.5);
  tocEntries = records.map((r, i) => ({ title: r.summary || r.title || r.trace_id || `Riga ${i + 1}`, index: i, page: null }));
  tocEntries.forEach((e, i) => {
    doc.fontSize(9).fillColor('black').text(`${i + 1}. ${e.title}`);
  });
  doc.addPage();
}

// Table header and layout
const headers = Object.keys(records[0] || {});
const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const baseCol = Math.floor(usableWidth / Math.max(1, headers.length));
const colWidths = headers.map(() => Math.max(60, Math.min(240, baseCol)));

function renderTableHeader() {
  doc.font('Helvetica-Bold').fontSize(10).fillColor('black');
  headers.forEach((h, idx) => {
    const x = doc.page.margins.left + colWidths.slice(0, idx).reduce((a, b) => a + b, 0);
    doc.text(h, x, doc.y, { width: colWidths[idx] });
  });
  doc.moveDown(0.6);
}

renderTableHeader();

// Render rows and remember page numbers for TOC
records.forEach((r, rowIndex) => {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 80) renderTableHeader();

  const status = (r.result || r.esito || r.status || '').toLowerCase();
  let fill = 'black';
  if (status.includes('ok') || status.includes('pass') || status.includes('✅')) fill = '#2e8b57';
  else if (status.includes('warn') || status.includes('⚠')) fill = '#ff8c00';
  else if (status.includes('fail') || status.includes('error') || status.includes('❌')) fill = '#d9534f';

  // record's page number
  const pageNum = doc.bufferedPageRange ? doc.bufferedPageRange().start + doc.bufferedPageRange().count : null;
  if (tocEntries[rowIndex]) tocEntries[rowIndex].page = pageNum;

  headers.forEach((h, idx) => {
    const x = doc.page.margins.left + colWidths.slice(0, idx).reduce((a, b) => a + b, 0);
    const text = String(r[h] ?? '');
    doc.fillColor(fill).font('Helvetica').fontSize(9).text(text, x, doc.y, { width: colWidths[idx] });
  });
  doc.moveDown(0.8);
});

// Append final TOC with page numbers if we created one
if (tocEntries.length) {
  doc.addPage();
  doc.fontSize(14).text('Indice (pagine)', { underline: true });
  doc.moveDown(0.5);
  tocEntries.forEach((e, i) => {
    doc.fontSize(9).fillColor('black').text(`${i + 1}. ${e.title} — pagina ${e.page || '?'}`);
  });
}

// Chart attach support
const chartFlagIndex = process.argv.indexOf('--chart');
if (chartFlagIndex !== -1 && process.argv[chartFlagIndex + 1]) {
  const chartPath = process.argv[chartFlagIndex + 1];
  if (fs.existsSync(chartPath)) {
    doc.addPage();
    try { doc.image(chartPath, { fit: [doc.page.width - 80, doc.page.height - 120], align: 'center', valign: 'center' }); } catch (e) { }
  }
}

// Footer with timestamp and run id
const footerText = `Generated from ${path.basename(inputCsv)} — ${new Date().toISOString()}${runMeta.run_id ? ' — Run: ' + runMeta.run_id : ''}`;
doc.fontSize(9).fillColor('gray').text(footerText, doc.page.margins.left, doc.page.height - 50, { align: 'left' });

// Attach images folder if specified via --attach
const attachArgs = process.argv.reduce((acc, v, i, arr) => {
  if (v === '--attach' && arr[i + 1]) acc.push(arr[i + 1]);
  return acc;
}, []);
attachArgs.forEach((p) => {
  if (!fs.existsSync(p)) return;
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(p).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    files.forEach(f => {
      doc.addPage();
      try { doc.image(path.join(p, f), { fit: [doc.page.width - 80, doc.page.height - 120], align: 'center', valign: 'center' }); } catch (e) { }
    });
  } else if (stat.isFile() && /\.(png|jpg|jpeg)$/i.test(p)) {
    doc.addPage();
    try { doc.image(p, { fit: [doc.page.width - 80, doc.page.height - 120], align: 'center', valign: 'center' }); } catch (e) { }
  }
});

// finalize
doc.end();

writeStream.on('finish', () => {
  console.log('PDF created at', outputPdf);
});
