const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === 're_your_key_here') return null;
  const { Resend } = require('resend');
  return new Resend(key);
}

async function sendEmail(to, subject, htmlBody) {
  const resend = getResend();

  // In development mode without a real API key, just log the email
  if (!resend) {
    console.log('\n📧 [EMAIL SIMULATION - No Resend API key configured]');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', htmlBody.replace(/<[^>]+>/g, ''));
    console.log('---');
    return { id: 'simulated-' + Date.now() };
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: subject,
    html: htmlBody,
  });

  if (error) {
    throw new Error(`Email failed: ${error.message}`);
  }

  return data;
}

function buildEmailHtml(body, businessName, footer) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: #16a34a; padding: 15px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">${businessName}</h2>
      </div>
      <div style="background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="white-space: pre-line; line-height: 1.6;">${body}</div>
        ${footer ? `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" /><p style="color: #6b7280; font-size: 14px;">${footer}</p>` : ''}
      </div>
    </div>
  `;
}

module.exports = { sendEmail, buildEmailHtml };
