#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const IMG_DIR = path.join(process.cwd(), 'public', 'img');
const SUPPORTED = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'];

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.isFile()) files.push(e.name);
  }
  return files;
}

async function convert(file) {
  const ext = path.extname(file).toLowerCase();
  const base = path.basename(file, ext);
  const src = path.join(IMG_DIR, file);
  const out = path.join(IMG_DIR, base + '.webp');
  try {
    await sharp(src)
      .resize({ width: 1600 })
      .webp({ quality: 82 })
      .toFile(out);
    console.log(`converted ${file} -> ${path.basename(out)}`);
  } catch (err) {
    console.error(`failed to convert ${file}:`, err.message);
  }
}

(async function main() {
  try {
    const files = await listFiles(IMG_DIR);
    const toConvert = files.filter(f => SUPPORTED.includes(path.extname(f).toLowerCase()));
    if (!toConvert.length) { console.log('No raster images to convert.'); return; }
    for (const f of toConvert) await convert(f);
    console.log('Image conversion completed.');
  } catch (e) {
    console.error('convert-images failed', e);
    process.exit(1);
  }
})();
