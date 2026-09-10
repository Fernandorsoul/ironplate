import fs from 'fs';
import path from 'path';

/**
 * Postgres rejects STABLE functions (timestamptz +/- interval) in exclusion
 * expressions with SQLSTATE 42P17. The no-overlap constraint must use the
 * raw instant range only.
 */
describe('appointment overlap exclusion constraint', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'migrations', '0006_careful_skrulls.sql'),
    'utf8',
  );

  it('does not call make_interval inside the gist exclusion expression', () => {
    const excludeBlock = sql.slice(sql.indexOf('professional_appointments_no_overlap'));
    expect(excludeBlock).toContain('tstzrange(starts_at, ends_at');
    expect(excludeBlock).not.toContain('make_interval');
  });

  it('is idempotent for retry after a partial apply', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "professional_appointments"');
    expect(sql).toContain('EXCEPTION WHEN duplicate_object THEN NULL');
  });
});
