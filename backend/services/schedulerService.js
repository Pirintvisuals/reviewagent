const { getDb } = require('../database');
const { initiateReviewProcess } = require('./reviewService');
const { generateReminderMessage } = require('./aiService');
const { sendEmail, buildEmailHtml } = require('./emailService');
const { sendWhatsApp } = require('./whatsappService');

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Process any jobs that are in 'scheduled' status and whose
 * review_scheduled_at time has now passed.
 */
async function processScheduledJobs() {
  const db = getDb();
  const now = new Date().toISOString();

  const jobs = db.prepare(`
    SELECT * FROM jobs
    WHERE status = 'scheduled' AND review_scheduled_at <= ?
  `).all(now);

  if (jobs.length > 0) {
    console.log(`[Scheduler] Processing ${jobs.length} scheduled job(s)...`);
  }

  for (const job of jobs) {
    try {
      console.log(`[Scheduler] Sending review request for job #${job.id}`);
      await initiateReviewProcess(job.id);
      console.log(`[Scheduler] ✅ Job #${job.id} review sent`);
    } catch (err) {
      console.error(`[Scheduler] ❌ Failed to process job #${job.id}:`, err.message);
    }
  }
}

/**
 * Process follow-up reminder nudges for reviews that:
 * - Were sent > 3 days ago
 * - Have not received a rating yet
 * - Have not already had a reminder sent
 */
async function processReminderNudges() {
  const db = getDb();

  // 3 days ago threshold
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const reviews = db.prepare(`
    SELECT r.*,
           j.landscaper_id, j.job_type,
           c.name  AS client_name,
           c.email AS client_email,
           c.phone AS client_phone,
           c.whatsapp_consent,
           l.business_name
    FROM reviews r
    JOIN jobs    j ON r.job_id   = j.id
    JOIN clients c ON j.client_id = c.id
    JOIN landscapers l ON j.landscaper_id = l.id
    WHERE j.status     = 'review_sent'
      AND r.rating     IS NULL
      AND r.reminder_sent = 0
      AND r.created_at <= ?
  `).all(threeDaysAgo);

  if (reviews.length > 0) {
    console.log(`[Scheduler] Sending ${reviews.length} reminder nudge(s)...`);
  }

  for (const review of reviews) {
    try {
      const reminderText = await generateReminderMessage(review.business_name, review.client_name);
      const subject = `Just checking in — ${review.business_name}`;
      const html = buildEmailHtml(reminderText, review.business_name, null);

      // Use the same channel as the original outreach
      const useWhatsApp =
        review.initial_channel === 'whatsapp' &&
        Boolean(review.whatsapp_consent) &&
        Boolean(review.client_phone);

      let actualChannel;
      if (useWhatsApp) {
        const result = await sendWhatsApp(
          review.client_phone,
          reminderText,
          review.client_email,
          subject,
          html
        );
        actualChannel = result.channel;
      } else {
        await sendEmail(review.client_email, subject, html);
        actualChannel = 'email';
      }

      // Append reminder to thread
      const thread = JSON.parse(review.email_thread || '[]');
      thread.push({
        direction: 'outbound',
        type: 'reminder_nudge',
        channel: actualChannel,
        subject: actualChannel === 'whatsapp' ? null : subject,
        body: reminderText,
        sentAt: new Date().toISOString(),
      });

      db.prepare(`
        UPDATE reviews
        SET reminder_sent = 1, email_thread = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(JSON.stringify(thread), review.id);

      console.log(`[Scheduler] ✅ Reminder sent for review #${review.id} via ${actualChannel}`);
    } catch (err) {
      console.error(`[Scheduler] ❌ Reminder failed for review #${review.id}:`, err.message);
    }
  }
}

/**
 * Start the background scheduler.
 * Fires immediately on startup (to catch any overdue jobs after a restart),
 * then polls every 15 minutes.
 */
function startScheduler() {
  const delayHours = parseFloat(process.env.REVIEW_DELAY_HOURS ?? '2');
  console.log(`[Scheduler] Started — delay: ${delayHours}h, polling every 15 min`);
  if (delayHours === 0) {
    console.log('[Scheduler] ⚠️  Delay is 0 — jobs will be sent within 15 min of completion');
  }

  // Run immediately to catch any overdue jobs from before a restart
  processScheduledJobs().catch(console.error);
  processReminderNudges().catch(console.error);

  // Then poll every 15 minutes
  setInterval(async () => {
    await processScheduledJobs();
    await processReminderNudges();
  }, INTERVAL_MS);
}

module.exports = { startScheduler };
