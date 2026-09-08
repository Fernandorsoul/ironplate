import {
  DailyLog,
  Food,
  MealPlan,
  ProfessionalExercise,
  ProfessionalAppointmentType,
  ProfessionalAppointment,
  ProfessionalAvailabilityRule,
  ProfessionalBookableSlot,
  ProfessionalNutritionPlan,
  ProfessionalScheduleBlockout,
  ProfessionalScheduleImpact,
  ProfessionalNotification,
  ProfessionalConsentScope,
  ProfessionalInvitationPreview,
  ProfessionalLink,
  ProfessionalProfile,
  ProfessionalTrainingExecution,
  ProfessionalTrainingPlan,
  TrainingPrescriptionSession,
  UserProfile,
} from '../types';
import type { BodyMeasurement } from './measurementTypes';
import { clearSession, getAccessToken } from './session';

export type { BodyMeasurement } from './measurementTypes';

const configuredApiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
const API_BASE = `${configuredApiBase}/api`;

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  accessToken: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  if (authenticated) {
    const token = await getAccessToken();
    if (!token) throw new ApiError('Authentication required', 401);
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (response.status === 401 && authenticated) {
    await clearSession();
  }
  return response;
}

async function expectOk(response: Response): Promise<void> {
  if (response.ok) return;

  let message = `API request failed with status ${response.status}`;
  try {
    const payload = await response.json() as { error?: unknown };
    if (typeof payload.error === 'string' && payload.error.trim()) {
      message = payload.error;
    }
  } catch {
    // Some infrastructure errors return an empty or non-JSON response body.
  }
  throw new ApiError(message, response.status);
}

async function authenticate(
  path: '/users/create' | '/users/auth',
  body: Record<string, string>,
): Promise<AuthenticatedUser | null> {
  try {
    const response = await apiFetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }, false);
    if (!response.ok) return null;
    return await response.json() as AuthenticatedUser;
  } catch (error) {
    console.error('Authentication request failed:', error);
    return null;
  }
}

export function createUser(name: string, email: string, password: string) {
  return authenticate('/users/create', { name, email, password });
}

export function authenticateUser(email: string, password: string) {
  return authenticate('/users/auth', { email, password });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await apiFetch('/users/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }, false);
  await expectOk(response);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await apiFetch('/users/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  }, false);
  await expectOk(response);
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  const response = await apiFetch(`/users/get?userId=${encodeURIComponent(userId)}`);
  if (response.status === 404) return null;
  await expectOk(response);
  return await response.json() as UserProfile;
}

export async function updateUser(userId: string, fields: Partial<UserProfile>): Promise<void> {
  const response = await apiFetch('/users/update', {
    method: 'PUT',
    body: JSON.stringify({ userId, fields }),
  });
  await expectOk(response);
}

export async function deleteAccount(userId: string): Promise<void> {
  const response = await apiFetch('/users/delete', {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });
  await expectOk(response);
}

export async function exportUserData(): Promise<Record<string, unknown>> {
  const response = await apiFetch('/users/export');
  await expectOk(response);
  return await response.json() as Record<string, unknown>;
}

export async function saveDailyLog(userId: string, log: DailyLog): Promise<void> {
  const response = await apiFetch('/users/daily-logs', {
    method: 'POST',
    body: JSON.stringify({ userId, log }),
  });
  await expectOk(response);
}

export async function getDailyLogs(userId: string, limit = 30): Promise<DailyLog[]> {
  const response = await apiFetch(
    `/users/daily-logs?userId=${encodeURIComponent(userId)}&limit=${limit}`,
  );
  await expectOk(response);
  return await response.json() as DailyLog[];
}

export async function saveMealPlan(userId: string, plan: MealPlan): Promise<void> {
  const response = await apiFetch('/users/meal-plans', {
    method: 'POST',
    body: JSON.stringify({ userId, plan }),
  });
  await expectOk(response);
}

export async function getMealPlans(userId: string): Promise<MealPlan[]> {
  const response = await apiFetch(`/users/meal-plans?userId=${encodeURIComponent(userId)}`);
  await expectOk(response);
  return await response.json() as MealPlan[];
}

export async function deleteMealPlan(userId: string, planId: string): Promise<void> {
  const response = await apiFetch('/users/meal-plans', {
    method: 'DELETE',
    body: JSON.stringify({ userId, planId }),
  });
  await expectOk(response);
}

export async function activateMealPlan(userId: string, planId: string): Promise<void> {
  const response = await apiFetch('/users/meal-plans', {
    method: 'PUT',
    body: JSON.stringify({ userId, planId }),
  });
  await expectOk(response);
}

export async function getProfessionalNutritionPlans(): Promise<ProfessionalNutritionPlan[]> {
  const response = await apiFetch('/users/get?resource=professionals&operation=nutrition-plans');
  await expectOk(response);
  return await response.json() as ProfessionalNutritionPlan[];
}

export async function getProfessionalProfile(): Promise<ProfessionalProfile | null> {
  const response = await apiFetch('/users/get?resource=professionals&operation=profile');
  if (response.status === 404) return null;
  await expectOk(response);
  return await response.json() as ProfessionalProfile;
}

export async function submitProfessionalProfile(input: {
  displayName: string;
  bio?: string;
  credentials: Array<{
    professionalRole: 'nutritionist' | 'fitness_professional';
    registrationType: 'CRN' | 'CREF';
    registrationNumber: string;
    registrationRegion: string;
  }>;
}): Promise<{ id: string; status: 'pending' }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=profile', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as { id: string; status: 'pending' };
}

export async function getProfessionalLinks(): Promise<ProfessionalLink[]> {
  const response = await apiFetch('/users/get?resource=professionals&operation=links');
  await expectOk(response);
  return await response.json() as ProfessionalLink[];
}

export async function getProfessionalInvitation(token: string): Promise<ProfessionalInvitationPreview> {
  const response = await apiFetch(
    `/users/get?resource=professionals&operation=links&token=${encodeURIComponent(token)}`,
  );
  await expectOk(response);
  return await response.json() as ProfessionalInvitationPreview;
}

export async function createProfessionalInvitation(input: {
  purpose: string;
  scopes: ProfessionalConsentScope[];
  professionalRoles: Array<'nutritionist' | 'fitness_professional'>;
  consentVersion: string;
  expiresInHours?: number;
  durationDays?: number;
}): Promise<{ id: string; token: string; invitationUrl: string; qrPayload: string; expiresAt: string }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=links', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as {
    id: string;
    token: string;
    invitationUrl: string;
    qrPayload: string;
    expiresAt: string;
  };
}

export async function decideProfessionalInvitation(
  token: string,
  decision: 'accept' | 'decline',
  scopes?: ProfessionalConsentScope[],
): Promise<void> {
  const response = await apiFetch('/users/get?resource=professionals&operation=links', {
    method: 'PUT',
    body: JSON.stringify({ token, decision, ...(scopes ? { scopes } : {}) }),
  });
  await expectOk(response);
}

export async function updateProfessionalConsent(
  linkId: string,
  decision: 'limit' | 'revoke',
  scopes?: ProfessionalConsentScope[],
): Promise<void> {
  const response = await apiFetch('/users/get?resource=professionals&operation=links', {
    method: 'PUT',
    body: JSON.stringify({ linkId, decision, ...(scopes ? { scopes } : {}) }),
  });
  await expectOk(response);
}

export async function getConsentedStudentData(
  studentId: string,
  scope: ProfessionalConsentScope,
): Promise<unknown[]> {
  const query = new URLSearchParams({ studentId, scope });
  const response = await apiFetch(
    `/users/get?resource=professionals&operation=shared-data&${query.toString()}`,
  );
  await expectOk(response);
  const payload = await response.json() as { data: unknown[] };
  return payload.data;
}

export async function createProfessionalNutritionPlan(input: {
  studentId: string;
  title: string;
  objective?: string;
  meals: MealPlan['meals'];
  totalMacros: MealPlan['totalMacros'];
  changeSummary?: string;
}): Promise<{ id: string; version: number; status: 'draft' }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=nutrition-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as { id: string; version: number; status: 'draft' };
}

export async function updateProfessionalNutritionPlan(input: {
  planId: string;
  action: 'update' | 'publish' | 'archive';
  title?: string;
  objective?: string;
  meals?: MealPlan['meals'];
  totalMacros?: MealPlan['totalMacros'];
  changeSummary?: string;
}): Promise<{ id: string; version?: number; status: ProfessionalNutritionPlan['status'] }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=nutrition-plans', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as { id: string; version?: number; status: ProfessionalNutritionPlan['status'] };
}

export async function getProfessionalExercises(): Promise<ProfessionalExercise[]> {
  const response = await apiFetch('/users/get?resource=professionals&operation=exercises');
  await expectOk(response);
  return await response.json() as ProfessionalExercise[];
}

export async function createProfessionalExercise(
  input: Omit<ProfessionalExercise, 'id' | 'visibility' | 'createdAt' | 'updatedAt'>,
): Promise<{ id: string; visibility: 'private' }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=exercises', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as { id: string; visibility: 'private' };
}

export async function updateProfessionalExercise(
  input: Omit<ProfessionalExercise, 'id' | 'visibility' | 'createdAt' | 'updatedAt'> & { exerciseId: string },
): Promise<{ id: string; visibility: 'private' }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=exercises', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as { id: string; visibility: 'private' };
}

export async function getProfessionalTrainingPlans(): Promise<ProfessionalTrainingPlan[]> {
  const response = await apiFetch('/users/get?resource=professionals&operation=training-plans');
  await expectOk(response);
  return await response.json() as ProfessionalTrainingPlan[];
}

export async function createProfessionalTrainingPlan(input: {
  studentId: string;
  title: string;
  objective?: string;
  startsOn?: string;
  endsOn?: string;
  sessions: TrainingPrescriptionSession[];
  changeSummary?: string;
}): Promise<{ id: string; version: number; status: 'draft' }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=training-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as { id: string; version: number; status: 'draft' };
}

export async function updateProfessionalTrainingPlan(input: {
  planId: string;
  action: 'update' | 'publish' | 'archive';
  title?: string;
  objective?: string;
  startsOn?: string;
  endsOn?: string;
  sessions?: TrainingPrescriptionSession[];
  changeSummary?: string;
}): Promise<{ id: string; version?: number; status: ProfessionalTrainingPlan['status'] }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=training-plans', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as { id: string; version?: number; status: ProfessionalTrainingPlan['status'] };
}

export async function getProfessionalTrainingExecutions(): Promise<ProfessionalTrainingExecution[]> {
  const response = await apiFetch('/users/get?resource=professionals&operation=training-executions');
  await expectOk(response);
  return await response.json() as ProfessionalTrainingExecution[];
}

export async function recordProfessionalTrainingExecution(input: {
  planId: string;
  version: number;
  sessionId: string;
  workoutId?: string;
  status?: ProfessionalTrainingExecution['status'];
  results: ProfessionalTrainingExecution['results'];
  perceivedExertion?: number;
  feedback?: string;
  performedAt: string;
}): Promise<{ id: string; status: ProfessionalTrainingExecution['status'] }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=training-executions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as { id: string; status: ProfessionalTrainingExecution['status'] };
}

type AvailabilityRuleInput = Omit<
  ProfessionalAvailabilityRule,
  'id' | 'active' | 'createdAt' | 'updatedAt'
>;

type ScheduleBlockoutInput = Omit<
  ProfessionalScheduleBlockout,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export interface ScheduleImpactDecision {
  appointmentId: string;
  action: 'keep' | 'decline' | 'cancel' | 'reschedule';
  proposedSlots?: string[];
}

export async function getProfessionalAvailability(): Promise<{
  rules: ProfessionalAvailabilityRule[];
  blockouts: ProfessionalScheduleBlockout[];
}> {
  const response = await apiFetch('/users/get?resource=professionals&operation=availability');
  await expectOk(response);
  return await response.json() as {
    rules: ProfessionalAvailabilityRule[];
    blockouts: ProfessionalScheduleBlockout[];
  };
}

export async function getProfessionalBookableSlots(input: {
  professionalId: string;
  appointmentType: ProfessionalAppointmentType;
  from: string;
  to: string;
}): Promise<ProfessionalBookableSlot[]> {
  const query = new URLSearchParams({ mode: 'slots', ...input });
  const response = await apiFetch(
    `/users/get?resource=professionals&operation=availability&${query.toString()}`,
  );
  await expectOk(response);
  return await response.json() as ProfessionalBookableSlot[];
}

export async function createProfessionalAvailabilityRule(
  rule: AvailabilityRuleInput,
): Promise<{ id: string; active: true }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=availability', {
    method: 'POST',
    body: JSON.stringify({ resource: 'rule', rule }),
  });
  await expectOk(response);
  return await response.json() as { id: string; active: true };
}

export async function updateProfessionalAvailabilityRule(input: {
  ruleId: string;
  action: 'update' | 'deactivate' | 'reactivate';
  rule?: AvailabilityRuleInput;
}): Promise<void> {
  const response = await apiFetch('/users/get?resource=professionals&operation=availability', {
    method: 'PUT',
    body: JSON.stringify({ resource: 'rule', ...input }),
  });
  await expectOk(response);
}

export async function previewProfessionalBlockout(
  blockout: ScheduleBlockoutInput,
): Promise<ProfessionalScheduleImpact[]> {
  const response = await apiFetch('/users/get?resource=professionals&operation=availability', {
    method: 'POST',
    body: JSON.stringify({ resource: 'blockout', blockout, preview: true }),
  });
  await expectOk(response);
  const result = await response.json() as { impacts: ProfessionalScheduleImpact[] };
  return result.impacts;
}

export async function createProfessionalBlockout(input: {
  blockout: ScheduleBlockoutInput;
  impactDecisions?: ScheduleImpactDecision[];
}): Promise<{ id: string; status: 'active'; impactedAppointments: number }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=availability', {
    method: 'POST',
    body: JSON.stringify({ resource: 'blockout', ...input }),
  });
  await expectOk(response);
  return await response.json() as { id: string; status: 'active'; impactedAppointments: number };
}

export async function updateProfessionalBlockout(input: {
  blockoutId: string;
  action: 'update' | 'cancel' | 'cancel_future';
  blockout?: ScheduleBlockoutInput;
  effectiveUntil?: string;
  preview?: boolean;
  impactDecisions?: ScheduleImpactDecision[];
}): Promise<{ impacts?: ProfessionalScheduleImpact[] }> {
  const response = await apiFetch('/users/get?resource=professionals&operation=availability', {
    method: 'PUT',
    body: JSON.stringify({ resource: 'blockout', ...input }),
  });
  await expectOk(response);
  return await response.json() as { impacts?: ProfessionalScheduleImpact[] };
}

export async function getProfessionalAppointments(): Promise<ProfessionalAppointment[]> {
  const response = await apiFetch('/users/get?resource=professionals&operation=appointments');
  await expectOk(response);
  return await response.json() as ProfessionalAppointment[];
}

export async function requestProfessionalAppointment(input: {
  professionalId: string;
  appointmentType: ProfessionalAppointmentType;
  startsAt: string;
  timeZone: string;
}): Promise<Pick<ProfessionalAppointment, 'id' | 'status' | 'startsAt' | 'endsAt' | 'holdExpiresAt'>> {
  const response = await apiFetch('/users/get?resource=professionals&operation=appointments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as Pick<
    ProfessionalAppointment,
    'id' | 'status' | 'startsAt' | 'endsAt' | 'holdExpiresAt'
  >;
}

export async function updateProfessionalAppointment(input: {
  appointmentId: string;
  action: 'confirm' | 'decline' | 'propose_reschedule' | 'accept_reschedule'
    | 'decline_reschedule' | 'cancel' | 'complete' | 'no_show';
  message?: string;
  proposedSlots?: string[];
  acceptedStartsAt?: string;
  timeZone?: string;
}): Promise<Pick<ProfessionalAppointment, 'id' | 'status'>> {
  const response = await apiFetch('/users/get?resource=professionals&operation=appointments', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  await expectOk(response);
  return await response.json() as Pick<ProfessionalAppointment, 'id' | 'status'>;
}

export async function getProfessionalNotifications(): Promise<ProfessionalNotification[]> {
  const response = await apiFetch('/users/get?resource=professionals&operation=notifications');
  await expectOk(response);
  return await response.json() as ProfessionalNotification[];
}

export async function markProfessionalNotificationRead(notificationId: string): Promise<void> {
  const response = await apiFetch('/users/get?resource=professionals&operation=notifications', {
    method: 'PUT',
    body: JSON.stringify({ notificationId, action: 'read' }),
  });
  await expectOk(response);
}

export async function saveCustomFood(userId: string, food: Food): Promise<void> {
  const response = await apiFetch('/users/custom-foods', {
    method: 'POST',
    body: JSON.stringify({ userId, food }),
  });
  await expectOk(response);
}

export async function getCustomFoods(userId: string): Promise<Food[]> {
  const response = await apiFetch(`/users/custom-foods?userId=${encodeURIComponent(userId)}`);
  await expectOk(response);
  return await response.json() as Food[];
}

export async function saveWeightEntry(
  userId: string,
  entry: { date: string; weight: number; bodyFat?: number },
): Promise<void> {
  const response = await apiFetch('/users/weight-history', {
    method: 'POST',
    body: JSON.stringify({ userId, entry }),
  });
  await expectOk(response);
}

export async function getWeightHistory(
  userId: string,
): Promise<{ date: string; weight: number; bodyFat?: number }[]> {
  const response = await apiFetch(`/users/weight-history?userId=${encodeURIComponent(userId)}`);
  await expectOk(response);
  return await response.json() as { date: string; weight: number; bodyFat?: number }[];
}

export async function saveBodyMeasurement(
  userId: string,
  measurement: BodyMeasurement,
): Promise<void> {
  const response = await apiFetch('/users/body-measurements', {
    method: 'POST',
    body: JSON.stringify({ userId, measurement }),
  });
  await expectOk(response);
}

export async function getBodyMeasurements(
  userId: string,
  limit = 30,
): Promise<BodyMeasurement[]> {
  const response = await apiFetch(
    `/users/body-measurements?userId=${encodeURIComponent(userId)}&limit=${limit}`,
  );
  await expectOk(response);
  return await response.json() as BodyMeasurement[];
}
