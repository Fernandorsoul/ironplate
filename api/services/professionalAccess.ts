export async function isApprovedEducator(sql: any, userId: string): Promise<boolean> {
  const rows = await sql`
    SELECT p.id
    FROM professional_profiles p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ${userId}
      AND p.status = 'approved'
      AND u.role = 'professional'
      AND UPPER(p.registration_type) = 'CREF'
  `;
  return rows.length > 0;
}

export async function getApprovedProfessionalRegistration(
  sql: any,
  userId: string,
): Promise<string | undefined> {
  const rows = await sql`
    SELECT UPPER(p.registration_type) AS registration_type
    FROM professional_profiles p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id = ${userId}
      AND p.status = 'approved'
      AND u.role = 'professional'
  `;
  return rows[0]?.registration_type as string | undefined;
}

export function registrationAllowsAppointmentType(registrationType: string, appointmentType: string): boolean {
  if (registrationType === 'CREF') return appointmentType.startsWith('fitness_');
  if (registrationType === 'CRN') return appointmentType.startsWith('nutrition_');
  return false;
}

export async function getScopedActiveLink(
  sql: any,
  professionalId: string,
  studentId: string,
  scope: 'nutrition' | 'training' | 'scheduling',
): Promise<string | undefined> {
  const rows = await sql`
    SELECT l.id
    FROM professional_student_links l
    JOIN consent_records c ON c.link_id = l.id
    WHERE l.professional_id = ${professionalId}
      AND l.student_id = ${studentId}
      AND l.status = 'active'
      AND c.status = 'granted'
      AND c.scopes_json::jsonb ? ${scope}
  `;
  return rows[0]?.id as string | undefined;
}
