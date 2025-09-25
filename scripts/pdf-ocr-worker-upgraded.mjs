#!/usr/bin/env node
// Upgraded PDF OCR worker: converts PDF pages to PNG using pdftoppm (poppler), OCRs each page with tesseract.js
// Requirements: install poppler-utils (pdftoppm) on the host. On Windows, install poppler and add to PATH.

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import fetch from 'node-fetch';
import { createWorker } from 'tesseract.js';
import { getDbClient } from '../lib/server/getDbClient.js';

const POLL_INTERVAL_MS = 15_000; // 15s
const DPI = 300; // recommended for OCR accuracy

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = await res.arrayBuffer();
  await fs.promises.writeFile(dest, Buffer.from(buffer));
}

function convertPdfToPngs(pdfPath, outDir, dpi = DPI) {
  // Uses pdftoppm from Poppler: pdftoppm -png -r 300 input.pdf outPrefix
  if (!fs.existsSync(pdfPath)) throw new Error('PDF not found: ' + pdfPath);
  fs.mkdirSync(outDir, { recursive: true });
  const outPrefix = path.join(outDir, 'page');
  const args = ['-png', '-r', String(dpi), pdfPath, outPrefix];
  const res = spawnSync('pdftoppm', args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`pdftoppm failed: ${res.stderr || res.stdout}`);
  }
  // gather generated files: page-1.png, page-2.png, ... depending on pdftoppm naming
  const files = fs.readdirSync(outDir).filter((f) => f.toLowerCase().endsWith('.png')).map((f) => path.join(outDir, f));
  files.sort();
  return files;
}

async function ocrFilesWithTesseract(files) {
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const results = [];
  for (const file of files) {
    console.log('OCRing', file);
    const { data } = await worker.recognize(file);
    results.push({ file, text: data.text, confidence: data.confidence });
  }
  await worker.terminate();
  return results;
}

async function processOne(supabase) {
  const { data: rows, error } = await supabase
    .from('pdf_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('Errore fetch pdf_jobs:', error.message || error);
    return;
  }
  if (!rows || rows.length === 0) return;

  const job = rows[0];
  await supabase.from('pdf_jobs').update({ status: 'processing' }).eq('id', job.id);

  const tmpDir = path.join('./tmp', job.id);
  await fs.promises.mkdir(tmpDir, { recursive: true });
  const destPdf = path.join(tmpDir, `${job.id}.pdf`);

  try {
    console.log('Downloading', job.object_url);
    await downloadFile(job.object_url, destPdf);

    // Try selectable text first using pdf-parse (quick path)
    let selectableText = '';
    try {
      const pdf = await import('pdf-parse');
      const dataBuffer = await fs.promises.readFile(destPdf);
      const parsed = await pdf.default(dataBuffer);
      selectableText = (parsed && parsed.text) ? parsed.text.trim() : '';
    } catch (e) {
      console.warn('pdf-parse not available or failed, will fallback to image OCR:', e?.message || e);
    }

    let finalText = '';
    if (selectableText && selectableText.length > 50) {
      console.log('Using selectable text extracted by pdf-parse');
      finalText = selectableText;
    } else {
      console.log('Converting PDF to PNGs with pdftoppm (requires poppler)');
      const pngFiles = convertPdfToPngs(destPdf, tmpDir, DPI);
      const ocrResults = await ocrFilesWithTesseract(pngFiles);
      finalText = ocrResults.map((r) => r.text).join('\n\n');
    }

    // Persist extraction
    await supabase.from('pdf_extractions').insert([{ job_id: job.id, raw_text: finalText, confidence: 0.85 }]);
    await supabase.from('pdf_jobs').update({ status: 'done' }).eq('id', job.id);
    await supabase.from('pdf_processing_log').insert([{ job_id: job.id, stage: 'extract', message: 'ok' }]);
    console.log(`Processed job ${job.id}`);
  } catch (err) {
    console.error('Error processing PDF job:', err?.message || err);
    const attempts = (job.attempts || 0) + 1;
    const updates = { attempts, last_error: err?.message || String(err) };
    if (attempts >= 3) updates.status = 'failed'; else updates.status = 'pending';
    await supabase.from('pdf_jobs').update(updates).eq('id', job.id);
    await supabase.from('pdf_processing_log').insert([{ job_id: job.id, stage: 'error', message: err?.message || String(err) }]);
  } finally {
    // cleanup tmp
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { }
  }
}

async function main() {
  const supabase = getDbClient();
  console.log('Upgraded PDF OCR worker started');
  while (true) {
    try { await processOne(supabase); } catch (err) { console.error('Worker loop error:', err?.message || err); }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((err) => { console.error('Fatal', err); process.exit(1); });
