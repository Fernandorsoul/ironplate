import { DailyLog, Food, MealPlan, UserProfile } from '../types';
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
