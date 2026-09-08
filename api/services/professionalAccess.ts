import { authorizeUserDataAccess, type AccessAction, type DataScope } from './authorization';

export async function isApprovedEducator(sql: any, userId: string): Promise<boolean> {
  const rows = await sql`
    SELECT c.id
    FROM professional_credentials c
    JOIN user_roles r ON r.user_id = c.user_id AND r.role = c.professional_role
    WHERE c.user_id = ${userId} AND c.professional_role = 'fitness_professional'
      AND c.status = 'verified' AND r.status = 'active'
  `;
  return rows.length > 0;
}

export async function getApprovedProfessionalRegistrations(
  sql: any,
  userId: string,
): Promise<string[]> {
  const rows = await sql`
    SELECT UPPER(c.registration_type) AS registration_type
    FROM professional_credentials c
    JOIN user_roles r ON r.user_id = c.user_id AND r.role = c.professional_role
    WHERE c.user_id = ${userId} AND c.status = 'verified' AND r.status = 'active'
    ORDER BY c.professional_role
  `;
  return rows.map((row: Record<string, unknown>) => row.registration_type as string);
}

export function registrationAllowsAppointmentType(
  registrationTypes: string | readonly string[],
  appointmentType: string,
): boolean {
  const registrations = typeof registrationTypes === 'string' ? [registrationTypes] : registrationTypes;
  return registrations.some((registrationType) => (
    (registrationType === 'CREF' && appointmentType.startsWith('fitness_'))
    || (registrationType === 'CRN' && appointmentType.startsWith('nutrition_'))
  ));
}

export async function getScopedActiveLink(
  sql: any,
  professionalId: string,
  studentId: string,
  scope: DataScope,
  options: { action?: AccessAction; recordAccess?: boolean } = {},
): Promise<string | undefined> {
  const decision = await authorizeUserDataAccess(sql, {
    actorUserId: professionalId,
    subjectUserId: studentId,
    scope,
    action: options.action ?? 'manage',
    recordAccess: options.recordAccess,
  });
  return decision.allowed ? decision.linkId : undefined;
}
