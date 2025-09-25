import { spawn } from 'child_process';
import path from 'path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const script = path.join(repoRoot, 'reporting', 'export_report.py');

const py = process.env.PYTHON || 'python';
const outDir = process.argv[2] || path.join(repoRoot, 'reporting', 'output');

const p = spawn(py, [script, '--out-dir', outDir], { stdio: 'inherit' });

p.on('close', code => {
  process.exit(code);
});
