import { escapeHtml } from '../src/utils/html';

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
});
