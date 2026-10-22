CREATE TABLE tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL CHECK (credits >= 0),
  created_at timestamptz NOT NULL
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('editor', 'viewer')),
  created_at timestamptz NOT NULL
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE drafts (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  author_id uuid NOT NULL REFERENCES users (id),
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX drafts_tenant_updated_idx ON drafts (tenant_id, updated_at DESC);

CREATE TABLE jobs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants (id),
  created_by uuid NOT NULL REFERENCES users (id),
  draft_id uuid REFERENCES drafts (id),
  title text NOT NULL,
  prompt text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  failure_code text CHECK (failure_code IS NULL OR failure_code IN ('insufficient_credits', 'worker_error')),
  object_key text,
  credit_cost integer NOT NULL CHECK (credit_cost > 0),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT jobs_success_has_object CHECK (status <> 'succeeded' OR object_key IS NOT NULL)
);

CREATE INDEX jobs_tenant_created_idx ON jobs (tenant_id, created_at DESC);
CREATE INDEX jobs_queued_created_idx ON jobs (created_at) WHERE status = 'queued';
