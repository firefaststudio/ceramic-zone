#!/usr/bin/env node
// scripts/migrate-products.js
// Reads data/products.json and upserts each product into the `products` table.
// Supports Supabase client if SUPABASE_URL + SUPABASE_KEY are set, otherwise uses DATABASE_URL with `pg`.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', 'data', 'products.json');

async function readProducts() {
  const raw = await fs.readFile(dataPath, 'utf8');
  return JSON.parse(raw);
}

async function run() {
  const products = await readProducts();
  if (!Array.isArray(products)) {
    console.error('data/products.json does not contain an array');
    process.exit(1);
  }

  // Prefer Supabase client when configured
  const { SUPABASE_URL, SUPABASE_KEY, DATABASE_URL } = process.env;

  if (SUPABASE_URL && SUPABASE_KEY) {
    console.log('Using Supabase client to upsert products');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });

    for (const p of products) {
      const row = {
        id: p.id,
        name: p.name,
        description: p.description || null,
        price: p.price,
        category: p.category || null,
        stock_quantity: p.stock_quantity ?? 0,
        images: p.images ?? [],
        created_at: p.created_at || new Date().toISOString()
      };

      const { data, error } = await supabase.from('products').upsert(row, { onConflict: 'id' }).select();
      if (error) {
        console.error('Upsert error for', p.id, error.message || error);
      } else {
        console.log('Upserted', p.id);
      }
    }

    process.exit(0);
  }

  if (DATABASE_URL) {
    console.log('Using pg client (DATABASE_URL) to upsert products');
    const { Client } = await import('pg');
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    try {
      for (const p of products) {
        const imagesJson = JSON.stringify(p.images ?? []);
        const query = `
          INSERT INTO products(id, name, description, price, category, stock_quantity, images, created_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            category = EXCLUDED.category,
            stock_quantity = EXCLUDED.stock_quantity,
            images = EXCLUDED.images,
            created_at = EXCLUDED.created_at
        `;

        const values = [p.id, p.name, p.description ?? null, p.price, p.category ?? null, p.stock_quantity ?? 0, imagesJson, p.created_at ?? new Date().toISOString()];
        await client.query(query, values);
        console.log('Upserted', p.id);
      }
    } catch (err) {
      console.error('Error during migration', err);
      process.exitCode = 2;
    } finally {
      await client.end();
    }

    process.exit(0);
  }

  console.error('No SUPABASE_URL+SUPABASE_KEY or DATABASE_URL found in environment. Aborting.');
  process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
