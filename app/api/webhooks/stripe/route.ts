// Runtime-safe Stripe webhook handler: dynamic import and standard Response.
import { getDbClient } from '../../../../lib/server/getDbClient';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature') || '';
  const buf = Buffer.from(await req.arrayBuffer());

  let stripe: any = null;
  try {
    const stripeModule = await import('stripe');
    const StripeCtor = stripeModule.default || stripeModule;
    stripe = new StripeCtor(process.env.STRIPE_KEY || '', { apiVersion: '2022-11-15' });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'stripe_unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WH_SECRET || '');
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid signature' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const db = getDbClient();
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as any;
    const orderId = (pi.metadata && pi.metadata.order_id) || null;
    if (orderId) {
      await db.from('orders').update({ status: 'paid' }).eq('id', orderId).limit(1);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
