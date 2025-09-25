#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Usage:
// 1) Place your 7 test files in ./test-files/
// 2) Ensure .env contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// 3) node ./scripts/upload-test-files.mjs

const BUCKET = process.env.SUPABASE_TEST_BUCKET || 'test-pdfs';
const LOCAL_DIR = path.resolve('./test-files');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment (.env)');
  process.exit(2);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const filesToUpload = [
  'sample-ok1.pdf',
  'sample-ok2.pdf',
  'sample-ok3.pdf',
  'file-pesante.pdf',
  'file-non-pdf.txt',
  'sample-lowquality.pdf',
  'sample-multilang.pdf'
];

(async function main() {
  if (!fs.existsSync(LOCAL_DIR)) {
    console.error('Local test-files directory not found:', LOCAL_DIR);
    process.exit(3);
  }

  console.log('Uploading to bucket:', BUCKET);

  // Ensure bucket exists (Supabase doesn't provide easy create via client; assume it exists or create manually)
  // We'll proceed to upload; if the bucket doesn't exist, uploads will fail with error from Supabase.

  for (const fileName of filesToUpload) {
    const localPath = path.join(LOCAL_DIR, fileName);
    if (!fs.existsSync(localPath)) {
      console.warn('Skipping missing file:', fileName);
      continue;
    }

    const destPath = `${fileName}`; // top-level path in bucket
    console.log('Uploading', fileName, '->', destPath);
    const fileBuffer = fs.readFileSync(localPath);

    const { data, error } = await supabase.storage.from(BUCKET).upload(destPath, fileBuffer, { upsert: true });
    if (error) {
      console.error('Upload error for', fileName, error.message || error);
      continue;
    }

    // public URL (if bucket is public)
    const { publicURL } = supabase.storage.from(BUCKET).getPublicUrl(destPath);
    console.log(' -> public URL:', publicURL);

    // Optional: create signed URL (temporary)
    try {
      const { data: signed, error: sigErr } = await supabase.storage.from(BUCKET).createSignedUrl(destPath, 60 * 60); // 1h
      if (!sigErr) console.log(' -> signed URL (1h):', signed.signedURL);
    } catch (e) {
      // ignore
    }

    console.log('---');
  }

  console.log('Upload script finished. Copy the printed URLs into tests/stress-test.mjs pdfList.');
})();
