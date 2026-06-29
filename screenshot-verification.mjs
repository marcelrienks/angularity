import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const BASE_URL = 'http://localhost:8080';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const pages = [
  { name: 'index', url: '/index.html', title: 'Index (Targets & Config)' },
  { name: 'input', url: '/input.html', title: 'Input' },
  { name: 'report', url: '/report.html', title: 'Report' },
  { name: 'diagrams', url: '/diagrams.html', title: 'Diagrams' }
];

async function takeScreenshot(page, dir, filename) {
  try {
    const filepath = path.join(dir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`  ✓ ${filename}`);
    return filepath;
  } catch (err) {
    console.error(`  ✗ ${filename}: ${err.message}`);
    return null;
  }
}

async function populateSampleData(page) {
  console.log('  Clicking "Sample Data" button...');
  try {
    // Click the sample data button to open modal
    await page.click('#btn-sample');
    await delay(500);
    
    // Look for modal and click confirm
    const confirmBtn = await page.$('#sample-data-modal-confirm');
    if (!confirmBtn) {
      console.error('  Modal confirm button not found');
      return false;
    }
    
    console.log('  Modal opened, clicking confirm...');
    await page.click('#sample-data-modal-confirm');
    await delay(3000); // Wait for grid rebuild and data loading
    
    console.log('  Sample data populated');
    return true;
  } catch (err) {
    console.error(`  Could not populate: ${err.message}`);
    return false;
  }
}

async function captureReportWheels(page, dir) {
  try {
    console.log('  Capturing all wheel tabs...');
    const wheelBtns = ['tab-table-fl', 'tab-table-fr', 'tab-table-rl', 'tab-table-rr'];
    
    for (const btnId of wheelBtns) {
      try {
        const btn = await page.$(`#${btnId}`);
        if (!btn) continue;
        
        await page.click(`#${btnId}`);
        await delay(500);
        
        const wheel = btnId.split('-').pop().toUpperCase();
        await takeScreenshot(page, dir, `report-table-${wheel}.png`);
      } catch (e) {
        // Skip if button doesn't exist
      }
    }
  } catch (err) {
    console.log(`  Wheel tabs skipped: ${err.message}`);
  }
}

async function run() {
  let browser;
  try {
    console.log('🚀 Launching Puppeteer...\n');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Step 1: Populate sample data on input page
    console.log('📥 Populating sample data...');
    console.log(`  Navigating to /input.html...`);
    try {
      await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await delay(1500);
      await populateSampleData(page);
    } catch (err) {
      console.error(`  Error populating: ${err.message}`);
    }
    
    // Step 2: Screenshot all pages
    console.log('\n📊 Capturing screenshots...\n');
    
    for (const pageConfig of pages) {
      console.log(`▶ ${pageConfig.title}`);
      const pageDir = path.join(screenshotsDir, pageConfig.name);
      if (!fs.existsSync(pageDir)) {
        fs.mkdirSync(pageDir, { recursive: true });
      }

      try {
        await page.goto(`${BASE_URL}${pageConfig.url}`, { 
          waitUntil: 'domcontentloaded', 
          timeout: 10000 
        });
        await delay(1500);
        
        // Full page screenshot
        await takeScreenshot(page, pageDir, '00-fullpage.png');
        
        // Report page: capture all wheel tabs
        if (pageConfig.name === 'report') {
          await captureReportWheels(page, pageDir);
        }
      } catch (err) {
        console.error(`  Error: ${err.message}`);
      }
    }

    console.log(`\n✅ Screenshots saved to: ${screenshotsDir}`);

  } catch (err) {
    console.error(`\n❌ Fatal error: ${err.message}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

run();
