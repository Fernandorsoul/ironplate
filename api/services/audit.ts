import { randomUUID } from 'crypto';

export async function writeAuditLog(
  sql: any,
  event: {
    actorUserId?: string | null;
    subjectUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await sql`
    INSERT INTO audit_logs (
      id, actor_user_id, subject_user_id, action, entity_type, entity_id, metadata_json
    ) VALUES (
      ${randomUUID()}, ${event.actorUserId ?? null}, ${event.subjectUserId ?? null},
      ${event.action}, ${event.entityType}, ${event.entityId},
      ${event.metadata ? JSON.stringify(event.metadata) : null}
    )
  `;
}
