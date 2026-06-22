import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812 });

  await page.goto('http://localhost:8080/site/report.html');
  await page.waitForTimeout(1000);

  // Check if we can directly check the source code
  const source = await page.content();
  const hasNewOrder = source.includes('Caster→') && source.includes('Camber↓');

  console.log('Checking page source for legend order...');
  if (hasNewOrder) {
    console.log('✓ Source contains both Caster→ and Camber↓');
  }

  // Take screenshot
  await page.screenshot({ path: './legend-mobile.png' });
  console.log('Screenshot saved to legend-mobile.png');

  // Try to check corner legend if table exists
  const cornerText = await page.evaluate(() => {
    const headers = document.querySelectorAll('th');
    for (const th of headers) {
      const text = th.textContent;
      if (text.includes('Caster') && text.includes('Camber')) {
        return text;
      }
    }
    return null;
  });

  if (cornerText) {
    console.log('Corner legend found:', JSON.stringify(cornerText));
    const lines = cornerText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines[0].includes('Caster')) {
      console.log('✓ PASS: Rendered legend has Caster on first line (top)');
    }
  } else {
    console.log('(Table not yet rendered - CSV data needed for full test)');
  }

  await browser.close();
})();
