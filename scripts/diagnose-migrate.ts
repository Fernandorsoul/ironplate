/**
 * Read-only diagnostics for deploy migrate failures.
 * Run with DATABASE_URL_UNPOOLED. Does not mutate schema.
 */
import postgres from 'postgres';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error('DATABASE_URL_UNPOOLED is required');
  if (new URL(url).hostname.includes('-pooler')) {
    throw new Error('Use a direct (non-pooler) Neon URL');
  }

  const sql = postgres(url, { max: 1 });
  try {
    const journal = await sql`
      SELECT id, hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 20
    `;
    console.log('journal_rows', JSON.stringify(journal));

    const tables = await sql`
      SELECT to_regclass('professional_appointments') AS appointments,
             to_regclass('professional_student_links') AS links,
             to_regclass('professional_nutrition_plans') AS nutrition
    `;
    console.log('tables', JSON.stringify(tables));

    const extensions = await sql`
      SELECT extname, nspname
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE extname IN ('btree_gist', 'btree_gin', 'pgcrypto')
    `;
    console.log('extensions', JSON.stringify(extensions));

    const constraints = await sql`
      SELECT conname, contype
      FROM pg_constraint
      WHERE conname LIKE 'professional_appointments%'
    `;
    console.log('appointment_constraints', JSON.stringify(constraints));

    const overlaps = await sql`
      SELECT COUNT(*) AS live
      FROM professional_appointments
      WHERE status IN ('requested', 'confirmed', 'reschedule_proposed')
    `.catch(() => [{ live: 'table-missing' }]);
    console.log('live_appointments', JSON.stringify(overlaps));

    // Probe the exact exclusion expression on an empty-ish plan
    try {
      await sql`SELECT tstzrange(now() - make_interval(mins => 0), now() + make_interval(mins => 0), '[)')`;
      console.log('tstzrange_probe', 'ok');
    } catch (error: unknown) {
      console.log('tstzrange_probe', JSON.stringify(error));
    }
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    event: 'diagnose_migrate_failed',
    message: error instanceof Error ? error.message : String(error),
    code: (error as { code?: string })?.code,
    detail: (error as { detail?: string })?.detail,
    hint: (error as { hint?: string })?.hint,
  }));
  process.exitCode = 1;
});
