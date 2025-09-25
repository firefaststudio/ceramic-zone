import fetch from 'node-fetch';
import fs from 'fs';

const BASE = process.env.URL || 'http://localhost:8080';

(async () => {
  const results = [];

  // GET products
  try {
    const r = await fetch(`${BASE}/api/products`);
    const ok = r.status === 200;
    const body = await r.text();
    results.push({ test: 'get-products', ok, status: r.status, body: ok ? JSON.parse(body).length : body });
  } catch (e) {
    results.push({ test: 'get-products', ok: false, error: String(e) });
  }

  // POST checkout
  try {
    const payload = { items: [{ productId: 'p1', quantity: 2 }], email: 'test@example.com' };
    const r = await fetch(`${BASE}/api/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const ok = r.status === 201;
    const body = await r.json();
    results.push({ test: 'post-checkout', ok, status: r.status, body });
  } catch (e) {
    results.push({ test: 'post-checkout', ok: false, error: String(e) });
  }

  const out = 'smoke-api-report.json';
  fs.writeFileSync(out, JSON.stringify(results, null, 2), 'utf8');
  console.log('Wrote', out);
})();
