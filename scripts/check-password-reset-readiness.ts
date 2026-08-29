import { neon } from '@neondatabase/serverless';

interface ReadinessRow {
  table_exists: boolean;
  hash_column_ready: boolean;
  hash_index_ready: boolean;
}

function loadLocalEnvironment(): void {
  if (process.env.DATABASE_URL) return;
  try {
    process.loadEnvFile('.env');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function main(): Promise<void> {
  loadLocalEnvironment();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
      ) AS table_exists,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'password_reset_tokens'
          AND column_name = 'token_hash'
          AND is_nullable = 'NO'
      ) AS hash_column_ready,
      EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'password_reset_tokens'
          AND indexname = 'password_reset_tokens_hash_unique'
      ) AS hash_index_ready
  ` as unknown as ReadinessRow[];

  const schema = rows[0];
  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.RESET_EMAIL_FROM && process.env.APP_URL,
  );
  const schemaReady = Boolean(
    schema?.table_exists && schema.hash_column_ready && schema.hash_index_ready,
  );
  const migrationConnectionConfigured = Boolean(process.env.DATABASE_URL_UNPOOLED);

  console.log(JSON.stringify({
    schemaReady,
    emailConfigured,
    migrationConnectionConfigured,
    schema,
  }));
  if (!schemaReady || !emailConfigured || !migrationConnectionConfigured) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
