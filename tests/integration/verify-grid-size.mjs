#!/usr/bin/env node

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:8080';

async function test() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    console.log('Loading input page...');
    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    console.log('Clicking sample button and confirming...');
    await page.click('#btn-sample');
    await page.waitForTimeout(500);
    await page.click('#sample-data-modal-confirm');
    await page.waitForTimeout(1500);

    // Get grid dimensions
    const gridInfo = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"]');

      // Get unique position values by examining input names/data-attributes
      const positions = new Set();
      inputs.forEach(input => {
        // Try to extract position from various attributes
        const dataPos = input.getAttribute('data-position');
        const dataCell = input.getAttribute('data-cell');
        if (dataPos) positions.add(dataPos);
        if (dataCell) positions.add(dataCell);
      });

      // Count visible inputs
      const visibleInputs = Array.from(inputs).filter(i => i.offsetParent !== null).length;

      // Get first few input values to check if data loaded
      const firstValues = Array.from(inputs)
        .slice(0, 20)
        .map(i => i.value)
        .filter(v => v !== '')
        .length;

      return {
        totalInputs: inputs.length,
        visibleInputs: visibleInputs,
        filledInputs: firstValues,
        gridExists: !!document.getElementById('input-grid')
      };
    });

    console.log('\nGrid Information:');
    console.log(`  Total inputs: ${gridInfo.totalInputs}`);
    console.log(`  Visible inputs: ${gridInfo.visibleInputs}`);
    console.log(`  Filled sample (first 20): ${gridInfo.filledInputs}`);
    console.log(`  Grid element exists: ${gridInfo.gridExists}`);

    // Expected: 13x13 = 169 cells, each with 3 inputs (neg20, zero, pos20) = 507 total inputs
    // Or if it's 5x5 = 25 cells * 3 = 75 inputs
    if (gridInfo.totalInputs >= 450) {
      console.log('\n✅ Grid is 13×13 (169 cells * 3 inputs per cell = 507+ total)');
    } else if (gridInfo.totalInputs >= 70) {
      console.log(`\n⚠️  Grid is 5×5 (25 cells * 3 inputs = 75 total, got ${gridInfo.totalInputs})`);
    } else {
      console.log(`\n❌ Unexpected grid size: ${gridInfo.totalInputs} inputs`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

test();
