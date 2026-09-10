import fs from 'fs';
import path from 'path';

/**
 * Drizzle postgres-js migrator splits on `--> statement-breakpoint` when the
 * journal sets breakpoints: true. Multi-statement files without markers are
 * sent as one prepared query and fail at deploy (see 0004_breezy_scourge).
 */
describe('drizzle migration breakpoints', () => {
  const journal = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'migrations', 'meta', '_journal.json'), 'utf8'),
  ) as { entries: Array<{ tag: string; breakpoints?: boolean }> };

  it('splits every multi-statement journal migration on statement-breakpoint', () => {
    const offenders: string[] = [];

    for (const entry of journal.entries) {
      if (!entry.breakpoints) continue;
      const file = path.join(process.cwd(), 'migrations', `${entry.tag}.sql`);
      const sql = fs.readFileSync(file, 'utf8');
      const statements = sql
        .split(/;\s*(?:--> statement-breakpoint)?/)
        .map(part => part.trim())
        .filter(part => part.length > 0 && !part.startsWith('--'));
      if (statements.length > 1 && !sql.includes('--> statement-breakpoint')) {
        offenders.push(entry.tag);
      }
    }

    expect(offenders).toEqual([]);
  });
});
