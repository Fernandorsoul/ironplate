CREATE TABLE "professional_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"professional_role" text NOT NULL,
	"registration_type" text NOT NULL,
	"registration_number" text NOT NULL,
	"registration_region" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "professional_credentials_user_role_unique" ON "professional_credentials" USING btree ("user_id","professional_role");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_credentials_registration_unique" ON "professional_credentials" USING btree ("registration_type","registration_number","registration_region");--> statement-breakpoint
CREATE INDEX "professional_credentials_user_idx" ON "professional_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_role_unique" ON "user_roles" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "user_roles_user_idx" ON "user_roles" USING btree ("user_id");
--> statement-breakpoint
INSERT INTO user_roles (id, user_id, role, status)
SELECT 'role-' || md5(id || ':student'), id, 'student', 'active'
FROM users
ON CONFLICT (user_id, role) DO NOTHING;
--> statement-breakpoint
INSERT INTO user_roles (id, user_id, role, status)
SELECT 'role-' || md5(id || ':admin_verifier'), id, 'admin_verifier', 'active'
FROM users WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;
--> statement-breakpoint
INSERT INTO professional_credentials (
	id, user_id, professional_role, registration_type, registration_number,
	registration_region, status, verified_at, created_at, updated_at
)
SELECT
	'credential-' || md5(p.id), p.user_id,
	CASE WHEN UPPER(p.registration_type) = 'CRN' THEN 'nutritionist' ELSE 'fitness_professional' END,
	UPPER(p.registration_type), p.registration_number, p.registration_region,
	CASE WHEN p.status = 'approved' THEN 'verified' WHEN p.status = 'rejected' THEN 'rejected' ELSE 'pending' END,
	CASE WHEN p.status = 'approved' THEN p.updated_at ELSE NULL END,
	p.created_at, p.updated_at
FROM professional_profiles p
WHERE UPPER(p.registration_type) IN ('CRN', 'CREF')
ON CONFLICT (user_id, professional_role) DO NOTHING;
--> statement-breakpoint
INSERT INTO user_roles (id, user_id, role, status)
SELECT
	'role-' || md5(c.user_id || ':' || c.professional_role), c.user_id, c.professional_role,
	CASE WHEN c.status = 'verified' THEN 'active' ELSE c.status END
FROM professional_credentials c
ON CONFLICT (user_id, role) DO NOTHING;
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_check" CHECK (role IN ('student', 'nutritionist', 'fitness_professional', 'admin_verifier'));
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_status_check" CHECK (status IN ('active', 'pending', 'rejected', 'suspended'));
--> statement-breakpoint
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_role_check" CHECK (professional_role IN ('nutritionist', 'fitness_professional'));
--> statement-breakpoint
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_status_check" CHECK (status IN ('pending', 'verified', 'rejected', 'suspended'));
--> statement-breakpoint
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_registration_check" CHECK (
	(professional_role = 'nutritionist' AND registration_type = 'CRN')
	OR (professional_role = 'fitness_professional' AND registration_type = 'CREF')
);
