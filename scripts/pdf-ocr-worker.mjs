#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '../lib/supabaseAdmin.mjs';
import { performOCR } from '../lib/ocr.mjs';

const POLL_INTERVAL_MS = 15000;

function estraiPunti(testOCR) {
  return (testOCR || '')
    .split('\n')
    .filter(line => /^(\d+\.|[-•])\s+/.test(line.trim()))
    .map(line => line.trim());
}

const MAX_RETRY = 3;
const BASE_DELAY = 5000; // 5 seconds

async function processJob(job) {
  console.log(`🚀 Lavorando sul job ${job.trace_id}...`);
  const supabase = supabaseAdmin;

  // Safety: ensure file is a PDF before running OCR
  if (!job.object_url || !job.object_url.toLowerCase().endsWith('.pdf')) {
    throw new Error('Formato non supportato');
  }

  // OCR
  const testoOCR = await performOCR(job.object_url);

  // Estratti punti elenco
  const punti = estraiPunti(testoOCR);

  // Inserisci estrazione completa
  const { error: errExtract } = await supabase
    .from('pdf_extractions')
    .insert({ trace_id: job.trace_id, testo: testoOCR, raw_json: { punti } });
  if (errExtract) throw errExtract;

  // Inserisci punti nella tabella dedicata
  if (punti.length) {
    const rows = punti.map((p, idx) => ({ trace_id: job.trace_id, punto_text: p, ordine: idx + 1 }));
    const { data: puntiInseriti, error: errPoints } = await supabase
      .from('pdf_points')
      .insert(rows)
      .select();
    if (errPoints) throw errPoints;

    // Popoliamo la review queue con tutti i punti nuovi (opzionale: filtro per confidence)
    const shouldEnqueueAll = true; // switchable policy: or use job.ocr_confidence
    if (shouldEnqueueAll) {
      const reviewRows = puntiInseriti.map(p => ({
        trace_id: job.trace_id,
        point_id: p.id,
        reviewer_id: null,
        status: 'pending'
      }));
      const { error: errReview } = await supabase
        .from('pdf_review_queue')
        .insert(reviewRows);
      if (errReview) throw errReview;
    }
  }

  // Aggiorna stato job
  await supabase
    .from('pdf_jobs')
    .update({ status: 'done' })
    .eq('id', job.id);

  console.log(`✅ Job ${job.trace_id} completato.`);
}

async function handleJobError(job, err) {
  const supabase = supabaseAdmin;
  const retry = (job.retry_count || 0) + 1;
  if (retry <= MAX_RETRY) {
    const delay = BASE_DELAY * Math.pow(3, retry - 1); // exponential: 5s, 15s, 45s
    console.warn(`⚠️ Job ${job.trace_id} fallito (tentativo ${retry}/${MAX_RETRY}): ${err?.message || err}`);
    console.log(`⏳ Riprovo tra ${delay / 1000}s...`);

    await supabase
      .from('pdf_jobs')
      .update({
        status: 'pending',
        retry_count: retry,
        last_error: err?.message || String(err)
      })
      .eq('id', job.id);

    await new Promise(r => setTimeout(r, delay));
  } else {
    console.error(`❌ Job ${job.trace_id} fallito definitivamente dopo ${MAX_RETRY} tentativi`);
    await supabase
      .from('pdf_jobs')
      .update({ status: 'failed', last_error: err?.message || String(err) })
      .eq('id', job.id);
  }
}

async function loop() {
  const supabase = supabaseAdmin;
  while (true) {
    try {
      const { data: job, error } = await supabase
        .from('pdf_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (!job) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      try {
        await supabase.from('pdf_jobs').update({ status: 'processing' }).eq('id', job.id);
        await processJob(job);
      } catch (err) {
        await handleJobError(job, err);
      }
    } catch (err) {
      console.error('Worker loop error:', err?.message || err);
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

loop();
