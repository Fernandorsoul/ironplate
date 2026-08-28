import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

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
    await migrate(drizzle(client), { migrationsFolder: './migrations' });
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
