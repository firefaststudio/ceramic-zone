#!/usr/bin/env node
// Simple worker that polls email_queue and retries sending via Resend
import { getDbClient } from '../lib/server/getDbClient.js';
import { sendEmailConfirmation } from '../lib/sendEmailConfirmation.js';

const POLL_INTERVAL_MS = 15_000; // 15s between polls

async function processOne(supabase) {
  // claim one pending job
  const { data: rows, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('Errore fetch email_queue:', error.message || error);
    return;
  }
  if (!rows || rows.length === 0) return;

  const job = rows[0];

  // mark processing
  await supabase.from('email_queue').update({ status: 'processing' }).eq('id', job.id);

  try {
    const ok = await sendEmailConfirmation(job.to, job.order_id, job.attempts + 1);
    if (ok) {
      await supabase.from('email_queue').update({ status: 'sent', attempts: job.attempts + 1 }).eq('id', job.id);
      console.log(`Email job ${job.id} sent to ${job.to}`);
    } else {
      const attempts = job.attempts + 1;
      const updates = { attempts };
      if (attempts >= (job.max_attempts || 5)) {
        updates.status = 'failed';
        updates.last_error = 'max attempts reached';
      } else {
        updates.status = 'pending';
      }
      await supabase.from('email_queue').update(updates).eq('id', job.id);
      console.log(`Email job ${job.id} requeued (attempts=${attempts})`);
    }
  } catch (err) {
    console.error('Errore process job:', err?.message || err);
    await supabase.from('email_queue').update({ status: 'pending', last_error: err?.message || String(err) }).eq('id', job.id);
  }
}

async function main() {
  const supabase = getDbClient();
  console.log('Email queue worker started');
  while (true) {
    try {
      await processOne(supabase);
    } catch (err) {
      console.error('Worker loop error:', err?.message || err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((err) => {
  console.error('Worker failed:', err?.message || err);
  process.exit(1);
});
