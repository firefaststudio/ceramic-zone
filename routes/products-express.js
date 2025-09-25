import express from 'express';
import { getDbClient } from '../lib/server/getDbClient.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const supabase = getDbClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

export default router;
