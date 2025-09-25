import fs from 'fs';
import net from 'net';
import puppeteer from 'puppeteer';

function waitForPort(host, port, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout waiting for port'));
        setTimeout(tryConnect, 250);
      });
      socket.once('timeout', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout waiting for port'));
        setTimeout(tryConnect, 250);
      });
      socket.connect(port, host, () => {
        socket.end();
        resolve();
      });
    };
    tryConnect();
  });
}

async function runTest(url) {
  // Use headful + extra flags to avoid sandbox/network oddities on some Windows CI environments
  const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];
  const browser = await puppeteer.launch({ headless: false, args: launchArgs });
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    console.log('→ Opening', url);
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.waitForSelector('#search-icon');
    await page.waitForSelector('#search-input');

    const results = [];

    // Initial state
    const initialExpanded = await page.$eval('#search-icon', el => el.getAttribute('aria-expanded'));
    results.push({ test: 'initial-aria', ok: initialExpanded === 'false', value: initialExpanded });

    // Click to open
    await page.click('#search-icon');
    await sleep(150);
    const afterClickExpanded = await page.$eval('#search-icon', el => el.getAttribute('aria-expanded'));
    const inputHasActive = await page.$eval('#search-input', el => el.classList.contains('active'));
    results.push({ test: 'click-open-aria', ok: afterClickExpanded === 'true', value: afterClickExpanded });
    results.push({ test: 'click-open-class', ok: inputHasActive === true, value: inputHasActive });

    // Press Escape to close
    await page.keyboard.press('Escape');
    await sleep(150);
    const afterEscExpanded = await page.$eval('#search-icon', el => el.getAttribute('aria-expanded'));
    const inputHasActiveAfterEsc = await page.$eval('#search-input', el => el.classList.contains('active'));
    results.push({ test: 'escape-close-aria', ok: afterEscExpanded === 'false', value: afterEscExpanded });
    results.push({ test: 'escape-close-class', ok: inputHasActiveAfterEsc === false, value: inputHasActiveAfterEsc });

    // Keyboard open via Enter on toggle
    await page.focus('#search-icon');
    await page.keyboard.press('Enter');
    await sleep(150);
    const afterKeyOpen = await page.$eval('#search-icon', el => el.getAttribute('aria-expanded'));
    results.push({ test: 'keyboard-open-aria', ok: afterKeyOpen === 'true', value: afterKeyOpen });

    // Click outside to close (click body)
    await page.click('body', { offset: { x: 1, y: 1 } }).catch(() => { });
    await sleep(150);
    const afterOutside = await page.$eval('#search-icon', el => el.getAttribute('aria-expanded'));
    results.push({ test: 'outside-click-close-aria', ok: afterOutside === 'false', value: afterOutside });

    // Print results
    console.log('--- Smoke test results ---');
    let allPass = true;
    for (const r of results) {
      console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.test} — value: ${r.value}`);
      if (!r.ok) allPass = false;
    }

    await browser.close();
    if (!allPass) process.exitCode = 2;
    else process.exitCode = 0;
  } catch (err) {
    console.error('Error during smoke test:', err);
    await browser.close();
    process.exitCode = 3;
  }
}

async function main() {
  const url = process.env.URL || 'http://localhost:8080/';
  const u = new URL(url);
  const host = u.hostname === 'localhost' ? '127.0.0.1' : u.hostname;
  const port = parseInt(u.port || '80', 10) || 80;

  process.stdout.write(`Waiting for ${host}:${port}...\n`);
  try {
    await waitForPort(host, port, 20000);
  } catch (err) {
    console.error('Port wait timeout:', err.message);
    process.exitCode = 4;
    return;
  }

  await runTest(url);
}

main();
