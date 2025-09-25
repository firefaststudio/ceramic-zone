import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const OUT_DIR = path.join(process.cwd(), 'artifacts');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const url = process.env.URL || 'http://localhost:8080';

const selectors = {
  hz: [
    '.hz-header',
    '#all-depts',
    '#mega-depts',
    '.hz-burger',
    '#nav-drawer',
    '#cart-count',
    '[data-row]',
    '[data-add-cart]'
  ],
  neo: [
    '.hero-neo',
    '#search-icon',
    '#neonParticles'
  ]
};

async function checkSelectors(page, list) {
  const results = {};
  for (const sel of list) {
    try {
      const found = await page.$(sel) !== null;
      results[sel] = !!found;
    } catch (e) {
      results[sel] = false;
    }
  }
  return results;
}

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  // Desktop
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
  const desktopShot = path.join(OUT_DIR, 'visual-desktop.png');
  await page.screenshot({ path: desktopShot, fullPage: true });
  const desktopHtml = await page.content();
  fs.writeFileSync(path.join(OUT_DIR, 'html-desktop.html'), desktopHtml, 'utf8');

  const desktopHz = await checkSelectors(page, selectors.hz);
  const desktopNeo = await checkSelectors(page, selectors.neo);

  // Mobile (emulate by viewport)
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
  const mobileShot = path.join(OUT_DIR, 'visual-mobile.png');
  await page.screenshot({ path: mobileShot, fullPage: true });
  const mobileHtml = await page.content();
  fs.writeFileSync(path.join(OUT_DIR, 'html-mobile.html'), mobileHtml, 'utf8');

  const mobileHz = await checkSelectors(page, selectors.hz);
  const mobileNeo = await checkSelectors(page, selectors.neo);

  const report = {
    url,
    timestamp: new Date().toISOString(),
    desktop: {
      viewport: { width: 1280, height: 900 },
      screenshots: desktopShot,
      html: path.join(OUT_DIR, 'html-desktop.html'),
      hz: desktopHz,
      neo: desktopNeo
    },
    mobile: {
      viewport: { width: 375, height: 812 },
      screenshots: mobileShot,
      html: path.join(OUT_DIR, 'html-mobile.html'),
      hz: mobileHz,
      neo: mobileNeo
    }
  };

  const outJson = path.join(OUT_DIR, 'visual-report.json');
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');

  console.log('Wrote:', outJson);
  console.log('Desktop screenshot:', desktopShot);
  console.log('Mobile screenshot:', mobileShot);

  await browser.close();
})();
