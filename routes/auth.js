import express from 'express';
import { getDbClient } from '../lib/server/getDbClient.js';

const router = express.Router();

// POST /api/auth/register - registra utente via Supabase Auth
router.post('/register', async (req, res) => {
  try {
    const supabase = getDbClient();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Registrazione completata', user: data.user });
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

export default router;
