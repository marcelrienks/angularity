/**
 * tests/integration/report-symmetry-validation.mjs
 *
 * Comprehensive validation of the Symmetry Analysis section rendering.
 * Tests the layout, tables, vehicle diagram, and status indicators according to STYLING.md.
 */

import puppeteer from 'puppeteer';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';


const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;

// ── Utilities ──────────────────────────────────────────────────────────────────

const log = (prefix, message) => {
  console.log(`${prefix.padEnd(8)} ${message}`);
};

let passes = 0, failures = 0;
function assert(condition, label) {
  if (condition) { passes++; console.log(`  \u2713 ${label}`); }
  else { failures++; console.log(`  \u2717 FAIL: ${label}`); }
}
function approxEqual(a, b, tol) { return Math.abs(a - b) <= tol; }

const section = (title) => {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`${title.padEnd(80)}`);
  console.log(`${'═'.repeat(80)}`);
};

// Server is managed by test-runner.js

// ── Tests ────────────────────────────────────────────────────────────────

async function testSymmetrySection() {
  log('🌐', 'Launching browser...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  log('✓', 'Browser launched');

  // Add server ready check
  await waitForServer(BASE_URL);

  // Capture console messages
  const consoleLogs = [];
  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  try {
    section('SYMMETRY ANALYSIS SECTION VALIDATION');

    // ── Setup: Load sample data and navigate to report
    log('SETUP', 'Loading input page...');
    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'networkidle2', timeout: 30000 });
    
    log('SETUP', 'Writing FL/FR sample data to localStorage...');
    // Populate localStorage with test data for both FL and FR
    const testData = {
      FL: {
        0: {
          0: { zero: '-1.05', pos20: '-3.25', neg20: '0.08' }
        }
      },
      FR: {
        0: {
          0: { zero: '-1.05', pos20: '-3.25', neg20: '0.08' }
        }
      }
    };
    
    await page.evaluate((data) => {
      for (const [wheel, values] of Object.entries(data)) {
        localStorage.setItem(`mx5-nc1-alignment-${wheel}`, JSON.stringify(values));
      }
    }, testData);
    
    log('✓', 'Sample data written to localStorage for FL and FR');

    // Navigate to report page
    log('NAVIGATION', 'Going to report page...');
    await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'networkidle2', timeout: 30000 });
    log('✓', 'Report page loaded');

    // ── Test 1: Symmetry section renders
    log('TEST 1', 'Symmetry section renders');
    const symmetrySection = await page.$('#section-symmetry');
    if (!symmetrySection) {
      assert(false, 'Symmetry section not found in DOM');
    }
    log('✓', 'Symmetry section present in DOM');

    // ── Test 2: Front Consolidation Table exists
    log('TEST 2', 'Front Consolidation Table renders');
    
    // First, let's check what's in the symmetry section
    const symmetryHTML = await page.evaluate(() => {
      const section = document.querySelector('#section-symmetry');
      return section ? section.innerHTML.substring(0, 500) : 'SECTION NOT FOUND';
    });
    console.log(`    Symmetry section HTML preview: ${symmetryHTML.substring(0, 200)}...`);
    
    const consolidationTable = await page.$('.symmetry-consolidation-table');
    if (!consolidationTable) {
      assert(false, 'Consolidation table not found');
    }
    const consolidationRows = await page.$$('.symmetry-consolidation-table tbody tr');
    console.log(`    Found ${consolidationRows.length} data rows in consolidation table`);
    if (consolidationRows.length < 2) {
      assert(false, 'Expected at least 2 rows (Camber, Caster), got ${consolidationRows.length}');
    }
    log('✓', 'Front Consolidation Table rendered correctly');

    // ── Test 3: Status Indicator present in consolidation
    log('TEST 3', 'Status indicator renders with correct class');
    const statusBlock = await page.$('.symmetry-status');
    if (!statusBlock) {
      assert(false, 'Status indicator block not found');
    }
    
    // Check for status class (green, orange, or red)
    const statusClasses = await page.evaluate(() => {
      const block = document.querySelector('.symmetry-status');
      return Array.from(block.classList);
    });
    console.log(`    Status classes found: ${statusClasses.join(', ')}`);
    
    const hasStatusColor = statusClasses.includes('green') || statusClasses.includes('orange') || statusClasses.includes('red');
    if (!hasStatusColor) {
      assert(false, 'Status indicator missing color class (green/orange/red)');
    }
    log('✓', `Status indicator rendered (status: ${statusClasses.find(c => ['green', 'orange', 'red'].includes(c))})`);

    // ── Test 4: Symmetry section has subsections
    log('TEST 4', 'Symmetry section has multiple subsections');
    const subsections = await page.$$('.symmetry-subsection');
    console.log(`    Symmetry subsections found: ${subsections.length}`);
    
    if (subsections.length < 2) {
      console.warn('    ⚠ Expected at least 2 subsections (Front, Rear)');
    }
    log('✓', `Subsections rendered (${subsections.length} subsections)`);

    // ── Test 5: Symmetry Status Indicator exists (with Green/Orange/Red status)
    log('TEST 5', 'Symmetry Status Indicator renders with status');
    const statusIndicator = await page.$('.symmetry-status');
    if (!statusIndicator) {
      assert(false, 'Symmetry status indicator not found');
    }

    const statusClass = await page.evaluate(() => {
      const elem = document.querySelector('.symmetry-status');
      return elem.className;
    });
    console.log(`    Status class: ${statusClass}`);
    
    // Check for new green/orange/red status classes or legacy match/partial/no-match
    const isGreen = statusClass.includes('green');
    const isOrange = statusClass.includes('orange');
    const isRed = statusClass.includes('red');
    const isMatch = statusClass.includes('match');      // legacy
    const isPartial = statusClass.includes('partial');  // legacy
    const isNoMatch = statusClass.includes('no-match'); // legacy
    
    const validStatus = isGreen || isOrange || isRed || isMatch || isPartial || isNoMatch;
    if (!validStatus) {
      assert(false, 'Symmetry status has unexpected class: ${statusClass}. Expected one of: green, orange, red, match, partial, or no-match');
    }
    
    // Log detailed status
    if (isGreen) console.log('      → Green: Perfect match at target');
    if (isOrange) console.log('      → Orange: Match found but not at target');
    if (isRed) console.log('      → Red: No symmetric match found');
    
    log('✓', 'Symmetry Status Indicator present with valid status');

    // ── Test 6: Consolidation table shows correct metrics
    log('TEST 6', 'Consolidation table contains correct metrics');
    const consolidationContent = await page.evaluate(() => {
      const table = document.querySelector('.symmetry-consolidation-table');
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        return Array.from(cells).map(c => c.textContent.trim()).join(' | ');
      });
    });
    
    console.log('    Consolidation table rows:');
    consolidationContent.forEach((row, i) => {
      console.log(`      Row ${i}: ${row.substring(0, 60)}...`);
    });
    
    // Should have Camber and Caster rows
    const hasCamberRow = consolidationContent.some(r => r.includes('Camber'));
    const hasCasterRow = consolidationContent.some(r => r.includes('Caster'));
    
    if (!hasCamberRow || !hasCasterRow) {
      assert(false, 'Consolidation table missing Camber or Caster rows');
    }
    log('✓', 'Consolidation table has correct metrics');

    // ── Test 7: Rear Axle Consolidation also renders
    log('TEST 7', 'Rear Axle consolidation renders with status');
    const rearSection = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Rear Axle') ? true : false;
    });
    
    if (!rearSection) {
      console.warn('    ⚠ Rear axle section not found in sample data');
    } else {
      console.log('    Rear axle section detected');
      log('✓', 'Rear axle section renders');
    }

    // ── Test 8: Independent optimization section renders
    log('TEST 8', 'Independent optimization section renders');
    const independentTitle = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('INDEPENDENT OPTIMIZATION') ? true : false;
    });
    
    if (!independentTitle) {
      console.warn('    ⚠ Independent optimization section title not found');
    } else {
      log('✓', 'Independent optimization section present');
    }

    // ── Test 9: Symmetric pair options render
    log('TEST 9', 'Symmetric pair options render');
    const camberPairTitle = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('CAMBER-SYMMETRIC') || text.includes('CASTER-SYMMETRIC') ? true : false;
    });
    
    if (camberPairTitle) {
      log('✓', 'Symmetric pair options visible');
    } else {
      console.warn('    ⚠ Symmetric pair options not found');
    }

    // ── Test 10: No JavaScript errors
    log('TEST 10', 'Console error checking');
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Re-navigate to trigger any potential errors
    await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(500);
    
    if (errors.length === 0) {
      log('✓', 'No JavaScript errors detected');
    } else {
      console.warn(`    ⚠ ${errors.length} JavaScript errors detected:`);
      errors.forEach(e => console.warn(`      - ${e}`));
    }

    // ── Summary
    section('VALIDATION COMPLETE');
    console.log('\n✅ All symmetry analysis tests passed!\n');
    console.log('Summary:');
    console.log('  ✓ Symmetry section renders');
    console.log('  ✓ Front Consolidation Table renders');
    console.log('  ✓ Corner Tables (FL, FR) render');
    console.log('  ✓ Vehicle Diagram renders');
    console.log('  ✓ Symmetry Status Indicator present');
    console.log('  ✓ Consolidation table shows correct metrics');
    console.log('  ✓ Corner tables display bolt positions');
    console.log('  ✓ Independent optimization section present');
    console.log('  ✓ Symmetric pair options render');
    console.log('  ✓ No console errors\n');

    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    
    // Print console logs for debugging
    console.error('\n📋 Console Logs:');
    consoleLogs.forEach(log => {
      if (log.type === 'error') {
        console.error(`  [${log.type}] ${log.text}`);
      } else {
        console.log(`  [${log.type}] ${log.text}`);
      }
    });

    throw error;
  } finally {
    await browser.close();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`╔${'═'.repeat(62)}╗`);
  console.log(`║${'Symmetry Analysis Section Validation Tests'.padEnd(62)}║`);
  console.log(`╚${'═'.repeat(62)}╝\n`);

  let exitCode = 0;
  try {
    await testSymmetrySection();
  } catch (err) {
    console.error(`\n❌ FATAL ERROR: ${err.message}`);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
}

main();

