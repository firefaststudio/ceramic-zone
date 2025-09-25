import { createClient } from '@supabase/supabase-js';

export function getDbClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured (SUPABASE_URL / SUPABASE_KEY)');
  }

  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}
