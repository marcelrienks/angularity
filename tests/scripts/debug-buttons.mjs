import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:8080';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to Input page...');
  await page.goto(`${BASE_URL}/input`, { waitUntil: 'networkidle2', timeout: 15000 });
  console.log('Waiting for scripts...');
  await delay(3000);
  
  // Check all HTML
  const html = await page.content();
  const btnSampleExists = html.includes('btn-sample');
  console.log(`  btn-sample in HTML: ${btnSampleExists}`);
  
  const buttons = await page.$$eval('button', btns =>
    btns.map(b => ({
      id: b.id,
      text: b.textContent.trim().substring(0, 30),
    }))
  );
  
  console.log(`\nFound ${buttons.length} buttons:`);
  buttons.forEach((b) => {
    console.log(`  id="${b.id}" text="${b.text}"`);
  });
  
  // Try to find any button with "sample" in text
  const sampleBtn = buttons.find(b => b.text.toLowerCase().includes('sample'));
  if (sampleBtn) {
    console.log(`\n✓ Found sample button: ${sampleBtn.id}`);
  } else {
    console.log(`\n✗ No sample button found`);
  }
  
  await browser.close();
})();
