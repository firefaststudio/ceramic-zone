import express from 'express';
import { getDbClient } from '../lib/server/getDbClient.js';

const router = express.Router();

// GET /api/orders - elenco ordini
router.get('/', async (req, res) => {
  try {
    const supabase = getDbClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

// POST /api/orders - crea nuovo ordine
router.post('/', async (req, res) => {
  try {
    const supabase = getDbClient();
    const { user_id, email, status, total_cents } = req.body;

    const { data, error } = await supabase
      .from('orders')
      .insert([{ user_id, email, status, total_cents }])
      .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

export default router;
