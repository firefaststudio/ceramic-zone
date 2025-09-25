#!/usr/bin/env node
import fs from 'fs';
import { spawnSync } from 'child_process';

console.log('Running lightweight PDF pipeline smoke checks...');

// 1) check worker script exists
if (!fs.existsSync('./scripts/pdf-ocr-worker.mjs')) {
  console.error('ERROR: scripts/pdf-ocr-worker.mjs not found');
  process.exit(2);
}

// 2) check ocr helper exists
if (!fs.existsSync('./lib/ocr.mjs')) {
  console.error('ERROR: lib/ocr.mjs not found');
  process.exit(2);
}

// 3) check env example
if (!fs.existsSync('.env.example')) {
  console.warn('WARN: .env.example not found');
}

// 4) optional: check pdftoppm/tesseract in PATH
const pp = spawnSync('pdftoppm', ['-h']);
if (pp.error) console.warn('WARN: pdftoppm not available in PATH');
const t = spawnSync('tesseract', ['-v']);
if (t.error) console.warn('WARN: tesseract not available in PATH');

console.log('Smoke checks completed.');
