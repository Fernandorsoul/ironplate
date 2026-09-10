import { readFileSync } from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/**
 * Tables created only by the legacy 005 script (outside the Drizzle journal).
 * 0004+ reference them; without this bootstrap a clean database fails deploy.
 */
function splitSqlStatements(sql: string): string[] {
  const withoutLineComments = sql
    .split('\n')
    .map(line => {
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
  return withoutLineComments
    .split(';')
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

async function ensureFoundationSchema(client: postgres.Sql): Promise<void> {
  const bootstrapPath = path.join(
    process.cwd(),
    'migrations',
    '000_bootstrap_professional_foundation.sql',
  );
  const sql = readFileSync(bootstrapPath, 'utf8');
  for (const statement of splitSqlStatements(sql)) {
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
    const dump = (err: unknown, depth = 0): void => {
      if (!err || typeof err !== 'object' || depth > 4) return;
      const e = err as {
        message?: string;
        name?: string;
        query?: string;
        code?: string;
        detail?: string;
        hint?: string;
        severity?: string;
        cause?: unknown;
        errors?: unknown[];
      };
      console.error(JSON.stringify({
        event: 'db_migrate_error',
        depth,
        name: e.name,
        message: e.message,
        code: e.code,
        severity: e.severity,
        detail: e.detail,
        hint: e.hint,
        query: e.query?.slice(0, 2000),
      }));
      if (e.cause) dump(e.cause, depth + 1);
      if (Array.isArray(e.errors)) {
        for (const child of e.errors) dump(child, depth + 1);
      }
    };
    dump(error);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
