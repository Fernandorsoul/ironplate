CREATE TABLE IF NOT EXISTS "body_measurements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"weight" double precision NOT NULL,
	"height" double precision,
	"body_fat" double precision,
	"body_fat_method" text DEFAULT 'visual',
	"resistance" double precision,
	"reactance" double precision,
	"phase_angle" double precision,
	"muscle_mass" double precision,
	"skeletal_muscle" double precision,
	"water_percent" double precision,
	"water_kg" double precision,
	"bone_mass" double precision,
	"protein_percent" double precision,
	"protein_mass" double precision,
	"basal_metabolism" double precision,
	"visceral_fat" double precision,
	"triceps" double precision,
	"biceps" double precision,
	"subscapular" double precision,
	"suprailiac" double precision,
	"abdominal" double precision,
	"chest_skinfold" double precision,
	"axillary_mid" double precision,
	"thigh_skinfold" double precision,
	"calf_skinfold" double precision,
	"arm_relaxed_right" double precision,
	"arm_relaxed_left" double precision,
	"arm_flexed_right" double precision,
	"arm_flexed_left" double precision,
	"forearm_right" double precision,
	"forearm_left" double precision,
	"wrist_right" double precision,
	"wrist_left" double precision,
	"chest_circumference" double precision,
	"waist_circumference" double precision,
	"abdomen_circumference" double precision,
	"hip_circumference" double precision,
	"thigh_proximal_right" double precision,
	"thigh_proximal_left" double precision,
	"thigh_mid_right" double precision,
	"thigh_mid_left" double precision,
	"calf_right" double precision,
	"calf_left" double precision,
	"ankle_right" double precision,
	"ankle_left" double precision,
	"lean_mass" double precision,
	"fat_mass" double precision,
	"bmi" double precision,
	"waist_hip_ratio" double precision,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_foods" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"calories" double precision DEFAULT 0 NOT NULL,
	"protein" double precision DEFAULT 0 NOT NULL,
	"carbs" double precision DEFAULT 0 NOT NULL,
	"fat" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"weight" double precision,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meal_foods" (
	"id" text PRIMARY KEY NOT NULL,
	"meal_id" text NOT NULL,
	"food_id" text NOT NULL,
	"food_name" text NOT NULL,
	"food_category" text,
	"grams" double precision NOT NULL,
	"calories" double precision DEFAULT 0 NOT NULL,
	"protein" double precision DEFAULT 0 NOT NULL,
	"carbs" double precision DEFAULT 0 NOT NULL,
	"fat" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meal_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"goal" text NOT NULL,
	"total_calories" double precision DEFAULT 0 NOT NULL,
	"total_protein" double precision DEFAULT 0 NOT NULL,
	"total_carbs" double precision DEFAULT 0 NOT NULL,
	"total_fat" double precision DEFAULT 0 NOT NULL,
	"meals_json" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meals" (
	"id" text PRIMARY KEY NOT NULL,
	"daily_log_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"timing" text NOT NULL,
	"time" text,
	"total_calories" double precision DEFAULT 0 NOT NULL,
	"total_protein" double precision DEFAULT 0 NOT NULL,
	"total_carbs" double precision DEFAULT 0 NOT NULL,
	"total_fat" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"age" integer,
	"weight" double precision,
	"height" double precision,
	"gender" text DEFAULT 'male',
	"activity_level" text DEFAULT 'moderate',
	"goal" text DEFAULT 'maintenance',
	"sport" text DEFAULT 'bodybuilding',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weight_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"weight" double precision NOT NULL,
	"body_fat" double precision
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workouts" (
	"id" text PRIMARY KEY NOT NULL,
	"daily_log_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"intensity" text DEFAULT 'medium' NOT NULL,
	"time" text
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "token_hash" text;--> statement-breakpoint
UPDATE "password_reset_tokens" SET "used" = true, "token_hash" = 'legacy-' || "id" WHERE "token_hash" IS NULL;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ALTER COLUMN "token_hash" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'password_reset_tokens' AND column_name = 'token') THEN
    ALTER TABLE "password_reset_tokens" ALTER COLUMN "token" DROP NOT NULL;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'body_measurements_user_id_users_id_fk') THEN
    ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_foods_user_id_users_id_fk') THEN
    ALTER TABLE "custom_foods" ADD CONSTRAINT "custom_foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_logs_user_id_users_id_fk') THEN
    ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_foods_meal_id_meals_id_fk') THEN
    ALTER TABLE "meal_foods" ADD CONSTRAINT "meal_foods_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meal_plans_user_id_users_id_fk') THEN
    ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meals_daily_log_id_daily_logs_id_fk') THEN
    ALTER TABLE "meals" ADD CONSTRAINT "meals_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meals_user_id_users_id_fk') THEN
    ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_user_id_users_id_fk') THEN
    ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weight_history_user_id_users_id_fk') THEN
    ALTER TABLE "weight_history" ADD CONSTRAINT "weight_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workouts_daily_log_id_daily_logs_id_fk') THEN
    ALTER TABLE "workouts" ADD CONSTRAINT "workouts_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "body_measurements_user_date_unique" ON "body_measurements" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "body_measurements_user_id_idx" ON "body_measurements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_foods_user_id_idx" ON "custom_foods" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_logs_user_date_unique" ON "daily_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "daily_logs_user_id_idx" ON "daily_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meal_foods_meal_id_idx" ON "meal_foods" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meal_plans_user_id_idx" ON "meal_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meals_daily_log_id_idx" ON "meals" USING btree ("daily_log_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_hash_unique" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "weight_history_user_date_unique" ON "weight_history" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weight_history_user_id_idx" ON "weight_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workouts_daily_log_id_idx" ON "workouts" USING btree ("daily_log_id");
