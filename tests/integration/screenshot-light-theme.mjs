#!/usr/bin/env node

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:8080';

async function test() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1200 });

    console.log('Taking screenshots of light theme...\n');

    // Screenshot of input page light theme
    console.log('Input page - light theme');
    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Set light theme
    await page.evaluate(() => {
      localStorage.setItem('angularity-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/light-input-page.png' });
    console.log('  ✓ /tmp/light-input-page.png');

    // Report page
    console.log('\nReport page - light theme');
    await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Set light theme
    await page.evaluate(() => {
      localStorage.setItem('angularity-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/light-report-page.png' });
    console.log('  ✓ /tmp/light-report-page.png');

    // Home/settings page
    console.log('\nHome/Settings page - light theme');
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Set light theme
    await page.evaluate(() => {
      localStorage.setItem('angularity-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/light-home-page.png' });
    console.log('  ✓ /tmp/light-home-page.png');

    console.log('\n✅ Screenshots saved');
    console.log('\nAnalyzing color visibility...');

    // Check current color scheme
    const colors = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        bg: style.getPropertyValue('--bg').trim(),
        text: style.getPropertyValue('--text').trim(),
        accent: style.getPropertyValue('--accent').trim(),
        border: style.getPropertyValue('--border').trim(),
        muted: style.getPropertyValue('--muted').trim(),
        panelAlt: style.getPropertyValue('--panel-alt').trim(),
      };
    });

    console.log('\nCurrent light theme CSS variables:');
    Object.entries(colors).forEach(([key, value]) => {
      console.log(`  --${key}: ${value}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

test();
