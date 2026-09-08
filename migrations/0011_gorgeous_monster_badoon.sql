DROP INDEX "administrative_identifiers_hash_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "administrative_identifiers_hash_idx" ON "administrative_identifiers" USING btree ("value_hash");