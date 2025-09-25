import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const srcDir = path.join(process.cwd(), 'frontend', 'img', 'originals');
const outDir = path.join(process.cwd(), 'frontend', 'img');

if (!fs.existsSync(srcDir)) {
  console.log('No originals dir found at', srcDir, '- skipping image conversion.');
  process.exit(0);
}

fs.readdirSync(srcDir).forEach(file => {
  const inPath = path.join(srcDir, file);
  const name = path.parse(file).name;
  const webpOut = path.join(outDir, `${name}.webp`);
  const avifOut = path.join(outDir, `${name}.avif`);

  sharp(inPath).resize({ width: 1600 }).toFile(webpOut).then(() => console.log('written', webpOut)).catch(e => console.error('webp error', e));
  sharp(inPath).resize({ width: 1600 }).toFile(avifOut).then(() => console.log('written', avifOut)).catch(e => console.error('avif error', e));
});

console.log('Image conversion job queued.');
