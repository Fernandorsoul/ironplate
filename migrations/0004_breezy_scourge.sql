CREATE TABLE IF NOT EXISTS professional_nutrition_plans (
  id TEXT PRIMARY KEY,
  professional_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  link_id TEXT NOT NULL REFERENCES professional_student_links(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  objective TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS professional_nutrition_plans_professional_idx ON professional_nutrition_plans(professional_id);
CREATE INDEX IF NOT EXISTS professional_nutrition_plans_student_idx ON professional_nutrition_plans(student_id);
CREATE INDEX IF NOT EXISTS professional_nutrition_plans_link_idx ON professional_nutrition_plans(link_id);

CREATE TABLE IF NOT EXISTS professional_nutrition_plan_versions (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES professional_nutrition_plans(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  meals_json TEXT NOT NULL,
  total_calories DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_protein DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_carbs DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_fat DOUBLE PRECISION NOT NULL DEFAULT 0,
  change_summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  CONSTRAINT professional_nutrition_plan_versions_unique UNIQUE (plan_id, version)
);
CREATE INDEX IF NOT EXISTS professional_nutrition_plan_versions_plan_idx ON professional_nutrition_plan_versions(plan_id);
