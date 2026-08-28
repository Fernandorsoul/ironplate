import { defineConfig } from 'drizzle-kit';

const migrationUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  schema: './api/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Generation is offline. scripts/migrate.ts rejects this placeholder and
    // requires DATABASE_URL_UNPOOLED before applying migrations.
    url: migrationUrl || 'postgresql://migration-only:invalid@localhost/ironplate',
  },
  strict: true,
  verbose: true,
});
