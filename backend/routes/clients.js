const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/clients - List all clients
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();
  const clients = db.prepare(`
    SELECT c.*,
      COUNT(j.id) as job_count,
      MAX(j.job_date) as last_job_date
    FROM clients c
    LEFT JOIN jobs j ON j.client_id = c.id
    WHERE c.landscaper_id = ?
    GROUP BY c.id
    ORDER BY c.name ASC
  `).all(req.landscaperId);

  res.json(clients.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    whatsappConsent: Boolean(c.whatsapp_consent),
    jobCount: c.job_count,
    lastJobDate: c.last_job_date,
    createdAt: c.created_at,
  })));
});

// POST /api/clients - Add new client
router.post('/', authenticateToken, (req, res) => {
  const { name, email, phone, whatsappConsent } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const db = getDb();

  const result = db.prepare(
    'INSERT INTO clients (landscaper_id, name, email, phone, whatsapp_consent) VALUES (?, ?, ?, ?, ?)'
  ).run(
    req.landscaperId,
    name.trim(),
    email.toLowerCase().trim(),
    phone || null,
    whatsappConsent ? 1 : 0
  );

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    whatsappConsent: Boolean(client.whatsapp_consent),
    createdAt: client.created_at,
  });
});

// GET /api/clients/:id - Get single client
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ? AND landscaper_id = ?'
  ).get(req.params.id, req.landscaperId);

  if (!client) return res.status(404).json({ error: 'Client not found' });

  const jobs = db.prepare(`
    SELECT j.*, r.rating, r.google_review_sent, r.negative_feedback_flagged
    FROM jobs j
    LEFT JOIN reviews r ON r.job_id = j.id
    WHERE j.client_id = ?
    ORDER BY j.job_date DESC
  `).all(client.id);

  res.json({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    whatsappConsent: Boolean(client.whatsapp_consent),
    createdAt: client.created_at,
    jobs: jobs.map(j => ({
      id: j.id,
      jobType: j.job_type,
      jobDate: j.job_date,
      status: j.status,
      rating: j.rating,
      googleReviewSent: j.google_review_sent,
    })),
  });
});

// PUT /api/clients/:id - Update client
router.put('/:id', authenticateToken, (req, res) => {
  const { name, email, phone, whatsappConsent } = req.body;
  const db = getDb();

  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ? AND landscaper_id = ?'
  ).get(req.params.id, req.landscaperId);

  if (!client) return res.status(404).json({ error: 'Client not found' });

  db.prepare(
    'UPDATE clients SET name = ?, email = ?, phone = ?, whatsapp_consent = ? WHERE id = ?'
  ).run(
    name || client.name,
    email || client.email,
    phone !== undefined ? phone : client.phone,
    whatsappConsent !== undefined ? (whatsappConsent ? 1 : 0) : client.whatsapp_consent,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    whatsappConsent: Boolean(updated.whatsapp_consent),
  });
});

// DELETE /api/clients/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDb();

  const client = db.prepare(
    'SELECT * FROM clients WHERE id = ? AND landscaper_id = ?'
  ).get(req.params.id, req.landscaperId);

  if (!client) return res.status(404).json({ error: 'Client not found' });

  // Soft check: don't delete if they have jobs
  const jobCount = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE client_id = ?').get(req.params.id);
  if (jobCount.count > 0) {
    return res.status(400).json({ error: 'Cannot delete client with existing jobs' });
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
