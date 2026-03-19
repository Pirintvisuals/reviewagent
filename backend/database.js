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
  return db;
}

module.exports = { getDb, initializeDatabase };

// Run directly to set up DB
if (require.main === module) {
  initializeDatabase();
  console.log('Database setup complete.');
}
