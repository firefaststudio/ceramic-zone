import http from 'http';
import fs from 'fs';
import path from 'path';

const LOG_PATH = process.env.EXPORT_LOG_PATH || path.join(process.cwd(), 'reports', 'export.log');
const ARCHIVE_DIR = process.env.ARCHIVE_DIR || path.join(process.cwd(), 'reports', 'archive');
const PORT = process.env.METRICS_PORT || 9229;

function parseLogLine(line) {
  // example log: 2025-08-21T... | run:... | project:... | csv:... | csv_sha256:... | pdf:... | pdf_sha256:... | uploaded:...
  const parts = line.split('|').map(s => s.trim());
  const obj = {};
  parts.forEach(part => {
    if (part.startsWith('run:')) obj.run = part.slice(4);
    else if (part.startsWith('project:')) obj.project = part.slice(8);
    else if (part.startsWith('csv:')) obj.csv = part.slice(4);
    else if (part.startsWith('csv_sha256:')) obj.csv_sha256 = part.slice(11);
    else if (part.startsWith('pdf:')) obj.pdf = part.slice(4);
    else if (part.startsWith('pdf_sha256:')) obj.pdf_sha256 = part.slice(11);
    else if (part.startsWith('uploaded:')) obj.uploaded = part.slice(9);
    else if (/^\d{4}-\d{2}-\d{2}T/.test(part)) obj.timestamp = part;
  });
  return obj;
}

function readLog() {
  if (!fs.existsSync(LOG_PATH)) return [];
  const raw = fs.readFileSync(LOG_PATH, 'utf8').trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).filter(Boolean);
  return lines.map(parseLogLine);
}

function gatherMetrics() {
  const rows = readLog();
  const total = rows.length;
  let success = 0;
  let uploadedCount = 0;
  let last = null;

  rows.forEach(r => {
    if (r.pdf && fs.existsSync(r.pdf)) success++;
    if (r.uploaded && r.uploaded !== '-') uploadedCount++;
    last = r; // last line will be last run
  });

  // compute archive size
  let archiveSize = 0;
  if (fs.existsSync(ARCHIVE_DIR)) {
    const walk = dir => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else archiveSize += fs.statSync(p).size;
      }
    };
    try { walk(ARCHIVE_DIR); } catch (e) { archiveSize = 0; }
  }

  return {
    total_runs: total,
    success_count: success,
    fail_count: Math.max(0, total - success),
    success_pct: total === 0 ? 0 : Math.round((success / total) * 100),
    uploaded_count: uploadedCount,
    last_run: last,
    archive_size_bytes: archiveSize
  };
}

const server = http.createServer((req, res) => {
  if (req.url === '/metrics' || req.url === '/status') {
    const metrics = gatherMetrics();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(metrics, null, 2));
    return;
  }
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`Metrics server listening on http://localhost:${PORT} (log=${LOG_PATH})`);
});
