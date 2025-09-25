import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const argv = process.argv.slice(2);
// options: --since-hours N --min-runs N --warn-success-rate 0.95 --slack-webhook URL --email to@example.com
const sinceFlag = argv.indexOf('--since-hours');
const sinceHours = sinceFlag !== -1 ? Number(argv[sinceFlag + 1]) : 24;
const minRunsFlag = argv.indexOf('--min-runs');
const minRuns = minRunsFlag !== -1 ? Number(argv[minRunsFlag + 1]) : 5;
const warnRateFlag = argv.indexOf('--warn-success-rate');
const warnSuccessRate = warnRateFlag !== -1 ? Number(argv[warnRateFlag + 1]) : 0.95;
const slackFlag = argv.indexOf('--slack-webhook');
const slackArg = slackFlag !== -1 ? argv[slackFlag + 1] : process.env.SLACK_WEBHOOK_URL;
const emailFlag = argv.indexOf('--email');
const emailArg = emailFlag !== -1 ? argv[emailFlag + 1] : null;

const logPath = path.join(process.cwd(), 'reports', 'export.log');
if (!fs.existsSync(logPath)) {
  console.error('export.log not found at', logPath);
  process.exit(2);
}

function parseLine(line) {
  const parts = line.split(' | ').map(p => p.trim());
  if (parts.length < 2) return null;
  const t = parts[0];
  const obj = { raw: line, timestamp: t };
  for (let i = 1; i < parts.length; i++) {
    const kv = parts[i].split(':');
    const k = kv.shift();
    const v = kv.join(':');
    obj[k] = v;
  }
  return obj;
}

const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean);
const entries = lines.map(parseLine).filter(Boolean);

// group by run id and keep last entry per run (by timestamp order)
const byRun = new Map();
for (const e of entries) {
  const run = e['run'] || e['run'];
  if (!run) continue;
  // use the entry to override previous (lines are chronological append)
  byRun.set(run, e);
}

// filter by sinceHours
const cutoff = Date.now() - (sinceHours * 3600 * 1000);
const recent = Array.from(byRun.values()).filter(e => {
  const ts = Date.parse(e.timestamp);
  return !isNaN(ts) && ts >= cutoff;
}).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

const total = recent.length;
const okCount = recent.filter(r => (r['status'] || '').trim() === 'OK').length;
const errCount = recent.filter(r => (r['status'] || '').trim() === 'ERROR').length;
const durations = recent.map(r => Number(r['duration_ms'] || 0)).filter(n => n > 0);
const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

console.log('Monitor summary (last', sinceHours, 'hours): runs=', total, 'OK=', okCount, 'ERROR=', errCount, 'avg_ms=', avgDuration);

async function sendSlack(webhook, text) {
  if (!webhook) return;
  try {
    await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    console.log('Slack alert sent');
  } catch (e) { console.error('Slack send failed', e.message); }
}

async function sendEmail(to, subject, body) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !to) return;
  try {
    const Resend = require('resend');
    const resend = new Resend(resendKey);
    await resend.emails.send({ from: process.env.REPORT_FROM || 'no-reply@example.com', to: [to], subject, html: `<pre>${body}</pre>` });
    console.log('Email alert sent');
  } catch (e) { console.error('Email send failed', e.message); }
}

(async function () {
  let alert = false;
  let msg = '';
  if (total < Math.max(1, minRuns)) {
    alert = true;
    msg += `Low run count: ${total} (expected >= ${minRuns})\n`;
  }
  const successRate = total ? (okCount / total) : 0;
  if (successRate < warnSuccessRate) {
    alert = true;
    msg += `Low success rate: ${(successRate * 100).toFixed(1)}% (threshold ${(warnSuccessRate * 100)}%)\n`;
  }
  const last = recent[0];
  if (!last) {
    alert = true;
    msg += 'No recent runs found\n';
  } else if ((last['status'] || '').trim() === 'ERROR') {
    alert = true;
    msg += `Last run error: run:${last['run']} at ${last.timestamp}\n`;
  }

  if (alert) {
    const subject = `ALERT: Collaudo monitor - project ${recent[0]?.project || 'unknown'}`;
    msg = `${subject}\n\n${msg}\nSummary: runs=${total} ok=${okCount} err=${errCount} avg_ms=${avgDuration}\n`;
    if (slackArg) await sendSlack(slackArg, msg);
    if (emailArg) await sendEmail(emailArg, subject, msg);
    // also write a note to export.log
    fs.appendFileSync(logPath, `${new Date().toISOString()} | monitor_alert | ${msg.replace(/\n/g, ' || ')}\n`);
  }
})();
