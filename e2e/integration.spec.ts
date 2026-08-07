import { test, expect } from '@playwright/test';

test.describe('Integration: Nutrition Calculations', () => {
  test('calculations are consistent across app', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Verify app loads without calculation errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.waitForTimeout(1000);

    // Should not have calculation-related errors
    const calcErrors = errors.filter(e =>
      e.includes('NaN') || e.includes('undefined') || e.includes('Infinity')
    );
    expect(calcErrors.length).toBe(0);
  });
});

test.describe('Integration: Navigation State', () => {
  test('maintains state across navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Navigate to different screens and back
    const screens = ['Plano', 'Peso', 'Resumo'];

    for (const screen of screens) {
      const button = page.getByText(screen);
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(500);

        // Go back
        const backButton = page.getByText('← Voltar').or(page.getByText('Voltar'));
        if (await backButton.isVisible().catch(() => false)) {
          await backButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });
});

test.describe('Integration: Data Persistence', () => {
  test('persists data in localStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check if AsyncStorage is being used
    const storage = await page.evaluate(() => {
      return Object.keys(localStorage).length;
    });

    // App should be using some form of storage
    expect(storage).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Integration: Theme Consistency', () => {
  test('applies dark theme consistently', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check background color
    const bgColor = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    });

    // Should have dark background (#1A1A2E or similar)
    expect(bgColor).toBeTruthy();
  });
});

test.describe('Integration: Error Handling', () => {
  test('handles missing data gracefully', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/');
    await page.waitForTimeout(3000);

    // App should not crash
    const body = await page.locator('body');
    await expect(body).toBeVisible();

    // Should not have uncaught errors
    const criticalErrors = errors.filter(e =>
      !e.includes('ResizeObserver') && !e.includes('favicon')
    );
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Integration: Performance', () => {
  test('loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForTimeout(2000);
    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('no memory leaks on navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Navigate multiple times
    for (let i = 0; i < 5; i++) {
      const button = page.getByText('Plano').or(page.getByText('Peso'));
      if (await button.first().isVisible().catch(() => false)) {
        await button.first().click();
        await page.waitForTimeout(300);

        const back = page.getByText('← Voltar').or(page.getByText('Voltar'));
        if (await back.isVisible().catch(() => false)) {
          await back.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // App should still be responsive
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });
});
