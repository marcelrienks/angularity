#!/usr/bin/env node

/**
 * Integration Test: Color-Coding UI Rendering & Interaction
 *
 * Validates that the report page correctly renders color-coded cells based on
 * the selected color-code-by preference (camber vs caster).
 *
 * This test goes beyond data sync validation to verify:
 * - DOM elements have correct CSS classes for color tiers
 * - Toggling color-code-by radio button dynamically changes cell colors
 * - Both camber and caster color tiers render correctly
 */

import puppeteer from 'puppeteer';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';


const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`);
}

let passes = 0, failures = 0;
function assert(condition, label) {
  if (condition) { passes++; log(colors.green, `  \u2713 ${label}`); }
  else { failures++; log(colors.red, `  \u2717 FAIL: ${label}`); }
}
function approxEqual(a, b, tol) { return Math.abs(a - b) <= tol; }



async function setWheelData(page, wheel, data) {
  await page.evaluate((wheelId, wheelData) => {
    const key = `mx5-nc1-alignment-${wheelId}`;
    localStorage.setItem(key, JSON.stringify(wheelData));
  }, wheel, data);
}

async function navigateTo(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

async function main() {
  let browser = null;

  try {
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  MX5 NC1 Alignment - Color-Coding UI Rendering Test        ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');

    // Launch browser
    log(colors.cyan, '🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    log(colors.green, '✓ Browser launched\n');

    const page = await browser.newPage();
    await waitForServer(BASE_URL);
    await page.setDefaultTimeout(10000);

    // Test data with mixed color scenarios
    // Format: gridState[front][rear][reading] matching localStorage schema
    // Valid bolt positions: [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]
    const testData = {
      // GREEN camber: -1.05° (Δ 0.05° from -1.1°)
      // ORANGE caster: 5.41° (Δ 0.41° from 5.0°) — calculated from sweep values
      FL: {
        0: {
          0: { zero: '-1.05', pos20: '-3.25', neg20: '0.08' }
        }
      },
      // ORANGE camber: -1.42° (Δ 0.32° from -1.1°)
      // RED caster: 6.11° (Δ 1.11° from 5.0°)
      FR: {
        0: {
          0: { zero: '-1.42', pos20: '-4.10', neg20: '0.08' }
        }
      }
    };

    log(colors.yellow, '📊 Test Data:');
    log(colors.yellow, '   FL Camber: -1.05° (GREEN Δ=0.05°), Caster: 4.87° (GREEN Δ=0.13°)');
    log(colors.yellow, '   FR Camber: -1.42° (ORANGE Δ=0.32°), Caster: 6.11° (RED Δ=1.11°)');

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Populate localStorage with test data
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ STEP 1: Populate localStorage ────────────────────────────┐');
    await navigateTo(page, '/input.html');
    for (const [wheel, values] of Object.entries(testData)) {
      await setWheelData(page, wheel, values);
    }
    log(colors.green, '✓ Test data written to localStorage');

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Load report page and verify initial color coding (Camber)
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ STEP 2: Verify Initial Color Coding (By Camber) ────────┐');
    await navigateTo(page, '/report.html');
    log(colors.green, '✓ Report page loaded');

    // Wait a bit for page JS to run and load from localStorage
    await page.waitForTimeout(1500);

    // Check if table exists
    const tableExists = await page.$('table.data-table') !== null;
    if (!tableExists) {
      log(colors.yellow, '  Table not yet visible, checking page state...');
      
      const pageContent = await page.evaluate(() => ({
        hasStorage: localStorage.getItem('mx5-nc1-alignment-FL') !== null,
        hasTable: document.querySelector('table.data-table') !== null,
        tableSectionVisible: document.querySelector('#section-table')?.style.display,
        noDataMsgVisible: document.querySelector('#no-data-msg')?.style.display
      }));
      
      log(colors.yellow, `  Storage has data: ${pageContent.hasStorage}`);
      log(colors.yellow, `  Table exists: ${pageContent.hasTable}`);
      log(colors.yellow, `  Table section visible: ${pageContent.tableSectionVisible}`);
      log(colors.yellow, `  No-data msg visible: ${pageContent.noDataMsgVisible}`);
    }

    // Wait for table to render
    await page.waitForSelector('table.data-table', { timeout: 5000 });
    log(colors.green, '✓ Data table rendered');

    const frontMetricButtonState = await page.evaluate(() => ({
      camberDisabled: document.querySelector('button[data-metric="camber"]')?.disabled ?? null,
      casterDisabled: document.querySelector('button[data-metric="caster"]')?.disabled ?? null,
      toeDisabled: document.querySelector('button[data-metric="toe"]')?.disabled ?? null,
    }));
    if (frontMetricButtonState.camberDisabled === false
      && frontMetricButtonState.casterDisabled === false
      && frontMetricButtonState.toeDisabled === true) {
      log(colors.green, '✓ Front-wheel metric gating verified (camber/caster enabled, toe disabled)');
    } else {
      assert(false, 'Unexpected front metric button state: ${JSON.stringify(frontMetricButtonState)}');
    }

    // Get selected metric + color class for the active wheel
    const camberColorsByWheel = await page.evaluate(() => {
      const activeTab = document.querySelector('.wheel-selector button.active');
      const activeWheel = activeTab?.getAttribute('data-wheel') || 'FL';
      const metricNode = document.querySelector('table.data-table tbody tr td .cell-value > div');
      if (!metricNode) return {};

      const className = metricNode.className;
      const metric = className.includes('camber') ? 'camber' : className.includes('caster') ? 'caster' : className.includes('toe') ? 'toe' : 'unknown';
      const tier = className.includes('target-met')
        ? 'target-met'
        : className.includes('near-target')
          ? 'near-target'
          : className.includes('off-target')
            ? 'off-target'
            : 'unknown';

      return {
        [activeWheel]: { metric, tier }
      };
    });


    // Now switch to the other wheel to get its color
    const otherWheel = camberColorsByWheel.FL ? 'FR' : 'FL';
    const otherWheelTab = await page.$(`button[data-wheel="${otherWheel}"]`);
    if (otherWheelTab) {
      await otherWheelTab.click();
      await page.waitForTimeout(300);
      
      const otherModeData = await page.evaluate((wheel) => {
        const metricNode = document.querySelector('table.data-table tbody tr td .cell-value > div');
        if (!metricNode) return {};

        const className = metricNode.className;
        const metric = className.includes('camber') ? 'camber' : className.includes('caster') ? 'caster' : className.includes('toe') ? 'toe' : 'unknown';
        const tier = className.includes('target-met')
          ? 'target-met'
          : className.includes('near-target')
            ? 'near-target'
            : className.includes('off-target')
              ? 'off-target'
              : 'unknown';

        return {
          [wheel]: { metric, tier }
        };
      }, otherWheel);
      
      Object.assign(camberColorsByWheel, otherModeData);
      
      // Switch back to FL for next test
      const flTab = await page.$('button[data-wheel="FL"]');
      if (flTab) {
        await flTab.click();
        await page.waitForTimeout(300);
      }
    }

    log(colors.cyan, '\n  Metric Classes (Camber Mode):');
    log(colors.yellow, `  Data: ${JSON.stringify(camberColorsByWheel)}`);
    log(colors.yellow, `  FL: ${camberColorsByWheel.FL?.metric || 'N/A'} (${camberColorsByWheel.FL?.tier || 'N/A'})`);
    log(colors.yellow, `  FR: ${camberColorsByWheel.FR?.metric || 'N/A'} (${camberColorsByWheel.FR?.tier || 'N/A'})`);

    // Verify camber mode shows only camber with expected tier
    const flCamberCorrect = camberColorsByWheel.FL?.metric === 'camber' && camberColorsByWheel.FL?.tier === 'target-met';
    const frCamberCorrect = camberColorsByWheel.FR?.metric === 'camber' && camberColorsByWheel.FR?.tier === 'near-target';
    
    if (flCamberCorrect && frCamberCorrect) {
      log(colors.green, '✓ Camber metric rendering verified (FL: GREEN tier, FR: ORANGE tier)');
    } else {
      log(colors.red, `✗ Color coding mismatch!`);
      log(colors.red, `  Expected: FL metric=camber tier=target-met, FR metric=camber tier=near-target`);
      log(colors.red, `  Got: FL=${camberColorsByWheel.FL?.metric}/${camberColorsByWheel.FL?.tier}, FR=${camberColorsByWheel.FR?.metric}/${camberColorsByWheel.FR?.tier}`);
      assert(false, 'Camber color coding test failed');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Toggle to "By Caster" and verify colors change
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ STEP 3: Toggle to Caster Metric ───────────────────────────┐');

    // Click the "By Caster" button
    const casterButton = await page.$('button[data-metric="caster"]');
    if (!casterButton) {
      assert(false, 'Caster metric button not found');
    }

    await casterButton.click();
    log(colors.green, '✓ Clicked "By Caster" button');

    // Wait for re-render (table cells to update)
    await page.waitForTimeout(500);

    // Get metric class after toggle
    const casterColorsByWheel = await page.evaluate(() => {
      const activeTab = document.querySelector('.wheel-selector button.active');
      const activeWheel = activeTab?.getAttribute('data-wheel') || 'FL';
      const metricNode = document.querySelector('table.data-table tbody tr td .cell-value > div');
      if (!metricNode) return {};

      const className = metricNode.className;
      const metric = className.includes('camber') ? 'camber' : className.includes('caster') ? 'caster' : className.includes('toe') ? 'toe' : 'unknown';
      const tier = className.includes('target-met')
        ? 'target-met'
        : className.includes('near-target')
          ? 'near-target'
          : className.includes('off-target')
            ? 'off-target'
            : 'unknown';

      return {
        [activeWheel]: { metric, tier }
      };
    });

    // Get the other wheel's color too
    const otherWheel2 = casterColorsByWheel.FL ? 'FR' : 'FL';
    const otherWheelTab2 = await page.$(`button[data-wheel="${otherWheel2}"]`);
    if (otherWheelTab2) {
      await otherWheelTab2.click();
      await page.waitForTimeout(300);
      
      const otherModeData2 = await page.evaluate((wheel) => {
        const metricNode = document.querySelector('table.data-table tbody tr td .cell-value > div');
        if (!metricNode) return {};

        const className = metricNode.className;
        const metric = className.includes('camber') ? 'camber' : className.includes('caster') ? 'caster' : className.includes('toe') ? 'toe' : 'unknown';
        const tier = className.includes('target-met')
          ? 'target-met'
          : className.includes('near-target')
            ? 'near-target'
            : className.includes('off-target')
              ? 'off-target'
              : 'unknown';

        return {
          [wheel]: { metric, tier }
        };
      }, otherWheel2);
      
      Object.assign(casterColorsByWheel, otherModeData2);
    }

    log(colors.cyan, '\n  Metric Classes (Caster Mode):');
    log(colors.yellow, `  FL: ${casterColorsByWheel.FL?.metric || 'N/A'} (${casterColorsByWheel.FL?.tier || 'N/A'})`);
    log(colors.yellow, `  FR: ${casterColorsByWheel.FR?.metric || 'N/A'} (${casterColorsByWheel.FR?.tier || 'N/A'})`);

    // Verify caster mode shows only caster with expected tier
    const flCasterCorrect = casterColorsByWheel.FL?.metric === 'caster' && casterColorsByWheel.FL?.tier === 'target-met';
    const frCasterCorrect = casterColorsByWheel.FR?.metric === 'caster' && casterColorsByWheel.FR?.tier === 'off-target';
    
    if (flCasterCorrect && frCasterCorrect) {
      log(colors.green, '✓ Caster metric rendering verified (FL: GREEN tier, FR: RED tier)');
    } else {
      log(colors.red, `✗ Color coding mismatch!`);
      log(colors.red, `  Expected: FL metric=caster tier=target-met, FR metric=caster tier=off-target`);
      log(colors.red, `  Got: FL=${casterColorsByWheel.FL?.metric}/${casterColorsByWheel.FL?.tier}, FR=${casterColorsByWheel.FR?.metric}/${casterColorsByWheel.FR?.tier}`);
      assert(false, 'Caster color coding test failed');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Verify colors changed between modes
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ STEP 4: Verify Color Changes Between Modes ───────────────┐');

    const flColorChanged = camberColorsByWheel.FL?.tier !== casterColorsByWheel.FL?.tier;
    const frColorChanged = camberColorsByWheel.FR?.tier !== casterColorsByWheel.FR?.tier;
    const atLeastOneChanged = flColorChanged || frColorChanged;

    if (atLeastOneChanged) {
      log(colors.green, '✓ Metric tiers dynamically switched when changing selected metric');
      if (flColorChanged) {
        log(colors.green, `  FL: ${camberColorsByWheel.FL?.tier} (camber) → ${casterColorsByWheel.FL?.tier} (caster)`);
      } else {
        log(colors.yellow, `  FL: ${camberColorsByWheel.FL?.tier} (camber) = ${casterColorsByWheel.FL?.tier} (caster) — same tier`);
      }
      if (frColorChanged) {
        log(colors.green, `  FR: ${camberColorsByWheel.FR?.tier} (camber) → ${casterColorsByWheel.FR?.tier} (caster)`);
      } else {
        log(colors.yellow, `  FR: ${camberColorsByWheel.FR?.tier} (camber) = ${casterColorsByWheel.FR?.tier} (caster) — same tier`);
      }
    } else {
      log(colors.red, `✗ Colors did NOT change at all!`);
      log(colors.red, `  FL: ${camberColorsByWheel.FL?.tier} → ${casterColorsByWheel.FL?.tier}`);
      log(colors.red, `  FR: ${camberColorsByWheel.FR?.tier} → ${casterColorsByWheel.FR?.tier}`);
      assert(false, 'Color switching test failed');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUCCESS
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  UI color-coding rendering and interaction verified         ║');
    log(colors.blue, '║  Camber and caster toggle properly updates DOM classes      ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');

    await page.close();
    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);

  } catch (error) {
    log(colors.red, '\n❌ TEST FAILED');
    log(colors.red, `Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
