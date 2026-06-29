import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:8080';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture console and network messages
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });
  
  await page.goto(`${BASE_URL}/input`, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Get the HTML
  const html = await page.content();
  
  // Find the div with control buttons
  const idx = html.indexOf('control-buttons');
  if (idx > -1) {
    console.log('HTML around control-buttons:');
    console.log(html.substring(Math.max(0, idx - 200), idx + 500));
  } else {
    console.log('control-buttons NOT found in HTML');
    console.log('\nFirst 2000 chars of body:');
    const bodyIdx = html.indexOf('<body');
    console.log(html.substring(bodyIdx, bodyIdx + 2000));
  }
  
  await browser.close();
})();
