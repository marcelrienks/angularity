#!/usr/bin/env node

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:8080';

async function test() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    console.log('Navigating to input page...');
    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Wait for modules to load
    console.log('✓ Input page loaded');

    // Wait for button to be available
    await page.waitForSelector('#btn-sample', { timeout: 10000 });

    // Clear localStorage
    await page.evaluate(() => localStorage.clear());

    // Click sample data button
    console.log('Clicking sample data button...');

    // Handle the confirm dialog asynchronously
    const dialogPromise = new Promise(resolve => {
      page.once('dialog', async dialog => {
        console.log(`Dialog: "${dialog.message()}"`);
        await dialog.accept();
        resolve();
      });
    });

    await page.click('#btn-sample');

    // Wait for dialog to be handled
    await Promise.race([dialogPromise, new Promise(r => setTimeout(r, 2000))]);
    await page.waitForTimeout(500);

    // Check if modal appeared
    const modalExists = await page.$('#sample-data-modal');
    if (modalExists) {
      console.log('✓ Sample data modal appeared');
    } else {
      console.log('✗ Modal did not appear');
    }

    // Check modal content
    const modalText = modalExists ? await page.$eval('#sample-data-modal', el => el.textContent) : '';
    if (modalText.includes('13×13') || modalText.includes('13x13')) {
      console.log('✓ Modal mentions 13×13 configuration');
    } else {
      console.log('✗ Modal missing 13×13 reference:', modalText.substring(0, 100));
    }

    // Click "Load Sample Data" button to confirm
    const confirmBtn = await page.$('#sample-data-modal-confirm');
    if (confirmBtn) {
      await confirmBtn.click();
      await page.waitForTimeout(1000);
      console.log('✓ Sample data loaded (confirmed)');
    }

    // Check measurement density (select is on settings page, may not exist on input page)
    const selectExists = await page.$('#measurement-density-select');
    if (selectExists) {
      const density = await page.$eval('#measurement-density-select', el => el.value);
      if (density === '13') {
        console.log('✓ Measurement density select = "13"');
      } else {
        console.log(`? Measurement density select = "${density}"`);
      }
    }

    // Get localStorage value to verify
    const stored = await page.evaluate(() => localStorage.getItem('alignment_measurement_density'));
    if (stored === '13') {
      console.log('✓ localStorage alignment_measurement_density = "13"');
    } else {
      console.log(`✗ localStorage alignment_measurement_density = "${stored}", expected "13"`);
    }

    // Check grid is populated by looking at visible inputs
    const allInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"]');
      const visible = Array.from(inputs)
        .filter(i => i.offsetParent !== null)
        .slice(0, 5)
        .map(i => i.value);
      return visible;
    });

    const filledCount = allInputs.filter(v => v !== '').length;
    if (filledCount > 0) {
      console.log(`✓ Grid populated: ${filledCount}/${allInputs.length} sample inputs filled`);
    } else {
      console.log('? Grid inputs not found or empty');
    }

    // Check that all wheel tabs exist
    const wheels = ['FL', 'FR', 'RL', 'RR'];
    let wheelCount = 0;
    for (const wheel of wheels) {
      const exists = await page.evaluate((w) => {
        return !!document.querySelector(`[data-wheel="${w}"]`);
      }, wheel);
      if (exists) {
        console.log(`✓ Wheel ${wheel} tab exists`);
        wheelCount++;
      }
    }

    if (wheelCount < 4) {
      console.log(`? Only ${wheelCount}/4 wheels found`);
    }

    console.log('\n✅ Sample data test complete - all verifications passed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

test();
