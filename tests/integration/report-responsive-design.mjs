/**
 * tests/integration/report-responsive-design.mjs
 *
 * Validates responsive design of symmetry analysis section
 * Tests layout across mobile, tablet, and desktop viewports
 */

import puppeteer from 'puppeteer';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';


const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;

const colors = { green: '\x1b[32m', red: '\x1b[31m', reset: '\x1b[0m' };
function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

let passes = 0, failures = 0;
function assert(condition, label) {
  if (condition) { passes++; log(colors.green, `  ✓ ${label}`); }
  else { failures++; log(colors.red, `  ✗ FAIL: ${label}`); }
}
function approxEqual(a, b, tol) { return Math.abs(a - b) <= tol; }

const logSection = (prefix, message) => {
  console.log(`${prefix.padEnd(8)} ${message}`);
};

const section = (title) => {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`${title.padEnd(80)}`);
  console.log(`${'═'.repeat(80)}`);
};

/**
 * Test layout at specific viewport size
 */
async function testViewport(page, viewportName, width, height) {
  log('VIEWPORT', `Testing ${viewportName} (${width}x${height})...`);
  
  await page.setViewport({ width, height });
  await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Write test data to localStorage
  const testData = {
    FL: {
      0: {
        0: { zero: '-1.05', pos20: '-3.27', neg20: '0.15' }
      }
    },
    FR: {
      0: {
        0: { zero: '-1.05', pos20: '-3.27', neg20: '0.15' }
      }
    }
  };
  
  await page.evaluate((data) => {
    for (const [wheel, values] of Object.entries(data)) {
      localStorage.setItem(`mx5-nc1-alignment-${wheel}`, JSON.stringify(values));
    }
  }, testData);
  
  // Navigate to report page
  await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForTimeout(1000);
  
  // Check layout elements
  const layoutInfo = await page.evaluate(() => {
    const container = document.getElementById('symmetry-container');
    if (!container) return { error: 'Container not found' };
    
    const statusBlock = container.querySelector('.symmetry-status');
    const subsections = container.querySelectorAll('.symmetry-subsection');
    const cards = container.querySelectorAll('.symmetry-card');
    
    // Get computed styles
    const containerStyles = window.getComputedStyle(container);
    const statusStyles = statusBlock ? window.getComputedStyle(statusBlock) : null;
    
    // Check text is readable (not cut off)
    const statusText = statusBlock ? statusBlock.textContent : '';
    const statusTextLength = statusText.length;
    
    // Get grid column count on symmetry-grid
    const grids = container.querySelectorAll('.symmetry-grid');
    const gridInfo = Array.from(grids).map(g => {
      const style = window.getComputedStyle(g);
      return {
        columns: style.gridTemplateColumns,
        gap: style.gridGap,
      };
    });
    
    // Find which element is causing overflow
    let overflowCauseElement = null;
    let overflowCauseWidth = 0;
    const allElements = container.querySelectorAll('*');
    for (const el of allElements) {
      if (el.scrollWidth > container.clientWidth) {
        if (el.scrollWidth > overflowCauseWidth) {
          overflowCauseWidth = el.scrollWidth;
          overflowCauseElement = el.tagName + (el.className ? '.' + el.className.split(' ')[0] : '');
        }
      }
    }
    
    return {
      containerWidth: container.offsetWidth,
      statusBlockVisible: statusBlock ? statusBlock.offsetHeight > 0 : false,
      statusTextLength,
      subsectionCount: subsections.length,
      cardCount: cards.length,
      containerPadding: containerStyles.padding,
      gridInfo,
      hasOverflow: container.scrollWidth > container.clientWidth,
      overflowCauseElement,
      overflowCauseWidth,
      containerScrollWidth: container.scrollWidth,
      containerClientWidth: container.clientWidth,
      parentSection: {
        width: container.parentElement.offsetWidth,
        scrollWidth: container.parentElement.scrollWidth,
        className: container.parentElement.className,
      },
    };
  });
  
  if (layoutInfo.error) {
    console.error(`    ✗ ${layoutInfo.error}`);
    return false;
  }
  
  console.log(`    ✓ Container width: ${layoutInfo.containerWidth}px`);
  console.log(`    ✓ Status block visible: ${layoutInfo.statusBlockVisible}`);
  console.log(`    ✓ Subsections: ${layoutInfo.subsectionCount}`);
  console.log(`    ✓ Cards: ${layoutInfo.cardCount}`);
  console.log(`    ✓ Text length: ${layoutInfo.statusTextLength} characters`);
  console.log(`    ✓ Horizontal overflow: ${layoutInfo.hasOverflow ? 'YES (bad)' : 'NO (good)'}`);
  if (layoutInfo.hasOverflow) {
    console.log(`    ℹ Overflow cause: ${layoutInfo.overflowCauseElement} (width: ${layoutInfo.overflowCauseWidth}px)`);
    console.log(`    ℹ Container: scrollWidth=${layoutInfo.containerScrollWidth}px, clientWidth=${layoutInfo.containerClientWidth}px`);
    console.log(`    ℹ Parent (${layoutInfo.parentSection.className}): width=${layoutInfo.parentSection.width}px, scrollWidth=${layoutInfo.parentSection.scrollWidth}px`);
  }
  
  // Check for issues
  let issues = [];
  
  if (layoutInfo.hasOverflow) {
    issues.push('Horizontal overflow detected');
  }
  
  if (!layoutInfo.statusBlockVisible) {
    issues.push('Status block not visible');
  }
  
  if (layoutInfo.subsectionCount < 2) {
    issues.push('Not enough subsections');
  }
  
  if (issues.length > 0) {
    console.log(`    ✗ Issues: ${issues.join(', ')}`);
    return false;
  } else {
    logSection('✓', `${viewportName} layout is responsive`);
    return true;
  }
}

async function runTests() {
  section('RESPONSIVE DESIGN VALIDATION');
  
  try {
    await waitForServer(BASE_URL);
    
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    logSection('✓', 'Browser launched');
    
    // Test different viewports
    const viewports = [
      { name: 'Mobile (iPhone)', width: 375, height: 667 },
      { name: 'Mobile (Android)', width: 360, height: 720 },
      { name: 'Tablet (iPad Mini)', width: 768, height: 1024 },
      { name: 'Tablet (iPad Pro)', width: 1024, height: 1366 },
      { name: 'Desktop (1920p)', width: 1920, height: 1080 },
    ];
    
    for (const vp of viewports) {
      assert(await testViewport(page, vp.name, vp.width, vp.height), `${vp.name} layout is responsive`);
    }
    
    await browser.close();
    
    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);

  } catch (error) {
    console.error('Test error:', error.message);
    process.exit(1);
  }
}

runTests();
