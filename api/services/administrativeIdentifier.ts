import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, randomUUID } from 'crypto';
import { administrativeIdentifierPostSchema, validationError } from '../middleware/validation';
import { writeAuditLog } from './audit';

function hashIdentifier(value: string): string {
  const pepper = process.env.ADMIN_IDENTIFIER_PEPPER;
  if (!pepper) throw new Error('ADMIN_IDENTIFIER_PEPPER is not configured');
  return createHash('sha256').update(`${pepper}:${value}`).digest('hex');
}

export async function handleAdministrativeIdentifier(
  req: VercelRequest,
  res: VercelResponse,
  sql: any,
  userId: string,
): Promise<void> {
  if (req.method === 'GET') {
    const rows = await sql`
      SELECT identifier_type, last_four, created_at, updated_at
      FROM administrative_identifiers WHERE user_id = ${userId}
    `;
    res.status(200).json(rows);
    return;
  }

  const parsed = administrativeIdentifierPostSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }
  const valueHash = hashIdentifier(parsed.data.value);
  const lastFour = parsed.data.value.slice(-4);
  const existing = await sql`
    SELECT id FROM administrative_identifiers
    WHERE user_id = ${userId} AND identifier_type = ${parsed.data.identifierType}
  `;
  const id = existing[0]?.id || randomUUID();
  await sql`
    INSERT INTO administrative_identifiers (
      id, user_id, identifier_type, value_hash, last_four, updated_at
    ) VALUES (
      ${id}, ${userId}, ${parsed.data.identifierType}, ${valueHash}, ${lastFour}, NOW()
    )
    ON CONFLICT (user_id, identifier_type) DO UPDATE SET
      value_hash = EXCLUDED.value_hash,
      last_four = EXCLUDED.last_four,
      updated_at = NOW()
  `;
  await writeAuditLog(sql, {
    actorUserId: userId,
    subjectUserId: userId,
    action: 'administrative_identifier.updated',
    entityType: 'administrative_identifier',
    entityId: id,
    metadata: { identifierType: parsed.data.identifierType, lastFour },
  });
  res.status(200).json({ identifierType: parsed.data.identifierType, lastFour });
}
