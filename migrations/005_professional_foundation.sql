ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';

CREATE TABLE IF NOT EXISTS professional_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  registration_type TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  registration_region TEXT NOT NULL,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT professional_profiles_user_unique UNIQUE (user_id),
  CONSTRAINT professional_profiles_registration_unique UNIQUE (registration_type, registration_number, registration_region)
);

CREATE TABLE IF NOT EXISTS professional_student_links (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  purpose TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT professional_student_links_pair_unique UNIQUE (professional_id, student_id)
);
CREATE INDEX IF NOT EXISTS professional_student_links_professional_idx ON professional_student_links(professional_id);
CREATE INDEX IF NOT EXISTS professional_student_links_student_idx ON professional_student_links(student_id);

CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL REFERENCES professional_student_links(id) ON DELETE CASCADE,
  subject_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT consent_records_link_unique UNIQUE (link_id)
);
CREATE INDEX IF NOT EXISTS consent_records_subject_idx ON consent_records(subject_user_id);

CREATE TABLE IF NOT EXISTS administrative_identifiers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  identifier_type TEXT NOT NULL,
  value_hash TEXT NOT NULL,
  last_four TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT administrative_identifiers_user_type_unique UNIQUE (user_id, identifier_type)
);
CREATE INDEX IF NOT EXISTS administrative_identifiers_hash_idx ON administrative_identifiers(value_hash);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  subject_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_subject_idx ON audit_logs(subject_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
