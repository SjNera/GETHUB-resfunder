-- Tables the app adds next to schema.sql (frozen) and auth-schema.sql (Better Auth).
-- Idempotent. Apply: npm run db:apply:app. Needs schema.sql and auth-schema.sql applied first.

-- One appeal per response, filed by the respondent after the researcher rejected a review.
create table if not exists appeals (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references responses (id),
  text text not null,
  status text not null default 'open' check (status in ('open', 'paid', 'kept')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- Sign-up answers of a user (age range, region and so on). One row per user.
create table if not exists profiles (
  user_id text primary key references "user" ("id") on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
