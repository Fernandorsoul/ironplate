import {
  buildExportFileName,
  buildExportPayload,
  parseMealsJson,
} from '../api/users/export';

describe('LGPD data export helpers', () => {
  describe('buildExportFileName', () => {
    it('builds a dated JSON file name', () => {
      expect(buildExportFileName(new Date('2026-08-28T15:30:00.000Z'))).toBe(
        'ironplate-export-2026-08-28.json'
      );
    });

    it('defaults to the current date', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(buildExportFileName()).toBe(`ironplate-export-${today}.json`);
    });
  });

  describe('parseMealsJson', () => {
    it('parses a valid JSON array string', () => {
      expect(parseMealsJson('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('returns [] for null, undefined and empty input', () => {
      expect(parseMealsJson(null)).toEqual([]);
      expect(parseMealsJson(undefined)).toEqual([]);
      expect(parseMealsJson('')).toEqual([]);
    });

    it('returns [] for invalid JSON', () => {
      expect(parseMealsJson('{not-json')).toEqual([]);
    });

    it('returns [] when JSON is not an array', () => {
      expect(parseMealsJson('123')).toEqual([]);
    });

    it('accepts an already-parsed array', () => {
      expect(parseMealsJson([{ id: 'm1' }])).toEqual([{ id: 'm1' }]);
    });
  });

  describe('buildExportPayload', () => {
    const parts = {
      user: {
        id: 'u1',
        name: 'Maria',
        email: 'maria@example.com',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        lastLogin: '2026-08-28T12:00:00.000Z',
      },
      profile: { age: 30, weight: 60, height: 165, gender: 'female', activityLevel: 'light', goal: 'cutting', sport: 'bjj' },
      dailyLogs: [{ date: '2026-08-28', meals: [], workouts: [] }],
      weightHistory: [{ date: '2026-08-28', weight: 60 }],
      bodyMeasurements: [{ date: '2026-08-28', weight: 60 }],
      customFoods: [{ id: 'f1', name: 'Frango', category: 'proteins', macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } }],
      mealPlans: [{ id: 'p1', name: 'Plano A', goal: 'cutting', meals: [], totalMacros: { calories: 2000, protein: 150, carbs: 200, fat: 60 }, createdAt: '2026-08-01T00:00:00.000Z' }],
    };

    it('includes all required sections and metadata', () => {
      const payload: any = buildExportPayload({ ...parts, exportedAt: '2026-08-28T12:00:00.000Z' });

      expect(payload.exportedAt).toBe('2026-08-28T12:00:00.000Z');
      expect(payload.formatVersion).toBe(1);
      expect(payload.user).toEqual(parts.user);
      expect(payload.profile).toEqual(parts.profile);
      expect(payload.dailyLogs).toEqual(parts.dailyLogs);
      expect(payload.weightHistory).toEqual(parts.weightHistory);
      expect(payload.bodyMeasurements).toEqual(parts.bodyMeasurements);
      expect(payload.customFoods).toEqual(parts.customFoods);
      expect(payload.mealPlans).toEqual(parts.mealPlans);
    });

    it('defaults exportedAt to the current time', () => {
      const before = Date.now();
      const payload: any = buildExportPayload(parts);
      const after = Date.now();

      const exported = new Date(payload.exportedAt).getTime();
      expect(Number.isNaN(exported)).toBe(false);
      expect(exported).toBeGreaterThanOrEqual(before);
      expect(exported).toBeLessThanOrEqual(after);
    });

    it('keeps account metadata fields (createdAt and lastLogin)', () => {
      const payload: any = buildExportPayload(parts);
      expect(payload.user.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(payload.user.lastLogin).toBe('2026-08-28T12:00:00.000Z');
    });
  });
});
