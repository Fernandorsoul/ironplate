import {
  buildExportFileName,
  buildExportPayload,
  parseMealsJson,
} from '../api/services/exportData';

describe('LGPD data export helpers', () => {
  it('builds a dated JSON file name', () => {
    expect(buildExportFileName(new Date('2026-08-28T15:30:00.000Z')))
      .toBe('ironplate-export-2026-08-28.json');
  });

  it('parses only JSON arrays', () => {
    expect(parseMealsJson('[1,2]')).toEqual([1, 2]);
    expect(parseMealsJson('{"id":1}')).toEqual([]);
    expect(parseMealsJson('{invalid')).toEqual([]);
  });

  it('includes all portability sections without password data', () => {
    const payload: any = buildExportPayload({
      exportedAt: '2026-08-28T12:00:00.000Z',
      user: { id: 'u1', email: 'user@example.com' },
      profile: {},
      dailyLogs: [],
      weightHistory: [],
      bodyMeasurements: [],
      customFoods: [],
      mealPlans: [],
    });
    expect(payload.formatVersion).toBe(1);
    expect(payload.exportedAt).toBe('2026-08-28T12:00:00.000Z');
    expect(payload).toEqual(expect.objectContaining({
      dailyLogs: [],
      weightHistory: [],
      bodyMeasurements: [],
      customFoods: [],
      mealPlans: [],
    }));
    expect(JSON.stringify(payload)).not.toContain('password_hash');
  });
});
