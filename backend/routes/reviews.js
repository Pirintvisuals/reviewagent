const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { handleClientResponse } = require('../services/reviewService');

const router = express.Router();

// GET /api/reviews - Get all reviews with stats
router.get('/', authenticateToken, (req, res) => {
  const db = getDb();

  const reviews = db.prepare(`
    SELECT r.*, j.job_type, j.job_date, j.status as job_status,
           c.name as client_name, c.email as client_email
    FROM reviews r
    JOIN jobs j ON r.job_id = j.id
    JOIN clients c ON j.client_id = c.id
    WHERE j.landscaper_id = ?
    ORDER BY r.updated_at DESC
  `).all(req.landscaperId);

  // Compute stats
  const ratedReviews = reviews.filter(r => r.rating !== null);
  const avgRating = ratedReviews.length
    ? (ratedReviews.reduce((sum, r) => sum + r.rating, 0) / ratedReviews.length).toFixed(1)
    : null;

  const stats = {
    total: reviews.length,
    avgRating,
    ratedCount: ratedReviews.length,
    googleReviewsSent: reviews.filter(r => r.google_review_sent).length,
    flaggedCount: reviews.filter(r => r.negative_feedback_flagged).length,
    noResponse: reviews.filter(r => r.rating === null).length,
  };

  const formatted = reviews.map(r => ({
    id: r.id,
    jobId: r.job_id,
    jobType: r.job_type,
    jobDate: r.job_date,
    clientName: r.client_name,
    clientEmail: r.client_email,
    rating: r.rating,
    feedbackText: r.feedback_text,
    emailThread: JSON.parse(r.email_thread || '[]'),
    googleReviewSent: Boolean(r.google_review_sent),
    negativeFlagged: Boolean(r.negative_feedback_flagged),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  res.json({ stats, reviews: formatted });
});

// GET /api/reviews/flagged - Get negative/flagged reviews
router.get('/flagged', authenticateToken, (req, res) => {
  const db = getDb();

  const reviews = db.prepare(`
    SELECT r.*, j.job_type, j.job_date,
           c.name as client_name, c.email as client_email
    FROM reviews r
    JOIN jobs j ON r.job_id = j.id
    JOIN clients c ON j.client_id = c.id
    WHERE j.landscaper_id = ? AND r.negative_feedback_flagged = 1
    ORDER BY r.updated_at DESC
  `).all(req.landscaperId);

  res.json(reviews.map(r => ({
    id: r.id,
    jobId: r.job_id,
    jobType: r.job_type,
    jobDate: r.job_date,
    clientName: r.client_name,
    rating: r.rating,
    feedbackText: r.feedback_text,
    emailThread: JSON.parse(r.email_thread || '[]'),
    updatedAt: r.updated_at,
  })));
});

// GET /api/reviews/:jobId - Get review for specific job
router.get('/:jobId', authenticateToken, (req, res) => {
  const db = getDb();

  const review = db.prepare(`
    SELECT r.*, j.job_type, j.job_date,
           c.name as client_name, c.email as client_email
    FROM reviews r
    JOIN jobs j ON r.job_id = j.id
    JOIN clients c ON j.client_id = c.id
    WHERE r.job_id = ? AND j.landscaper_id = ?
  `).get(req.params.jobId, req.landscaperId);

  if (!review) return res.status(404).json({ error: 'Review not found' });

  res.json({
    id: review.id,
    jobId: review.job_id,
    jobType: review.job_type,
    jobDate: review.job_date,
    clientName: review.client_name,
    rating: review.rating,
    feedbackText: review.feedback_text,
    emailThread: JSON.parse(review.email_thread || '[]'),
    googleReviewSent: Boolean(review.google_review_sent),
    negativeFlagged: Boolean(review.negative_feedback_flagged),
    updatedAt: review.updated_at,
  });
});

// POST /api/reviews/simulate-response - Simulate client email response (for testing)
router.post('/simulate-response', authenticateToken, async (req, res) => {
  const { jobId, rating, message } = req.body;

  if (!jobId || rating === undefined) {
    return res.status(400).json({ error: 'jobId and rating are required' });
  }

  if (rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'Rating must be between 1 and 10' });
  }

  const db = getDb();

  // Verify the job belongs to this landscaper
  const job = db.prepare(
    'SELECT * FROM jobs WHERE id = ? AND landscaper_id = ?'
  ).get(jobId, req.landscaperId);

  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status === 'pending') {
    return res.status(400).json({ error: 'Job must be completed first (review_sent status)' });
  }

  try {
    const result = await handleClientResponse(jobId, rating, message || '');
    res.json({
      success: true,
      type: result.type,
      message: result.type === 'positive'
        ? 'Google review link sent to client'
        : 'Follow-up email sent to gather feedback',
      emailPreview: result.emailBody,
    });
  } catch (err) {
    console.error('Error handling client response:', err);
    res.status(500).json({ error: 'Failed to process response: ' + err.message });
  }
});

module.exports = router;
