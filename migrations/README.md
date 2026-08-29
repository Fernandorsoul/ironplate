# Database migrations

The schema is defined in `api/db/schema.ts` and versioned by Drizzle Kit.

- Generate a migration after changing the schema: `npm run db:generate`
- Apply migrations: set `DATABASE_URL_UNPOOLED` to a direct Neon connection and run `npm run db:migrate`

Do not use the pooled `DATABASE_URL` for migrations. The migration command rejects hostnames containing `-pooler`.
Test migrations on an isolated Neon branch before applying them to production.
