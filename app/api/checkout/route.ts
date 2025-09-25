//localhost:8080.// Use dynamic imports and standard Response to avoid import-time failures when
// optional dependencies (stripe, next) are not installed in the environment.
import { getDbClient } from '../../../../lib/server/getDbClient';

export async function POST(req: Request) {
  const { orderId, amount, currency, email } = await req.json();
  if (!orderId || !amount || !currency || !email) {
    return new Response(JSON.stringify({ ok: false, error: 'missing' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Try to load Stripe dynamically; if not available, return a helpful error
  let stripe: any = null;
  try {
    const stripeModule = await import('stripe');
    const StripeCtor = stripeModule.default || stripeModule;
    stripe = new StripeCtor(process.env.STRIPE_KEY || '', { apiVersion: '2022-11-15' });
  } catch (e) {
    // Stripe not installed or not configured; continue but return a client-friendly error
    return new Response(JSON.stringify({ ok: false, error: 'stripe_unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    receipt_email: email,
    automatic_payment_methods: { enabled: true }
  });

  // Optionally persist client_secret with order
  const db = getDbClient();
  try {
    await db.query('update public.orders set status=$1 where id=$2', ['pending', orderId]);
  } catch (err) {
    // ignore DB write failure here but log server-side if available
  }

  return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret, ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
