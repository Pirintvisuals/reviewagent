# 🌿 Landscaper Review System

A complete web application for landscaping businesses to manage clients and automatically collect Google reviews using AI-powered email conversations.

## Features

- **Client Management** — Add, edit, and track all your clients
- **Job Tracking** — Create jobs, mark them complete with one tap
- **AI Review Emails** — Claude generates natural, British-tone emails automatically
- **Smart Routing** — Ratings 6+ get a Google review link; below 6 get a follow-up
- **Dashboard** — See your stats, pending jobs, and alerts at a glance
- **Mobile-First** — Designed for use on a phone in a van

---

## Quick Start

### Prerequisites
- Node.js 18+ ([download](https://nodejs.org))
- npm

### 1. Install backend dependencies
```bash
npm install
```

### 2. Install frontend dependencies
```bash
cd frontend && npm install && cd ..
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```
ANTHROPIC_API_KEY=sk-ant-your_key_here
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=onboarding@resend.dev   # Use this for testing
JWT_SECRET=any-random-string-here
```

**Getting API keys:**
- **Anthropic**: https://console.anthropic.com → API Keys
- **Resend**: https://resend.com → API Keys (free tier: 100 emails/day)
  - For testing, use `FROM_EMAIL=onboarding@resend.dev` (no domain verification needed)
  - For production, verify your domain and use your own `FROM_EMAIL`

> ⚠️ **No API keys?** The app works without them — emails are logged to the console and AI text is skipped. Great for testing the UI.

### 4. Seed demo data
```bash
npm run seed
```

### 5. Run the app

**Terminal 1 — Backend:**
```bash
npm run server
```

**Terminal 2 — Frontend:**
```bash
cd frontend && npm run dev
```

Open **http://localhost:5173** and log in with `demo@example.com`

---

## Testing the Full Flow

1. **Login** with `demo@example.com`
2. **Dashboard** — See 3 pending jobs, 2 awaiting response, 5 with ratings
3. **Mark a job complete** — Click "Complete" on any pending job → AI email is generated and sent
4. **Go to Jobs → View a "Review Sent" job** → Click **"Simulate Client Response"**
5. **Set rating 7+** → Watch Claude generate a Google review request email
6. **Set rating 3** → Watch Claude generate an empathetic follow-up email
7. **Reviews page** — See all results, flagged negatives highlighted in red

---

## File Structure

```
landscaper-review-system/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── database.js            # SQLite setup & schema
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js            # POST /api/auth/login
│   │   ├── landscaper.js      # GET/PUT /api/landscaper/profile
│   │   ├── clients.js         # CRUD /api/clients
│   │   ├── jobs.js            # CRUD /api/jobs + complete endpoint
│   │   └── reviews.js         # GET /api/reviews + simulate
│   ├── services/
│   │   ├── aiService.js       # Claude API email generation
│   │   ├── emailService.js    # Resend email sending
│   │   └── reviewService.js   # Review flow orchestration
│   └── utils/
│       └── seed.js            # Demo data generator
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Router setup
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Clients.jsx
│   │   │   ├── Jobs.jsx
│   │   │   ├── JobDetail.jsx  # Email thread + simulate response
│   │   │   ├── Reviews.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── StatsCard.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── Toast.jsx
│   │   └── utils/
│   │       └── api.js         # All API calls
│   └── vite.config.js         # Proxies /api to backend
├── .env.example
├── package.json
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (creates account if new) |
| GET | `/api/landscaper/profile` | Get business details |
| PUT | `/api/landscaper/profile` | Update business name + Google link |
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Add client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |
| GET | `/api/jobs` | List jobs (filter: `?status=pending`) |
| POST | `/api/jobs` | Create job |
| POST | `/api/jobs/:id/complete` | **Mark complete + trigger AI email** |
| GET | `/api/jobs/:id` | Job details with email thread |
| GET | `/api/reviews` | All reviews + stats |
| POST | `/api/reviews/simulate-response` | Simulate client rating reply |

---

## Deployment (Railway / Render)

1. Push code to GitHub
2. Connect repo to Railway or Render
3. Set environment variables in the dashboard
4. For the frontend, build with `cd frontend && npm run build`
5. Serve `frontend/dist` as static files (or deploy separately to Netlify/Vercel)

For Railway (full-stack):
- Set `PORT` to Railway's provided port
- The SQLite DB is stored as `backend/landscaper.db`
- Add a persistent volume for the DB file if needed

---

## Customisation

- **Email tone** — Edit prompts in `backend/services/aiService.js`
- **Rating threshold** — Change `rating < 6` in `backend/services/reviewService.js`
- **Job types** — Edit the `JOB_TYPES` array in `frontend/src/pages/Jobs.jsx`
- **Colours** — Change `green` to any Tailwind colour in components

---

## Troubleshooting

**"Email failed"** — Check your Resend API key and `FROM_EMAIL`. Use `onboarding@resend.dev` for testing without domain verification.

**"Invalid or expired token"** — Clear localStorage and log in again.

**AI email not generating** — Check `ANTHROPIC_API_KEY` in `.env`. Without it, you'll see an error in the terminal.

**Port conflicts** — Backend runs on 3001, frontend on 5173. Change in `.env` and `vite.config.js`.
