/**
 * tests/integration/report-status-scenarios.mjs
 *
 * Test all three status indicator scenarios: Green, Orange, and Red
 * Validates the status determination logic with different measurement data.
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
 * Test a specific status scenario
 * Returns the detected status from the page
 */
async function testStatusScenario(page, scenarioName, testData, expectedStatus) {
  log('TEST', `Testing ${scenarioName}...`);
  
  // Load input page
  await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Write test data to localStorage
  await page.evaluate((data) => {
    for (const [wheel, values] of Object.entries(data)) {
      localStorage.setItem(`mx5-nc1-alignment-${wheel}`, JSON.stringify(values));
    }
  }, testData);
  
  // Navigate to report page
  await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForTimeout(1000); // Wait for calculations
  
  // Extract status information
  const statusInfo = await page.evaluate(() => {
    const statusBlock = document.querySelector('.symmetry-status');
    if (!statusBlock) return null;
    
    const statusClasses = Array.from(statusBlock.classList);
    const statusColor = ['green', 'orange', 'red'].find(c => statusClasses.includes(c));
    const titleText = statusBlock.textContent;
    
    return {
      status: statusColor,
      title: titleText.split('\n')[0].trim(),
      fullText: titleText
    };
  });
  
  if (!statusInfo) {
    console.error(`    ✗ Status indicator not found for ${scenarioName}`);
    return false;
  }
  
  const statusIcon = statusInfo.status === 'green' ? '✓' : 
                     statusInfo.status === 'orange' ? '◐' : '✗';
  log('     ', `Status: ${statusIcon} ${statusInfo.status.toUpperCase()}`);
  log('     ', `Title: ${statusInfo.title.substring(0, 60)}...`);
  
  if (statusInfo.status === expectedStatus) {
    logSection('✓', `${scenarioName}: Status is correct (${expectedStatus})`);
    return true;
  } else {
    logSection('✗', `${scenarioName}: Expected ${expectedStatus}, got ${statusInfo.status}`);
    return false;
  }
}

async function runTests() {
  section('STATUS INDICATOR SCENARIO TESTS');
  
  try {
    await waitForServer(BASE_URL);
    
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    logSection('✓', 'Browser launched');
    
    // ── Scenario 1: GREEN (Perfect match at target)
    // TARGET_CAMBER = -1.1° (needs to be within ±0.15°)
    // TARGET_CASTER = 5.0° (needs to be within ±0.15°)
    // CASTER_MULTIPLIER = 1.462
    // caster = 1.462 × |pos20 - neg20|
    // For caster = 5.0°: pos20 - neg20 should be ≈ 3.42
    log('SCENARIO', 'GREEN - Perfect symmetric match at target');
    const greenData = {
      FL: {
        0: {
          0: { zero: '-1.05', pos20: '-3.27', neg20: '0.15' }  // camber: -1.05°, caster: ≈5.0°
        }
      },
      FR: {
        0: {
          0: { zero: '-1.05', pos20: '-3.27', neg20: '0.15' }
        }
      }
    };
    
    assert(await testStatusScenario(page, 'GREEN scenario', greenData, 'green'), 'GREEN status scenario');
    
    // ── Scenario 2: ORANGE (Match found but off-target)
    // Both wheels have identical measurements, so they match each other (symmetric pair exists)
    // But the matched value is off-target: -0.75° (off by 0.35° from -1.1° target)
    log('SCENARIO', 'ORANGE - Match found but off-target');
    const orangeData = {
      FL: {
        0: {
          0: { zero: '-0.75', pos20: '-3.27', neg20: '0.15' }  // camber: -0.75° (matches FR but off-target by 0.35°)
        }
      },
      FR: {
        0: {
          0: { zero: '-0.75', pos20: '-3.27', neg20: '0.15' }  // same as FL, so symmetric pair matches at -0.75°
        }
      }
    };
    
    assert(await testStatusScenario(page, 'ORANGE scenario', orangeData, 'orange'), 'ORANGE status scenario');
    
    // ── Scenario 3: RED (No match within tolerance)
    // One or both wheels have values outside acceptable range
    log('SCENARIO', 'RED - No symmetric match found');
    const redData = {
      FL: {
        0: {
          0: { zero: '-0.50', pos20: '-3.27', neg20: '0.15' }  // camber: -0.50° (off by 0.60°, outside tolerance)
        }
      },
      FR: {
        0: {
          0: { zero: '-1.05', pos20: '-3.27', neg20: '0.15' }
        }
      }
    };
    
    assert(await testStatusScenario(page, 'RED scenario', redData, 'red'), 'RED status scenario');
    
    await browser.close();
    
    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);

  } catch (error) {
    console.error('Test error:', error.message);
    process.exit(1);
  }
}

runTests();
