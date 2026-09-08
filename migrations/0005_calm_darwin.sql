CREATE TABLE "professional_exercises" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_professional_id" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"muscle_groups_json" text NOT NULL,
	"equipment" text,
	"modality" text NOT NULL,
	"instructions" text NOT NULL,
	"media_url" text,
	"source_attribution" text,
	"safety_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_training_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_version_id" text NOT NULL,
	"student_id" text NOT NULL,
	"workout_id" text,
	"session_id" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"results_json" text NOT NULL,
	"perceived_exertion" double precision,
	"feedback" text,
	"performed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_training_plan_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"version" integer NOT NULL,
	"sessions_json" text NOT NULL,
	"change_summary" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "professional_training_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"student_id" text NOT NULL,
	"link_id" text NOT NULL,
	"title" text NOT NULL,
	"objective" text,
	"starts_on" text,
	"ends_on" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"published_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "consent_records" ADD COLUMN "scopes_json" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_nutrition_plans" ADD COLUMN "published_version" integer;--> statement-breakpoint
UPDATE professional_nutrition_plans
SET published_version = current_version
WHERE status = 'published' AND published_version IS NULL;--> statement-breakpoint
ALTER TABLE "professional_exercises" ADD CONSTRAINT "professional_exercises_owner_professional_id_users_id_fk" FOREIGN KEY ("owner_professional_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_training_executions" ADD CONSTRAINT "professional_training_executions_plan_version_id_professional_training_plan_versions_id_fk" FOREIGN KEY ("plan_version_id") REFERENCES "public"."professional_training_plan_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_training_executions" ADD CONSTRAINT "professional_training_executions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_training_executions" ADD CONSTRAINT "professional_training_executions_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_training_plan_versions" ADD CONSTRAINT "professional_training_plan_versions_plan_id_professional_training_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."professional_training_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_training_plan_versions" ADD CONSTRAINT "professional_training_plan_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_training_plans" ADD CONSTRAINT "professional_training_plans_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_training_plans" ADD CONSTRAINT "professional_training_plans_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_training_plans" ADD CONSTRAINT "professional_training_plans_link_id_professional_student_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."professional_student_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "professional_exercises_owner_idx" ON "professional_exercises" USING btree ("owner_professional_id");--> statement-breakpoint
CREATE INDEX "professional_exercises_visibility_idx" ON "professional_exercises" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "professional_training_executions_student_idx" ON "professional_training_executions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "professional_training_executions_version_idx" ON "professional_training_executions" USING btree ("plan_version_id");--> statement-breakpoint
CREATE INDEX "professional_training_executions_workout_idx" ON "professional_training_executions" USING btree ("workout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_training_plan_versions_unique" ON "professional_training_plan_versions" USING btree ("plan_id","version");--> statement-breakpoint
CREATE INDEX "professional_training_plan_versions_plan_idx" ON "professional_training_plan_versions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "professional_training_plans_professional_idx" ON "professional_training_plans" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "professional_training_plans_student_idx" ON "professional_training_plans" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "professional_training_plans_link_idx" ON "professional_training_plans" USING btree ("link_id");
--> statement-breakpoint
INSERT INTO professional_exercises (
  id, owner_professional_id, visibility, name, description, muscle_groups_json,
  equipment, modality, instructions, source_attribution, safety_notes
) VALUES
  (
    'global-barbell-squat', NULL, 'global', 'Agachamento livre',
    'Movimento composto de agachamento com barra.', '["quadriceps","glutes","core"]',
    'Barra e rack', 'strength',
    'Ajuste a barra, mantenha os pes apoiados e execute a amplitude prescrita pelo profissional.',
    'IronPlate - catalogo educacional proprio',
    'A carga, a amplitude e eventuais adaptacoes devem ser definidas por profissional habilitado.'
  ),
  (
    'global-bench-press', NULL, 'global', 'Supino reto',
    'Movimento de empurrar realizado em banco horizontal.', '["chest","triceps","shoulders"]',
    'Banco e barra', 'strength',
    'Mantenha apoio estavel no banco e siga a cadencia e a amplitude prescritas.',
    'IronPlate - catalogo educacional proprio',
    'Utilize presilhas e apoio de seguranca quando houver carga externa.'
  ),
  (
    'global-bent-over-row', NULL, 'global', 'Remada curvada',
    'Movimento de puxar com inclinacao do tronco.', '["back","biceps","core"]',
    'Barra', 'strength',
    'Estabilize o tronco e puxe a barra conforme a trajetoria prescrita.',
    'IronPlate - catalogo educacional proprio',
    'Interrompa o exercicio se nao conseguir manter a posicao orientada pelo profissional.'
  ),
  (
    'global-deadlift', NULL, 'global', 'Levantamento terra',
    'Movimento composto de extensao de quadril e joelhos.', '["hamstrings","glutes","back","core"]',
    'Barra', 'strength',
    'Posicione a barra e execute a subida mantendo o controle indicado na prescricao.',
    'IronPlate - catalogo educacional proprio',
    'Tecnica e progressao de carga devem ser supervisionadas por profissional habilitado.'
  ),
  (
    'global-front-plank', NULL, 'global', 'Prancha frontal',
    'Exercicio isometrico para estabilidade do tronco.', '["core"]',
    'Peso corporal', 'strength',
    'Mantenha o alinhamento corporal pelo tempo prescrito, respirando normalmente.',
    'IronPlate - catalogo educacional proprio',
    'Encerre a serie se perder o alinhamento definido pelo profissional.'
  )
ON CONFLICT (id) DO NOTHING;
