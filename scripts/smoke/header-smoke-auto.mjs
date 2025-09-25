import net from 'net';
import puppeteer from 'puppeteer';

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

const candidates = {
  megaToggle: ['#all-depts', '[data-mega-toggle]', '.mega-toggle'],
  megaPanel: ['#mega-depts', '.hz-mega', '[data-mega]'],
  burger: ['.hz-burger', '.burger', '#burger'],
  drawer: ['#nav-drawer', '.hz-drawer', '.drawer'],
  drawerClose: ['.hz-drawer__close', '.drawer-close', '.hz-drawer__backdrop'],
  hero: ['.hz-hero', '.hero-neo', '[data-carousel]', '.carousel'],
  heroNext: ['.hz-hero__next', '.hero-next', '.carousel-next'],
  heroPrev: ['.hz-hero__prev', '.hero-prev', '.carousel-prev'],
  heroDots: ['.hz-hero__dots button', '.hero-dots button', '.hz-hero__dots button'],
  rowViewport: ['.hz-row__viewport[data-row]', '[data-row]', '.row-viewport'],
  rowTrack: ['.hz-row__track', '.hz-row__list', '.hz-row__track'],
  rowNext: ['.hz-row__nav.next', '.row-next', '.hz-row__nav.next'],
  rowPrev: ['.hz-row__nav.prev', '.row-prev', '.hz-row__nav.prev'],
  addCart: ['[data-add-cart]', '.add-to-cart', '.hz-btn[data-add-cart]'],
  cartCount: ['#cart-count', '.hz-cart__count', '.cart-count']
};

async function pickSelector(page, list) {
  for (const sel of list) {
    try {
      if (await page.$(sel)) return sel;
    } catch (e) {
      // ignore invalid selectors
    }
  }
  return null;
}

async function run() {
  const url = process.env.URL || 'http://localhost:8080/';
  const u = new URL(url);
  const host = u.hostname === 'localhost' ? '127.0.0.1' : u.hostname;
  const port = parseInt(u.port || '80', 10) || 80;

  process.stdout.write(`Waiting for ${host}:${port}...\n`);
  try { await waitForPort(host, port, 20000); } catch (e) { console.error('Port wait timeout'); process.exitCode = 4; return; }

  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);

  const results = [];
  const used = {};

  try {
    console.log('→ Opening', url);
    await page.goto(url, { waitUntil: 'networkidle2' });
    await sleep(300);

    // detect selectors
    for (const k of Object.keys(candidates)) {
      used[k] = await pickSelector(page, candidates[k]);
    }

    console.log('Detected selectors:', used);

    // Mega menu
    if (used.megaToggle && used.megaPanel) {
      try {
        const before = await page.$eval(used.megaToggle, el => el.getAttribute('aria-expanded'));
        results.push({ test: 'mega-initial-aria', ok: before === 'false', value: before });
        await page.click(used.megaToggle);
        await sleep(200);
        const afterOpen = await page.$eval(used.megaToggle, el => el.getAttribute('aria-expanded'));
        const panelHidden = await page.$eval(used.megaPanel, el => el.hasAttribute('hidden'));
        results.push({ test: 'mega-open-aria', ok: afterOpen === 'true', value: afterOpen });
        results.push({ test: 'mega-panel-visible', ok: panelHidden === false, value: `hidden=${panelHidden}` });
        await page.click(used.megaToggle); await sleep(150);
        const afterClose = await page.$eval(used.megaToggle, el => el.getAttribute('aria-expanded'));
        results.push({ test: 'mega-close-aria', ok: afterClose === 'false', value: afterClose });
      } catch (e) { results.push({ test: 'mega-menu', ok: false, value: String(e.message) }); }
    } else {
      results.push({ test: 'mega-menu', ok: false, value: 'not found' });
    }

    // Drawer
    if (used.burger && used.drawer) {
      try {
        await page.click(used.burger); await sleep(300);
        const drawerOpen = await page.$eval(used.drawer, el => el.classList.contains('open') || el.getAttribute('aria-hidden') === 'false');
        results.push({ test: 'drawer-open', ok: drawerOpen === true, value: drawerOpen });
        const closeSel = used.drawerClose;
        if (closeSel && await page.$(closeSel)) {
          await page.click(closeSel); await sleep(150);
          const closed = await page.$eval(used.drawer, el => !(el.classList.contains('open')) && el.getAttribute('aria-hidden') === 'true');
          results.push({ test: 'drawer-close', ok: closed === true, value: closed });
        } else {
          results.push({ test: 'drawer-close', ok: false, value: 'no close/backdrop' });
        }
      } catch (e) { results.push({ test: 'drawer', ok: false, value: String(e.message) }); }
    } else {
      results.push({ test: 'drawer', ok: false, value: 'not found' });
    }

    // Hero
    if (used.hero) {
      try {
        const getActive = async () => await page.$$eval((used.hero + '.__slide') || '.hz-hero__slide', slides => slides.findIndex(s => s.classList.contains('is-active') || s.classList.contains('active'))).catch(() => -1);
        // Prefer the hz selectors if present
        const slideSel = '.hz-hero__slide';
        const activeIndex = await page.$$eval(slideSel, slides => slides.findIndex(s => s.classList.contains('is-active') || s.classList.contains('active'))).catch(() => -1);
        let beforeIndex = activeIndex;
        if (beforeIndex === -1) {
          // try alternative slides
          beforeIndex = await page.$$eval('.hero-neo__slide', slides => slides.findIndex(s => s.classList.contains('is-active') || s.classList.contains('active'))).catch(() => -1);
        }
        if (await pickSelector(page, candidates.heroNext)) {
          const nextSel = await pickSelector(page, candidates.heroNext);
          await page.click(nextSel); await sleep(300);
          const afterNext = await page.$$eval('.hz-hero__slide', slides => slides.findIndex(s => s.classList.contains('is-active') || s.classList.contains('active'))).catch(() => -1);
          results.push({ test: 'hero-next-changed', ok: (afterNext !== beforeIndex && afterNext !== -1), value: `${beforeIndex}→${afterNext}` });
        } else {
          results.push({ test: 'hero-next-changed', ok: false, value: 'no next control' });
        }
      } catch (e) { results.push({ test: 'hero-carousel', ok: false, value: String(e.message) }); }
    } else {
      results.push({ test: 'hero-carousel', ok: false, value: 'not found' });
    }

    // Rows
    if (used.rowViewport) {
      try {
        const viewport = await page.$(used.rowViewport);
        const track = await (viewport.$('.hz-row__track').catch(() => null) || viewport.$('.hz-row__track'));
        const nextBtn = await viewport.$('.hz-row__nav.next');
        const prevBtn = await viewport.$('.hz-row__nav.prev');
        const evalScroll = async () => track ? await page.evaluate(el => el.scrollLeft || 0, track) : 0;
        const before = await evalScroll();
        if (nextBtn) { await nextBtn.click(); await sleep(300); const after = await evalScroll(); results.push({ test: 'row-scroll-next', ok: after > before, value: `${before}→${after}` }); if (prevBtn) { await prevBtn.click(); await sleep(300); const afterPrev = await evalScroll(); results.push({ test: 'row-scroll-prev', ok: afterPrev <= before, value: `${afterPrev}` }); } } else { results.push({ test: 'row-scroll', ok: false, value: 'no next' }); }
      } catch (e) { results.push({ test: 'row-scroll', ok: false, value: String(e.message) }); }
    } else {
      results.push({ test: 'row-scroll', ok: false, value: 'not found' });
    }

    // Cart
    if (used.addCart && used.cartCount) {
      try {
        const before = await page.$eval(used.cartCount, el => parseInt(el.textContent || '0', 10));
        await page.click(used.addCart); await sleep(200);
        const after = await page.$eval(used.cartCount, el => parseInt(el.textContent || '0', 10));
        results.push({ test: 'cart-increment', ok: after > before, value: `${before}→${after}` });
      } catch (e) { results.push({ test: 'cart-increment', ok: false, value: String(e.message) }); }
    } else {
      results.push({ test: 'cart-increment', ok: false, value: 'not found' });
    }

    // Print
    console.log('--- header-smoke-auto results ---');
    let allPass = true;
    for (const r of results) { console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.test} — value: ${r.value}`); if (!r.ok) allPass = false; }
    await browser.close();
    process.exitCode = allPass ? 0 : 2;
  } catch (err) {
    console.error('Error during header-smoke-auto:', err);
    await browser.close();
    process.exitCode = 3;
  }
}

run();
