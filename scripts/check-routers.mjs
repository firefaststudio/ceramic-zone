import url from 'url';
import path from 'path';

const base = path.dirname(url.fileURLToPath(import.meta.url)) + '..';
const routers = [
  new URL('../routes/products.js', import.meta.url).pathname,
  new URL('../routes/products-express.js', import.meta.url).pathname,
  new URL('../routes/orders.js', import.meta.url).pathname,
  new URL('../routes/reviews.js', import.meta.url).pathname,
  new URL('../routes/checkout.js', import.meta.url).pathname,
  new URL('../routes/auth.js', import.meta.url).pathname,
  new URL('../routes/search.js', import.meta.url).pathname,
  new URL('../routes/admin-pdf.js', import.meta.url).pathname
];

(async () => {
  for (const p of routers) {
    try {
      console.log('Importing', p);
      const mod = await import(p);
      console.log('Imported OK:', p);
      const r = mod.default;
      if (!r) {
        console.log('No default export');
        continue;
      }
      if (r.stack) {
        console.log('Routes:', r.stack.map(s => s.route && s.route.path).filter(Boolean));
      } else {
        console.log('Router has no stack property');
      }
    } catch (e) {
      console.error('ERROR importing', p, e && e.stack ? e.stack.split('\n')[0] : e);
    }
  }
})();
