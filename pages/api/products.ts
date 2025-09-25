// pages/api/products.ts
// Use runtime-safe types to avoid Next.js-only type errors in different editors.
import { getDbClient } from '../../lib/server/getDbClient';

export default async function handler(req: any, res: any) {
  const supabase = getDbClient();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  res.status(405).end();
}
