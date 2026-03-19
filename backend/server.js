require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');
const { startScheduler } = require('./services/schedulerService');

// Initialize DB on startup, then start background scheduler
initializeDatabase();
startScheduler();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/landscaper', require('./routes/landscaper'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/reviews', require('./routes/reviews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🌿 Landscaper Review System backend running on http://localhost:${PORT}`);
    console.log(`   Anthropic configured: ${process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'sk-ant-your_key_here' ? '✅' : '❌ (AI will be simulated)'}`);
    console.log(`   Resend configured:    ${process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_your_key_here' ? '✅' : '⚠️  (emails logged to console)'}`);
    console.log(`   Twilio configured:    ${process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_account_sid' ? '✅' : '⚠️  (WhatsApp will be simulated)'}`);
    console.log(`   Review delay:         ${process.env.REVIEW_DELAY_HOURS ?? '2'}h`);
  });
}

module.exports = app;
