import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let supabaseUrl = process.env.SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let resendKey = process.env.RESEND_API_KEY;
let slackWebhook = process.env.SLACK_WEBHOOK_URL;

// Usage: node scripts/auto_export.mjs <input-csv-or-json> [--project name] [--out-dir path] [--upload-bucket bucket-name] [--email to@example.com] [--logo path] [--chart-type bar|pie] [--qr-url url] [--net-path \\\\server\share] [--slack-webhook url]
const argv = process.argv.slice(2);
if (argv.length < 1) {
  console.error('Usage: node scripts/auto_export.mjs <input-csv-or-json> [--project name] [--out-dir path] [--upload-bucket bucket-name] [--email to@example.com] [--logo path] [--chart-type bar|pie] [--qr-url url] [--net-path \\\\server\\share] [--slack-webhook url]');
  process.exit(2);
}

const input = argv[0];
const projectFlag = argv.indexOf('--project');
const projectName = projectFlag !== -1 ? argv[projectFlag + 1] : 'default';
const outDirFlag = argv.indexOf('--out-dir');
const customOutDir = outDirFlag !== -1 ? argv[outDirFlag + 1] : null;
const bucketFlag = argv.indexOf('--upload-bucket');
const bucketName = bucketFlag !== -1 ? argv[bucketFlag + 1] : null;
const emailFlag = argv.indexOf('--email');
const emailTo = emailFlag !== -1 ? argv[emailFlag + 1] : null;
const logoFlag = argv.indexOf('--logo');
const logoPathArg = logoFlag !== -1 ? argv[logoFlag + 1] : null;
const chartFlag = argv.indexOf('--chart-type');
const chartType = chartFlag !== -1 ? argv[chartFlag + 1] : 'bar';
const qrFlag = argv.indexOf('--qr-url');
const qrUrl = qrFlag !== -1 ? argv[qrFlag + 1] : null;
const netFlag = argv.indexOf('--net-path');
const netPath = netFlag !== -1 ? argv[netFlag + 1] : null;
const slackFlag = argv.indexOf('--slack-webhook');
const slackArg = slackFlag !== -1 ? argv[slackFlag + 1] : null;
if (slackArg) slackWebhook = slackArg;

if (!fs.existsSync(input)) {
  console.error('Input file not found:', input);
  process.exit(2);
}

const defaultOut = path.join(process.cwd(), 'reports', 'archive');
const outDir = customOutDir ? path.resolve(customOutDir) : defaultOut;
// create dated folder structure: year/month/day/project/
const now = new Date();
const year = String(now.getFullYear());
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const datedOutDir = path.join(outDir, year, month, day, safeProject);
if (!fs.existsSync(datedOutDir)) fs.mkdirSync(datedOutDir, { recursive: true });

// Create run id and destination names
import { v4 as uuidv4 } from 'uuid';
const runId = uuidv4();
const date = new Date().toISOString().slice(0, 10);
// sanitize project name for filesystem
const safeProject = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
const baseName = `collaudo_${safeProject}_${date}_${runId}`;

// Copy/convert input to archive as CSV
let csvPath = input;
if (path.extname(input).toLowerCase() === '.json') {
  const data = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (!Array.isArray(data)) { console.error('JSON input must be array'); process.exit(2); }
  const headers = Object.keys(data[0] || {});
  const lines = [headers.join(',')];
  data.forEach(row => {
    const cols = headers.map(h => {
      const v = row[h] ?? '';
      if (String(v).includes(',') || String(v).includes('"')) return `"${String(v).replace(/"/g, '""')}"`;
      return String(v);
    });
    lines.push(cols.join(','));
  });
  csvPath = path.join(datedOutDir, `${baseName}.csv`);
  fs.writeFileSync(csvPath, lines.join('\n'));
} else {
  csvPath = path.join(datedOutDir, `${baseName}${path.extname(input) || '.csv'}`);
  fs.copyFileSync(input, csvPath);
}

// write meta
fs.writeFileSync(path.join(datedOutDir, `${baseName}.meta.json`), JSON.stringify({ run_id: runId, generated_at: new Date().toISOString() }, null, 2));

// generate PDF via existing script
const pdfPath = path.join(datedOutDir, `${baseName}.pdf`);
const pdfScript = path.join(process.cwd(), 'reports', 'generate_pdf_from_csv.mjs');
// prepare a rich logging line for start
const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
const exportLogPath = path.join(reportsDir, 'export.log');
const startTs = new Date().toISOString();
const startLine = `${startTs} | run:${runId} | project:${safeProject} | status:START | input:${input} | out_dir:${datedOutDir}\n`;
fs.appendFileSync(exportLogPath, startLine);
console.log('Generating PDF...');
try {
  // pass logo and chart args to PDF generator if provided
  const logoArg = logoPathArg ? ` --logo "${logoPathArg}"` : '';
  // chart generation is internal (bar) - if chartType is pie, we log and fallback to bar
  const chartArg = ` --chart "${path.join(outDir, baseName + '_chart.png')}"`;
  execSync(`node "${pdfScript}" "${csvPath}" "${pdfPath}" ${logoArg} ${chartArg}`, { stdio: 'inherit' });
} catch (e) {
  console.error('PDF generation failed', e.message);
  const errLine = `${new Date().toISOString()} | run:${runId} | project:${safeProject} | status:ERROR | phase:PDF | error:${e.message}\n`;
  fs.appendFileSync(exportLogPath, errLine);
  // rethrow so outer try/catch can handle
  throw e;
}

// compute SHA256
import crypto from 'crypto';
function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// optional upload to Supabase Storage
async function uploadToSupabase(filePath, bucket) {
  if (!supabaseUrl || !supabaseKey) {
    console.log('Supabase credentials not set; skipping upload');
    return null;
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);
  const key = path.basename(filePath);
  const data = fs.readFileSync(filePath);
  const { error } = await supabase.storage.from(bucket).upload(key, data, { upsert: true });
  if (error) {
    console.error('Upload error:', error.message);
    return null;
  }
  const publicUrl = `${supabaseUrl.replace(/\.co.*$/, '.co')}/storage/v1/object/public/${bucket}/${encodeURIComponent(key)}`;
  return publicUrl;
}

// optional send email via Resend (if key present)
async function sendEmailWithAttachment(to, subject, body, attachments) {
  if (!resendKey) {
    console.log('Resend API key not set; skipping email');
    return null;
  }
  const Resend = require('resend');
  const resend = new Resend(resendKey);
  const from = process.env.REPORT_FROM || 'no-reply@example.com';
  const attachPayload = attachments.map(p => ({ type: 'attachment', filename: path.basename(p), data: fs.readFileSync(p).toString('base64') }));
  const resp = await resend.emails.send({
    from,
    to: [to],
    subject,
    html: `<p>${body}</p>`,
    attachments: attachPayload
  });
  return resp;
}

// helper: generate QR code PNG into outDir if qrUrl provided
async function generateQrPng(url, dest) {
  if (!url) return null;
  try {
    const QR = await import('qrcode');
    const out = path.join(dest, `${baseName}_qr.png`);
    await QR.toFile(out, url, { width: 200 });
    return out;
  } catch (e) {
    console.error('QR generation failed', e.message);
    return null;
  }
}

// helper: send Slack notification
async function notifySlack(webhook, text, attachments) {
  if (!webhook) return;
  try {
    const body = { text, attachments: attachments || [] };
    // node 18+ has global fetch
    await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (e) { console.error('Slack notify failed', e.message); }
}

(async function main() {
  // upload files if requested
  let uploaded = [];
  // generate QR if requested
  let qrFile = null;
  if (qrUrl) {
    qrFile = await generateQrPng(qrUrl, outDir);
  }
  if (bucketName) {
    try {
      const csvUrl = await uploadToSupabase(csvPath, bucketName);
      const pdfUrl = await uploadToSupabase(pdfPath, bucketName);
      uploaded = [csvUrl, pdfUrl].filter(Boolean);
    } catch (e) {
      console.error('Upload step failed', e.message);
      const errLine = `${new Date().toISOString()} | run:${runId} | project:${safeProject} | status:ERROR | phase:UPLOAD | error:${e.message}\n`;
      fs.appendFileSync(exportLogPath, errLine);
    }
  }

  // send email if requested
  if (emailTo) {
    try {
      const emailAttachments = [csvPath, pdfPath];
      if (qrFile) emailAttachments.push(qrFile);
      await sendEmailWithAttachment(emailTo, `Collaudo ${date} - ${runId}`, `In allegato i risultati del collaudo. Run: ${runId}`, emailAttachments);
      console.log('Email sent to', emailTo);
    } catch (e) { console.error('Email failed', e.message); }
  }

  // copy to network path if requested
  if (netPath) {
    try {
      const netCsv = path.join(netPath, path.basename(csvPath));
      const netPdf = path.join(netPath, path.basename(pdfPath));
      fs.copyFileSync(csvPath, netCsv);
      fs.copyFileSync(pdfPath, netPdf);
      console.log('Copied files to network path', netPath);
    } catch (e) { console.error('Network copy failed', e.message); }
  }

  // compute hashes
  let csvHash = null, pdfHash = null;
  try { csvHash = sha256(csvPath); } catch (e) { }
  try { pdfHash = sha256(pdfPath); } catch (e) { }

  // log event
  const finishTs = new Date().toISOString();
  const durationMs = new Date(finishTs) - new Date(startTs);
  const logLine = `${finishTs} | run:${runId} | project:${safeProject} | status:OK | duration_ms:${durationMs} | csv:${csvPath} | csv_sha256:${csvHash || '-'} | pdf:${pdfPath} | pdf_sha256:${pdfHash || '-'} | uploaded:${uploaded.join(',') || '-'}\n`;
  fs.appendFileSync(exportLogPath, logLine);
  console.log('Export complete. run_id=', runId);

  // Slack notify if webhook present
  if (slackWebhook) {
    const text = `Collaudo ${safeProject} completed - ${date} - run:${runId}\nFiles: ${path.basename(csvPath)}, ${path.basename(pdfPath)}`;
    const attachments = uploaded.length ? uploaded : [csvPath, pdfPath];
    await notifySlack(slackWebhook, text, attachments.map(u => ({ title: path.basename(u), url: u })));
  }
})();
