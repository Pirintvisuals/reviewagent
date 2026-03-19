const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const VALID_TEMPLATES = ['ai_generated', 'friendly', 'professional', 'brief'];

// GET /api/landscaper/profile
router.get('/profile', authenticateToken, (req, res) => {
  const db = getDb();
  const landscaper = db.prepare('SELECT * FROM landscapers WHERE id = ?').get(req.landscaperId);

  if (!landscaper) return res.status(404).json({ error: 'Landscaper not found' });

  res.json({
    id: landscaper.id,
    businessName: landscaper.business_name,
    email: landscaper.email,
    googleReviewLink: landscaper.google_review_link,
    defaultTemplate: landscaper.default_template || 'ai_generated',
    createdAt: landscaper.created_at,
  });
});

// PUT /api/landscaper/profile
router.put('/profile', authenticateToken, (req, res) => {
  const { businessName, googleReviewLink, defaultTemplate } = req.body;
  const db = getDb();

  // Validate template key — silently fall back to ai_generated if unknown
  const safeTemplate = VALID_TEMPLATES.includes(defaultTemplate) ? defaultTemplate : 'ai_generated';

  db.prepare(
    'UPDATE landscapers SET business_name = ?, google_review_link = ?, default_template = ? WHERE id = ?'
  ).run(businessName || '', googleReviewLink || null, safeTemplate, req.landscaperId);

  const landscaper = db.prepare('SELECT * FROM landscapers WHERE id = ?').get(req.landscaperId);

  res.json({
    id: landscaper.id,
    businessName: landscaper.business_name,
    email: landscaper.email,
    googleReviewLink: landscaper.google_review_link,
    defaultTemplate: landscaper.default_template || 'ai_generated',
  });
});

module.exports = router;
