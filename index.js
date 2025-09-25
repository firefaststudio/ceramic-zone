import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import morgan from 'morgan';
import winston from 'winston';
import { body, param, validationResult } from 'express-validator';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, 'logs/error.log'), level: 'error', maxsize: 5242880, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(__dirname, 'logs/combined.log'), maxsize: 5242880, maxFiles: 5 })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) }));
}

// Directories
const dataDir = path.join(process.cwd(), 'data');
const logsDir = path.join(process.cwd(), 'logs');

async function ensureDirectories() {
  try {
    await fsp.mkdir(dataDir, { recursive: true });
    await fsp.mkdir(logsDir, { recursive: true });
    logger.info('Data and logs directories ensured');
  } catch (error) {
    logger.error('Failed to create directories:', error);
    process.exit(1);
  }
}

// DB clients (Supabase for reads, pg Pool for transactional writes)
let supabase = null;
let pgPool = null;
async function initDbClients() {
  const { SUPABASE_URL, SUPABASE_KEY, DATABASE_URL } = process.env;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
      logger.info('Supabase client initialized');
    } catch (err) {
      logger.warn('Failed to initialize Supabase client', err?.message || err);
      supabase = null;
    }
  }
  if (process.env.DATABASE_URL) {
    try {
      pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
      // test connection
      await pgPool.query('SELECT 1');
      logger.info('Postgres pool connected');
    } catch (err) {
      logger.warn('Failed to initialize pg Pool', err?.message || err);
      pgPool = null;
    }
  }
}

// Middlewares
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Helmet security
app.use(helmet({
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === 'production' ? 100 : 1000 });
app.use('/api', limiter);

// CORS
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:8080'];
    if (allowed.includes(origin)) return cb(null, true);
    logger.warn(`CORS blocked origin: ${origin}`);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));

// Data access helpers - prefer Supabase for reads and pg Pool for transactional writes.
async function getProductsFromDb() {
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return data || [];
  }
  // fallback to file
  const productsPath = path.join(dataDir, 'products.json');
  try {
    const raw = await fsp.readFile(productsPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fsp.writeFile(productsPath, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    throw err;
  }
}

async function getProductByIdFromDb(id) {
  if (supabase) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).limit(1);
    if (error) throw error;
    return Array.isArray(data) && data.length ? data[0] : null;
  }
  const productsPath = path.join(dataDir, 'products.json');
  try {
    const raw = await fsp.readFile(productsPath, 'utf8');
    const products = JSON.parse(raw || '[]');
    return products.find(p => String(p.id) === String(id)) || null;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function createOrderDb({ email, items }) {
  // Prefer pgPool for transactional safety
  if (pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const orderId = `order_${Date.now()}`;
      const total = items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
      await client.query(
        'INSERT INTO orders(id, email, status, total, created_at, updated_at) VALUES($1,$2,$3,$4,NOW(),NOW())',
        [orderId, email, 'created', total]
      );
      for (const it of items) {
        await client.query(
          'INSERT INTO order_items(order_id, product_id, quantity, price) VALUES($1,$2,$3,$4)',
          [orderId, it.productId, it.quantity, it.price]
        );
      }
      await client.query('COMMIT');
      // return order summary
      return { id: orderId, email, items, status: 'created', total };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { });
      throw err;
    } finally {
      client.release();
    }
  }

  // If no pgPool, attempt to use Supabase client (not fully transactional) if available
  if (supabase) {
    const orderId = `order_${Date.now()}`;
    const total = items.reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0);
    const { error: orderErr } = await supabase.from('orders').insert([{ id: orderId, email, status: 'created', total }]);
    if (orderErr) throw orderErr;
    for (const it of items) {
      const { error: itemErr } = await supabase.from('order_items').insert([{ order_id: orderId, product_id: it.productId, quantity: it.quantity, price: it.price }]);
      if (itemErr) throw itemErr;
    }
    return { id: orderId, email, items, status: 'created', total };
  }

  // Fallback to file-backed orders
  const ordersPath = path.join(dataDir, 'orders.json');
  let orders = [];
  try { orders = JSON.parse(await fsp.readFile(ordersPath, 'utf8') || '[]'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const newOrder = { id: `order_${Date.now()}`, items, email, status: 'created', created_at: new Date().toISOString() };
  orders.push(newOrder);
  await fsp.writeFile(ordersPath, JSON.stringify(orders, null, 2), 'utf8');
  return newOrder;
}

// Validation middleware
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'validation_failed', details: errors.array() });
  next();
}

// Mock news
const NEWS_ITEMS = [
  { id: 'n1', title: 'Lancio della piattaforma 2.0', excerpt: 'Nuove funzionalità per affidabilità, osservabilità e scala globale.', category: 'tech', image: '/img/hero.svg', url: '#', date: '2025-08-20T09:00:00Z', views: 1280 },
  { id: 'n2', title: 'Accordo strategico con partner internazionali', excerpt: 'Espandiamo la presenza in 18 nuovi mercati con SLA locali.', category: 'business', image: '/img/logo.svg', url: '#', date: '2025-08-12T10:30:00Z', views: 890 }
];

// Routes
app.get('/api/products', async (req, res) => {
  try {
    const products = await getProductsFromDb();
    res.set({ 'Cache-Control': 'public, max-age=300', ETag: `"${Date.now()}"` });
    return res.json(products);
  } catch (err) {
    logger.error('Failed to read products', err);
    return res.status(500).json({ error: 'read_error' });
  }
});

app.get('/api/products/:id', [param('id').isString().isLength({ min: 1, max: 50 })], validateRequest, async (req, res) => {
  try {
    const p = await getProductByIdFromDb(req.params.id);
    if (!p) return res.status(404).json({ error: 'not_found' });
    return res.json(p);
  } catch (err) {
    logger.error('Failed to read product', err);
    return res.status(500).json({ error: 'read_error' });
  }
});

app.post('/api/checkout', [
  body('email').isEmail(),
  body('items').isArray({ min: 1, max: 50 }),
  body('items.*.productId').isString(),
  body('items.*.quantity').isInt({ min: 1, max: 100 })
], validateRequest, async (req, res) => {
  try {
    const { email, items } = req.body;
    // Validate requested products exist and attach current price
    for (const it of items) {
      const prod = await getProductByIdFromDb(it.productId);
      if (!prod) return res.status(400).json({ error: 'invalid_product', productId: it.productId });
      // attach price if not provided
      if (typeof it.price === 'undefined') it.price = prod.price || 0;
    }

    // create order in DB (transactional when pgPool available)
    const created = await createOrderDb({ email, items });
    return res.status(201).json({ ok: true, order: created });
  } catch (err) {
    logger.error('checkout error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.get('/api/news', (req, res) => {
  try {
    const qLimit = typeof req.query.limit !== 'undefined' ? parseInt(req.query.limit, 10) : 10;
    const qOffset = typeof req.query.offset !== 'undefined' ? parseInt(req.query.offset, 10) : 0;
    const category = typeof req.query.category !== 'undefined' ? String(req.query.category).toLowerCase() : 'all';
    const qraw = typeof req.query.q !== 'undefined' ? String(req.query.q).trim() : '';
    let items = NEWS_ITEMS.slice();
    if (qraw) {
      const needle = qraw.toLowerCase();
      items = items.filter(i => (i.title || '').toLowerCase().includes(needle) || (i.excerpt || '').toLowerCase().includes(needle));
    }
    if (category && category !== 'all') items = items.filter(i => String(i.category || '').toLowerCase() === category);
    const sort = typeof req.query.sort !== 'undefined' ? String(req.query.sort) : 'date_desc';
    if (sort === 'date_asc') items = items.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    else if (sort === 'popularity') items = items.slice().sort((a, b) => (b.views || 0) - (a.views || 0));
    else items = items.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const paginated = items.slice(qOffset, qOffset + qLimit);
    res.set({ 'Cache-Control': 'public, max-age=60', 'X-Total-Count': items.length.toString() });
    return res.json({ items: paginated, total: items.length, limit: qLimit, offset: qOffset });
  } catch (err) {
    logger.error('news error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Static and SPA fallback
const publicDir = path.join(process.cwd(), 'public');
app.get('/', (req, res, next) => {
  if (process.env.TEST_HZ === '1' || process.env.FORCE_ROOT_INDEX === '1') {
    const rootIndex = path.join(process.cwd(), 'index.html');
    if (fs.existsSync(rootIndex)) return res.sendFile(rootIndex);
  }
  return next();
});

app.use(express.static(publicDir, {
  extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '7d' : '0', setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }
}));

app.use((req, res) => {
  return res.sendFile(path.join(publicDir, 'index.html'));
});

// Start server with graceful shutdown
const PORT = process.env.PORT || 8080;
let server;

async function startServer() {
  await ensureDirectories();
  server = app.listen(PORT, () => logger.info(`Server listening on http://localhost:${PORT}`));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

async function shutdown() {
  logger.info('Shutting down server');
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('Forcing shutdown');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

startServer();
