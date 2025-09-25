#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('Running assertions...');

try {
  execSync('node --check ./scripts/pdf-ocr-worker.mjs', { stdio: 'inherit' });
  execSync('node --check ./lib/ocr.mjs', { stdio: 'inherit' });
  console.log('Assertions passed.');
} catch (err) {
  console.error('Assertions failed:', err?.message || err);
  process.exit(3);
}
