import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import {
  administrativeIdentifierPostSchema,
  administrativeIdentifierSearchSchema,
  validationError,
} from '../middleware/validation';
import { encryptCpf, hashCpfForLookup, lookupHashCandidates, maskCpf } from '../security/cpf';
import { writeAuditLog } from './audit';

export async function handleAdministrativeIdentifier(
  req: VercelRequest,
  res: VercelResponse,
  sql: any,
  userId: string,
): Promise<void> {
  if (req.method === 'GET') {
    const rows = await sql`
      SELECT identifier_type, last_four, purpose, authorized_at, created_at, updated_at
      FROM administrative_identifiers WHERE user_id = ${userId}
    `;
    res.status(200).json((rows as Record<string, any>[]).map(row => ({
      identifierType: row.identifier_type,
      maskedValue: maskCpf(row.last_four),
      purpose: row.purpose,
      authorizedAt: row.authorized_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })));
    return;
  }

  if (req.method === 'DELETE') {
    const removed = await sql`
      DELETE FROM administrative_identifiers
      WHERE user_id = ${userId} AND identifier_type = 'cpf'
      RETURNING id
    `;
    if (removed.length > 0) {
      await writeAuditLog(sql, {
        actorUserId: userId,
        subjectUserId: userId,
        action: 'administrative_identifier.removed',
        entityType: 'administrative_identifier',
        entityId: removed[0].id,
      });
    }
    res.status(200).json({ removed: removed.length > 0 });
    return;
  }

  const parsed = administrativeIdentifierPostSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }
  const activeLinks = await sql`
    SELECT l.id
    FROM professional_student_links l
    JOIN LATERAL (
      SELECT status, scopes_json, expires_at FROM consent_records
      WHERE link_id = l.id ORDER BY created_at DESC, id DESC LIMIT 1
    ) c ON TRUE
    WHERE l.student_id = ${userId} AND l.status = 'active' AND c.status = 'granted'
      AND c.scopes_json::jsonb ? 'basic_profile'
      AND (l.expires_at IS NULL OR l.expires_at > NOW())
      AND (c.expires_at IS NULL OR c.expires_at > NOW())
    LIMIT 1
  `;
  if (activeLinks.length === 0) {
    res.status(403).json({ error: 'Active professional link required' });
    return;
  }

  const encrypted = encryptCpf(parsed.data.value);
  const lookup = hashCpfForLookup(parsed.data.value);
  // Store only the digits required to render the masked suffix (minimization).
  const lastFour = parsed.data.value.slice(-4);
  const lastTwo = lastFour.slice(-2);
  const existing = await sql`
    SELECT id FROM administrative_identifiers
    WHERE user_id = ${userId} AND identifier_type = ${parsed.data.identifierType}
  `;
  const id = existing[0]?.id || randomUUID();
  try {
    await sql`
      INSERT INTO administrative_identifiers (
        id, user_id, identifier_type, value_hash, value_hash_key_version,
        encrypted_value, encryption_iv, encryption_tag, encryption_key_version,
        last_four, purpose, authorized_at, updated_at
      ) VALUES (
        ${id}, ${userId}, ${parsed.data.identifierType}, ${lookup.hash}, ${lookup.keyVersion},
        ${encrypted.encryptedValue}, ${encrypted.iv}, ${encrypted.tag}, ${encrypted.keyVersion},
        ${lastTwo}, ${parsed.data.purpose}, NOW(), NOW()
      )
      ON CONFLICT (user_id, identifier_type) DO UPDATE SET
        value_hash = EXCLUDED.value_hash,
        value_hash_key_version = EXCLUDED.value_hash_key_version,
        encrypted_value = EXCLUDED.encrypted_value,
        encryption_iv = EXCLUDED.encryption_iv, encryption_tag = EXCLUDED.encryption_tag,
        encryption_key_version = EXCLUDED.encryption_key_version, last_four = EXCLUDED.last_four,
        purpose = EXCLUDED.purpose, authorized_at = NOW(), updated_at = NOW()
    `;
  } catch (error: any) {
    // Unique violations can mean "already stored for this user" or "held by another
    // account". A distinct message would let an authenticated caller enumerate which
    // CPFs exist system-wide, so both cases share one non-informative response.
    if (error?.code === '23505') {
      res.status(409).json({ error: 'Unable to save administrative identifier' });
      return;
    }
    throw error;
  }
  await writeAuditLog(sql, {
    actorUserId: userId,
    subjectUserId: userId,
    action: 'administrative_identifier.updated',
    entityType: 'administrative_identifier',
    entityId: id,
    metadata: { identifierType: parsed.data.identifierType, purpose: parsed.data.purpose },
  });
  res.status(200).json({ identifierType: parsed.data.identifierType, maskedValue: maskCpf(lastTwo) });
}

export async function handleAdministrativeIdentifierSearch(
  req: VercelRequest,
  res: VercelResponse,
  sql: any,
  professionalId: string,
): Promise<void> {
  const parsed = administrativeIdentifierSearchSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error.issues);
    return;
  }
  const candidates = lookupHashCandidates(parsed.data.value).map(item => item.hash);
  const rows = await sql`
    SELECT ai.id, ai.user_id, ai.last_four, u.name, l.id AS link_id
    FROM administrative_identifiers ai
    JOIN users u ON u.id = ai.user_id
    JOIN professional_student_links l
      ON l.student_id = ai.user_id AND l.professional_id = ${professionalId} AND l.status = 'active'
    JOIN LATERAL (
      SELECT status, scopes_json, expires_at FROM consent_records
      WHERE link_id = l.id ORDER BY created_at DESC, id DESC LIMIT 1
    ) c ON c.status = 'granted' AND c.scopes_json::jsonb ? 'basic_profile'
    WHERE ai.identifier_type = 'cpf' AND ai.value_hash = ANY(${candidates})
      AND (l.expires_at IS NULL OR l.expires_at > NOW())
      AND (c.expires_at IS NULL OR c.expires_at > NOW())
      AND EXISTS (
        SELECT 1 FROM professional_credentials pc
        JOIN user_roles ur ON ur.user_id = pc.user_id AND ur.role = pc.professional_role
        WHERE pc.user_id = ${professionalId} AND pc.status = 'verified' AND ur.status = 'active'
          AND l.professional_roles_json::jsonb ? pc.professional_role
      )
    LIMIT 1
  `;
  const match = rows[0] as Record<string, any> | undefined;
  await writeAuditLog(sql, {
    actorUserId: professionalId,
    subjectUserId: match?.user_id,
    action: 'administrative_identifier.searched',
    entityType: 'professional_student_link',
    entityId: match?.link_id || professionalId,
    metadata: { identifierType: 'cpf', purpose: parsed.data.purpose, matched: !!match },
  });
  res.status(200).json({
    match: match ? {
      studentId: match.user_id,
      displayName: match.name,
      maskedValue: maskCpf(match.last_four),
    } : null,
  });
}
