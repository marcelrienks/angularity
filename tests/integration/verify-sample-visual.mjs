#!/usr/bin/env node

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:8080';

async function test() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    console.log('Loading input page...');
    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    console.log('Clicking sample data button...');
    await page.click('#btn-sample');
    await page.waitForTimeout(1000);

    // Take screenshot of modal
    await page.screenshot({ path: '/tmp/sample-modal.png' });
    console.log('✓ Screenshot: /tmp/sample-modal.png');

    // Click confirm button
    await page.click('#sample-data-modal-confirm');
    await page.waitForTimeout(1500);

    // Take screenshot of populated grid
    await page.screenshot({ path: '/tmp/sample-grid.png' });
    console.log('✓ Screenshot: /tmp/sample-grid.png');

    // Check grid columns to verify 13x13
    const columnCount = await page.evaluate(() => {
      const headers = document.querySelectorAll('.grid-header-col');
      return headers.length;
    });

    console.log(`\nGrid analysis:`);
    console.log(`  Column count: ${columnCount}`);

    if (columnCount >= 13) {
      console.log('✅ Grid is 13×13 (all columns visible)');
    } else {
      console.log(`⚠️  Grid shows ${columnCount} columns (may be scrolled)`);
    }

    // Check first row to verify data is populated
    const firstRowValues = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('input[type="text"]'))
        .slice(0, 5)
        .map(i => i.value);
      return cells;
    });

    const filledCount = firstRowValues.filter(v => v !== '').length;
    console.log(`  Sample inputs filled: ${filledCount}/5`);

    if (filledCount > 0) {
      console.log('✅ Sample data is populated');
    }

    console.log('\n✅ Visual verification complete');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

test();
