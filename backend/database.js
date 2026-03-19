// Uses Node.js built-in SQLite (available since Node.js 22.5+)
// No npm package needed - zero native compilation!
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.VERCEL
  ? '/tmp/landscaper.db'
  : path.join(__dirname, 'landscaper.db');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

function initializeDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS landscapers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      google_review_link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      landscaper_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (landscaper_id) REFERENCES landscapers(id)
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      landscaper_id INTEGER NOT NULL,
      job_type TEXT NOT NULL,
      job_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (landscaper_id) REFERENCES landscapers(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL UNIQUE,
      rating INTEGER,
      feedback_text TEXT,
      email_thread TEXT DEFAULT '[]',
      google_review_sent INTEGER DEFAULT 0,
      negative_feedback_flagged INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );
  `);

  // === MIGRATIONS — add new columns without breaking existing data ===
  // SQLite doesn't support IF NOT EXISTS on ADD COLUMN, so we try/catch each one.
  const alterations = [
    'ALTER TABLE clients ADD COLUMN whatsapp_consent INTEGER DEFAULT 0',
    'ALTER TABLE jobs ADD COLUMN review_scheduled_at DATETIME',
    'ALTER TABLE reviews ADD COLUMN reminder_sent INTEGER DEFAULT 0',
    'ALTER TABLE reviews ADD COLUMN initial_channel TEXT DEFAULT "email"',
    'ALTER TABLE landscapers ADD COLUMN default_template TEXT DEFAULT "ai_generated"',
  ];
  for (const sql of alterations) {
    try { db.exec(sql); } catch (e) { /* column already exists, skip */ }
  }

  console.log('Database initialized at:', DB_PATH);

  // Auto-seed demo data when DB is empty (e.g. Vercel cold start)
  const existing = db.prepare('SELECT COUNT(*) as count FROM landscapers').get();
  if (existing.count === 0) {
    seedDemoData(db);
  }

  return db;
}

function seedDemoData(db) {
  console.log('Seeding demo data...');

  const landscaperResult = db.prepare(
    'INSERT INTO landscapers (business_name, email, google_review_link) VALUES (?, ?, ?)'
  ).run('Green Thumb Landscaping', 'demo@example.com', 'https://g.page/r/green-thumb-landscaping/review');
  const landscaperId = landscaperResult.lastInsertRowid;

  const clients = [
    { name: 'James Whitfield', email: 'james.whitfield@example.com', phone: '07700 900123' },
    { name: 'Sarah Bennett', email: 'sarah.bennett@example.com', phone: '07700 900456' },
    { name: 'Robert Clarke', email: 'r.clarke@example.com', phone: null },
    { name: 'Emma Thompson', email: 'emma.t@example.com', phone: '07700 900789' },
    { name: 'David Hargreaves', email: 'd.hargreaves@example.com', phone: '07700 900321' },
  ];

  const clientIds = clients.map(c =>
    db.prepare('INSERT INTO clients (landscaper_id, name, email, phone) VALUES (?, ?, ?, ?)')
      .run(landscaperId, c.name, c.email, c.phone).lastInsertRowid
  );

  const now = new Date();
  const daysAgo = d => { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt.toISOString().split('T')[0]; };

  const jobs = [
    { clientIdx: 0, jobType: 'Lawn Mowing',       jobDate: daysAgo(2),  status: 'pending' },
    { clientIdx: 1, jobType: 'Hedge Trimming',     jobDate: daysAgo(1),  status: 'pending' },
    { clientIdx: 2, jobType: 'Garden Clearance',   jobDate: daysAgo(3),  status: 'pending' },
    { clientIdx: 3, jobType: 'Lawn Mowing',        jobDate: daysAgo(7),  status: 'review_sent' },
    { clientIdx: 4, jobType: 'Patio Cleaning',     jobDate: daysAgo(10), status: 'review_sent' },
    { clientIdx: 0, jobType: 'Garden Design',      jobDate: daysAgo(14), status: 'review_sent', rating: 9,  message: 'Brilliant job, very pleased!',                isPositive: true },
    { clientIdx: 1, jobType: 'Lawn Mowing',        jobDate: daysAgo(21), status: 'review_sent', rating: 8,  message: 'Great work as always',                       isPositive: true },
    { clientIdx: 2, jobType: 'Hedge Trimming',     jobDate: daysAgo(28), status: 'review_sent', rating: 7,  message: '',                                           isPositive: true },
    { clientIdx: 3, jobType: 'Patio Installation', jobDate: daysAgo(35), status: 'review_sent', rating: 4,  message: 'Some areas were missed and had to call back', isNegative: true },
    { clientIdx: 4, jobType: 'Lawn Mowing',        jobDate: daysAgo(42), status: 'review_sent', rating: 3,  message: 'Not happy with the finish',                  isNegative: true },
  ];

  jobs.forEach(job => {
    const r = db.prepare(
      'INSERT INTO jobs (client_id, landscaper_id, job_type, job_date, status, completed_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(clientIds[job.clientIdx], landscaperId, job.jobType, job.jobDate, job.status,
      job.status !== 'pending' ? new Date(job.jobDate).toISOString() : null);
    const jobId = r.lastInsertRowid;

    if (job.status === 'review_sent') {
      const firstName = clients[job.clientIdx].name.split(' ')[0];
      const thread = [{
        direction: 'outbound', type: 'initial_review_request',
        subject: `How was your ${job.jobType}? - Green Thumb Landscaping`,
        body: `Hi ${firstName},\n\nThank you for choosing Green Thumb Landscaping for your ${job.jobType}!\n\nWe'd love to know how we did. Could you rate your experience from 1-10?`,
        sentAt: new Date(job.jobDate + 'T10:00:00Z').toISOString(),
      }];

      if (job.rating) {
        thread.push({ direction: 'inbound', type: 'client_rating_response', rating: job.rating, body: job.message, receivedAt: new Date(job.jobDate + 'T14:00:00Z').toISOString() });
        if (job.isPositive) {
          thread.push({ direction: 'outbound', type: 'google_review_request', subject: 'Thank you for the great rating!', body: `Hi ${firstName},\n\n${job.rating}/10 — brilliant, thank you!\n\nPlease share on Google: https://g.page/r/green-thumb-landscaping/review`, sentAt: new Date(job.jobDate + 'T14:05:00Z').toISOString() });
        } else if (job.isNegative) {
          thread.push({ direction: 'outbound', type: 'negative_followup', subject: "We'd love to hear more", body: `Hi ${firstName},\n\nSorry to hear your experience wasn't right. Could you tell us more so we can improve?`, sentAt: new Date(job.jobDate + 'T14:05:00Z').toISOString() });
        }
      }

      db.prepare('INSERT INTO reviews (job_id, rating, feedback_text, email_thread, google_review_sent, negative_feedback_flagged) VALUES (?, ?, ?, ?, ?, ?)')
        .run(jobId, job.rating || null, job.message || null, JSON.stringify(thread), job.isPositive ? 1 : 0, job.isNegative ? 1 : 0);
    }
  });

  console.log('Demo data seeded.');
}

module.exports = { getDb, initializeDatabase };

// Run directly to set up DB
if (require.main === module) {
  initializeDatabase();
  console.log('Database setup complete.');
}
