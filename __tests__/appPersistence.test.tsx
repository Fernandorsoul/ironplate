import React from 'react';
import { Text, View } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('../src/services/database', () => ({
  authenticateUser: jest.fn(),
  getUserById: jest.fn(),
  getDailyLogs: jest.fn(),
  getMealPlans: jest.fn(),
  getWeightHistory: jest.fn(),
  getCustomFoods: jest.fn(),
  saveDailyLog: jest.fn(),
}));
jest.mock('../src/services/storage', () => ({
  purgeLegacyLocalData: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/session', () => ({
  clearSession: jest.fn().mockResolvedValue(undefined),
  loadSession: jest.fn().mockResolvedValue(null),
  saveSession: jest.fn().mockResolvedValue(undefined),
}));

import { AppProvider, useApp } from '../src/context/AppContext';
import * as Database from '../src/services/database';
import { saveSession } from '../src/services/session';
import type { Meal, MealPlan, UserProfile } from '../src/types';

const mockedDatabase = Database as jest.Mocked<typeof Database>;
const mockedSaveSession = saveSession as jest.MockedFunction<typeof saveSession>;

const profile: UserProfile = {
  name: 'Atleta',
  age: 30,
  weight: 80,
  height: 180,
  gender: 'male',
  activityLevel: 'moderate',
  goal: 'maintenance',
  sport: 'bodybuilding',
};

const plan: MealPlan = {
  id: 'plan-1',
  name: 'Plano salvo',
  goal: 'maintenance',
  meals: [],
  totalMacros: { calories: 2000, protein: 150, carbs: 220, fat: 60 },
  createdAt: '2026-08-30T12:00:00.000Z',
  isActive: true,
};

let currentApp: ReturnType<typeof useApp>;

function PersistenceProbe() {
  const app = useApp();
  currentApp = app;
  return (
    <View>
      <Text>{`loading:${app.isLoading}`}</Text>
      <Text>{`user:${app.userId ?? 'none'}`}</Text>
      <Text>{`logs:${app.dailyLogs.length}`}</Text>
      <Text>{`plans:${app.mealPlans.length}`}</Text>
      <Text>{`weights:${app.weightHistory.length}`}</Text>
      <Text>{`foods:${app.customFoods.length}`}</Text>
      <Text>{`today-meals:${app.todayLog?.meals.length ?? 0}`}</Text>
      <Text>{`today-calories:${app.todayLog?.totalMacros.calories ?? 0}`}</Text>
    </View>
  );
}

describe('database hydration after login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDatabase.authenticateUser.mockResolvedValue({
      id: 'user-1',
      name: 'Atleta',
      email: 'atleta@example.com',
      accessToken: 'access-token',
    });
    mockedDatabase.getUserById.mockResolvedValue(profile);
    mockedDatabase.getDailyLogs.mockResolvedValue([{
      date: '2026-08-30',
      meals: [],
      workouts: [],
      weight: 80,
      totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    }]);
    mockedDatabase.getMealPlans.mockResolvedValue([plan]);
    mockedDatabase.getWeightHistory.mockResolvedValue([{ date: '2026-08-30', weight: 80 }]);
    mockedDatabase.getCustomFoods.mockResolvedValue([{
      id: 'food-1',
      name: 'Alimento salvo',
      category: 'teste',
      macros: { calories: 100, protein: 10, carbs: 10, fat: 2 },
    }]);
    mockedDatabase.saveDailyLog.mockResolvedValue(undefined);
  });

  it('reloads all persistent collections when an existing user logs in', async () => {
    await act(async () => {
      render(
        <AppProvider>
          <PersistenceProbe />
        </AppProvider>,
      );
    });

    await waitFor(() => expect(screen.getByText('loading:false')).toBeTruthy());
    await act(async () => {
      await currentApp.login('atleta@example.com', 'Senha123');
    });

    await waitFor(() => expect(screen.getByText('user:user-1')).toBeTruthy());
    expect(screen.getByText('logs:1')).toBeTruthy();
    expect(screen.getByText('plans:1')).toBeTruthy();
    expect(screen.getByText('weights:1')).toBeTruthy();
    expect(screen.getByText('foods:1')).toBeTruthy();
    expect(mockedSaveSession).toHaveBeenCalledWith({ userId: 'user-1', accessToken: 'access-token' });
    expect(mockedDatabase.getDailyLogs).toHaveBeenCalledWith('user-1', 100);
    expect(mockedDatabase.getMealPlans).toHaveBeenCalledWith('user-1');
    expect(mockedDatabase.getWeightHistory).toHaveBeenCalledWith('user-1');
  });

  it('serializes meal saves and recalculates the daily totals from all saved meals', async () => {
    const mealOne: Meal = {
      id: 'meal-1',
      name: 'Café da manhã',
      timing: 'regular',
      foods: [],
      totalMacros: { calories: 120.4, protein: 10.1, carbs: 12.2, fat: 3.3 },
    };
    const mealTwo: Meal = {
      id: 'meal-2',
      name: 'Almoço',
      timing: 'post_workout',
      foods: [],
      totalMacros: { calories: 330.2, protein: 25.2, carbs: 40.4, fat: 9.1 },
    };

    await act(async () => {
      render(
        <AppProvider>
          <PersistenceProbe />
        </AppProvider>,
      );
    });
    await waitFor(() => expect(screen.getByText('loading:false')).toBeTruthy());
    await act(async () => {
      await currentApp.login('atleta@example.com', 'Senha123');
    });

    await act(async () => {
      await Promise.all([
        currentApp.addMealToToday(mealOne),
        currentApp.addMealToToday(mealTwo),
      ]);
    });

    expect(mockedDatabase.saveDailyLog).toHaveBeenCalledTimes(2);
    const finalSavedLog = mockedDatabase.saveDailyLog.mock.calls[1][1];
    expect(finalSavedLog.meals.map(meal => meal.id)).toEqual(['meal-1', 'meal-2']);
    expect(finalSavedLog.totalMacros).toEqual({
      calories: 450.6,
      protein: 35.3,
      carbs: 52.6,
      fat: 12.4,
    });
    expect(screen.getByText('today-meals:2')).toBeTruthy();
    expect(screen.getByText('today-calories:450.6')).toBeTruthy();
  });

  it('uses the seven most recent days in the weekly macro summary', async () => {
    mockedDatabase.getDailyLogs.mockResolvedValue(
      Array.from({ length: 8 }, (_, index) => ({
        date: `2026-08-${String(31 - index).padStart(2, '0')}`,
        meals: [],
        workouts: [],
        totalMacros: {
          calories: 800 - index * 100,
          protein: 80 - index * 10,
          carbs: 160 - index * 20,
          fat: 40 - index * 5,
        },
      })),
    );

    await act(async () => {
      render(
        <AppProvider>
          <PersistenceProbe />
        </AppProvider>,
      );
    });
    await waitFor(() => expect(screen.getByText('loading:false')).toBeTruthy());
    await act(async () => {
      await currentApp.login('atleta@example.com', 'Senha123');
    });

    expect(currentApp.dailyLogs.map(log => log.date)).toEqual([
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
      '2026-08-31',
    ]);
    expect(currentApp.getWeeklySummary()).toMatchObject({
      avgCalories: 500,
      avgProtein: 50,
      avgCarbs: 100,
      avgFat: 25,
      daysTracked: 7,
    });
  });
});
