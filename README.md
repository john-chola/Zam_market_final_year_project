# 🪵 ZamMarket — Sprint 1

**A Progressive Web Application for local Zambian charcoal commerce**
University of Zambia · Final Year Project · 2026

---

## Project Structure

```
zammarket/
├── backend/          # Node.js + Express + MongoDB API
└── frontend/         # React 18 + Redux Toolkit + Tailwind-inspired CSS
```

---

## Prerequisites

Install these before starting:

1. **Node.js 18+** — https://nodejs.org (download LTS version)
2. **MongoDB Atlas account** — https://cloud.mongodb.com (free tier)
3. **Git** — https://git-scm.com

---

## Backend Setup

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Open `.env` and fill in your MongoDB Atlas connection string:
```
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/zammarket
JWT_SECRET=pick_any_long_random_string_here
```

**Getting your MongoDB URI:**
- Log in to MongoDB Atlas → Clusters → Connect → Connect your application
- Copy the connection string and replace `<password>` with your DB user password

### 3. Start the backend
```bash
npm run dev        # development (auto-restarts on changes)
# or
npm start          # production
```

Backend runs on: http://localhost:5000

### 4. Test it works
Open: http://localhost:5000/api/health
You should see: `{ "status": "ok", "message": "ZamMarket API is running" }`

---

## Frontend Setup

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Start the frontend
```bash
npm start
```

Frontend runs on: http://localhost:3000

---

## How Simulated OTP Works

Since we are using simulated OTP (no real SMS):

1. User enters their phone number on the Register page
2. They click "Send Verification Code"
3. **Look at your backend terminal** — you will see:
   ```
   ──────────────────────────────────────
   📱 SIMULATED OTP for +260977123456: 847291
   ──────────────────────────────────────
   ```
4. Enter that 6-digit code in the app

---

## API Endpoints (Sprint 1)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | No |
| POST | `/api/auth/request-otp` | Send OTP to phone | No |
| POST | `/api/auth/register` | Create account | No |
| POST | `/api/auth/login` | Log in | No |
| GET | `/api/auth/me` | Get current user | JWT |
| GET | `/api/users/:id` | Get user profile | No |
| PUT | `/api/users/me` | Update profile | JWT |
| PUT | `/api/users/me/upgrade-to-seller` | Become a seller | JWT |

---

## User Flows (Sprint 1)

### Registration (3 steps)
1. Enter Zambian phone number (Zamtel/Airtel/MTN)
2. Enter 6-digit OTP from server console
3. Fill in name, password, role (buyer/seller), neighbourhood

### Login
- Phone number + password → JWT token stored in localStorage

### Dashboard
- View profile, trust score, neighbourhood
- Buyers can upgrade to seller role
- Placeholders for Sprint 2 features (listings, browse)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Redux Toolkit, React Router 6 |
| Backend | Node.js, Express 4 |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT (7-day expiry) + bcrypt (12 rounds) |
| OTP | Simulated (console) → swap for Africa's Talking in Sprint 4 |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Sprint Roadmap

- ✅ **Sprint 1** — Auth, OTP, user profiles, roles ← *You are here*
- ⬜ **Sprint 2** — Charcoal listings, browse, search, neighbourhood filters
- ⬜ **Sprint 3** — Voice listing, offline PWA, blockchain trust score
- ⬜ **Sprint 4** — Real-time chat, offline message queue, admin panel
- ⬜ **Sprint 5** — Testing, Lighthouse audit, deployment, documentation

---

## Common Issues

**`ECONNREFUSED` on backend start?**
→ Check your `MONGODB_URI` in `.env` is correct

**OTP not appearing?**
→ Make sure you are watching the backend terminal, not the frontend

**CORS error?**
→ Make sure both servers are running (port 5000 + 3000)

---

*ZamMarket — UNZA School of Natural and Applied Sciences, Dept of Computing & Informatics*