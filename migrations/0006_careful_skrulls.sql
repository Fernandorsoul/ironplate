CREATE TABLE "professional_appointment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"appointment_id" text NOT NULL,
	"actor_user_id" text,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"metadata_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"student_id" text NOT NULL,
	"link_id" text NOT NULL,
	"appointment_type" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"time_zone" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"buffer_before_minutes" integer DEFAULT 0 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"hold_expires_at" timestamp with time zone,
	"proposed_slots_json" text,
	"neutral_title" text DEFAULT 'Atendimento' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_availability_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"appointment_type" text NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"time_zone" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"slot_interval_minutes" integer NOT NULL,
	"buffer_before_minutes" integer DEFAULT 0 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"minimum_notice_minutes" integer DEFAULT 720 NOT NULL,
	"maximum_booking_days" integer DEFAULT 90 NOT NULL,
	"effective_from" text NOT NULL,
	"effective_until" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_user_id" text NOT NULL,
	"actor_user_id" text,
	"appointment_id" text,
	"notification_type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_schedule_blockouts" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"recurrence" text DEFAULT 'single' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"weekday" integer,
	"start_time" text,
	"end_time" text,
	"time_zone" text NOT NULL,
	"effective_from" text,
	"effective_until" text,
	"reason_category" text DEFAULT 'other' NOT NULL,
	"private_reason" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "professional_appointment_events" ADD CONSTRAINT "professional_appointment_events_appointment_id_professional_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."professional_appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_appointment_events" ADD CONSTRAINT "professional_appointment_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_appointments" ADD CONSTRAINT "professional_appointments_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_appointments" ADD CONSTRAINT "professional_appointments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_appointments" ADD CONSTRAINT "professional_appointments_link_id_professional_student_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."professional_student_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_availability_rules" ADD CONSTRAINT "professional_availability_rules_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_notifications" ADD CONSTRAINT "professional_notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_notifications" ADD CONSTRAINT "professional_notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_notifications" ADD CONSTRAINT "professional_notifications_appointment_id_professional_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."professional_appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_schedule_blockouts" ADD CONSTRAINT "professional_schedule_blockouts_professional_id_users_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "professional_appointment_events_appointment_idx" ON "professional_appointment_events" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "professional_appointments_professional_idx" ON "professional_appointments" USING btree ("professional_id","starts_at");--> statement-breakpoint
CREATE INDEX "professional_appointments_student_idx" ON "professional_appointments" USING btree ("student_id","starts_at");--> statement-breakpoint
CREATE INDEX "professional_appointments_link_idx" ON "professional_appointments" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "professional_availability_rules_professional_idx" ON "professional_availability_rules" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "professional_availability_rules_lookup_idx" ON "professional_availability_rules" USING btree ("professional_id","appointment_type","weekday");--> statement-breakpoint
CREATE INDEX "professional_notifications_recipient_idx" ON "professional_notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "professional_schedule_blockouts_professional_idx" ON "professional_schedule_blockouts" USING btree ("professional_id");--> statement-breakpoint
CREATE INDEX "professional_schedule_blockouts_single_idx" ON "professional_schedule_blockouts" USING btree ("professional_id","starts_at","ends_at");
--> statement-breakpoint
ALTER TABLE "professional_availability_rules" ADD CONSTRAINT "professional_availability_rules_weekday_check" CHECK (weekday BETWEEN 0 AND 6);
--> statement-breakpoint
ALTER TABLE "professional_availability_rules" ADD CONSTRAINT "professional_availability_rules_time_check" CHECK (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND end_time > start_time);
--> statement-breakpoint
ALTER TABLE "professional_availability_rules" ADD CONSTRAINT "professional_availability_rules_limits_check" CHECK (duration_minutes > 0 AND slot_interval_minutes > 0 AND buffer_before_minutes >= 0 AND buffer_after_minutes >= 0 AND minimum_notice_minutes >= 0 AND maximum_booking_days > 0);
--> statement-breakpoint
ALTER TABLE "professional_availability_rules" ADD CONSTRAINT "professional_availability_rules_type_check" CHECK (appointment_type IN ('nutrition_consultation', 'nutrition_assessment', 'fitness_session', 'fitness_assessment'));
--> statement-breakpoint
ALTER TABLE "professional_availability_rules" ADD CONSTRAINT "professional_availability_rules_effective_dates_check" CHECK (effective_until IS NULL OR effective_until >= effective_from);
--> statement-breakpoint
ALTER TABLE "professional_schedule_blockouts" ADD CONSTRAINT "professional_schedule_blockouts_shape_check" CHECK (
	(recurrence = 'single' AND starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at > starts_at AND weekday IS NULL AND start_time IS NULL AND end_time IS NULL)
	OR
	(recurrence = 'weekly' AND starts_at IS NULL AND ends_at IS NULL AND weekday BETWEEN 0 AND 6 AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time AND effective_from IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "professional_schedule_blockouts" ADD CONSTRAINT "professional_schedule_blockouts_values_check" CHECK (recurrence IN ('single', 'weekly') AND status IN ('active', 'cancelled') AND reason_category IN ('vacation', 'holiday', 'conference', 'personal', 'other') AND (effective_until IS NULL OR effective_until >= effective_from));
--> statement-breakpoint
ALTER TABLE "professional_appointments" ADD CONSTRAINT "professional_appointments_interval_check" CHECK (ends_at > starts_at AND duration_minutes > 0 AND buffer_before_minutes >= 0 AND buffer_after_minutes >= 0);
--> statement-breakpoint
ALTER TABLE "professional_appointments" ADD CONSTRAINT "professional_appointments_type_check" CHECK (appointment_type IN ('nutrition_consultation', 'nutrition_assessment', 'fitness_session', 'fitness_assessment'));
--> statement-breakpoint
ALTER TABLE "professional_appointments" ADD CONSTRAINT "professional_appointments_status_check" CHECK (status IN ('requested', 'confirmed', 'declined', 'reschedule_proposed', 'cancelled_by_student', 'cancelled_by_professional', 'completed', 'no_show', 'expired'));
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "professional_appointments" ADD CONSTRAINT "professional_appointments_no_overlap" EXCLUDE USING gist (
	professional_id WITH =,
	tstzrange(
		starts_at - make_interval(mins => buffer_before_minutes),
		ends_at + make_interval(mins => buffer_after_minutes),
		'[)'
	) WITH &&
) WHERE (status IN ('requested', 'confirmed', 'reschedule_proposed'));
