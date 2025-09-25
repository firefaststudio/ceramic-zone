// Use dynamic imports and standard Response to avoid hard dependency on Next types
// and on project path aliases.
export async function POST(req: Request) {
  // Load auth and db helpers dynamically; if unavailable, fail gracefully
  let auth: any = null;
  let getDbClient: any = null;
  try {
    const server = await import('../../../../lib/server/getDbClient');
    // server module may export getDbClient or default
    getDbClient = server.getDbClient || server.default || server.getSupabaseServerClient || null;
  } catch (e) {
    // continue; we'll error if we need DB
  }

  try {
    const authMod = await import('../../../../lib/server/auth');
    auth = authMod.auth || authMod.getSupabaseServerClient || null;
  } catch (e) {
    // no-op
  }

  if (!auth) {
    return new Response(JSON.stringify({ ok: false, error: 'auth_unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  const user = await (typeof auth === 'function' ? auth(req) : null);
  if (!user) return new Response(JSON.stringify({ ok: false, error: 'unauthenticated' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const body = await req.json();
  const { orderId, productId, rating, title, body: text } = body;
  if (!orderId || !productId || !rating) return new Response(JSON.stringify({ ok: false, error: 'missing' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (rating < 1 || rating > 5) return new Response(JSON.stringify({ ok: false, error: 'invalid rating' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  if (!getDbClient) return new Response(JSON.stringify({ ok: false, error: 'db_unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });

  const db = getDbClient();
  // Verify order exists, belongs to user and is delivered
  const orderCheck = await db.query('select id, status from public.orders where id=$1 and (user_id=$2 or email=$3) limit 1', [orderId, user.id, user.email]);
  if (!orderCheck || orderCheck.rowCount === 0) return new Response(JSON.stringify({ ok: false, error: 'order not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  const order = orderCheck.rows[0];
  if (order.status !== 'delivered') return new Response(JSON.stringify({ ok: false, error: 'order not delivered' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  // Ensure the order contains the product: adjust depending on order_items table
  const contains = await db.query('select 1 from public.order_items where order_id=$1 and product_id=$2 limit 1', [orderId, productId]);
  if (!contains || contains.rowCount === 0) return new Response(JSON.stringify({ ok: false, error: 'product not in order' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  // Insert review (one per order-product)
  const exists = await db.query('select 1 from public.reviews where order_id=$1 and product_id=$2 limit 1', [orderId, productId]);
  if (exists.rowCount > 0) return new Response(JSON.stringify({ ok: false, error: 'review exists' }), { status: 409, headers: { 'Content-Type': 'application/json' } });

  const insert = await db.query('insert into public.reviews (order_id, product_id, user_id, rating, title, body, verified) values ($1,$2,$3,$4,$5,$6,true) returning id', [orderId, productId, user.id, rating, title || null, text || null]);
  return new Response(JSON.stringify({ ok: true, reviewId: insert.rows[0].id }), { headers: { 'Content-Type': 'application/json' } });
}
