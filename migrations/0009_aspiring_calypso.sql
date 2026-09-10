CREATE TABLE "professional_link_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"professional_roles_json" text NOT NULL,
	"purpose" text NOT NULL,
	"scopes_json" text NOT NULL,
	"consent_version" text NOT NULL,
	"duration_days" integer NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by" text,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "consent_records_link_unique";--> statement-breakpoint
ALTER TABLE "consent_records" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consent_records" ADD COLUMN "changed_by" text;--> statement-breakpoint
ALTER TABLE "professional_student_links" ADD COLUMN "requested_scopes_json" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_student_links" ADD COLUMN "professional_roles_json" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_student_links" ADD COLUMN "origin" text DEFAULT 'invite_link' NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_student_links" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "professional_student_links" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "professional_student_links" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "professional_student_links" ADD COLUMN "last_action_by" text;--> statement-breakpoint
ALTER TABLE "professional_student_links" ALTER COLUMN "status" SET DEFAULT 'invited';--> statement-breakpoint
ALTER TABLE "professional_link_invitations" ADD CONSTRAINT "professional_link_invitations_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_link_invitations" ADD CONSTRAINT "professional_link_invitations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "professional_link_invitations_token_unique" ON "professional_link_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "professional_link_invitations_professional_idx" ON "professional_link_invitations" USING btree ("professional_id","created_at");--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_student_links" ADD CONSTRAINT "professional_student_links_last_action_by_users_id_fk" FOREIGN KEY ("last_action_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_records_link_created_idx" ON "consent_records" USING btree ("link_id","created_at");
--> statement-breakpoint
WITH latest AS (
  SELECT DISTINCT ON (link_id) link_id, scopes_json
  FROM consent_records
  ORDER BY link_id, created_at DESC, id DESC
)
UPDATE professional_student_links l
SET requested_scopes_json = latest.scopes_json,
    professional_roles_json = CASE
      WHEN latest.scopes_json::jsonb ? 'nutrition' AND latest.scopes_json::jsonb ? 'training'
        THEN '["nutritionist","fitness_professional"]'
      WHEN latest.scopes_json::jsonb ? 'nutrition' THEN '["nutritionist"]'
      WHEN latest.scopes_json::jsonb ? 'training' THEN '["fitness_professional"]'
      ELSE '["nutritionist","fitness_professional"]'
    END,
    origin = 'legacy_direct',
    activated_at = CASE WHEN l.status = 'active' THEN l.updated_at ELSE NULL END,
    last_action_by = l.student_id,
    status = CASE WHEN l.status = 'pending' THEN 'invited' ELSE l.status END
FROM latest
WHERE latest.link_id = l.id;
--> statement-breakpoint
UPDATE consent_records c
SET changed_by = CASE WHEN c.status = 'requested' THEN l.requested_by ELSE c.subject_user_id END,
    scopes_json = (
      SELECT jsonb_agg(DISTINCT expanded.scope)::text
      FROM jsonb_array_elements_text(c.scopes_json::jsonb) original(scope)
      CROSS JOIN LATERAL (
        SELECT scope WHERE scope NOT IN ('nutrition', 'training')
        UNION ALL SELECT unnest(ARRAY['nutrition_data', 'meals_adherence', 'meal_plans', 'weight', 'body_measurements'])
          WHERE scope = 'nutrition'
        UNION ALL SELECT unnest(ARRAY['prescribed_training', 'training_execution', 'weight', 'body_measurements'])
          WHERE scope = 'training'
      ) expanded
    )
FROM professional_student_links l
WHERE l.id = c.link_id AND c.scopes_json::jsonb ?| ARRAY['nutrition', 'training'];
--> statement-breakpoint
UPDATE consent_records c
SET changed_by = CASE WHEN c.status = 'requested' THEN l.requested_by ELSE c.subject_user_id END
FROM professional_student_links l
WHERE l.id = c.link_id AND c.changed_by IS NULL;
--> statement-breakpoint
UPDATE professional_student_links
SET status = 'invited', origin = 'legacy_direct'
WHERE status = 'pending';
--> statement-breakpoint
WITH latest AS (
  SELECT DISTINCT ON (link_id) link_id, scopes_json
  FROM consent_records
  ORDER BY link_id, created_at DESC, id DESC
)
UPDATE professional_student_links l
SET requested_scopes_json = latest.scopes_json
FROM latest
WHERE latest.link_id = l.id;
--> statement-breakpoint
ALTER TABLE professional_link_invitations
  ADD CONSTRAINT professional_link_invitations_status_check
  CHECK (status IN ('issued', 'accepted', 'declined', 'expired'));
--> statement-breakpoint
ALTER TABLE professional_link_invitations
  ADD CONSTRAINT professional_link_invitations_duration_check
  CHECK (duration_days BETWEEN 1 AND 3650);
--> statement-breakpoint
ALTER TABLE professional_student_links
  ADD CONSTRAINT professional_student_links_status_check
  CHECK (status IN ('invited', 'active', 'revoked', 'declined', 'expired'));
--> statement-breakpoint
ALTER TABLE professional_student_links
  ADD CONSTRAINT professional_student_links_origin_check
  CHECK (origin IN ('invite_link', 'invite_qr', 'legacy_direct'));
--> statement-breakpoint
ALTER TABLE consent_records
  ADD CONSTRAINT consent_records_status_check
  CHECK (status IN ('requested', 'granted', 'revoked', 'declined', 'expired'));
