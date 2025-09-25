import express from 'express';
import { getDbClient } from '../lib/server/getDbClient.js';

const router = express.Router();

// GET /api/reviews - elenco recensioni
router.get('/', async (req, res) => {
  try {
    const supabase = getDbClient();
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// POST /api/reviews - crea nuova recensione
router.post('/', async (req, res) => {
  try {
    const supabase = getDbClient();
    const { order_id, product_id, user_id, rating, title, body, verified } = req.body;

    const { data, error } = await supabase
      .from('reviews')
      .insert([{ order_id, product_id, user_id, rating, title, body, verified }])
      .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

export default router;
