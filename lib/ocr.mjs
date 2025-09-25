#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const TMP_DIR = path.join(os.tmpdir(), 'pdf_ocr');
const DPI = 300;

async function downloadPDF(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const buf = await res.arrayBuffer();
  await fs.writeFile(outPath, Buffer.from(buf));
}

async function pdfToImages(pdfPath) {
  await fs.mkdir(TMP_DIR, { recursive: true });
  const prefix = path.join(TMP_DIR, path.basename(pdfPath, path.extname(pdfPath)));
  const args = ['-png', '-r', String(DPI), pdfPath, prefix];
  const res = spawnSync('pdftoppm', args, { encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`pdftoppm failed: ${res.stderr || res.stdout}`);
  const files = await fs.readdir(TMP_DIR);
  return files.filter(f => f.toLowerCase().endsWith('.png')).map(f => path.join(TMP_DIR, f)).sort();
}

function ocrImages(imgPaths, lang = 'eng') {
  let fullText = '';
  for (const imgPath of imgPaths) {
    const res = spawnSync('tesseract', [imgPath, 'stdout', '-l', lang], { encoding: 'utf8' });
    if (res.error) throw res.error;
    if (res.status !== 0) console.warn('tesseract warning:', res.stderr || res.stdout);
    fullText += `\n${res.stdout || ''}`;
  }
  return fullText.trim();
}

/**
 * performOCR accepts either a remote URL (http/https) or a local filepath.
 * It will try to extract selectable text via pdf-parse, otherwise fallback
 * to converting pages to images (pdftoppm) and running tesseract on them.
 */
export async function performOCR(urlOrPath, opts = {}) {
  const isUrl = typeof urlOrPath === 'string' && /^https?:\/\//i.test(urlOrPath);
  const localPdf = isUrl ? path.join(TMP_DIR, `input_${Date.now()}.pdf`) : urlOrPath;

  try {
    if (isUrl) await downloadPDF(urlOrPath, localPdf);

    // try selectable text first
    try {
      const pdf = await import('pdf-parse');
      const dataBuffer = await fs.readFile(localPdf);
      const parsed = await pdf.default(dataBuffer);
      const selectableText = parsed && parsed.text ? String(parsed.text).trim() : '';
      if (selectableText && selectableText.length > 50) return selectableText;
    } catch (e) {
      // ignore and fallback to image OCR
    }

    const images = await pdfToImages(localPdf);
    const lang = opts.lang || 'eng';
    const ocrText = ocrImages(images, lang);
    return ocrText;
  } finally {
    try {
      if (isUrl) await fs.rm(localPdf, { force: true });
    } catch (e) {
      // ignore
    }
  }
}
