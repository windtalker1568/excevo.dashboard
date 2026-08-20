-- Run this in the Supabase SQL Editor before deploying the application.
create table if not exists public.dashboard_state (
  id text primary key,
  data jsonb not null default '{"people":[],"efficiency":[],"quality":[],"pips":[],"imports":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_state enable row level security;

-- The Express server uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- No browser-side access to this table is granted.
