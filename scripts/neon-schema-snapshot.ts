/**
 * Read-only schema snapshot for the appointments migration.
 * Safe on pooled or direct Neon URLs. Does not mutate.
 */
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
  if (!url) throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required');
  const pooled = new URL(url).hostname.includes('-pooler');
  console.log(JSON.stringify({ event: 'connect_mode', mode: pooled ? 'pooled-read-only' : 'direct' }));

  const sql = postgres(url, { max: 1 });
  try {
    const journal = await sql`
      SELECT hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 5
    `;
    console.log(JSON.stringify({ event: 'journal', rows: journal }));

    const tables = await sql`
      SELECT c.relname AS table
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname LIKE 'professional_%'
      ORDER BY 1
    `;
    console.log(JSON.stringify({ event: 'professional_tables', tables }));

    const constraints = await sql`
      SELECT conrelid::regclass::text AS table, conname, contype
      FROM pg_constraint
      WHERE conname LIKE 'professional_appointments%'
      ORDER BY 1, 2
    `;
    console.log(JSON.stringify({ event: 'appointment_constraints', constraints }));

    const ext = await sql`
      SELECT extname FROM pg_extension WHERE extname = 'btree_gist'
    `;
    console.log(JSON.stringify({ event: 'btree_gist', installed: ext.length > 0 }));

    const live = await sql`
      SELECT COUNT(*)::int AS live
      FROM professional_appointments
      WHERE status IN ('requested', 'confirmed', 'reschedule_proposed')
    `.catch(() => [{ live: -1 }]);
    console.log(JSON.stringify({ event: 'live_appointments', live }));

    // Immutable-only exclusion probe (the form we will ship)
    try {
      await sql`SELECT 1 FROM professional_appointments WHERE false`;
      console.log(JSON.stringify({ event: 'exclude_probe_plan', note: 'table readable' }));
    } catch (error: unknown) {
      console.log(JSON.stringify({
        event: 'exclude_probe_plan_error',
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    event: 'snapshot_failed',
    message: error instanceof Error ? error.message : String(error),
    code: (error as { code?: string })?.code,
  }));
  process.exitCode = 1;
});
