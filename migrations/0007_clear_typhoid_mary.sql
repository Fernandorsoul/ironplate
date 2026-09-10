ALTER TABLE "professional_appointments" ADD COLUMN "previous_status" text;--> statement-breakpoint
ALTER TABLE "professional_appointments" ADD COLUMN "origin" text DEFAULT 'student_request' NOT NULL;--> statement-breakpoint
ALTER TABLE "professional_availability_rules" ADD COLUMN "request_hold_minutes" integer DEFAULT 1440 NOT NULL;
--> statement-breakpoint
ALTER TABLE "professional_availability_rules" ADD CONSTRAINT "professional_availability_rules_hold_check" CHECK (request_hold_minutes BETWEEN 5 AND 20160);
--> statement-breakpoint
ALTER TABLE "professional_appointments" ADD CONSTRAINT "professional_appointments_origin_check" CHECK (origin IN ('student_request', 'professional_reschedule'));
--> statement-breakpoint
ALTER TABLE "professional_appointments" ADD CONSTRAINT "professional_appointments_previous_status_check" CHECK (previous_status IS NULL OR previous_status IN ('requested', 'confirmed'));
