const mockTransactionQuery = jest.fn();
const mockTransaction = jest.fn();
const mockSql = Object.assign(jest.fn(), { transaction: mockTransaction });
const mockRequireAuth = jest.fn();
const mockGetRegistration = jest.fn();
const mockGetScopedActiveLink = jest.fn();

jest.mock('../api/middleware/cors', () => ({ applyCors: () => false }));
jest.mock('../api/middleware/db', () => ({ getSql: () => mockSql }));
jest.mock('../api/middleware/rateLimit', () => ({
  generalRateLimit: async (_req: unknown, _res: unknown, next: () => unknown) => next(),
}));
jest.mock('../api/middleware/auth', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
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

import appointmentsHandler, { transitionFor } from '../api/professionals/appointments';
import notificationsHandler from '../api/professionals/notifications';

const professionalId = '550e8400-e29b-41d4-a716-446655440000';
const studentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const startsAt = '2026-09-14T11:00:00.000Z';
const ruleRow = {
  id: 'rule-1',
  appointment_type: 'fitness_session',
  weekday: 1,
  start_time: '08:00',
  end_time: '12:00',
  time_zone: 'America/Sao_Paulo',
  duration_minutes: 60,
  slot_interval_minutes: 60,
  buffer_before_minutes: 15,
  buffer_after_minutes: 15,
  minimum_notice_minutes: 0,
  maximum_booking_days: 90,
  request_hold_minutes: 120,
  effective_from: '2026-09-01',
};
const appointmentRow = {
  id: 'appointment-1',
  professional_id: professionalId,
  student_id: studentId,
  link_id: 'link-1',
  appointment_type: 'fitness_session',
  starts_at: startsAt,
  ends_at: '2026-09-14T12:00:00.000Z',
  time_zone: 'America/Sao_Paulo',
  duration_minutes: 60,
  buffer_before_minutes: 15,
  buffer_after_minutes: 15,
  status: 'requested',
  previous_status: null,
  hold_expires_at: '2026-09-14T10:00:00.000Z',
  proposed_slots_json: null,
  neutral_title: 'Atendimento',
  origin: 'student_request',
  created_at: '2026-09-08T12:00:00.000Z',
  updated_at: '2026-09-08T12:00:00.000Z',
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

describe('professional appointment workflow', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-08T12:00:00.000Z'));
  });

  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockReset();
    mockSql.mockResolvedValue([]);
    mockRequireAuth.mockResolvedValue({ userId: studentId });
    mockGetRegistration.mockResolvedValue(['CREF']);
    mockGetScopedActiveLink.mockResolvedValue('link-1');
    mockTransactionQuery.mockResolvedValue([]);
    mockTransaction.mockImplementation(async (buildQueries: (txn: typeof mockTransactionQuery) => Promise<unknown>[]) => {
      const queries = buildQueries(mockTransactionQuery);
      return Promise.all(queries);
    });
  });

  it('creates a requested hold only for a currently bookable consented slot', async () => {
    mockSql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([ruleRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await appointmentsHandler({
      method: 'POST',
      headers: {},
      body: { professionalId, appointmentType: 'fitness_session', startsAt, timeZone: 'America/Sao_Paulo' },
    } as any, response);

    expect(mockGetScopedActiveLink).toHaveBeenCalledWith(mockSql, professionalId, studentId, 'scheduling');
    expect(sqlStatement(mockTransactionQuery, 0)).toContain('professional_appointments');
    expect(sqlStatement(mockTransactionQuery, 1)).toContain('professional_appointment_events');
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'requested',
      holdExpiresAt: '2026-09-08T14:00:00.000Z',
    }));
  });

  it('rejects requests when scheduling consent is absent', async () => {
    mockGetScopedActiveLink.mockResolvedValue(undefined);
    const response = responseMock();

    await appointmentsHandler({
      method: 'POST',
      headers: {},
      body: { professionalId, appointmentType: 'fitness_session', startsAt, timeZone: 'America/Sao_Paulo' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it('maps a database exclusion violation to a safe conflict response', async () => {
    mockSql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([ruleRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockTransaction.mockRejectedValueOnce(Object.assign(new Error('overlap'), { code: '23P01' }));
    const response = responseMock();

    await appointmentsHandler({
      method: 'POST',
      headers: {},
      body: { professionalId, appointmentType: 'fitness_session', startsAt, timeZone: 'America/Sao_Paulo' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({ error: 'Appointment conflicts with another active event' });
  });

  it('allows the verified professional to confirm a live request atomically with its event', async () => {
    mockRequireAuth.mockResolvedValue({ userId: professionalId });
    mockSql.mockResolvedValueOnce([appointmentRow]).mockResolvedValueOnce([{ appointment_id: 'appointment-1' }]);
    const response = responseMock();

    await appointmentsHandler({
      method: 'PUT',
      headers: {},
      body: { appointmentId: 'appointment-1', action: 'confirm' },
    } as any, response);

    expect(sqlStatement(mockSql, 1)).toContain('WITH updated AS');
    expect(sqlStatement(mockSql, 1)).toContain('professional_appointment_events');
    expect(response.json).toHaveBeenCalledWith({ id: 'appointment-1', status: 'confirmed' });
  });

  it('does not allow a student to confirm their own request', async () => {
    mockSql.mockResolvedValueOnce([appointmentRow]);
    const response = responseMock();

    await appointmentsHandler({
      method: 'PUT',
      headers: {},
      body: { appointmentId: 'appointment-1', action: 'confirm' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });

  it('expires a stale request before a professional can confirm it', async () => {
    mockRequireAuth.mockResolvedValue({ userId: professionalId });
    mockSql
      .mockResolvedValueOnce([{ ...appointmentRow, hold_expires_at: '2026-09-08T11:59:00.000Z' }])
      .mockResolvedValueOnce([{ id: 'appointment-1', student_id: studentId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await appointmentsHandler({
      method: 'PUT',
      headers: {},
      body: { appointmentId: 'appointment-1', action: 'confirm' },
    } as any, response);

    expect(sqlStatement(mockSql, 1)).toContain("status = 'expired'");
    expect(response.status).toHaveBeenCalledWith(409);
  });

  it('requires a newly proposed slot to remain bookable', async () => {
    mockRequireAuth.mockResolvedValue({ userId: professionalId });
    mockSql
      .mockResolvedValueOnce([{ ...appointmentRow, status: 'confirmed', hold_expires_at: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const response = responseMock();

    await appointmentsHandler({
      method: 'PUT',
      headers: {},
      body: {
        appointmentId: 'appointment-1',
        action: 'propose_reschedule',
        proposedSlots: ['2026-09-15T11:00:00.000Z'],
      },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({ error: 'A proposed slot is no longer available' });
  });

  it('accepts only an offered reschedule and returns it to explicit confirmation', async () => {
    const proposedStart = '2026-09-21T11:00:00.000Z';
    mockSql
      .mockResolvedValueOnce([{
        ...appointmentRow,
        status: 'reschedule_proposed',
        previous_status: 'confirmed',
        proposed_slots_json: JSON.stringify([proposedStart]),
      }])
      .mockResolvedValueOnce([ruleRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ appointment_id: 'appointment-1' }]);
    const response = responseMock();

    await appointmentsHandler({
      method: 'PUT',
      headers: {},
      body: {
        appointmentId: 'appointment-1',
        action: 'accept_reschedule',
        acceptedStartsAt: proposedStart,
        timeZone: 'America/Sao_Paulo',
      },
    } as any, response);

    expect(sqlStatement(mockSql, 4)).toContain("origin = ");
    expect(response.json).toHaveBeenCalledWith({ id: 'appointment-1', status: 'requested' });
  });

  it('keeps appointment state successful when notification delivery fails', async () => {
    mockRequireAuth.mockResolvedValue({ userId: professionalId });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSql
      .mockResolvedValueOnce([appointmentRow])
      .mockResolvedValueOnce([{ appointment_id: 'appointment-1' }])
      .mockRejectedValueOnce(new Error('notification unavailable'));
    const response = responseMock();

    await appointmentsHandler({
      method: 'PUT',
      headers: {},
      body: { appointmentId: 'appointment-1', action: 'decline', message: 'Horario indisponivel' },
    } as any, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(consoleSpy).toHaveBeenCalledWith('Appointment notification error:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('lists only appointments where the caller is a participant and includes the event trail', async () => {
    mockSql
      .mockResolvedValueOnce([{ ...appointmentRow, status: 'confirmed', hold_expires_at: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...appointmentRow, status: 'confirmed', hold_expires_at: null }])
      .mockResolvedValueOnce([{
        id: 'event-1',
        appointment_id: 'appointment-1',
        event_type: 'appointment.confirm',
        from_status: 'requested',
        to_status: 'confirmed',
        metadata_json: '{"message":"Confirmado"}',
        created_at: '2026-09-08T13:00:00.000Z',
      }]);
    const response = responseMock();

    await appointmentsHandler({ method: 'GET', headers: {}, query: {} } as any, response);

    expect(sqlStatement(mockSql, 0)).toContain('professional_id =');
    expect(sqlStatement(mockSql, 0)).toContain('student_id =');
    expect(response.json).toHaveBeenCalledWith([expect.objectContaining({
      neutralTitle: 'Atendimento',
      events: [expect.objectContaining({ eventType: 'appointment.confirm' })],
    })]);
  });
});

describe('appointment state machine', () => {
  it.each([
    ['professional', 'requested', 'confirm', undefined, 'confirmed'],
    ['professional', 'requested', 'decline', undefined, 'declined'],
    ['professional', 'confirmed', 'propose_reschedule', undefined, 'reschedule_proposed'],
    ['professional', 'confirmed', 'cancel', undefined, 'cancelled_by_professional'],
    ['professional', 'confirmed', 'complete', undefined, 'completed'],
    ['professional', 'confirmed', 'no_show', undefined, 'no_show'],
    ['student', 'confirmed', 'cancel', undefined, 'cancelled_by_student'],
    ['student', 'reschedule_proposed', 'accept_reschedule', 'confirmed', 'requested'],
    ['student', 'reschedule_proposed', 'decline_reschedule', 'confirmed', 'confirmed'],
  ] as const)('%s can move %s with %s to %s', (actor, currentStatus, action, previousStatus, expected) => {
    expect(transitionFor({ actor, currentStatus, action, previousStatus })).toBe(expected);
  });

  it('rejects transitions not owned by the actor or current state', () => {
    expect(transitionFor({ actor: 'student', currentStatus: 'requested', action: 'confirm' })).toBeUndefined();
    expect(transitionFor({ actor: 'professional', currentStatus: 'declined', action: 'confirm' })).toBeUndefined();
  });
});

describe('professional appointment notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockReset();
    mockSql.mockResolvedValue([]);
    mockRequireAuth.mockResolvedValue({ userId: studentId });
  });

  it('lists notifications only for the authenticated recipient', async () => {
    mockSql.mockResolvedValueOnce([{
      id: 'notification-1',
      appointment_id: 'appointment-1',
      notification_type: 'appointment.confirmed',
      title: 'Atualizacao de atendimento',
      body: 'O status foi atualizado.',
      read_at: null,
      created_at: '2026-09-08T13:00:00.000Z',
    }]);
    const response = responseMock();

    await notificationsHandler({ method: 'GET', headers: {}, query: {} } as any, response);

    expect(sqlStatement(mockSql)).toContain('recipient_user_id =');
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('cannot mark another user notification as read', async () => {
    mockSql.mockResolvedValueOnce([]);
    const response = responseMock();

    await notificationsHandler({
      method: 'PUT',
      headers: {},
      body: { notificationId: 'notification-1', action: 'read' },
    } as any, response);

    expect(sqlStatement(mockSql)).toContain('recipient_user_id =');
    expect(response.status).toHaveBeenCalledWith(404);
  });
});
