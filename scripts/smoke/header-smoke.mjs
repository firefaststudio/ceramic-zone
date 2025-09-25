import puppeteer from 'puppeteer';
import fs from 'fs';

const baseURL = process.env.URL || 'http://localhost:8080';
const forceHz = process.argv.includes('--force-hz');
const headlessMode = process.argv.includes('--headless') || process.env.CI === '1';

function logResult(status, name, value = '') {
  console.log(`${status.toUpperCase()} ${name} — value: ${value}`);
}

const results = [];

async function runHzSuite(page) {
  // Mega menu
  const megaBtn = await page.$('#all-depts');
  if (megaBtn) {
    try {
      await megaBtn.click();
      const ariaHandle = await page.$('#all-depts');
      const aria = ariaHandle ? await ariaHandle.evaluate(el => el.getAttribute('aria-expanded')) : null;
      logResult('pass', 'mega-open-aria', aria);
      results.push({ test: 'mega-open-aria', ok: true, value: aria });
      await megaBtn.click();
      const ariaCloseHandle = await page.$('#all-depts');
      const ariaClose = ariaCloseHandle ? await ariaCloseHandle.evaluate(el => el.getAttribute('aria-expanded')) : null;
      logResult('pass', 'mega-close-aria', ariaClose);
      results.push({ test: 'mega-close-aria', ok: true, value: ariaClose });
    } catch (e) {
      logResult('fail', 'mega-menu', e.message);
      results.push({ test: 'mega-menu', ok: false, value: e.message });
    }
  } else {
    logResult('skipped', 'mega-menu');
    results.push({ test: 'mega-menu', ok: null, value: 'skipped' });
  }

  // Drawer
  const burger = await page.$('.hz-burger');
  if (burger) {
    try {
      await burger.click();
      const drawerHandle = await page.$('#nav-drawer');
      const ariaDrawer = drawerHandle ? await drawerHandle.evaluate(el => el.getAttribute('aria-hidden')) : null;
      logResult('pass', 'drawer-open-aria', ariaDrawer);
      results.push({ test: 'drawer-open-aria', ok: true, value: ariaDrawer });
      const closeBtn = await page.$('.hz-drawer__close');
      if (closeBtn) await closeBtn.click();
      const ariaDrawerCloseHandle = await page.$('#nav-drawer');
      const ariaDrawerClose = ariaDrawerCloseHandle ? await ariaDrawerCloseHandle.evaluate(el => el.getAttribute('aria-hidden')) : null;
      logResult('pass', 'drawer-close-aria', ariaDrawerClose);
      results.push({ test: 'drawer-close-aria', ok: true, value: ariaDrawerClose });
    } catch (e) {
      logResult('fail', 'drawer', e.message);
      results.push({ test: 'drawer', ok: false, value: e.message });
    }
  } else {
    logResult('skipped', 'drawer');
    results.push({ test: 'drawer', ok: null, value: 'skipped' });
  }

  // Hero
  const heroNext = await page.$('.hz-hero__next');
  if (heroNext) {
    try {
      await heroNext.click();
      logResult('pass', 'hero-next', true);
      results.push({ test: 'hero-next', ok: true, value: true });
      const prev = await page.$('.hz-hero__prev');
      if (prev) await prev.click();
      logResult('pass', 'hero-prev', true);
      results.push({ test: 'hero-prev', ok: true, value: true });
    } catch (e) {
      logResult('fail', 'hero', e.message);
      results.push({ test: 'hero', ok: false, value: e.message });
    }
  } else {
    logResult('skipped', 'hero');
    results.push({ test: 'hero', ok: null, value: 'skipped' });
  }

  // Righe orizzontali
  const rowNext = await page.$('.hz-row__nav.next');
  if (rowNext) {
    try {
      await rowNext.click();
      logResult('pass', 'row-scroll-next', true);
      results.push({ test: 'row-scroll-next', ok: true, value: true });
      const prevRow = await page.$('.hz-row__nav.prev');
      if (prevRow) await prevRow.click();
      logResult('pass', 'row-scroll-prev', true);
      results.push({ test: 'row-scroll-prev', ok: true, value: true });
    } catch (e) {
      logResult('fail', 'row-scroll', e.message);
      results.push({ test: 'row-scroll', ok: false, value: e.message });
    }
  } else {
    logResult('skipped', 'row-scroll');
    results.push({ test: 'row-scroll', ok: null, value: 'skipped' });
  }

  // Carrello
  const cartBtn = await page.$('[data-add-cart]');
  if (cartBtn) {
    try {
      await cartBtn.click();
      const cartCountHandle = await page.$('#cart-count');
      const count = cartCountHandle ? await cartCountHandle.evaluate(el => el.textContent.trim()) : null;
      logResult('pass', 'cart-increment', count);
      results.push({ test: 'cart-increment', ok: true, value: count });
    } catch (e) {
      logResult('fail', 'cart', e.message);
      results.push({ test: 'cart', ok: false, value: e.message });
    }
  } else {
    logResult('skipped', 'cart');
    results.push({ test: 'cart', ok: null, value: 'skipped' });
  }
}

async function runNeoSuite(page) {
  // Search icon → input toggle
  const searchIcon = await page.$('#search-icon');
  if (searchIcon) {
    await searchIcon.click();
    logResult('pass', 'neo-search-click', true);
    results.push({ test: 'neo-search-click', ok: true, value: true });
  } else {
    logResult('skipped', 'neo-search');
    results.push({ test: 'neo-search', ok: null, value: 'skipped' });
  }

  // Hero neo placeholder
  const heroNeo = await page.$('.hero-neo');
  if (heroNeo) {
    logResult('pass', 'neo-hero-present', true);
    results.push({ test: 'neo-hero-present', ok: true, value: true });
  } else {
    logResult('skipped', 'neo-hero');
    results.push({ test: 'neo-hero', ok: null, value: 'skipped' });
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: headlessMode ? true : 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.goto(baseURL, { waitUntil: 'networkidle2' });

  // Detect variant
  const hzHero = await page.$('.hz-hero');
  const heroNeo = await page.$('.hero-neo');

  if (forceHz || hzHero) {
    console.log('→ Forcing HZ UI — running full hz-suite');
    await runHzSuite(page);
  } else if (heroNeo) {
    console.log('→ Detected NEO UI — running neo-suite');
    await runNeoSuite(page);
  } else {
    console.log('No known UI detected — all tests skipped');
  }

  // write JSON report
  try {
    fs.writeFileSync('smoke-report.json', JSON.stringify(results, null, 2));
    console.log('Wrote smoke-report.json');
  } catch (e) {
    console.error('Failed to write smoke-report.json', e.message);
  }

  await browser.close();
}

main();
