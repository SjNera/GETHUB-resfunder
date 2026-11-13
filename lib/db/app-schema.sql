-- Tables the app adds next to schema.sql (frozen) and auth-schema.sql (Better Auth).
-- Idempotent. Apply: npm run db:apply:app. Needs schema.sql and auth-schema.sql applied first.

-- Sign-up answers of a user (age range, region and so on). One row per user.
create table if not exists profiles (
  user_id text primary key references "user" ("id") on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
