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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
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

  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);

  const results = [];

  try {
    console.log('→ Opening', url);
    await page.goto(url, { waitUntil: 'networkidle2' });
    await sleep(300);

    // 1) Mega-menu open/close (assumes toggle #all-depts -> panel #mega-depts)
    try {
      await page.waitForSelector('#all-depts', { timeout: 2000 });
      await page.waitForSelector('#mega-depts', { timeout: 2000 });
      const before = await page.$eval('#all-depts', el => el.getAttribute('aria-expanded'));
      results.push({ test: 'mega-initial-aria', ok: before === 'false', value: before });
      await page.click('#all-depts');
      await sleep(200);
      const afterOpen = await page.$eval('#all-depts', el => el.getAttribute('aria-expanded'));
      const panelVisible = await page.$eval('#mega-depts', el => el.getAttribute('aria-hidden') === 'false' || el.classList.contains('open'));
      results.push({ test: 'mega-open-aria', ok: afterOpen === 'true', value: afterOpen });
      results.push({ test: 'mega-panel-visible', ok: panelVisible === true, value: panelVisible });
      // close
      await page.click('#all-depts');
      await sleep(150);
      const afterClose = await page.$eval('#all-depts', el => el.getAttribute('aria-expanded'));
      results.push({ test: 'mega-close-aria', ok: afterClose === 'false', value: afterClose });
    } catch (e) {
      results.push({ test: 'mega-menu', ok: false, value: String(e.message) });
    }

    // 2) Drawer mobile open/close (assumes .hz-burger opens #nav-drawer and .hz-drawer__close closes it)
    try {
      await page.waitForSelector('.hz-burger', { timeout: 2000 });
      await page.waitForSelector('#nav-drawer', { timeout: 2000 });
      // open
      await page.click('.hz-burger');
      await sleep(300);
      const drawerOpen = await page.$eval('#nav-drawer', el => el.classList.contains('open') || el.getAttribute('aria-hidden') === 'false');
      results.push({ test: 'drawer-open', ok: drawerOpen === true, value: drawerOpen });
      // close via close button if present
      const closeSel = '.hz-drawer__close';
      if (await page.$(closeSel)) {
        await page.click(closeSel);
        await sleep(150);
        const drawerClosed = await page.$eval('#nav-drawer', el => !(el.classList.contains('open')) && (el.getAttribute('aria-hidden') === 'true'));
        results.push({ test: 'drawer-close', ok: drawerClosed === true, value: drawerClosed });
      } else {
        // fallback: click backdrop
        await page.click('#nav-drawer .hz-drawer__backdrop').catch(() => { });
        await sleep(150);
        const drawerClosed = await page.$eval('#nav-drawer', el => !(el.classList.contains('open')));
        results.push({ test: 'drawer-close', ok: drawerClosed === true, value: drawerClosed });
      }
    } catch (e) {
      results.push({ test: 'drawer', ok: false, value: String(e.message) });
    }

    // 3) Hero carousel (next/prev/dots). Assumes selectors .hz-hero__next, .hz-hero__prev, .hz-hero__dots button
    try {
      await page.waitForSelector('.hz-hero', { timeout: 2000 });
      const getActiveIndex = async () => {
        return await page.$$eval('.hz-hero__slide', slides => slides.findIndex(s => s.classList.contains('active')));
      };
      const beforeIndex = await getActiveIndex();
      // click next
      if (await page.$('.hz-hero__next')) {
        await page.click('.hz-hero__next');
        await sleep(300);
        const afterNext = await getActiveIndex();
        results.push({ test: 'hero-next-changed', ok: afterNext !== beforeIndex, value: `${beforeIndex}→${afterNext}` });
        // prev
        if (await page.$('.hz-hero__prev')) {
          await page.click('.hz-hero__prev');
          await sleep(300);
          const afterPrev = await getActiveIndex();
          results.push({ test: 'hero-prev-return', ok: afterPrev === beforeIndex, value: `${afterPrev}` });
        }
      }
      // dots
      if (await page.$('.hz-hero__dots button')) {
        const dots = await page.$$('.hz-hero__dots button');
        if (dots.length > 1) {
          await dots[1].click();
          await sleep(300);
          const afterDot = await getActiveIndex();
          results.push({ test: 'hero-dot-change', ok: afterDot === 1, value: `${afterDot}` });
        }
      }
    } catch (e) {
      results.push({ test: 'hero-carousel', ok: false, value: String(e.message) });
    }

    // 4) Horizontal rows scroll arrows (assumes [data-row] container with .hz-row__nav.next and .hz-row__nav.prev)
    try {
      const row = await page.$('[data-row]');
      if (row) {
        const container = await row.$('.hz-row__list') || row;
        const beforeScroll = await page.evaluate(el => el.scrollLeft || 0, container);
        // click next arrow
        if (await row.$('.hz-row__nav.next')) {
          await row.click('.hz-row__nav.next');
          await sleep(300);
          const afterScroll = await page.evaluate(el => el.scrollLeft || 0, container);
          results.push({ test: 'row-scroll-next', ok: afterScroll > beforeScroll, value: `${beforeScroll}→${afterScroll}` });
          // click prev
          if (await row.$('.hz-row__nav.prev')) {
            await row.click('.hz-row__nav.prev');
            await sleep(300);
            const afterPrevScroll = await page.evaluate(el => el.scrollLeft || 0, container);
            results.push({ test: 'row-scroll-prev', ok: afterPrevScroll <= beforeScroll, value: `${afterPrevScroll}` });
          }
        }
      } else {
        results.push({ test: 'row-scroll', ok: false, value: 'no [data-row] found' });
      }
    } catch (e) {
      results.push({ test: 'row-scroll', ok: false, value: String(e.message) });
    }

    // 5) Cart counter (assumes elements [data-add-cart] and #cart-count)
    try {
      if (await page.$('[data-add-cart]') && await page.$('#cart-count')) {
        const before = await page.$eval('#cart-count', el => parseInt(el.textContent || '0', 10));
        await page.click('[data-add-cart]');
        await sleep(200);
        const after = await page.$eval('#cart-count', el => parseInt(el.textContent || '0', 10));
        results.push({ test: 'cart-increment', ok: after > before, value: `${before}→${after}` });
      } else {
        results.push({ test: 'cart-increment', ok: false, value: 'selectors missing' });
      }
    } catch (e) {
      results.push({ test: 'cart-increment', ok: false, value: String(e.message) });
    }

    // Print results
    console.log('--- Extended Smoke test results ---');
    let allPass = true;
    for (const r of results) {
      console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.test} — value: ${r.value}`);
      if (!r.ok) allPass = false;
    }

    await browser.close();
    if (!allPass) process.exitCode = 2; else process.exitCode = 0;
  } catch (err) {
    console.error('Error during extended smoke test:', err);
    await browser.close();
    process.exitCode = 3;
  }
}

run();
