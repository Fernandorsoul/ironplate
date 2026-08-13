import { chromium, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const APP_URL = 'http://localhost:8081';

// Mobile viewport dims for Play Store screenshots
const PHONE_VW = 390;
const PHONE_VH = 844;

const screens = [
  { name: '01-home', desc: 'Home screen', url: '/', action: null },
];

async function takeScreenshot(page: Page, name: string, url: string) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  // Wait for app to render
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
  console.log(`✓ Captured: ${name}`);
}

async function main() {
  // Create output directory
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: PHONE_VW, height: PHONE_VH },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  console.log('📸 Gerando screenshots do IronPlate...');

  try {
    // Home / Main screen
    await takeScreenshot(page, '01-home', APP_URL);

    // If there's an onboarding step, wait longer
    await page.waitForTimeout(2000);

    // Try to find and navigate to various tabs
    // Meal Plan / Plano
    const planBtn = page.getByText('Plano').or(page.getByText('Meal Plan')).first();
    if (await planBtn.isVisible().catch(() => false)) {
      await planBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-meal-plan.png') });
      console.log('✓ Captured: meal-plan');
    }

    // Weight / Peso
    const weightBtn = page.getByText('Peso').or(page.getByText('Weight')).first();
    if (await weightBtn.isVisible().catch(() => false)) {
      await weightBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-weight.png') });
      console.log('✓ Captured: weight');
    }

    // Evolution / Evolução
    const evolutionBtn = page.getByText('Evolução').or(page.getByText('Evolution')).first();
    if (await evolutionBtn.isVisible().catch(() => false)) {
      await evolutionBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-evolution.png') });
      console.log('✓ Captured: evolution');
    }

    // Body Measurements / Medidas Corporais
    const measureBtn = page.getByText('Medidas').or(page.getByText('Measurements')).first();
    if (await measureBtn.isVisible().catch(() => false)) {
      await measureBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-measurements.png') });
      console.log('✓ Captured: measurements');
    }

    // Profile / Perfil
    const profileBtn = page.getByText('Perfil').or(page.getByText('Profile')).first();
    if (await profileBtn.isVisible().catch(() => false)) {
      await profileBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-profile.png') });
      console.log('✓ Captured: profile');
    }
  } finally {
    await browser.close();
  }

  // List generated files
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n📁 Screenshots gerados (${files.length}):`);
  files.forEach(f => console.log(`   - ${f}`));
}

main().catch((err: unknown) => {
  console.error('❌ Erro ao gerar screenshots:', err instanceof Error ? err.message : err);
  process.exit(1);
});
