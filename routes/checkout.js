import express from 'express';
import { getDbClient } from '../lib/server/getDbClient.js';

const router = express.Router();

// POST /api/checkout - crea ordine minimo e ritorna conferma
router.post('/', async (req, res) => {
  try {
    const supabase = getDbClient();
    const { email, total_cents } = req.body;

    if (!email || !total_cents) return res.status(400).json({ error: 'email and total_cents required' });

    // 1. Salva ordine
    const { data, error } = await supabase
      .from('orders')
      .insert([{ email, total_cents, status: 'pending' }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // 2. Invio email in background (Resend)
    // Send confirmation only if RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { sendEmailConfirmation } = await import('../lib/sendEmailConfirmation.js');
        sendEmailConfirmation(email, data.id).catch((e) => console.error('Errore invio email:', e));
      } catch (e) {
        console.error('sendEmailConfirmation import failed', e);
      }
    } else {
      // don't attempt to import/send email when key missing
      console.warn('RESEND_API_KEY not set — skipping confirmation email');
    }

    res.status(201).json({ message: 'Ordine ricevuto!', order: data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'server error' });
  }
});

export default router;
