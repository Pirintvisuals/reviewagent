const Anthropic = require('@anthropic-ai/sdk');
const { renderTemplate } = require('./templateService');

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === 'sk-ant-your_key_here') return null;
  return new Anthropic({ apiKey: key });
}

async function generateEmail(prompt) {
  const anthropic = getClient();

  // Fallback if no API key configured
  if (!anthropic) {
    console.log('\n🤖 [AI SIMULATION - No Anthropic API key configured]');
    console.log('Prompt:', prompt.slice(0, 100) + '...');
    return `Thank you for choosing our landscaping service. We'd love to hear your feedback. Please rate your experience from 1-10 by replying to this email.`;
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  return message.content[0].text;
}

// Generate the initial review request message body.
// template: 'ai_generated' (default) | 'friendly' | 'professional' | 'brief'
async function generateInitialReviewEmail(businessName, clientName, jobType, jobDate, template = 'ai_generated') {
  const formattedDate = new Date(jobDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  // Pre-written template path — skip Claude entirely
  if (template !== 'ai_generated') {
    return renderTemplate(template, {
      clientName,
      jobType,
      jobDate: formattedDate,
      businessName,
    });
  }

  // AI generation path (original behaviour)
  const prompt = `You are sending an email on behalf of ${businessName}, a landscaping company in the UK.

Client details:
- Name: ${clientName}
- Job completed: ${jobType} on ${formattedDate}

Write a short, friendly email (max 100 words) asking them to rate their experience from 1-10. Keep it warm, professional, and British in tone. Include:
1. Thank them for their business
2. Mention the specific job completed
3. Ask for a rating from 1-10 on how satisfied they were
4. Keep it conversational, not corporate

DO NOT include subject line - just the email body.
DO NOT include a signature - we'll add that separately.
DO NOT include any placeholder text or brackets.`;

  return generateEmail(prompt);
}

// Generate follow-up email for negative ratings (< 6)
async function generateNegativeFollowUpEmail(businessName, clientName, rating, clientMessage) {
  const prompt = `You are sending an email on behalf of ${businessName}, a landscaping company in the UK.

The client ${clientName} rated their experience as ${rating}/10, which isn't great.${clientMessage ? ` They said: "${clientMessage}"` : ''}

Write a short, empathetic follow-up email (max 80 words) asking what we could have done better. Be genuinely apologetic and curious. Keep it British and humble.

DO NOT be overly apologetic or groveling. Just professional and wanting to improve.
DO NOT include subject line - just the email body.
DO NOT include a signature.
DO NOT include any placeholder text or brackets.`;

  return generateEmail(prompt);
}

// Generate Google review request email for positive ratings (>= 6)
async function generatePositiveReviewEmail(businessName, clientName, rating, googleReviewLink) {
  const prompt = `You are sending an email on behalf of ${businessName}, a landscaping company in the UK.

The client ${clientName} rated their experience as ${rating}/10 - that's brilliant!

Write a short, grateful email (max 60 words) thanking them and asking if they'd mind leaving a Google review. The Google review link is: ${googleReviewLink || 'https://g.page/your-business/review'}

Make it feel like a genuine ask, not pushy. British tone.
The link MUST appear in the email text.
DO NOT include subject line - just the email body.
DO NOT include a signature.`;

  return generateEmail(prompt);
}

// Generate a gentle reminder nudge (sent after 3 days of no response)
async function generateReminderMessage(businessName, clientName) {
  const prompt = `Write a gentle, brief follow-up message (maximum 40 words) from ${businessName} to ${clientName}. They haven't replied to a review request sent 3 days ago. Keep it warm, light, and non-pushy. British tone. No subject line. No signature.`;

  return generateEmail(prompt);
}

module.exports = {
  generateInitialReviewEmail,
  generateNegativeFollowUpEmail,
  generatePositiveReviewEmail,
  generateReminderMessage,
};
