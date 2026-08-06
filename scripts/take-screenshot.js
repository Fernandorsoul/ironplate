const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 size
  });
  const page = await context.newPage();

  try {
    // Navigate to the app
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Take screenshot of onboarding
    await page.screenshot({
      path: 'screenshots/01-onboarding.png',
      fullPage: false,
    });
    console.log('Screenshot 1: Onboarding captured');

    // Fill in the name
    const nameInput = page.locator('input[placeholder="Seu nome"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Atleta');
      await page.screenshot({
        path: 'screenshots/02-name-filled.png',
        fullPage: false,
      });
      console.log('Screenshot 2: Name filled');

      // Click next
      const nextButton = page.locator('text=Próximo').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: 'screenshots/03-step2-data.png',
          fullPage: false,
        });
        console.log('Screenshot 3: Step 2 - Data');

        // Fill data
        const ageInput = page.locator('input[placeholder="Idade"]');
        const weightInput = page.locator('input[placeholder="Peso (kg)"]');
        const heightInput = page.locator('input[placeholder="Altura (cm)"]');

        if (await ageInput.isVisible()) {
          await ageInput.fill('25');
          await weightInput.fill('80');
          await heightInput.fill('175');
          await page.screenshot({
            path: 'screenshots/04-data-filled.png',
            fullPage: false,
          });
          console.log('Screenshot 4: Data filled');

          // Click next
          const nextBtn2 = page.locator('text=Próximo').first();
          await nextBtn2.click();
          await page.waitForTimeout(500);
          await page.screenshot({
            path: 'screenshots/05-step3-activity.png',
            fullPage: false,
          });
          console.log('Screenshot 5: Step 3 - Activity');

          // Select activity
          const activeOption = page.locator('text=Muito ativo').first();
          if (await activeOption.isVisible()) {
            await activeOption.click();
            await page.screenshot({
              path: 'screenshots/06-activity-selected.png',
              fullPage: false,
            });
            console.log('Screenshot 6: Activity selected');

            // Click next
            const nextBtn3 = page.locator('text=Próximo').first();
            await nextBtn3.click();
            await page.waitForTimeout(500);
            await page.screenshot({
              path: 'screenshots/07-step4-goal.png',
              fullPage: false,
            });
            console.log('Screenshot 7: Step 4 - Goal');

            // Select goal
            const bulkOption = page.locator('text=Bulking (ganhar massa)').first();
            if (await bulkOption.isVisible()) {
              await bulkOption.click();
              await page.screenshot({
                path: 'screenshots/08-goal-selected.png',
                fullPage: false,
              });
              console.log('Screenshot 8: Goal selected');

              // Select sport
              const bbOption = page.locator('text=Bodybuilding').first();
              if (await bbOption.isVisible()) {
                await bbOption.click();
                await page.screenshot({
                  path: 'screenshots/09-sport-selected.png',
                  fullPage: false,
                });
                console.log('Screenshot 9: Sport selected');

                // Click start
                const startButton = page.locator('text=Começar').first();
                if (await startButton.isVisible()) {
                  await startButton.click();
                  await page.waitForTimeout(2000);
                  await page.screenshot({
                    path: 'screenshots/10-home-screen.png',
                    fullPage: true,
                  });
                  console.log('Screenshot 10: Home screen captured');
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({
      path: 'screenshots/error-state.png',
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
})();
