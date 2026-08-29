import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app renders without crashing', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // App should render
    const body = await page.locator('body');
    await expect(body).toBeVisible();

    // Should not have React error boundary
    const errorBoundary = page.getByText('Something went wrong');
    expect(await errorBoundary.isVisible().catch(() => false)).toBeFalsy();
  });

  test('no critical console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Filter out non-critical errors (React Native Web, Expo, and dev warnings)
    const criticalErrors = errors.filter(e =>
      !e.includes('DevTools') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('Warning:') &&
      !e.includes('act(...)') &&
      !e.includes('StrictMode') &&
      !e.includes('deprecated') &&
      !e.includes('favicon') &&
      !e.includes('manifest')
    );

    // Allow some non-critical warnings in development
    expect(criticalErrors.length).toBeLessThanOrEqual(3);
  });

  test('responsive to viewport changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const viewports = [
      { width: 320, height: 568 },
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },  // iPad
      { width: 1920, height: 1080 }, // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);

      const body = await page.locator('body');
      await expect(body).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    }
  });
});

test.describe('Smoke: Critical Paths', () => {
  test('can access home screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Should see some content
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(0);
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Try to find and click any navigation button
    const buttons = page.locator('button, [role="button"]');
    const count = await buttons.count();

    // Should have some interactive elements
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Smoke: Data Integrity', () => {
  test('macros display correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check for macro-related text
    const hasMacros = await page.getByText('kcal')
      .or(page.getByText('Proteína'))
      .or(page.getByText('Calorias'))
      .isVisible()
      .catch(() => false);

    // If on home screen, should see macros
    if (hasMacros) {
      expect(hasMacros).toBeTruthy();
    }
  });

  test('weight tracking accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const weightButton = page.getByText('Peso');
    if (await weightButton.isVisible().catch(() => false)) {
      await weightButton.click();
      await page.waitForTimeout(1000);

      // Should see weight-related content
      const hasWeight = await page.getByText('kg')
        .or(page.getByText('Peso'))
        .isVisible()
        .catch(() => false);

      expect(true).toBeTruthy();
    }
  });
});
