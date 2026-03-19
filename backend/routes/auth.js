const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// POST /api/auth/login - Login by email only (MVP: no password)
router.post('/login', (req, res) => {
  const { email, businessName } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const db = getDb();

  // Find or create landscaper by email
  let landscaper = db.prepare('SELECT * FROM landscapers WHERE email = ?').get(email.toLowerCase());

  if (!landscaper) {
    // Auto-create account for new email
    const name = businessName || email.split('@')[0].replace(/[^a-zA-Z0-9 ]/g, ' ') + ' Landscaping';
    const result = db.prepare(
      'INSERT INTO landscapers (business_name, email) VALUES (?, ?)'
    ).run(name, email.toLowerCase());

    landscaper = db.prepare('SELECT * FROM landscapers WHERE id = ?').get(result.lastInsertRowid);
  }

  // Issue JWT token
  const token = jwt.sign(
    { landscaperId: landscaper.id, email: landscaper.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    landscaper: {
      id: landscaper.id,
      businessName: landscaper.business_name,
      email: landscaper.email,
      googleReviewLink: landscaper.google_review_link,
    },
  });
});

module.exports = router;
