#!/usr/bin/env node
// Lightweight stress test: sends a list of pdf jobs to the admin endpoint
// Requires env: ADMIN_TOKEN, ADMIN_URL

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ADMIN_URL = process.env.ADMIN_URL;
const USER_ID = process.env.STRESS_USER_ID || 'uuid-utente-test';

if (!ADMIN_TOKEN || !ADMIN_URL) {
  console.error('Please set ADMIN_TOKEN and ADMIN_URL in environment (.env)');
  process.exit(2);
}

// Sample list - replace with your real test files
const pdfList = [
  'https://TUA_URL_BUCKET/sample-ok1.pdf',
  'https://TUA_URL_BUCKET/sample-ok2.pdf',
  'https://TUA_URL_BUCKET/file-pesante.pdf',
  'https://TUA_URL_BUCKET/file-non-pdf.txt',
  'https://TUA_URL_BUCKET/sample-ok3.pdf'
];

// Ensure fetch exists (Node 18+), otherwise try to import node-fetch dynamically
let fetchFn;
try {
  fetchFn = globalThis.fetch;
  if (!fetchFn) throw new Error('no global fetch');
} catch (e) {
  try {
    const nf = await import('node-fetch');
    fetchFn = nf.default || nf;
  } catch (err) {
    console.error('Fetch is not available and node-fetch could not be imported.');
    process.exit(3);
  }
}

async function sendJob(pdfUrl) {
  try {
    const res = await fetchFn(ADMIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN
      },
      body: JSON.stringify({ user_id: USER_ID, object_url: pdfUrl })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ Job per ${pdfUrl} rifiutato: ${res.status} ${res.statusText} -> ${text}`);
      return null;
    }

    const data = await res.json();
    // admin endpoint may return { job } or the job directly
    const trace = data?.trace_id || data?.job?.trace_id || data?.job?.traceId || data?.id || null;
    console.log(`📨 Job creato per ${pdfUrl} → trace_id: ${trace || 'n/a'}`);
    return trace;
  } catch (err) {
    console.error(`❌ Errore invio job per ${pdfUrl}:`, err?.message || err);
    return null;
  }
}

(async () => {
  const traceIds = [];
  for (const pdf of pdfList) {
    const id = await sendJob(pdf);
    if (id) traceIds.push(id);
    // small delay between sends
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n🕒 Inviati jobs, attendi qualche minuto e poi controlla lo stato:');
  console.table(traceIds.map(id => ({ traceId: id })));
})();
