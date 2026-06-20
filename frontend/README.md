# FGFTI Church Attendance & Lyrics System

Full Gospel Faith Temple Inc. — Church App
Built with React + Vite + TypeScript (frontend) and Node.js + Express + TypeScript (backend), using Neon PostgreSQL.

---

## Prerequisites

- Node.js 18+
- npm 9+
- A [Neon](https://neon.tech) PostgreSQL account (free tier works)
- A [Render](https://render.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)

---

## Local Development Setup

### 1. Clone and Install

```bash
# Root
mkdir church-app && cd church-app

# Backend
mkdir backend && cd backend
# Paste all backend files here
npm install

# Frontend
cd ../
mkdir frontend && cd frontend
# Paste all frontend files here
npm install
```

### 2. Set Up Neon Database

1. Go to [neon.tech](https://neon.tech) → Create a project → Create a database
2. Copy the **connection string** (it looks like `postgresql://user:pass@host/dbname?sslmode=require`)
3. In the Neon SQL Editor, paste and run the entire contents of `database/migration.sql`

### 3. Backend Environment

```bash
# In /backend, create .env
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://your-neon-connection-string
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS=[localhost](http://localhost:5173)
```

### 4. Run Backend

```bash
cd backend
npm run dev
# Runs on [localhost](http://localhost:4000)
# Test: [localhost](http://localhost:4000/health)
```

### 5. Frontend Environment

```bash
# In /frontend, create .env
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=
# Leave empty for local dev — Vite proxy handles it
```

### 6. Run Frontend

```bash
cd frontend
npm run dev
# Runs on [localhost](http://localhost:5173)
```

Open `[localhost](http://localhost:5173)` — the app should be fully functional locally.

---

## Deployment

### Step 1 — Deploy Backend to Render

1. Push `/backend` to a GitHub repository
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Configure:
   - **Name**: `church-app-backend`
   - **Root Directory**: `backend` (if monorepo) or leave blank
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
   - **Instance Type**: Free

5. Add **Environment Variables** in Render dashboard:
   ```
   DATABASE_URL     = your-neon-connection-string
   NODE_ENV         = production
   ALLOWED_ORIGINS  = [your-app.vercel.app](https://your-app.vercel.app)
   PORT             = 4000
   ```

6. After first deploy, note your Render URL:
   `[church-app-backend.onrender.com](https://church-app-backend.onrender.com)`

7. Run the database migration once via Render Shell or locally:
   ```bash
   cd backend
   DATABASE_URL="your-neon-url" npm run migrate
   ```

### Step 2 — Deploy Frontend to Vercel

1. Push `/frontend` to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (if monorepo) or leave blank
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. Add **Environment Variable** in Vercel dashboard:
   ```
   VITE_API_URL = [church-app-backend.onrender.com](https://church-app-backend.onrender.com)
   ```

5. Deploy → Vercel gives you a URL like `[church-app.vercel.app](https://church-app.vercel.app)`

### Step 3 — Update CORS on Render

Go back to Render → Environment Variables → update:
```
ALLOWED_ORIGINS = [church-app.vercel.app](https://church-app.vercel.app)
```

Then redeploy the backend (Render does this automatically on save).

---

## Keeping Render Warm (Cold Start Fix)

The frontend pings `/health` on every page load (see `App.tsx`).
For production, consider using [UptimeRobot](https://uptimerobot.com) (free) to ping your Render URL every 5 minutes.

---

## Folder Structure

```
church-app/
├── frontend/          # React + Vite + TypeScript → deploy to Vercel
├── backend/           # Node.js + Express + TypeScript → deploy to Render
├── database/
│   └── migration.sql  # Run once on Neon
└── README.md
```

---

## Logo

Place your `logo.png` (the FGFTI logo) in `frontend/public/logo.png`.

---

## Features Summary

| Feature | Status |
|---|---|
| Sunday attendance registration | ✅ |
| Duplicate detection (case-insensitive) | ✅ |
| Edit & delete attendance with confirmation | ✅ |
| Attendance dashboard & stats | ✅ |
| CSV export by date or month | ✅ |
| Printable attendance sheet | ✅ |
| Song library with search | ✅ |
| Inline chord notation `[G]` | ✅ |
| Chord transposition (up/down/select key) | ✅ |
| Sharp & flat support | ✅ |
| Slash chords (G/B, D/F#) | ✅ |
| Song sections (Verse, Chorus, Bridge…) | ✅ |
| Printable song sheet | ✅ |
| Export song as .txt | ✅ |
| Mobile-friendly layout | ✅ |
| Toast notifications | ✅ |
| Confirm modals for delete | ✅ |
| Rate limiting | ✅ |
| SQL injection prevention | ✅ |
| Server-side timestamps | ✅ |

---

## Color Palette

| Name | Hex |
|---|---|
| Primary Blue | `#5B7FA6` |
| Dark Navy | `#1A1A1A` |
| Light Blue BG | `#EAF0F7` |
| Border Gray | `#D1D9E0` |
| White | `#FFFFFF` |
