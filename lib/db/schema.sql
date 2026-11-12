-- FROZEN. Changes need all three devs to agree. Source: docs/TDD.md section 8.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE surveys (
  survey_id             BIGINT PRIMARY KEY,           -- assigned by the contract
  researcher            TEXT NOT NULL,                -- lowercase wallet
  questions_json        JSONB NOT NULL,
  survey_hash           TEXT NOT NULL,
  rate_wei              NUMERIC(78,0) NOT NULL,
  quota                 INTEGER NOT NULL,
  deadline_unix         BIGINT NOT NULL,
  fee_per_response_wei  NUMERIC(78,0) NOT NULL,
  tx_hash               TEXT NOT NULL UNIQUE,         -- funding transaction
  status                TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  paused                BOOLEAN NOT NULL DEFAULT FALSE,
  refunded_wei          NUMERIC(78,0),
  close_tx_hash         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id     BIGINT NOT NULL REFERENCES surveys(survey_id),
  wallet        TEXT NOT NULL,                        -- lowercase
  email         TEXT NOT NULL,                        -- trimmed, lowercase
  email_hash    TEXT NOT NULL,
  answers_json  JSONB NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        TEXT NOT NULL DEFAULT 'received'
                CHECK (status IN ('received','processing','paid','blocked','review')),
  UNIQUE (survey_id, wallet),
  UNIQUE (survey_id, email_hash)
);

CREATE TABLE decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id     UUID NOT NULL UNIQUE REFERENCES responses(id),
  result          TEXT NOT NULL CHECK (result IN ('pay','review','dont_pay')),
  reasons         JSONB NOT NULL,                     -- string[]
  reason_hash     TEXT NOT NULL,
  signals         JSONB NOT NULL,
  ai_result       JSONB,
  llm_model       TEXT,
  rubric_version  TEXT NOT NULL,
  status          TEXT NOT NULL
                  CHECK (status IN ('pending','sent','confirmed','failed','off_chain')),
  tx_hash         TEXT,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX responses_survey_idx ON responses (survey_id, submitted_at DESC);
