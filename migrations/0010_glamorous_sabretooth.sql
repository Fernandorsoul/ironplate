DELETE FROM "administrative_identifiers";--> statement-breakpoint
ALTER TABLE "administrative_identifiers" ADD COLUMN "encrypted_value" text NOT NULL;--> statement-breakpoint
ALTER TABLE "administrative_identifiers" ADD COLUMN "encryption_iv" text NOT NULL;--> statement-breakpoint
ALTER TABLE "administrative_identifiers" ADD COLUMN "encryption_tag" text NOT NULL;--> statement-breakpoint
ALTER TABLE "administrative_identifiers" ADD COLUMN "encryption_key_version" text DEFAULT 'v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "administrative_identifiers" ADD COLUMN "purpose" text NOT NULL;--> statement-breakpoint
ALTER TABLE "administrative_identifiers" ADD COLUMN "authorized_at" timestamp with time zone DEFAULT now() NOT NULL;
