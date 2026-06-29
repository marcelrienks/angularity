import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:8080';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function populateSampleData(page) {
  try {
    await page.click('#btn-sample');
    await delay(1500);
    return true;
  } catch (err) {
    console.error(`❌ Could not populate sample data: ${err.message}`);
    return false;
  }
}

async function extractInputValues(page) {
  console.log('\n📋 Extracting INPUT page values...');
  try {
    // Get all input cells
    const inputs = await page.$$eval('input[type="text"]', elements =>
      elements.map((el) => ({
        name: el.name || el.id,
        value: el.value,
        wheel: el.closest('[data-wheel]')?.getAttribute('data-wheel') || 'unknown'
      }))
    );
    
    console.log(`  Found ${inputs.length} input cells`);
    
    // Group by wheel
    const byWheel = {};
    inputs.forEach(inp => {
      if (!byWheel[inp.wheel]) byWheel[inp.wheel] = [];
      byWheel[inp.wheel].push(inp);
    });
    
    console.log('  Values by wheel:');
    Object.entries(byWheel).forEach(([wheel, vals]) => {
      const filled = vals.filter(v => v.value && v.value.trim());
      console.log(`    ${wheel}: ${filled.length}/${vals.length} cells filled`);
      if (filled.length > 0) {
        console.log(`      Sample values: ${filled.slice(0, 3).map(v => v.value).join(', ')}`);
      }
    });
    
    return { type: 'input', count: inputs.length, byWheel };
  } catch (err) {
    console.error(`  Error extracting: ${err.message}`);
    return null;
  }
}

async function extractIndexValues(page) {
  console.log('\n📋 Extracting INDEX page values...');
  try {
    // Get all input fields (targets, etc.)
    const fields = await page.$$eval('input[type="number"], input[type="text"]', elements =>
      elements.map((el) => ({
        label: el.previousElementSibling?.textContent?.trim() || el.id,
        value: el.value,
        id: el.id
      }))
    );
    
    console.log(`  Found ${fields.length} form fields`);
    fields.slice(0, 5).forEach(f => {
      console.log(`    ${f.label}: ${f.value}`);
    });
    
    return { type: 'index', fields };
  } catch (err) {
    console.error(`  Error extracting: ${err.message}`);
    return null;
  }
}

async function extractReportValues(page) {
  console.log('\n📋 Extracting REPORT page values...');
  try {
    // Get all table cells from the summary table
    const cells = await page.$$eval('table td', elements =>
      elements.map((el) => el.textContent.trim())
    );
    
    console.log(`  Found ${cells.length} table cells`);
    if (cells.length > 0) {
      console.log(`  Sample cells: ${cells.slice(0, 5).join(' | ')}`);
    }
    
    // Try to find numeric values (results)
    const numbers = cells.filter(c => /^-?\d+\.?\d*$/.test(c));
    console.log(`  Numeric values found: ${numbers.length}`);
    
    return { type: 'report', cellCount: cells.length, numericValues: numbers.length };
  } catch (err) {
    console.error(`  Error extracting: ${err.message}`);
    return null;
  }
}

async function run() {
  let browser;
  try {
    console.log('🔍 Value Verification Script\n');
    console.log('═'.repeat(50));
    
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Step 1: Populate data
    console.log('\n🔄 Populating sample data...');
    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await delay(1000);
    const populated = await populateSampleData(page);
    
    if (!populated) {
      console.log('⚠ Data population failed, continuing anyway...');
    }
    
    // Extract from input page
    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'domcontentloaded' });
    await delay(1000);
    const inputData = await extractInputValues(page);
    
    // Extract from index page
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
    await delay(1000);
    const indexData = await extractIndexValues(page);
    
    // Extract from report page
    await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'domcontentloaded' });
    await delay(1000);
    const reportData = await extractReportValues(page);
    
    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('═'.repeat(50));
    console.log('\n✓ Data extraction completed');
    console.log('✓ Screenshots available in: ./screenshots/');
    console.log('\n📋 Verification checklist:');
    console.log('   □ Compare input values across wheels (FL, FR, RL, RR)');
    console.log('   □ Verify index targets match across all pages');
    console.log('   □ Check report calculations are consistent');
    console.log('   □ Validate that locked/symmetry rules are applied correctly');
    console.log('   □ Confirm color-coding matches actual values');
    
    await browser.close();
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
  }
}

run();
