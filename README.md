# VSN AI Music Generator

Free AI music & song generation. Type a prompt or lyrics, pick a genre, language and voice, and generate an AI-sung song in seconds — then edit, remix, download and share it.

Monorepo with two apps:

| Folder | What it is |
|---|---|
| `frontend/` | Next.js 16 (App Router, Tailwind v4, Framer Motion, Firebase client) |
| `backend/` | Express 5 API (generation via Hugging Face, Firebase Admin, quota, social features) |

## Local development

Requirements: Node 20+.

```bash
# 1. Backend (port 4000)
cd backend
npm install
cp .env.example .env        # default .env works: demo mode, no keys needed
npm run dev

# 2. Frontend (port 3000)
cd ../frontend
npm install
npm run dev
```

Open http://localhost:3000. Sign in with "Continue with demo" — the whole flow (generate, edit, remix, library, profiles, moderation) works without any API keys.

### Demo shortcuts

- Demo auth is automatic (token `demo-<uid>`). Every visitor gets a stable local identity.
- Demo admin: token `demo-admin` (uid `admin`) unlocks `/admin`.
- With no `HF_API_TOKEN`, generation uses a built-in synthesizer so songs still produce playable audio.

## Configuration

### Backend (`.env`)

| Key | Purpose |
|---|---|
| `HF_API_TOKEN` | Hugging Face Inference API token (kept server-side only) |
| `HF_MODEL_MUSIC` | Music model, default `facebook/musicgen-small` |
| `HF_MODEL_VOCAL` | Optional TTS model for sung vocals |
| `DEMO_MODE` | `1` allows demo tokens; `0` requires Firebase auth |
| `DAILY_LIMIT` | Daily generations per user (default 10, enforced server-side) |
| `ADMIN_UIDS` | Comma-separated UIDs allowed into `/api/admin` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin service-account JSON (enables Firestore + Storage) |
| `CORS_ORIGIN` | Allowed origins for the API |
| `PUBLIC_BASE_URL` | Absolute URL used to build audio URLs |

With no Firebase config the backend persists everything to `backend/data/db.json` and audio to `backend/uploads/`.

### Frontend (`frontend/.env.local`)

| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL (default `http://localhost:4000`) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for SEO (sitemap/robots/metadata) |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config (only needed when Firebase auth is enabled) |

## Deployment

### Frontend → Vercel

1. Push the repo, import `frontend/` as the project root in Vercel.
2. Set env vars: `NEXT_PUBLIC_API_URL` (backend URL), `NEXT_PUBLIC_SITE_URL`, and the `NEXT_PUBLIC_FIREBASE_*` keys if used.
3. Deploy. Static pages (`/`, `/discover`, `/signin`, …) are prerendered; user pages render on demand.

### Backend → Render

1. Import the repo, pick `backend/` as the root (or use `render.yaml` as a blueprint).
2. Build command `npm install`, start command `npm start`.
3. Set env vars from the table above. In production set `DEMO_MODE=0`, add real Firebase creds and an `HF_API_TOKEN`.

> Note: the free Render plan sleeps after inactivity and local `uploads/` + `data/db.json` storage is ephemeral — configure Firebase (Firestore + Storage bucket) for persistent data.

## Verification

```bash
# backend unit/integration checks
cd backend
node test-smoke.js
node test-integration.js seed   # seeds data first
node test-integration.js

# frontend checks
cd ../frontend
npm run lint
npx tsc --noEmit
npm run build
```

## Tech notes

- Next.js 16 breaking changes: `params`/`searchParams` are Promises; see `frontend/node_modules/next/dist/docs/`.
- React Compiler lint is strict: no sync `setState` in effects, no impure render calls (seeded randomness only), no manual memoization mismatches.
- Daily quota increments only after a successful generation; failures never burn credits.
