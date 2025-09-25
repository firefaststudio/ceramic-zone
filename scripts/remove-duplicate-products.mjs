import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL or SUPABASE_ANON_KEY not set in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching products...');
  const { data: products, error } = await supabase
    .from('products')
    .select('id,title,slug,description,price_cents,created_at')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to fetch products:', error.message || error);
    process.exit(1);
  }

  // Group by key (title, slug, price_cents, description)
  const groups = new Map();
  for (const p of products) {
    const key = [p.title || '', p.slug || '', String(p.price_cents || ''), p.description || ''].join('||');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const idsToDelete = [];
  for (const [key, items] of groups.entries()) {
    if (items.length <= 1) continue;
    // items already ordered by created_at desc, so keep first, delete rest
    const toDelete = items.slice(1).map(i => i.id);
    idsToDelete.push(...toDelete);
  }

  if (idsToDelete.length === 0) {
    console.log('No duplicates found.');
    return;
  }

  console.log(`Deleting ${idsToDelete.length} duplicate product(s)...`);
  const { data: delData, error: delError } = await supabase
    .from('products')
    .delete()
    .in('id', idsToDelete);
  if (delError) {
    console.error('Delete failed:', delError.message || delError);
    process.exit(1);
  }

  console.log('Deleted IDs:');
  for (const id of idsToDelete) console.log('-', id);
  console.log('Done.');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
