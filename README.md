# Infinity Marketing & Advertisement — Fullstack Website

Complete rebuild: static frontend (8 pages) + Node/Express backend + PostgreSQL + JWT auth + AI chatbot (OpenAI-backed) + admin CMS routes for blog/case studies + client dashboard.

## Folder structure
```
infinity-fullstack/
├── frontend/          → static site (HTML/CSS/JS), served by the backend
├── backend/           → Node/Express API, PostgreSQL, auth, chatbot
└── docker-compose.yml → one-command local Postgres + backend
```

## Option A — Run with Docker (easiest)
Requires Docker Desktop installed.

```bash
cd infinity-fullstack
docker compose up --build
```

Then run migrations once (in a new terminal, while containers are running):
```bash
docker compose exec backend node src/db/migrate.js
```

Visit: **http://localhost:5000** — this serves the full site AND the API from one server.

## Option B — Run locally without Docker
Requires Node.js 18+ and a local PostgreSQL server running.

```bash
cd infinity-fullstack/backend
cp .env.example .env
# edit .env: set DATABASE_URL to your local Postgres, set JWT_SECRET,
# and optionally set OPENAI_API_KEY for the live chatbot

npm install
npm run migrate     # creates all tables
npm run dev          # starts server on http://localhost:5000
```

Visit **http://localhost:5000** — the backend serves the frontend directly from `../frontend`.

## Enabling the live AI chatbot
Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`) in `backend/.env`. Without a key, the chatbot still works end-to-end (session created, messages logged) but replies with a safe fallback message instead of a live AI answer.

## Creating an admin account
Set `ADMIN_SIGNUP_CODE` in `.env` to a private invite code, then sign up via:
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@infinitymarketing.london","password":"changeme123","adminCode":"YOUR_CODE"}'
```

## API summary
| Route | Method | Auth | Purpose |
|---|---|---|---|
| /api/auth/signup, /login, /logout, /me | — | mixed | Auth |
| /api/auth/forgot-password, /reset-password | POST | public | Password reset |
| /api/leads | POST | public | Contact/careers/newsletter forms |
| /api/leads | GET | admin | View captured leads |
| /api/chat | POST | public | AI chatbot message |
| /api/chat/lead | POST | public | Capture lead from chatbot |
| /api/blog | GET | public | Published posts |
| /api/blog | POST/PUT/DELETE | admin | Manage posts |
| /api/case-studies | GET | public | Published case studies |
| /api/case-studies | POST/PUT/DELETE | admin | Manage case studies |
| /api/dashboard/reports | GET | client/admin | Client campaign reports |

## Deploying
- **Frontend+Backend together (simplest):** deploy the whole `backend/` folder (it serves `frontend/` too) to Render/Railway/AWS, with a managed PostgreSQL add-on.
- **Split:** deploy `frontend/` as static hosting (Netlify/Vercel) and `backend/` separately (Render/Railway); update `CLIENT_ORIGIN` in `.env` and `API_BASE` in `frontend/assets/js/main.js` to point at the deployed backend URL.

## Notes
- Passwords are hashed with bcrypt; JWTs are signed and expire per `JWT_EXPIRES_IN`.
- Rate limiting is applied to auth and chat endpoints.
- `helmet`'s CSP is disabled for local dev (Tailwind/Google Fonts via CDN) — tighten this for production.
- This is a working local/dev-ready fullstack app; production hardening (HTTPS, secrets management, email delivery for password reset, image uploads) still needs to be added before going live.
# infinity-fullstack
