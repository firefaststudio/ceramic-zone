import express from 'express';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.mjs';
import crypto from 'crypto';
// import fileType from 'file-type'; // optional: to sniff MIME from stream

const router = express.Router();

const supabaseAdmin = getSupabaseAdmin();

// Simple token-based auth for admin endpoint
function requireAdminToken(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || token !== process.env.ADMIN_API_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.post('/pdf-jobs', requireAdminToken, async (req, res) => {
  const { object_url, user_id, filename, meta } = req.body;
  if (!object_url) return res.status(400).json({ error: 'object_url required' });

  // 1️⃣ Controllo estensione
  if (!object_url.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'Solo PDF ammessi' });
  }

  // 2️⃣ Controllo peso max (es. 15 MB)
  try {
    const headRes = await fetch(object_url, { method: 'HEAD' });
    const size = parseInt(headRes.headers.get('content-length') || '0', 10);
    if (size > 15 * 1024 * 1024) {
      return res.status(400).json({ error: 'File troppo grande (max 15 MB)' });
    }
  } catch (err) {
    return res.status(400).json({ error: 'File non raggiungibile' });
  }

  // (Opzionale) 3️⃣ Controllo MIME reale
  // const mimeCheck = await fileType.fromStream((await fetch(object_url)).body);
  // if (mimeCheck?.mime !== 'application/pdf') return res.status(400).json({ error: 'MIME non valido' });

  try {
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase admin client not configured' });
    const trace_id = req.body.trace_id || crypto.randomUUID();
    const { data: job, error } = await supabaseAdmin
      .from('pdf_jobs')
      .insert({ trace_id, user_id: user_id || null, object_url, filename: filename || null, meta: meta || null, status: 'pending' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message || error });

    await supabaseAdmin.from('pdf_processing_log').insert([{ job_id: job.id, stage: 'enqueue', message: 'Job creato via admin API' }]);
    res.json({ job });
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

export default router;
