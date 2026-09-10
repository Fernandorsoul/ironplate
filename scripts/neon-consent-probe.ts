import postgres from 'postgres';

function loadEnv(): void {
  if (process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED) return;
  try {
    process.loadEnvFile('.env');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const sql = postgres(url, { max: 1 });
  try {
    const tables = await sql`
      SELECT c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND c.relname IN ('consent_records', 'administrative_identifiers', 'professional_appointments', 'professional_nutrition_plans')
      ORDER BY 1
    `;
    console.log(JSON.stringify({ tables }));

    const indexes = await sql`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND (indexname LIKE '%consent%' OR indexname LIKE '%administrative%')
      ORDER BY 1, 2
    `;
    console.log(JSON.stringify({ indexes }));

    const journal = await sql`
      SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 8
    `;
    console.log(JSON.stringify({ journal }));
  } finally {
    await sql.end();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
