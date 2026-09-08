import {
  authorizeUserDataAccess,
  hasVerifiedProfessionalRole,
} from '../api/services/authorization';
import { getScopedActiveLink } from '../api/services/professionalAccess';
import {
  getApprovedProfessionalRegistrations,
  registrationAllowsAppointmentType,
} from '../api/services/professionalAccess';

const professionalId = 'professional-1';
const studentId = 'student-1';

describe('cumulative professional authorization', () => {
  it('allows users to access their own data without a professional role', async () => {
    const sql = jest.fn();

    await expect(authorizeUserDataAccess(sql, {
      actorUserId: studentId,
      subjectUserId: studentId,
      scope: 'meal_plans',
      action: 'read',
    })).resolves.toEqual({ allowed: true, reason: 'self' });
    expect(sql).not.toHaveBeenCalled();
  });

  it('rejects professional access when the compatible credential is not verified', async () => {
    const sql = jest.fn().mockResolvedValueOnce([]);

    await expect(authorizeUserDataAccess(sql, {
      actorUserId: professionalId,
      subjectUserId: studentId,
      scope: 'meal_plans',
      action: 'write',
    })).resolves.toEqual({ allowed: false, reason: 'missing_role' });
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('does not let a verified fitness role read nutrition data', async () => {
    const sql = jest.fn().mockResolvedValueOnce([]);

    await expect(authorizeUserDataAccess(sql, {
      actorUserId: professionalId,
      subjectUserId: studentId,
      scope: 'nutrition_data',
      action: 'read',
    })).resolves.toEqual({ allowed: false, reason: 'missing_role' });
    expect((sql.mock.calls[0][0] as TemplateStringsArray).join(' ')).toContain('professional_credentials');
    expect(sql.mock.calls[0]).toContain('nutritionist');
  });

  it('rejects a verified professional when active granular consent is absent', async () => {
    const sql = jest.fn()
      .mockResolvedValueOnce([{ exists: 1 }])
      .mockResolvedValueOnce([]);

    await expect(authorizeUserDataAccess(sql, {
      actorUserId: professionalId,
      subjectUserId: studentId,
      scope: 'prescribed_training',
      action: 'manage',
    })).resolves.toEqual({ allowed: false, reason: 'missing_consent' });
  });

  it('returns the consented link for a verified compatible role', async () => {
    const sql = jest.fn()
      .mockResolvedValueOnce([{ exists: 1 }])
      .mockResolvedValueOnce([{ id: 'link-1' }]);

    await expect(getScopedActiveLink(
      sql,
      professionalId,
      studentId,
      'scheduling',
    )).resolves.toBe('link-1');
    expect(sql).toHaveBeenCalledTimes(3);
    expect((sql.mock.calls[2][0] as TemplateStringsArray).join(' ')).toContain('INSERT INTO audit_logs');
    expect(sql.mock.calls[2]).toContain('professional_data.manage');
    expect(sql.mock.calls[2]).toContain(JSON.stringify({ scope: 'scheduling' }));
  });

  it('can validate student-initiated operations without attributing a read to the professional', async () => {
    const sql = jest.fn()
      .mockResolvedValueOnce([{ exists: 1 }])
      .mockResolvedValueOnce([{ id: 'link-1' }]);

    await expect(getScopedActiveLink(
      sql,
      professionalId,
      studentId,
      'scheduling',
      { action: 'read', recordAccess: false },
    )).resolves.toBe('link-1');
    expect(sql).toHaveBeenCalledTimes(2);
  });

  it('requires both an active role and its verified credential', async () => {
    const sql = jest.fn().mockResolvedValueOnce([]);

    await expect(hasVerifiedProfessionalRole(sql, professionalId, 'fitness_professional')).resolves.toBe(false);
    const statement = (sql.mock.calls[0][0] as TemplateStringsArray).join(' ');
    expect(statement).toContain("r.status = 'active'");
    expect(statement).toContain("c.status = 'verified'");
  });

  it('keeps both verified councils available for cumulative scheduling permissions', async () => {
    const sql = jest.fn().mockResolvedValue([
      { registration_type: 'CREF' },
      { registration_type: 'CRN' },
    ]);

    const registrations = await getApprovedProfessionalRegistrations(sql, professionalId);

    expect(registrations).toEqual(['CREF', 'CRN']);
    expect(registrationAllowsAppointmentType(registrations, 'fitness_session')).toBe(true);
    expect(registrationAllowsAppointmentType(registrations, 'nutrition_consultation')).toBe(true);
  });
});
