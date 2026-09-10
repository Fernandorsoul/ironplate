import { readFileSync } from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Tables created only by the legacy 005 script (outside the Drizzle journal).
 * 0004+ reference them; without this bootstrap a clean database fails deploy.
 */
async function ensureFoundationSchema(client: postgres.Sql): Promise<void> {
  const bootstrapPath = path.join(
    process.cwd(),
    'migrations',
    '000_bootstrap_professional_foundation.sql',
  );
  const sql = readFileSync(bootstrapPath, 'utf8');
  const statements = sql
    .split(/;\s*(?:--> statement-breakpoint)?/)
    .map(part => part.trim())
    .filter(part => part.length > 0 && !part.startsWith('--'));
  for (const statement of statements) {
    await client.unsafe(statement);
  }
}

async function main(): Promise<void> {
  const migrationUrl = process.env.DATABASE_URL_UNPOOLED;
  if (!migrationUrl) {
    throw new Error('DATABASE_URL_UNPOOLED is required for schema migrations');
  }

  const hostname = new URL(migrationUrl).hostname;
  if (hostname.includes('-pooler')) {
    throw new Error('Migrations require a direct Neon connection, not a pooled -pooler URL');
  }

  const client = postgres(migrationUrl, { max: 1 });
  try {
    await ensureFoundationSchema(client);
    await migrate(drizzle(client), { migrationsFolder: './migrations' });
  } catch (error: unknown) {
    if (error && typeof error === 'object') {
      const err = error as {
        message?: string;
        query?: string;
        code?: string;
        detail?: string;
        hint?: string;
      };
      if (err.query) {
        console.error('Failed migration SQL:\n', err.query);
      }
      if (err.code || err.detail || err.hint) {
        console.error(JSON.stringify({
          event: 'db_migrate_failed',
          code: err.code,
          detail: err.detail,
          hint: err.hint,
        }));
      }
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
