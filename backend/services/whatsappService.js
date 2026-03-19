const { sendEmail, buildEmailHtml } = require('./emailService');

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || sid === 'your_account_sid') return null;
  return require('twilio')(sid, token);
}

/**
 * Send a WhatsApp message via Twilio.
 * Falls back to email if Twilio is not configured or the send fails.
 *
 * @param {string} toPhone         - Client phone in E.164 format, e.g. +447700900123
 * @param {string} messageText     - Plain text body (WhatsApp doesn't support HTML)
 * @param {string} fallbackEmail   - Email address to use if WhatsApp fails
 * @param {string} fallbackSubject - Subject line for the fallback email
 * @param {string} fallbackHtml    - HTML body for the fallback email
 * @returns {{ channel: string, simulated?: boolean, fallback?: boolean }}
 */
async function sendWhatsApp(toPhone, messageText, fallbackEmail, fallbackSubject, fallbackHtml) {
  const client = getTwilioClient();
  const from = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

  // Simulation mode — no Twilio keys configured
  if (!client) {
    console.log('\n📱 [WHATSAPP SIMULATION - No Twilio configured]');
    console.log('To:', toPhone);
    console.log('From:', from);
    console.log('Message:', messageText);
    console.log('---');
    return { channel: 'whatsapp', simulated: true };
  }

  try {
    await client.messages.create({
      from,
      to: `whatsapp:${toPhone}`,
      body: messageText,
    });
    console.log(`📱 WhatsApp sent to ${toPhone}`);
    return { channel: 'whatsapp', simulated: false };
  } catch (err) {
    console.error('⚠️  WhatsApp send failed, falling back to email:', err.message);
    await sendEmail(fallbackEmail, fallbackSubject, fallbackHtml);
    return { channel: 'email', fallback: true };
  }
}

module.exports = { sendWhatsApp };
