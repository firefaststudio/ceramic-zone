import fs from 'fs';
import puppeteer from 'puppeteer';

(async function () {
  const outDir = 'tools';
  const url = 'http://localhost:8080/';
  const logs = [];
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    page.on('console', msg => {
      try {
        const location = msg.location && msg.location.url ? `${msg.location.url}:${msg.location.lineNumber || 0}` : '';
        logs.push({ kind: 'console', level: msg.type(), text: msg.text(), location });
      } catch (e) { }
    });

    page.on('pageerror', err => {
      logs.push({ kind: 'pageerror', message: err.message, stack: err.stack });
    });

    page.on('requestfailed', req => {
      const failure = req.failure && req.failure().errorText ? req.failure().errorText : null;
      logs.push({ kind: 'requestfailed', url: req.url(), method: req.method(), failure });
    });

    page.on('response', resp => {
      try {
        if (resp.status() === 404) {
          logs.push({ kind: 'response-404', url: resp.url(), status: resp.status() });
        }
      } catch (e) { }
    });

    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    // wait a bit for any late scripts (use compatible API across puppeteer versions)
    if (typeof page.waitForTimeout === 'function') {
      await page.waitForTimeout(2000);
    } else if (typeof page.waitFor === 'function') {
      await page.waitFor(2000);
    } else {
      await new Promise(r => setTimeout(r, 2000));
    }

    // screenshot
    const ssPath = `${outDir}/home-screenshot.png`;
    await page.screenshot({ path: ssPath, fullPage: true });
    logs.push({ kind: 'screenshot', path: ssPath });

    await browser.close();

    fs.writeFileSync(`${outDir}/console-log.json`, JSON.stringify(logs, null, 2));
    console.log('OK - logs written to tools/console-log.json and screenshot saved to ' + ssPath);
  } catch (err) {
    console.error('ERROR', err && err.message);
    try { fs.writeFileSync(`${outDir}/console-log.json`, JSON.stringify(logs, null, 2)); } catch (e) { }
    process.exit(1);
  }
})();
