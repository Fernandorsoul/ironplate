import { escapeHtml } from '../src/utils/html';
import { generateMealHTML } from '../src/utils/dietPdfGenerator';
import type { Meal } from '../src/types';

describe('PDF HTML escaping', () => {
  it('escapes markup and attributes from user-controlled fields', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)"> Tom & Ana')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; Tom &amp; Ana',
    );
  });

  it('handles missing and numeric values safely', () => {
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(82.5)).toBe('82.5');
  });

  it.each([
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)></svg>',
    '<script>alert(1)</script>',
  ])('renders malicious portion units only as escaped text: %s', (unit) => {
    const macros = { calories: 100, protein: 10, carbs: 12, fat: 2 };
    const meal = {
      id: 'meal-1',
      name: 'Refeição',
      timing: 'regular',
      foods: [{
        food: { id: 'unknown-food', name: 'Alimento', category: 'teste', macros },
        grams: 100,
        quantity: 1,
        unit,
        macros,
      }],
      totalMacros: macros,
    } as unknown as Meal;

    const html = generateMealHTML(meal);

    expect(html).toContain(escapeHtml(unit));
    expect(html).not.toContain(unit);
  });
});
