#!/usr/bin/env node
/*
  Usage:
    node tests/assert-stress.mjs <trace_id1> <trace_id2> ...
  Or set env TRACE_IDS comma-separated.
  Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.

  The script will:
  - Poll pdf_jobs until each trace_id reaches 'done' or 'failed' (or timeout)
  - Gather pdf_extractions, pdf_points, pdf_review_queue data
  - Print a short table and dump a JSON report to stdout
*/

import { createClient } from '@supabase/supabase-js';

const TRACE_IDS_ARG = process.argv.slice(2);
const TRACE_IDS_ENV = process.env.TRACE_IDS ? process.env.TRACE_IDS.split(',').map(s => s.trim()).filter(Boolean) : [];
const TRACE_IDS = TRACE_IDS_ARG.length ? TRACE_IDS_ARG : TRACE_IDS_ENV;

if (!TRACE_IDS || TRACE_IDS.length === 0) {
  console.error('Provide trace ids as args or set TRACE_IDS env (comma separated).');
  process.exit(2);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(3);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const POLL_INTERVAL = parseInt(process.env.ASSERT_POLL_INTERVAL_MS || '5000', 10);
const TIMEOUT_MS = parseInt(process.env.ASSERT_TIMEOUT_MS || String(5 * 60 * 1000), 10); // default 5min

async function fetchJob(trace_id) {
  const { data, error } = await supabase.from('pdf_jobs').select('*').eq('trace_id', trace_id).limit(1).single();
  if (error) throw error;
  return data;
}

async function fetchExtraction(trace_id) {
  const { data, error } = await supabase.from('pdf_extractions').select('*').eq('trace_id', trace_id).limit(1).single();
  if (error && error.code !== 'PGRST116') throw error; // ignore not found
  return data || null;
}

async function fetchPoints(trace_id) {
  const { data, error } = await supabase.from('pdf_points').select('*').eq('trace_id', trace_id).order('ordine', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchReviewsByTrace(trace_id) {
  const { data, error } = await supabase.from('pdf_review_queue').select('*').eq('trace_id', trace_id);
  if (error) throw error;
  return data || [];
}

async function waitForCompletion(trace_id, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await fetchJob(trace_id);
    if (!job) return { found: false };
    if (job.status === 'done' || job.status === 'failed' || job.status === 'error') return { found: true, job };
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
  // timeout
  const last = await fetchJob(trace_id);
  return { found: !!last, job: last, timedOut: true };
}

(async function main() {
  console.log('Asserting stress results for', TRACE_IDS.length, 'trace_ids');

  const reports = [];

  for (const t of TRACE_IDS) {
    console.log('\n➡️  Trace:', t, '- waiting for completion (timeout', TIMEOUT_MS / 1000, 's)');
    try {
      const res = await waitForCompletion(t, TIMEOUT_MS);
      if (!res.found) {
        console.warn('Trace not found in pdf_jobs:', t);
        reports.push({ trace_id: t, found: false });
        continue;
      }
      const job = res.job;
      if (res.timedOut) console.warn('Timed out waiting for trace:', t);

      const extraction = await fetchExtraction(t);
      const points = await fetchPoints(t);
      const reviews = await fetchReviewsByTrace(t);

      const summary = {
        trace_id: t,
        job: {
          id: job.id,
          status: job.status,
          retry_count: job.retry_count || 0,
          last_error: job.last_error || null,
          created_at: job.created_at,
          updated_at: job.updated_at
        },
        extraction: extraction ? { id: extraction.id, text_length: extraction.testo ? extraction.testo.length : 0, raw_json: extraction.raw_json || null, created_at: extraction.created_at } : null,
        points: points.map(p => ({ id: p.id, ordine: p.ordine, punto_text: p.punto_text })),
        review_rows: reviews.map(r => ({ id: r.id, point_id: r.point_id, status: r.status, reviewer_id: r.reviewer_id }))
      };

      reports.push(summary);

      // Print compact table for this trace
      console.log('Job:', summary.job.status, 'retries:', summary.job.retry_count, 'last_error:', summary.job.last_error || '-');
      console.log('Points extracted:', summary.points.length, 'Review rows:', summary.review_rows.length);
    } catch (err) {
      console.error('Error asserting trace', t, err?.message || err);
      reports.push({ trace_id: t, error: String(err) });
    }
  }

  // Print full JSON report
  console.log('\n=== Full report JSON ===');
  console.log(JSON.stringify(reports, null, 2));

  process.exit(0);
})();
