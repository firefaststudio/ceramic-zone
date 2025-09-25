import fs from 'fs';
import { fileURLToPath } from 'url';
const root = fileURLToPath(new URL('..', import.meta.url));
console.log('root', root);

// patch express Router to log route patterns by creating a small helper script
const { spawnSync } = await import('child_process');
const helperTemplate = fs.readFileSync(root + '/scripts/trace-helper.cjs', 'utf8');
const escapedIndex = root.replace(/\\/g, '\\\\') + '/index.js';
const tmpContent = helperTemplate.replace('__INDEX_PATH__', escapedIndex);
const tmpPath = root + '/scripts/.tmp_trace.cjs';
fs.writeFileSync(tmpPath, tmpContent, 'utf8');
console.log('Wrote helper, running node to trace...');
const res = spawnSync('node', [tmpPath], { encoding: 'utf8' });
console.log('STDOUT:\n', (res.stdout || '').slice(0, 4000));
console.log('STDERR:\n', (res.stderr || '').slice(0, 4000));
try { fs.unlinkSync(tmpPath); } catch (e) { }
