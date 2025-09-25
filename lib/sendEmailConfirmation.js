import { Resend } from 'resend';
import { getDbClient } from './server/getDbClient.js';

const resend = new Resend(process.env.RESEND_API_KEY);

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function sendEmailConfirmation(to, orderId, attempt = 1) {
  try {
    await resend.emails.send({
      from: process.env.MAIL_FROM || 'noreply@iltuodominio.com',
      to,
      subject: `Conferma ordine #${orderId}`,
      html: `
        <h1>Grazie per il tuo ordine!</h1>
        <p>Abbiamo ricevuto il tuo ordine con ID <strong>${orderId}</strong>.</p>
        <p>Ti aggiorneremo non appena sarà elaborato.</p>
      `,
    });
    console.log(`Email inviata a ${to}`);
    return true;
  } catch (err) {
    console.error(`Tentativo ${attempt} fallito:`, err?.message || err);
    if (attempt < 3) {
      await delay(2000 * attempt);
      return sendEmailConfirmation(to, orderId, attempt + 1);
    }

    // final failure: enqueue into email_queue if available
    try {
      const supabase = getDbClient();
      await supabase.from('email_queue').insert([{ to, order_id: orderId, payload: JSON.stringify({ type: 'order_confirmation', orderId }), attempts: attempt, status: 'pending' }]);
      console.warn('Email inserita in email_queue per retry successivo');
    } catch (qerr) {
      console.error('Fallito inserimento in email_queue:', qerr?.message || qerr);
    }

    return false;
  }
}
