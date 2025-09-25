import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL or SUPABASE_ANON_KEY not set in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function norm(s) {
  return (s || '').toString().trim().toLowerCase();
}

async function main() {
  console.log('Fetching categories...');
  const { data: categories, error: catErr } = await supabase.from('categories').select('id,name,slug');
  if (catErr) {
    console.error('Failed to fetch categories:', catErr.message || catErr);
    process.exit(1);
  }
  const catMap = new Map();
  for (const c of categories) catMap.set(norm(c.name), c.id);

  console.log(`Found ${categories.length} categories.`);

  console.log('Fetching products with non-empty category...');
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id,category,category_id')
    .not('category', 'is', null)
    .neq('category', '');

  if (prodErr) {
    console.error('Failed to fetch products:', prodErr.message || prodErr);
    process.exit(1);
  }

  let updated = 0;
  for (const p of products) {
    if (p.category_id) continue;
    const key = norm(p.category);
    const catId = catMap.get(key);
    if (catId) {
      const { error: upErr } = await supabase.from('products').update({ category_id: catId }).eq('id', p.id);
      if (upErr) {
        console.error('Failed to update product', p.id, upErr.message || upErr);
      } else {
        updated++;
        console.log('Updated product', p.id, '=> category_id', catId);
      }
    }
  }

  console.log(`Done. Products updated: ${updated}`);

  // verification: count products with category_id not null
  const { data: countData, error: countErr } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .not('category_id', 'is', null);

  if (countErr) console.error('Count error:', countErr);
  else console.log('Products with category_id populated:', countData.length || 0);
}

main().catch(err => {
  console.error('Unexpected error:', err.message || err);
  process.exit(1);
});
