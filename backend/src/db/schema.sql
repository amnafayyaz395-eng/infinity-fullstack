-- ============================================================
-- Infinity Marketing & Advertisement — Database Schema (PostgreSQL)
-- Run with: npm run migrate   (executes this file against DATABASE_URL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- Users (client + admin login) ----------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('client','admin')),
  company       VARCHAR(160),
  reset_token       TEXT,
  reset_token_expires TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Leads (contact form, careers form, chatbot capture) ----------
CREATE TABLE IF NOT EXISTS leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120),
  email       VARCHAR(160),
  phone       VARCHAR(40),
  company     VARCHAR(160),
  goal        VARCHAR(60),          -- increase sales / brand awareness / generate leads / careers / other
  message     TEXT,
  source      VARCHAR(30) NOT NULL DEFAULT 'contact_form', -- contact_form | careers_form | chatbot | newsletter
  status      VARCHAR(20) NOT NULL DEFAULT 'new', -- new | contacted | qualified | closed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Chat sessions + logs (AI chatbot) ----------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  page_url    TEXT
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        VARCHAR(10) NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Blog posts (CMS-driven, admin managed) ----------
CREATE TABLE IF NOT EXISTS blog_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        VARCHAR(200) NOT NULL,
  slug         VARCHAR(220) UNIQUE NOT NULL,
  category     VARCHAR(60),
  excerpt      TEXT,
  content      TEXT NOT NULL,
  cover_image  TEXT,
  author_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  published    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Case studies (admin managed) ----------
CREATE TABLE IF NOT EXISTS case_studies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name  VARCHAR(160) NOT NULL,
  sector       VARCHAR(60),
  title        VARCHAR(200) NOT NULL,
  challenge    TEXT,
  approach     TEXT,
  stats        JSONB,           -- e.g. [{"value":"+34%","label":"acquisition"}]
  cover_image  TEXT,
  published    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Client campaign reports (client dashboard placeholder data) ----------
CREATE TABLE IF NOT EXISTS campaign_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_name VARCHAR(160) NOT NULL,
  week_ending  DATE NOT NULL,
  reps_deployed INT DEFAULT 0,
  conversions   INT DEFAULT 0,
  territory     VARCHAR(120),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_reports_user ON campaign_reports(user_id, week_ending DESC);
