const mockTransactionQuery = jest.fn();
const mockTransaction = jest.fn();
const mockSql = Object.assign(jest.fn(), { transaction: mockTransaction });
const mockGetRegistration = jest.fn();
const mockGetScopedActiveLink = jest.fn();

jest.mock('../api/middleware/cors', () => ({ applyCors: () => false }));
jest.mock('../api/middleware/db', () => ({ getSql: () => mockSql }));
jest.mock('../api/middleware/rateLimit', () => ({
  generalRateLimit: async (_req: unknown, _res: unknown, next: () => unknown) => next(),
}));
jest.mock('../api/middleware/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
}));
jest.mock('../api/services/professionalAccess', () => ({
  getApprovedProfessionalRegistrations: (...args: unknown[]) => mockGetRegistration(...args),
  getScopedActiveLink: (...args: unknown[]) => mockGetScopedActiveLink(...args),
  registrationAllowsAppointmentType: (registrations: string[], appointmentType: string) => (
    registrations.some(registration => (
      registration === 'CREF' ? appointmentType.startsWith('fitness_') : appointmentType.startsWith('nutrition_')
    ))
  ),
}));
jest.mock('../api/services/audit', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));

import handler from '../api/professionals/availability';

const professionalId = '550e8400-e29b-41d4-a716-446655440000';
const studentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const rule = {
  appointmentType: 'fitness_session',
  weekday: 1,
  startTime: '08:00',
  endTime: '12:00',
  timeZone: 'America/Sao_Paulo',
  durationMinutes: 60,
  slotIntervalMinutes: 60,
  bufferBeforeMinutes: 15,
  bufferAfterMinutes: 15,
  minimumNoticeMinutes: 720,
  maximumBookingDays: 90,
  effectiveFrom: '2026-09-01',
};
const blockout = {
  recurrence: 'single',
  startsAt: '2026-09-14T11:30:00.000Z',
  endsAt: '2026-09-14T12:30:00.000Z',
  timeZone: 'America/Sao_Paulo',
  reasonCategory: 'personal',
  privateReason: 'Detalhe privado',
};
const impactedAppointment = {
  id: 'appointment-1',
  student_id: studentId,
  status: 'confirmed',
  starts_at: '2026-09-14T12:00:00.000Z',
  ends_at: '2026-09-14T13:00:00.000Z',
};

function responseMock() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response;
}

function sqlStatement(mock: jest.Mock, index = 0): string {
  return (mock.mock.calls[index][0] as TemplateStringsArray).join(' ');
}

describe('professional availability API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockReset();
    mockSql.mockResolvedValue([]);
    mockGetRegistration.mockResolvedValue(['CREF']);
    mockGetScopedActiveLink.mockResolvedValue('link-1');
    mockTransactionQuery.mockResolvedValue([]);
    mockTransaction.mockImplementation(async (buildQueries: (txn: typeof mockTransactionQuery) => Promise<unknown>[]) => {
      const queries = buildQueries(mockTransactionQuery);
      return Promise.all(queries);
    });
  });

  it('returns private blockout reasons only in the professional configuration view', async () => {
    mockSql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'blockout-1',
        recurrence: 'single',
        starts_at: blockout.startsAt,
        ends_at: blockout.endsAt,
        time_zone: blockout.timeZone,
        reason_category: 'personal',
        private_reason: 'Detalhe privado',
        status: 'active',
      }]);
    const response = responseMock();

    await handler({ method: 'GET', headers: {}, query: {} } as any, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      blockouts: [expect.objectContaining({ privateReason: 'Detalhe privado' })],
    }));
  });

  it('requires scheduling consent before exposing student slots', async () => {
    mockGetRegistration.mockResolvedValue([]);
    mockGetScopedActiveLink.mockResolvedValue(undefined);
    const response = responseMock();

    await handler({
      method: 'GET',
      headers: {},
      query: {
        mode: 'slots',
        professionalId,
        appointmentType: 'fitness_session',
        from: '2026-09-14T00:00:00.000Z',
        to: '2026-09-15T00:00:00.000Z',
      },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('returns only reservable slot fields to a linked student', async () => {
    mockGetRegistration.mockResolvedValue([]);
    mockSql
      .mockResolvedValueOnce([{
        id: 'rule-1',
        appointment_type: 'fitness_session',
        weekday: 1,
        start_time: '08:00',
        end_time: '12:00',
        time_zone: 'America/Sao_Paulo',
        duration_minutes: 60,
        slot_interval_minutes: 60,
        buffer_before_minutes: 0,
        buffer_after_minutes: 0,
        minimum_notice_minutes: 0,
        maximum_booking_days: 90,
        effective_from: '2026-09-01',
        active: true,
      }])
      .mockResolvedValueOnce([{
        id: 'blockout-1',
        recurrence: 'single',
        starts_at: '2026-09-14T12:00:00.000Z',
        ends_at: '2026-09-14T13:00:00.000Z',
        time_zone: 'America/Sao_Paulo',
        private_reason: 'Nao pode vazar',
      }])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await handler({
      method: 'GET',
      headers: {},
      query: {
        mode: 'slots',
        professionalId,
        appointmentType: 'fitness_session',
        from: '2026-09-14T00:00:00.000Z',
        to: '2026-09-15T00:00:00.000Z',
      },
    } as any, response);

    expect(mockGetScopedActiveLink).toHaveBeenCalledWith(
      mockSql,
      professionalId,
      professionalId,
      'scheduling',
      { action: 'read', recordAccess: false },
    );
    const payload = response.json.mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toContain('private');
    expect(JSON.stringify(payload)).not.toContain('Nao pode vazar');
  });

  it('creates an availability rule for a compatible verified professional', async () => {
    const response = responseMock();

    await handler({ method: 'POST', headers: {}, body: { resource: 'rule', rule } } as any, response);

    expect(sqlStatement(mockSql)).toContain('professional_availability_rules');
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it('rejects appointment types outside the professional registration', async () => {
    const response = responseMock();

    await handler({
      method: 'POST',
      headers: {},
      body: { resource: 'rule', rule: { ...rule, appointmentType: 'nutrition_consultation' } },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('previews impacted events without saving the private blockout', async () => {
    mockSql.mockResolvedValueOnce([impactedAppointment]);
    const response = responseMock();

    await handler({
      method: 'POST',
      headers: {},
      body: { resource: 'blockout', blockout, preview: true },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      impacts: [expect.objectContaining({
        appointmentId: 'appointment-1',
        allowedActions: ['keep', 'cancel', 'reschedule'],
      })],
    });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('refuses to save a conflicting blockout without explicit decisions', async () => {
    mockSql.mockResolvedValueOnce([impactedAppointment]);
    const response = responseMock();

    await handler({
      method: 'POST',
      headers: {},
      body: { resource: 'blockout', blockout },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('records an explicit reschedule decision and a neutral notification', async () => {
    mockSql.mockResolvedValueOnce([impactedAppointment]);
    const response = responseMock();

    await handler({
      method: 'POST',
      headers: {},
      body: {
        resource: 'blockout',
        blockout,
        impactDecisions: [{
          appointmentId: 'appointment-1',
          action: 'reschedule',
          proposedSlots: ['2026-09-15T12:00:00.000Z'],
        }],
      },
    } as any, response);

    const statements = mockTransactionQuery.mock.calls.map((call) => (call[0] as TemplateStringsArray).join(' '));
    expect(statements.some((statement) => statement.includes('professional_schedule_blockouts'))).toBe(true);
    expect(statements.some((statement) => statement.includes('professional_notifications'))).toBe(true);
    expect(statements.some((statement) => statement.includes('private_reason'))).toBe(true);
    expect(statements.find((statement) => statement.includes('professional_notifications'))).not.toContain('Detalhe privado');
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it('supports cancelling future occurrences without deleting history', async () => {
    mockSql.mockResolvedValueOnce([{ id: 'blockout-1', recurrence: 'weekly' }]).mockResolvedValueOnce([]);
    const response = responseMock();

    await handler({
      method: 'PUT',
      headers: {},
      body: {
        resource: 'blockout',
        blockoutId: 'blockout-1',
        action: 'cancel_future',
        effectiveUntil: '2026-09-30',
      },
    } as any, response);

    expect(sqlStatement(mockSql, 1)).toContain('effective_until');
    expect(sqlStatement(mockSql, 1)).not.toContain('DELETE');
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('soft-cancels a blockout so valid future slots can reopen', async () => {
    mockSql.mockResolvedValueOnce([{ id: 'blockout-1', recurrence: 'single' }]).mockResolvedValueOnce([]);
    const response = responseMock();

    await handler({
      method: 'PUT',
      headers: {},
      body: { resource: 'blockout', blockoutId: 'blockout-1', action: 'cancel' },
    } as any, response);

    expect(sqlStatement(mockSql, 1)).toContain("status = 'cancelled'");
    expect(sqlStatement(mockSql, 1)).not.toContain('DELETE');
    expect(response.json).toHaveBeenCalledWith({ id: 'blockout-1', status: 'cancelled' });
  });

  it('validates IANA time zones before writing', async () => {
    const response = responseMock();

    await handler({
      method: 'POST',
      headers: {},
      body: { resource: 'rule', rule: { ...rule, timeZone: 'Mars/Olympus' } },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockSql).not.toHaveBeenCalled();
  });
});
