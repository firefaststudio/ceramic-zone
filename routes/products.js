import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { logError } from '../logger.js';

const router = express.Router();

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    logError('Failed to create Supabase client: ' + (err.message || err.toString()));
    return null;
  }
}

// GET /products?category=...
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const { page = 1, limit = 10, category, search } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
    const offset = (pageNum - 1) * limitNum;

    // Select only the fields needed for the list to keep payload small
    // Always include category_id and nested categories(name,slug)
    const selectFields = [
      'id', 'title', 'price_cents', 'currency', 'images', 'slug', 'category_id', 'created_at', 'categories(name,slug)'
    ];

    let query = supabase
      .from('products')
      .select(selectFields.join(','), { count: 'exact' })
      .eq('status', 'published');

    if (category) {
      // support filtering by category id or category text
      // if looks like a uuid, try category_id, otherwise category text
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(String(category));
      if (isUuid) query = query.eq('category_id', category);
      else query = query.eq('category', category);
    }

    if (search) {
      const safe = String(search).replace(/%/g, '\\%');
      // simple ILIKE search on title or description
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    query = query.range(offset, offset + limitNum - 1).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) {
      logError(error.message || error.toString());
      return res.status(500).json({ error: error.message || 'DB error' });
    }

    res.json({
      page: pageNum,
      limit: limitNum,
      total: count || 0,
      results: data || []
    });
  } catch (err) {
    logError(err.message || err.toString());
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });

    const id = req.params.id;
    // Fetch product with nested category info (explicit fields without legacy 'category')
    const selectStr = 'id,title,slug,description,price_cents,currency,stock,images,metadata,created_at,updated_at,category_id,categories(name,slug)';
    const { data: productArr, error: prodErr } = await supabase
      .from('products')
      .select(selectStr)
      .eq('id', id)
      .limit(1);
    const product = (productArr && productArr[0]) || null;

    if (prodErr) {
      if (prodErr.code === 'PGRST116' || prodErr.message?.includes('No rows')) {
        return res.status(404).json({ error: 'Not found' });
      }
      logError(prodErr.message || prodErr.toString());
      return res.status(500).json({ error: prodErr.message || 'DB error' });
    }

    // Fetch ordered images from product_images and merge into product.images_ordered
    const { data: images, error: imgErr } = await supabase
      .from('product_images')
      .select('id,url,alt,position')
      .eq('product_id', id)
      .order('position', { ascending: true });

    if (imgErr) {
      logError(imgErr.message || imgErr.toString());
      // not fatal: return product without images
      return res.json(product);
    }

    const productWithImages = {
      ...product,
      images_ordered: images || [],
      // keep legacy images array too
      images: product.images || []
    };

    res.json(productWithImages);
  } catch (err) {
    logError(err.message || err.toString());
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
