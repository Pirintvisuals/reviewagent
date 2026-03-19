/**
 * Pre-written message templates for review requests.
 * Used when the landscaper prefers a fixed template over AI generation.
 * Placeholders: {client_name}, {job_type}, {job_date}, {business_name}
 */
const TEMPLATES = {
  friendly: {
    name: 'Friendly',
    description: 'Warm, casual and personal',
    body: `Hi {client_name}! 😊

Hope you're well! Just wanted to say a massive thank you for having us round to do your {job_type} on {job_date} — it was great to see you.

We absolutely love what we do and genuinely hope you're pleased with how it turned out.

Could you do us a little favour and give us a rating from 1 to 10? Just reply to this message — it only takes a second and means the world to a small business like ours.

Cheers,
{business_name}`,
  },

  professional: {
    name: 'Professional',
    description: 'Polite and formal',
    body: `Dear {client_name},

Thank you for choosing {business_name} for your recent {job_type} on {job_date}.

We are committed to delivering the highest standard of service and your feedback is invaluable to us. We would be very grateful if you could take a moment to rate your experience on a scale of 1 to 10 by replying to this message.

Your response helps us to continually improve our service.

Yours sincerely,
{business_name}`,
  },

  brief: {
    name: 'Brief',
    description: 'Short and to the point',
    body: `Hi {client_name}, thanks for having us out for the {job_type} on {job_date}. How did we do? Please reply with a score out of 10. — {business_name}`,
  },
};

/**
 * Render a template by replacing all placeholders.
 * @param {string} templateKey - 'friendly' | 'professional' | 'brief'
 * @param {{ clientName, jobType, jobDate, businessName }} vars
 * @returns {string} The rendered message body
 */
function renderTemplate(templateKey, vars) {
  const tmpl = TEMPLATES[templateKey];
  if (!tmpl) throw new Error(`Unknown template key: "${templateKey}". Valid keys: ${Object.keys(TEMPLATES).join(', ')}`);

  return tmpl.body
    .replace(/{client_name}/g, vars.clientName || 'there')
    .replace(/{job_type}/g, vars.jobType || 'recent job')
    .replace(/{job_date}/g, vars.jobDate || 'recently')
    .replace(/{business_name}/g, vars.businessName || 'us');
}

module.exports = { TEMPLATES, renderTemplate };
