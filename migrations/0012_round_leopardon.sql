DO $$ BEGIN
  ALTER TABLE "professional_nutrition_plan_versions" DROP CONSTRAINT IF EXISTS "professional_nutrition_plan_versions_created_by_users_id_fk";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "professional_student_links" DROP CONSTRAINT IF EXISTS "professional_student_links_requested_by_users_id_fk";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;--> statement-breakpoint
-- Postgres truncates identifiers > 63 chars; resolve the actual name then drop.
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'professional_training_executions'::regclass
    AND contype = 'f'
    AND conname LIKE 'professional_training_executions_plan_version%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE professional_training_executions DROP CONSTRAINT %I', cname);
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "professional_training_plan_versions" DROP CONSTRAINT IF EXISTS "professional_training_plan_versions_created_by_users_id_fk";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "professional_nutrition_plan_versions" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_student_links" ALTER COLUMN "requested_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_training_plan_versions" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "professional_nutrition_plan_versions" ADD CONSTRAINT "professional_nutrition_plan_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "professional_student_links" ADD CONSTRAINT "professional_student_links_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "professional_training_executions" ADD CONSTRAINT "professional_training_executions_plan_version_id_professional_t" FOREIGN KEY ("plan_version_id") REFERENCES "public"."professional_training_plan_versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "professional_training_plan_versions" ADD CONSTRAINT "professional_training_plan_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
