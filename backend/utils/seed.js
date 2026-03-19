require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { initializeDatabase, getDb } = require('../database');

initializeDatabase();
const db = getDb();

console.log('🌱 Seeding demo data...');

// Clear existing demo data
db.exec(`
  DELETE FROM reviews WHERE job_id IN (SELECT id FROM jobs WHERE landscaper_id IN (SELECT id FROM landscapers WHERE email = 'demo@example.com'));
  DELETE FROM jobs WHERE landscaper_id IN (SELECT id FROM landscapers WHERE email = 'demo@example.com');
  DELETE FROM clients WHERE landscaper_id IN (SELECT id FROM landscapers WHERE email = 'demo@example.com');
  DELETE FROM landscapers WHERE email = 'demo@example.com';
`);

// Create demo landscaper
const landscaperResult = db.prepare(`
  INSERT INTO landscapers (business_name, email, google_review_link)
  VALUES ('Green Thumb Landscaping', 'demo@example.com', 'https://g.page/r/green-thumb-landscaping/review')
`).run();
const landscaperId = landscaperResult.lastInsertRowid;

// Create demo clients
const clients = [
  { name: 'James Whitfield', email: 'james.whitfield@example.com', phone: '07700 900123' },
  { name: 'Sarah Bennett', email: 'sarah.bennett@example.com', phone: '07700 900456' },
  { name: 'Robert Clarke', email: 'r.clarke@example.com', phone: null },
  { name: 'Emma Thompson', email: 'emma.t@example.com', phone: '07700 900789' },
  { name: 'David Hargreaves', email: 'd.hargreaves@example.com', phone: '07700 900321' },
];

const clientIds = clients.map(c => {
  const result = db.prepare(
    'INSERT INTO clients (landscaper_id, name, email, phone) VALUES (?, ?, ?, ?)'
  ).run(landscaperId, c.name, c.email, c.phone);
  return result.lastInsertRowid;
});

// Demo jobs and reviews
const now = new Date();
const daysAgo = (d) => {
  const date = new Date(now);
  date.setDate(date.getDate() - d);
  return date.toISOString().split('T')[0];
};

const jobs = [
  // Pending jobs
  { clientIdx: 0, jobType: 'Lawn Mowing', jobDate: daysAgo(2), status: 'pending' },
  { clientIdx: 1, jobType: 'Hedge Trimming', jobDate: daysAgo(1), status: 'pending' },
  { clientIdx: 2, jobType: 'Garden Clearance', jobDate: daysAgo(3), status: 'pending' },

  // Completed - awaiting response
  { clientIdx: 3, jobType: 'Lawn Mowing', jobDate: daysAgo(7), status: 'review_sent' },
  { clientIdx: 4, jobType: 'Patio Cleaning', jobDate: daysAgo(10), status: 'review_sent' },

  // Completed - positive reviews
  { clientIdx: 0, jobType: 'Garden Design', jobDate: daysAgo(14), status: 'review_sent', rating: 9, message: 'Brilliant job, very pleased!', isPositive: true },
  { clientIdx: 1, jobType: 'Lawn Mowing', jobDate: daysAgo(21), status: 'review_sent', rating: 8, message: 'Great work as always', isPositive: true },
  { clientIdx: 2, jobType: 'Hedge Trimming', jobDate: daysAgo(28), status: 'review_sent', rating: 7, message: '', isPositive: true },

  // Completed - negative reviews
  { clientIdx: 3, jobType: 'Patio Installation', jobDate: daysAgo(35), status: 'review_sent', rating: 4, message: 'Some areas were missed and had to call back', isNegative: true },
  { clientIdx: 4, jobType: 'Lawn Mowing', jobDate: daysAgo(42), status: 'review_sent', rating: 3, message: 'Not happy with the finish', isNegative: true },
];

jobs.forEach(job => {
  const result = db.prepare(`
    INSERT INTO jobs (client_id, landscaper_id, job_type, job_date, status, completed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    clientIds[job.clientIdx],
    landscaperId,
    job.jobType,
    job.jobDate,
    job.status,
    job.status !== 'pending' ? new Date(job.jobDate).toISOString() : null
  );
  const jobId = result.lastInsertRowid;

  // Create review records for sent/completed jobs
  if (job.status === 'review_sent') {
    const thread = [
      {
        direction: 'outbound',
        type: 'initial_review_request',
        subject: `How was your ${job.jobType}? - Green Thumb Landscaping`,
        body: `Hi ${clients[job.clientIdx].name.split(' ')[0]},\n\nThank you so much for choosing Green Thumb Landscaping for your ${job.jobType}. It was a pleasure working at your property!\n\nWe'd love to know how we did. Could you rate your experience from 1-10? Your feedback helps us improve our service.\n\nLooking forward to hearing from you!`,
        sentAt: new Date(job.jobDate + 'T10:00:00Z').toISOString(),
      }
    ];

    if (job.rating) {
      thread.push({
        direction: 'inbound',
        type: 'client_rating_response',
        rating: job.rating,
        body: job.message,
        receivedAt: new Date(job.jobDate + 'T14:00:00Z').toISOString(),
      });

      if (job.isPositive) {
        thread.push({
          direction: 'outbound',
          type: 'google_review_request',
          subject: `Thank you for the great rating! - Green Thumb Landscaping`,
          body: `Hi ${clients[job.clientIdx].name.split(' ')[0]},\n\nWow, ${job.rating}/10 - that's brilliant, thank you so much!\n\nIf you have a moment, we'd be really grateful if you could share your experience on Google. It helps other homeowners find us:\n\nhttps://g.page/r/green-thumb-landscaping/review\n\nThanks again for your support!`,
          sentAt: new Date(job.jobDate + 'T14:05:00Z').toISOString(),
        });
      } else if (job.isNegative) {
        thread.push({
          direction: 'outbound',
          type: 'negative_followup',
          subject: `We'd love to hear more - Green Thumb Landscaping`,
          body: `Hi ${clients[job.clientIdx].name.split(' ')[0]},\n\nThank you for being honest with us. We're sorry to hear your experience wasn't quite right.\n\nCould you tell us a bit more about what we could have done better? We genuinely want to improve and make sure this doesn't happen again.\n\nApologies again for falling short.`,
          sentAt: new Date(job.jobDate + 'T14:05:00Z').toISOString(),
        });
      }
    }

    db.prepare(`
      INSERT INTO reviews (job_id, rating, feedback_text, email_thread, google_review_sent, negative_feedback_flagged)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      job.rating || null,
      job.message || null,
      JSON.stringify(thread),
      job.isPositive ? 1 : 0,
      job.isNegative ? 1 : 0
    );
  }
});

console.log('✅ Demo data seeded successfully!');
console.log('');
console.log('📋 Demo account:');
console.log('   Email: demo@example.com');
console.log('   Business: Green Thumb Landscaping');
console.log('');
console.log('   5 clients, 10 jobs (3 pending, 2 awaiting response, 5 with reviews)');
console.log('');
console.log('🚀 Open http://localhost:5173 and log in with demo@example.com');
