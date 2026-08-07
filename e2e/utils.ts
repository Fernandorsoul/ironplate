import { Page, expect } from '@playwright/test';

export async function waitForAppLoad(page: Page) {
  await page.goto('/');
  await page.waitForTimeout(2000);
}

export async function navigateToScreen(page: Page, screenName: string) {
  const button = page.getByText(screenName);
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

export async function goBack(page: Page) {
  const backButton = page.getByText('← Voltar').or(page.getByText('Voltar'));
  if (await backButton.isVisible().catch(() => false)) {
    await backButton.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

export async function checkNoErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.waitForTimeout(1000);

  const criticalErrors = errors.filter(e =>
    !e.includes('ResizeObserver') &&
    !e.includes('favicon') &&
    !e.includes('DevTools')
  );

  return criticalErrors.length === 0;
}

export async function getElementText(page: Page, selector: string) {
  const element = page.locator(selector);
  if (await element.isVisible().catch(() => false)) {
    return await element.textContent();
  }
  return null;
}
