// Minimal mailer helper (Resend or SMTP). Replace with your provider.
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

export async function sendOrderConfirmation(email: string, orderId: string) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@tuodominio.com',
    to: email,
    subject: `Conferma ordine ${orderId}`,
    html: `<p>Grazie per il tuo ordine. ID: ${orderId}</p>`
  });
}
