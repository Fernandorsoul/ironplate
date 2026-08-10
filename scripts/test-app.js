const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testApp() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 size
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    consoleErrors.push(`PAGE ERROR: ${error.message}`);
  });

  console.log('1. Opening app...');
  await page.goto('http://localhost:8082', { waitUntil: 'networkidle' });
  await delay(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login.png'), fullPage: true });
  console.log('   Screenshot: 01-login.png');

  // Check if login screen is visible
  const loginTitle = await page.textContent('body');
  console.log('   Login screen loaded:', loginTitle.includes('IRONPLATE') || loginTitle.includes('Login'));

  // Try to register
  console.log('2. Testing Register flow...');
  const registerLink = await page.$('text=Registrar');
  if (registerLink) {
    await registerLink.click();
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-register.png'), fullPage: true });
    console.log('   Screenshot: 02-register.png');
  }

  // Fill registration form
  const nameInput = await page.$('input[placeholder*="nome"], input[placeholder*="Nome"]');
  if (nameInput) {
    await nameInput.fill('Teste User');
  }

  const emailInput = await page.$('input[placeholder*="email"], input[placeholder*="Email"]');
  if (emailInput) {
    await emailInput.fill('teste@teste.com');
  }

  const passwordInputs = await page.$$('input[type="password"]');
  for (const input of passwordInputs) {
    await input.fill('123456');
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-register-filled.png'), fullPage: true });
  console.log('   Screenshot: 03-register-filled.png');

  // Try to submit registration
  const registerButton = await page.$('button:has-text("Registrar"), button:has-text("Cadastrar")');
  if (registerButton) {
    await registerButton.click();
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-after-register.png'), fullPage: true });
    console.log('   Screenshot: 04-after-register.png');
  }

  // Check if we're on onboarding
  console.log('3. Testing Onboarding...');
  await delay(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-onboarding.png'), fullPage: true });
  console.log('   Screenshot: 05-onboarding.png');

  // Fill onboarding
  const nameOnboarding = await page.$('input[placeholder*="nome"], input[placeholder*="Nome"]');
  if (nameOnboarding) {
    await nameOnboarding.fill('Atleta Teste');
    const nextButton = await page.$('button:has-text("Próximo"), button:has-text("Começar")');
    if (nextButton) {
      await nextButton.click();
      await delay(1000);
    }
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-onboarding-step2.png'), fullPage: true });
  console.log('   Screenshot: 06-onboarding-step2.png');

  // Fill physical data
  const ageInput = await page.$('input[placeholder*="Idade"]');
  const weightInput = await page.$('input[placeholder*="Peso"]');
  const heightInput = await page.$('input[placeholder*="Altura"]');

  if (ageInput) await ageInput.fill('25');
  if (weightInput) await weightInput.fill('80');
  if (heightInput) await heightInput.fill('175');

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-onboarding-filled.png'), fullPage: true });
  console.log('   Screenshot: 07-onboarding-filled.png');

  // Navigate through onboarding steps
  for (let i = 0; i < 3; i++) {
    const nextBtn = await page.$('button:has-text("Próximo"), button:has-text("Começar")');
    if (nextBtn) {
      await nextBtn.click();
      await delay(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `08-onboarding-step${i + 3}.png`), fullPage: true });
      console.log(`   Screenshot: 08-onboarding-step${i + 3}.png`);
    }
  }

  // Check home screen
  console.log('4. Testing Home Screen...');
  await delay(2000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-home.png'), fullPage: true });
  console.log('   Screenshot: 09-home.png');

  const homeContent = await page.textContent('body');
  console.log('   Home screen loaded:', homeContent.includes('Olá') || homeContent.includes('Atleta'));

  // Test navigation to different screens
  console.log('5. Testing Navigation...');

  // Try clicking on action buttons
  const actionButtons = await page.$$('button, [role="button"]');
  console.log(`   Found ${actionButtons.length} interactive elements`);

  // Screenshot current state
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-final-state.png'), fullPage: true });
  console.log('   Screenshot: 10-final-state.png');

  // Summary
  console.log('\n=== CONSOLE ERRORS ===');
  if (consoleErrors.length === 0) {
    console.log('No console errors detected!');
  } else {
    consoleErrors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.substring(0, 200)}`);
    });
  }

  console.log('\n=== TEST SUMMARY ===');
  console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log(`Total console errors: ${consoleErrors.length}`);

  await browser.close();
}

testApp().catch(console.error);
