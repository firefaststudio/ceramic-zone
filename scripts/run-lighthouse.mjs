import lighthouse from 'lighthouse';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const chromeLauncher = require('chrome-launcher');
import fs from 'fs';

(async () => {
  const url = 'http://localhost:8080';
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });
  const opts = { port: chrome.port, output: 'html' };
  const runnerResult = await lighthouse(url, opts);
  const reportHtml = runnerResult.report;
  fs.writeFileSync('./reports/lighthouse.html', reportHtml);
  console.log('Lighthouse report written to ./reports/lighthouse.html');
  await chrome.kill();
})();
