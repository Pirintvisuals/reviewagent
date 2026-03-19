const { getDb } = require('../database');
const { generateInitialReviewEmail, generateNegativeFollowUpEmail, generatePositiveReviewEmail } = require('./aiService');
const { sendEmail, buildEmailHtml } = require('./emailService');
const { sendWhatsApp } = require('./whatsappService');

// Triggered when the scheduler fires for a 'scheduled' job — sends initial review request
async function initiateReviewProcess(jobId) {
  const db = getDb();

  const job = db.prepare(`
    SELECT j.*, c.name as client_name, c.email as client_email,
           c.phone as client_phone, c.whatsapp_consent as whatsapp_consent,
           l.business_name, l.google_review_link, l.default_template
    FROM jobs j
    JOIN clients c ON j.client_id = c.id
    JOIN landscapers l ON j.landscaper_id = l.id
    WHERE j.id = ?
  `).get(jobId);

  if (!job) throw new Error('Job not found');

  // Generate message body — AI or pre-written template
  const messageBody = await generateInitialReviewEmail(
    job.business_name,
    job.client_name,
    job.job_type,
    job.job_date,
    job.default_template || 'ai_generated'
  );

  const subject = `How was your ${job.job_type}? - ${job.business_name}`;
  const footer = `Simply reply with your rating from 1-10. Thanks! - ${job.business_name}`;
  const html = buildEmailHtml(messageBody, job.business_name, footer);

  // Determine channel: WhatsApp if client has consented AND has a phone number
  const useWhatsApp = Boolean(job.whatsapp_consent) && Boolean(job.client_phone);

  let actualChannel;
  if (useWhatsApp) {
    const result = await sendWhatsApp(
      job.client_phone,   // WhatsApp destination
      messageBody,        // plain text for WhatsApp
      job.client_email,   // fallback email address
      subject,            // fallback subject
      html                // fallback HTML
    );
    actualChannel = result.channel; // 'whatsapp' or 'email' if fallback triggered
  } else {
    await sendEmail(job.client_email, subject, html);
    actualChannel = 'email';
  }

  // Build thread entry
  const emailEntry = {
    direction: 'outbound',
    type: 'initial_review_request',
    channel: actualChannel,
    subject: actualChannel === 'whatsapp' ? null : subject,
    body: messageBody,
    sentAt: new Date().toISOString(),
  };

  // Create or update review record, storing the channel used
  const existing = db.prepare('SELECT id, email_thread FROM reviews WHERE job_id = ?').get(jobId);
  if (existing) {
    const thread = JSON.parse(existing.email_thread || '[]');
    thread.push(emailEntry);
    db.prepare(`
      UPDATE reviews
      SET email_thread = ?, initial_channel = ?, updated_at = CURRENT_TIMESTAMP
      WHERE job_id = ?
    `).run(JSON.stringify(thread), actualChannel, jobId);
  } else {
    db.prepare(`
      INSERT INTO reviews (job_id, email_thread, initial_channel)
      VALUES (?, ?, ?)
    `).run(jobId, JSON.stringify([emailEntry]), actualChannel);
  }

  // Update job status to review_sent
  db.prepare('UPDATE jobs SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('review_sent', jobId);

  return { success: true, emailBody: messageBody, channel: actualChannel };
}

// Handle client's rating response
async function handleClientResponse(jobId, rating, clientMessage) {
  const db = getDb();

  const review = db.prepare('SELECT * FROM reviews WHERE job_id = ?').get(jobId);
  if (!review) throw new Error('Review not found');

  const job = db.prepare(`
    SELECT j.*, c.name as client_name, c.email as client_email,
           l.business_name, l.google_review_link
    FROM jobs j
    JOIN clients c ON j.client_id = c.id
    JOIN landscapers l ON j.landscaper_id = l.id
    WHERE j.id = ?
  `).get(jobId);

  const thread = JSON.parse(review.email_thread || '[]');

  // Record client's response in thread
  thread.push({
    direction: 'inbound',
    type: 'client_rating_response',
    channel: review.initial_channel || 'email',
    rating,
    body: clientMessage || '',
    receivedAt: new Date().toISOString(),
  });

  if (rating < 6) {
    // NEGATIVE: Ask for feedback, flag for attention
    const emailBody = await generateNegativeFollowUpEmail(
      job.business_name, job.client_name, rating, clientMessage
    );

    const subject = `We'd love to hear more - ${job.business_name}`;
    const html = buildEmailHtml(emailBody, job.business_name, null);
    await sendEmail(job.client_email, subject, html);

    thread.push({
      direction: 'outbound',
      type: 'negative_followup',
      channel: 'email',
      subject,
      body: emailBody,
      sentAt: new Date().toISOString(),
    });

    db.prepare(`
      UPDATE reviews SET rating = ?, feedback_text = ?, email_thread = ?,
        negative_feedback_flagged = 1, updated_at = CURRENT_TIMESTAMP
      WHERE job_id = ?
    `).run(rating, clientMessage || null, JSON.stringify(thread), jobId);

    return { success: true, type: 'negative', emailBody };

  } else {
    // POSITIVE: Send Google review link
    const googleLink = job.google_review_link || 'https://g.page/your-business/review';
    const emailBody = await generatePositiveReviewEmail(
      job.business_name, job.client_name, rating, googleLink
    );

    const subject = `Thank you for the great rating! - ${job.business_name}`;
    const html = buildEmailHtml(emailBody, job.business_name, null);
    await sendEmail(job.client_email, subject, html);

    thread.push({
      direction: 'outbound',
      type: 'google_review_request',
      channel: 'email',
      subject,
      body: emailBody,
      sentAt: new Date().toISOString(),
    });

    db.prepare(`
      UPDATE reviews SET rating = ?, feedback_text = ?, email_thread = ?,
        google_review_sent = 1, updated_at = CURRENT_TIMESTAMP
      WHERE job_id = ?
    `).run(rating, clientMessage || null, JSON.stringify(thread), jobId);

    return { success: true, type: 'positive', emailBody };
  }
}

module.exports = { initiateReviewProcess, handleClientResponse };
