const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:8080/site/input.html', {waitUntil: 'networkidle2', timeout: 10000});
    await page.waitForTimeout(1500);

    // Click RL button to select rear left
    await page.click('[data-wheel="RL"]');
    await page.waitForTimeout(500);

    // Count inputs in first cell
    const cellInputs = await page.$$('input.cell-input[data-front="-6"][data-rear="-6"]');
    console.log(`Inputs in first cell for RL wheel: ${cellInputs.length}`);

    // Check for toe input specifically
    const toeInputs = await page.$$('input.cell-input[data-key="toe"]');
    console.log(`Toe inputs found: ${toeInputs.length}`);

    if (cellInputs.length === 4) {
      console.log('✓ SUCCESS: 4 inputs per cell (3 camber + 1 toe)');
    } else if (cellInputs.length === 3) {
      console.log('✗ FAILED: Only 3 inputs, toe field not added');
    } else {
      console.log(`✗ FAILED: Unexpected input count: ${cellInputs.length}`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  }

  await browser.close();
})();
