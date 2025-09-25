import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sha256File(p) {
  const b = fs.readFileSync(p);
  return crypto.createHash('sha256').update(b).digest('hex');
}

function sampleRecords() {
  return [
    { id: 1, titolo: 'Bug login', risolto: false },
    { id: 2, titolo: 'Aggiornare policy', risolto: true },
    { id: 3, titolo: 'Errore pagamento', risolto: false }
  ];
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const out = { outDir: path.join(__dirname, 'output'), sessionId: null, dataFile: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out-dir' || a === '-o') out.outDir = argv[++i];
    else if (a === '--session-id' || a === '-s') out.sessionId = argv[++i];
    else if (a === '--data-file' || a === '-i') out.dataFile = argv[++i];
  }
  return out;
}

async function renderReport(records, outDir, sessionId) {
  fs.mkdirSync(outDir, { recursive: true });
  const totale = records.length;
  const risolti = records.filter(r => r.risolto).length;
  const nonRisolti = totale - risolti;
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(0, 15);
  const filenameBase = `report_${timestamp}_${sessionId}`;

  // CSV
  const csvPath = path.join(outDir, `${filenameBase}.csv`);
  const csvLines = [];
  csvLines.push(['ID', 'Titolo', 'Risolto'].join(','));
  records.sort((a, b) => (a.risolto === b.risolto) ? a.id - b.id : (a.risolto ? 1 : -1)).forEach(r => {
    csvLines.push([r.id, `"${String(r.titolo).replace(/"/g, '""')}"`, r.risolto ? 'Risolto' : 'Non risolto'].join(','));
  });
  fs.writeFileSync(csvPath, csvLines.join('\r\n'), { encoding: 'utf8' });

  // Chart (optional)
  let chartPath = null;
  try {
    const { ChartJSNodeCanvas } = await import('chartjs-node-canvas');
    const width = 400; const height = 400;
    const chartCallback = (ChartJS) => {
      // noop for now
    };
    const charter = new ChartJSNodeCanvas({ width, height, chartCallback });
    const configuration = {
      type: 'pie',
      data: {
        labels: ['Risolti', 'Non risolti'],
        datasets: [{ data: [risolti, nonRisolti], backgroundColor: ['#4CAF50', '#F44336'] }]
      },
      options: { plugins: { legend: { position: 'bottom' } } }
    };
    const buffer = await charter.renderToBuffer(configuration);
    chartPath = path.join(outDir, `${filenameBase}_chart.png`);
    fs.writeFileSync(chartPath, buffer);
  } catch (e) {
    console.warn('Chart generation skipped:', e.message || e);
  }

  // PDF
  let pdfPath = path.join(outDir, `${filenameBase}.pdf`);
  try {
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 40 });
    const ws = fs.createWriteStream(pdfPath);
    doc.pipe(ws);

    doc.fontSize(16).font('Helvetica-Bold').text('Report KPI Segnalazioni', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica').text(`Totale segnalazioni: ${totale}`);
    doc.text(`Risolti: ${risolti}`);
    doc.text(`Non risolti: ${nonRisolti}`);
    doc.moveDown();

    if (chartPath && fs.existsSync(chartPath)) {
      try { doc.image(chartPath, { fit: [300, 300], align: 'center' }); doc.moveDown(); } catch (e) { console.warn('Unable to add chart to PDF:', e.message || e); }
    }

    // Table header
    const startX = doc.x;
    const cellHeight = 20;
    doc.font('Helvetica-Bold');
    doc.rect(doc.x, doc.y, 50, cellHeight).stroke(); doc.text('ID', doc.x + 5, doc.y + 5, { width: 50 - 10 });
    doc.rect(doc.x + 50, doc.y, 300, cellHeight).stroke(); doc.text('Titolo', doc.x + 55, doc.y + 5, { width: 300 - 10 });
    doc.rect(doc.x + 350, doc.y, 100, cellHeight).stroke(); doc.text('Stato', doc.x + 355, doc.y + 5, { width: 100 - 10 });
    doc.moveDown();

    doc.font('Helvetica');
    records.sort((a, b) => (a.risolto === b.risolto) ? a.id - b.id : (a.risolto ? 1 : -1)).forEach(r => {
      const y = doc.y;
      doc.rect(doc.x, y, 50, cellHeight).stroke(); doc.text(String(r.id), doc.x + 5, y + 5, { width: 50 - 10 });
      doc.rect(doc.x + 50, y, 300, cellHeight).stroke(); doc.text(String(r.titolo), doc.x + 55, y + 5, { width: 300 - 10 });
      doc.rect(doc.x + 350, y, 100, cellHeight).stroke();
      if (r.risolto) doc.fillColor('#008000'); else doc.fillColor('#C80000');
      doc.text(r.risolto ? 'Risolto' : 'Non risolto', doc.x + 355, y + 5, { width: 100 - 10 });
      doc.fillColor('black');
      doc.moveDown();
    });

    doc.end();
    // wait for stream finish
    await new Promise((res, rej) => ws.on('finish', res).on('error', rej));
  } catch (e) {
    console.warn('PDF generation failed:', e.message || e);
    // ensure pdfPath points to something or null
    if (!fs.existsSync(pdfPath)) pdfPath = null;
  }

  // meta
  const meta = { run_id: sessionId, generated_at: new Date().toISOString(), csv: path.basename(csvPath), pdf: pdfPath ? path.basename(pdfPath) : null };
  try { meta.csv_sha256 = sha256File(csvPath); if (pdfPath) meta.pdf_sha256 = sha256File(pdfPath); } catch (e) { meta.hash_error = String(e); }

  const metaPath = path.join(outDir, `${filenameBase}.meta.json`);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), { encoding: 'utf8' });

  return { csv: csvPath, pdf: pdfPath, meta: metaPath };
}

async function main() {
  const opts = parseArgs();
  const outDir = path.isAbsolute(opts.outDir) ? opts.outDir : path.join(process.cwd(), opts.outDir);
  const sessionId = opts.sessionId || crypto.randomBytes(4).toString('hex');
  let records = [];
  if (opts.dataFile) {
    try { records = JSON.parse(fs.readFileSync(opts.dataFile, 'utf8')); } catch (e) { console.warn('Unable to read data file, using sample:', e.message); records = sampleRecords(); }
  } else records = sampleRecords();

  const artifacts = await renderReport(records, outDir, sessionId);
  console.log('Report CSV salvato in:', artifacts.csv);
  console.log('Report PDF salvato in:', artifacts.pdf);
  console.log('Meta salvato in:', artifacts.meta);
}

if (process.argv[1].endsWith('export_report.mjs')) main().catch(e => { console.error(e); process.exit(1); });
