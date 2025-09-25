import express from 'express';
import { getDbClient } from '../lib/server/getDbClient.js';

const router = express.Router();

// GET /api/search?q=term
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Parametro q mancante' });

    const supabase = getDbClient();
    // call RPC function
    const { data, error } = await supabase.rpc('search_products', { query: String(q) });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

export default router;
