import { writeAuditLog } from './audit';

export type UserRole = 'student' | 'nutritionist' | 'fitness_professional' | 'admin_verifier';
export type DataScope =
  | 'basic_profile'
  | 'nutrition_data'
  | 'meals_adherence'
  | 'meal_plans'
  | 'weight'
  | 'body_measurements'
  | 'prescribed_training'
  | 'training_execution'
  | 'scheduling';
export type AccessAction = 'read' | 'write' | 'manage';

export interface AuthorizationDecision {
  allowed: boolean;
  reason: 'self' | 'active_role' | 'active_consent' | 'missing_role' | 'missing_consent';
  linkId?: string;
}

const ROLE_POLICY: Record<
  DataScope,
  Record<AccessAction, Array<'nutritionist' | 'fitness_professional'>>
> = {
  basic_profile: {
    read: ['nutritionist', 'fitness_professional'],
    write: ['nutritionist', 'fitness_professional'],
    manage: ['nutritionist', 'fitness_professional'],
  },
  nutrition_data: {
    read: ['nutritionist'],
    write: ['nutritionist'],
    manage: ['nutritionist'],
  },
  meals_adherence: {
    read: ['nutritionist'],
    write: ['nutritionist'],
    manage: ['nutritionist'],
  },
  meal_plans: {
    read: ['nutritionist'],
    write: ['nutritionist'],
    manage: ['nutritionist'],
  },
  weight: {
    read: ['nutritionist', 'fitness_professional'],
    write: ['nutritionist', 'fitness_professional'],
    manage: ['nutritionist', 'fitness_professional'],
  },
  body_measurements: {
    read: ['nutritionist', 'fitness_professional'],
    write: ['nutritionist', 'fitness_professional'],
    manage: ['nutritionist', 'fitness_professional'],
  },
  prescribed_training: {
    read: ['fitness_professional'],
    write: ['fitness_professional'],
    manage: ['fitness_professional'],
  },
  training_execution: {
    read: ['fitness_professional'],
    write: ['fitness_professional'],
    manage: ['fitness_professional'],
  },
  scheduling: {
    read: ['nutritionist', 'fitness_professional'],
    write: ['nutritionist', 'fitness_professional'],
    manage: ['nutritionist', 'fitness_professional'],
  },
};

export async function hasActiveRole(sql: any, userId: string, roles: readonly UserRole[]): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM user_roles
    WHERE user_id = ${userId} AND role = ANY(${roles}) AND status = 'active'
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function hasVerifiedProfessionalRole(
  sql: any,
  userId: string,
  role: 'nutritionist' | 'fitness_professional',
): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM user_roles r
    JOIN professional_credentials c
      ON c.user_id = r.user_id AND c.professional_role = r.role
    WHERE r.user_id = ${userId} AND r.role = ${role} AND r.status = 'active'
      AND c.status = 'verified'
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function authorizeUserDataAccess(
  sql: any,
  input: {
    actorUserId: string;
    subjectUserId: string;
    scope: DataScope;
    action: AccessAction;
    recordAccess?: boolean;
  },
): Promise<AuthorizationDecision> {
  if (input.actorUserId === input.subjectUserId) return { allowed: true, reason: 'self' };
  const compatibleRoles = ROLE_POLICY[input.scope][input.action];
  let verified = false;
  for (const role of compatibleRoles) {
    if (await hasVerifiedProfessionalRole(sql, input.actorUserId, role)) {
      verified = true;
      break;
    }
  }
  if (!verified) return { allowed: false, reason: 'missing_role' };
  const links = await sql`
    SELECT l.id
    FROM professional_student_links l
    JOIN LATERAL (
      SELECT status, scopes_json, expires_at
      FROM consent_records
      WHERE link_id = l.id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    ) c ON TRUE
    WHERE l.professional_id = ${input.actorUserId}
      AND l.student_id = ${input.subjectUserId}
      AND l.status = 'active' AND c.status = 'granted'
      AND (l.expires_at IS NULL OR l.expires_at > NOW())
      AND (c.expires_at IS NULL OR c.expires_at > NOW())
      AND c.scopes_json::jsonb ? ${input.scope}
    LIMIT 1
  `;
  if (links.length === 0) return { allowed: false, reason: 'missing_consent' };
  if (input.recordAccess !== false) {
    await writeAuditLog(sql, {
      actorUserId: input.actorUserId,
      subjectUserId: input.subjectUserId,
      action: `professional_data.${input.action}`,
      entityType: 'professional_student_link',
      entityId: links[0].id,
      metadata: { scope: input.scope },
    });
  }
  return { allowed: true, reason: 'active_consent', linkId: links[0].id };
}
