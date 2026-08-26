const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const APP_URL = 'http://localhost:8081';
const PHONE_VW = 390;
const PHONE_VH = 844;

async function takeScreenshot(page, name, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
  console.log(`✓ Captured: ${name}`);
}

async function clickIfExists(page, text) {
  const btn = page.getByText(text).first();
  try {
    if (await btn.isVisible()) {
      await btn.click();
      await new Promise(r => setTimeout(r, 2000));
      return true;
    }
  } catch {}
  return false;
}

async function main() {
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
    await takeScreenshot(page, '01-home', APP_URL);

    // Meal Plan / Plano
    await clickIfExists(page, 'Plano') || await clickIfExists(page, 'Meal Plan');
    await takeScreenshot(page, '02-meal-plan', APP_URL);

    // Weight / Peso
    await clickIfExists(page, 'Peso') || await clickIfExists(page, 'Weight');
    await takeScreenshot(page, '03-weight', APP_URL);

    // Evolution / Evolução
    await clickIfExists(page, 'Evolução') || await clickIfExists(page, 'Evolution');
    await takeScreenshot(page, '04-evolution', APP_URL);

    // Body Measurements / Medidas
    await clickIfExists(page, 'Medidas') || await clickIfExists(page, 'Measurements');
    await takeScreenshot(page, '05-measurements', APP_URL);

    // Profile / Perfil
    await clickIfExists(page, 'Perfil') || await clickIfExists(page, 'Profile');
    await takeScreenshot(page, '06-profile', APP_URL);

  } finally {
    await browser.close();
  }

  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n📁 Screenshots gerados (${files.length}):`);
  files.forEach(f => console.log(`   - ${f}`));
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
