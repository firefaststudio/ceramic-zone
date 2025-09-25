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

    // Mega-menu: #all-depts -> #mega-depts
    try {
      await page.waitForSelector('#all-depts', { timeout: 2000 });
      await page.waitForSelector('#mega-depts', { timeout: 2000 });
      const before = await page.$eval('#all-depts', el => el.getAttribute('aria-expanded'));
      results.push({ test: 'mega-initial-aria', ok: before === 'false', value: before });
      await page.click('#all-depts');
      await sleep(200);
      const afterOpen = await page.$eval('#all-depts', el => el.getAttribute('aria-expanded'));
      const panelHidden = await page.$eval('#mega-depts', el => el.hasAttribute('hidden'));
      results.push({ test: 'mega-open-aria', ok: afterOpen === 'true', value: afterOpen });
      results.push({ test: 'mega-panel-visible', ok: panelHidden === false, value: `hidden=${panelHidden}` });
      // close
      await page.click('#all-depts');
      await sleep(150);
      const afterClose = await page.$eval('#all-depts', el => el.getAttribute('aria-expanded'));
      results.push({ test: 'mega-close-aria', ok: afterClose === 'false', value: afterClose });
    } catch (e) {
      results.push({ test: 'mega-menu', ok: false, value: String(e.message) });
    }

    // Drawer mobile: .hz-burger -> #nav-drawer, .hz-drawer__close, .hz-drawer__backdrop
    try {
      await page.waitForSelector('.hz-burger', { timeout: 2000 });
      await page.waitForSelector('#nav-drawer', { timeout: 2000 });
      await page.click('.hz-burger');
      await sleep(300);
      const drawerOpen = await page.$eval('#nav-drawer', el => el.classList.contains('open') || el.getAttribute('aria-hidden') === 'false');
      results.push({ test: 'drawer-open', ok: drawerOpen === true, value: drawerOpen });
      if (await page.$('.hz-drawer__close')) {
        await page.click('.hz-drawer__close');
        await sleep(150);
        const drawerClosed = await page.$eval('#nav-drawer', el => !(el.classList.contains('open')) && el.getAttribute('aria-hidden') === 'true');
        results.push({ test: 'drawer-close', ok: drawerClosed === true, value: drawerClosed });
      } else if (await page.$('.hz-drawer__backdrop')) {
        await page.click('.hz-drawer__backdrop');
        await sleep(150);
        const drawerClosed = await page.$eval('#nav-drawer', el => !(el.classList.contains('open')));
        results.push({ test: 'drawer-close', ok: drawerClosed === true, value: drawerClosed });
      } else {
        results.push({ test: 'drawer-close', ok: false, value: 'no close/backdrop selector' });
      }
    } catch (e) {
      results.push({ test: 'drawer', ok: false, value: String(e.message) });
    }

    // Hero carousel: .hz-hero, .hz-hero__next, .hz-hero__prev, .hz-hero__dots
    try {
      await page.waitForSelector('.hz-hero', { timeout: 2000 });
      const getActiveIndex = async () => page.$$eval('.hz-hero__slide', slides => slides.findIndex(s => s.classList.contains('is-active') || s.classList.contains('active')));
      const beforeIndex = await getActiveIndex();
      if (await page.$('.hz-hero__next')) {
        await page.click('.hz-hero__next');
        await sleep(300);
        const afterNext = await getActiveIndex();
        results.push({ test: 'hero-next-changed', ok: afterNext !== beforeIndex, value: `${beforeIndex}→${afterNext}` });
        if (await page.$('.hz-hero__prev')) {
          await page.click('.hz-hero__prev');
          await sleep(300);
          const afterPrev = await getActiveIndex();
          results.push({ test: 'hero-prev-return', ok: afterPrev === beforeIndex, value: `${afterPrev}` });
        }
      }
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

    // Rows horizontal: .hz-row__viewport[data-row] with .hz-row__nav.next / .prev and .hz-row__track
    try {
      const viewport = await page.$('.hz-row__viewport[data-row]');
      if (viewport) {
        const nextBtn = await viewport.$('.hz-row__nav.next');
        const prevBtn = await viewport.$('.hz-row__nav.prev');
        const track = await viewport.$('.hz-row__track');
        const evaluateScroll = async () => {
          if (!track) return 0;
          return await page.evaluate(el => el.scrollLeft || 0, track);
        };
        const before = await evaluateScroll();
        if (nextBtn) {
          await nextBtn.click();
          await sleep(300);
          const after = await evaluateScroll();
          results.push({ test: 'row-scroll-next', ok: after > before, value: `${before}→${after}` });
          if (prevBtn) {
            await prevBtn.click();
            await sleep(300);
            const afterPrev = await evaluateScroll();
            results.push({ test: 'row-scroll-prev', ok: afterPrev <= before, value: `${afterPrev}` });
          }
        } else {
          results.push({ test: 'row-scroll', ok: false, value: 'no next button' });
        }
      } else {
        results.push({ test: 'row-scroll', ok: false, value: 'no viewport' });
      }
    } catch (e) {
      results.push({ test: 'row-scroll', ok: false, value: String(e.message) });
    }

    // Cart counter: [data-add-cart] buttons and #cart-count
    try {
      const addBtn = await page.$('[data-add-cart]');
      const cartEl = await page.$('#cart-count');
      if (addBtn && cartEl) {
        const before = await page.$eval('#cart-count', el => parseInt(el.textContent || '0', 10));
        await addBtn.click();
        await sleep(250);
        const after = await page.$eval('#cart-count', el => parseInt(el.textContent || '0', 10));
        results.push({ test: 'cart-increment', ok: after > before, value: `${before}→${after}` });
      } else {
        results.push({ test: 'cart-increment', ok: false, value: 'selectors missing' });
      }
    } catch (e) {
      results.push({ test: 'cart-increment', ok: false, value: String(e.message) });
    }

    // Print results
    console.log('--- header-smoke-upd results ---');
    let allPass = true;
    for (const r of results) {
      console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.test} — value: ${r.value}`);
      if (!r.ok) allPass = false;
    }

    await browser.close();
    process.exitCode = allPass ? 0 : 2;
  } catch (err) {
    console.error('Error during header-smoke-upd:', err);
    await browser.close();
    process.exitCode = 3;
  }
}

run();
