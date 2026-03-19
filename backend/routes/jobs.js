const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/jobs - List jobs with optional filter
// status: 'all' | 'pending' | 'scheduled' | 'review_sent' | 'pending_all' (pending + scheduled combined)
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();
  const { status } = req.query;

  let query = `
    SELECT j.*, c.name as client_name, c.email as client_email,
           r.rating, r.google_review_sent, r.negative_feedback_flagged
    FROM jobs j
    JOIN clients c ON j.client_id = c.id
    LEFT JOIN reviews r ON r.job_id = j.id
    WHERE j.landscaper_id = ?
  `;
  const params = [req.landscaperId];

  if (status && status !== 'all') {
    if (status === 'pending_all') {
      // Merge pending + scheduled into the "Pending" tab view
      query += " AND j.status IN ('pending', 'scheduled')";
    } else {
      query += ' AND j.status = ?';
      params.push(status);
    }
  }

  query += ' ORDER BY j.job_date DESC, j.created_at DESC';

  const jobs = db.prepare(query).all(...params);

  res.json(jobs.map(j => ({
    id: j.id,
    clientId: j.client_id,
    clientName: j.client_name,
    clientEmail: j.client_email,
    jobType: j.job_type,
    jobDate: j.job_date,
    status: j.status,
    reviewScheduledAt: j.review_scheduled_at,
    completedAt: j.completed_at,
    createdAt: j.created_at,
    rating: j.rating,
    googleReviewSent: j.google_review_sent,
    negativeFlagged: j.negative_feedback_flagged,
  })));
});

// POST /api/jobs - Create new job
router.post('/', authenticateToken, (req, res) => {
  const { clientId, jobType, jobDate } = req.body;

  if (!clientId || !jobType || !jobDate) {
    return res.status(400).json({ error: 'clientId, jobType, and jobDate are required' });
  }

  const db = getDb();

  // Verify client belongs to this landscaper
  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ? AND landscaper_id = ?'
  ).get(clientId, req.landscaperId);

  if (!client) return res.status(404).json({ error: 'Client not found' });

  const result = db.prepare(
    'INSERT INTO jobs (client_id, landscaper_id, job_type, job_date) VALUES (?, ?, ?, ?)'
  ).run(clientId, req.landscaperId, jobType.trim(), jobDate);

  const job = db.prepare(`
    SELECT j.*, c.name as client_name FROM jobs j
    JOIN clients c ON j.client_id = c.id
    WHERE j.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({
    id: job.id,
    clientId: job.client_id,
    clientName: job.client_name,
    jobType: job.job_type,
    jobDate: job.job_date,
    status: job.status,
    createdAt: job.created_at,
  });
});

// GET /api/jobs/:id - Get job details
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();

  const job = db.prepare(`
    SELECT j.*, c.name as client_name, c.email as client_email, c.phone as client_phone
    FROM jobs j
    JOIN clients c ON j.client_id = c.id
    WHERE j.id = ? AND j.landscaper_id = ?
  `).get(req.params.id, req.landscaperId);

  if (!job) return res.status(404).json({ error: 'Job not found' });

  const review = db.prepare('SELECT * FROM reviews WHERE job_id = ?').get(job.id);

  res.json({
    id: job.id,
    clientId: job.client_id,
    clientName: job.client_name,
    clientEmail: job.client_email,
    clientPhone: job.client_phone,
    jobType: job.job_type,
    jobDate: job.job_date,
    status: job.status,
    reviewScheduledAt: job.review_scheduled_at,
    completedAt: job.completed_at,
    createdAt: job.created_at,
    review: review ? {
      id: review.id,
      rating: review.rating,
      feedbackText: review.feedback_text,
      emailThread: JSON.parse(review.email_thread || '[]'),
      googleReviewSent: Boolean(review.google_review_sent),
      negativeFlagged: Boolean(review.negative_feedback_flagged),
      reminderSent: Boolean(review.reminder_sent),
      initialChannel: review.initial_channel || 'email',
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    } : null,
  });
});

// PUT /api/jobs/:id - Update job (pending only)
router.put('/:id', authenticateToken, (req, res) => {
  const { jobType, jobDate } = req.body;
  const db = getDb();

  const job = db.prepare(
    'SELECT * FROM jobs WHERE id = ? AND landscaper_id = ?'
  ).get(req.params.id, req.landscaperId);

  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'pending') {
    return res.status(400).json({ error: 'Can only edit pending jobs' });
  }

  db.prepare('UPDATE jobs SET job_type = ?, job_date = ? WHERE id = ?')
    .run(jobType || job.job_type, jobDate || job.job_date, req.params.id);

  res.json({ success: true });
});

// POST /api/jobs/:id/complete - Schedule delayed review request
router.post('/:id/complete', authenticateToken, (req, res) => {
  const db = getDb();

  const job = db.prepare(
    'SELECT * FROM jobs WHERE id = ? AND landscaper_id = ?'
  ).get(req.params.id, req.landscaperId);

  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'pending') {
    return res.status(400).json({ error: 'Job is not in pending status' });
  }

  const delayHours = parseFloat(process.env.REVIEW_DELAY_HOURS ?? '2');
  const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

  db.prepare(`
    UPDATE jobs
    SET status = 'scheduled', review_scheduled_at = ?, completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(scheduledAt, job.id);

  const message = delayHours > 0
    ? `Job marked complete — review request will be sent in ${delayHours} hour${delayHours !== 1 ? 's' : ''}`
    : 'Job marked complete — review request will be sent within 15 minutes';

  res.json({ success: true, message, scheduledAt });
});

// DELETE /api/jobs/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDb();

  const job = db.prepare(
    'SELECT * FROM jobs WHERE id = ? AND landscaper_id = ?'
  ).get(req.params.id, req.landscaperId);

  if (!job) return res.status(404).json({ error: 'Job not found' });

  // Delete associated review first (FK constraint)
  db.prepare('DELETE FROM reviews WHERE job_id = ?').run(req.params.id);
  db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);

  res.json({ success: true });
});

module.exports = router;
