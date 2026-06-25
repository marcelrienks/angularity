import puppeteer from 'puppeteer';

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;
const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

function generateGrid(wheel = 'FL') {
  const gridData = {};
  
  for (const frontBolt of BOLT_POSITIONS) {
    gridData[frontBolt] = {};
    const normalized = (frontBolt + 6) / 12;
    const exponential = Math.pow(2, normalized) - 1;
    const wheelOffset = wheel === 'FR' ? -0.12 : 
                        wheel === 'RL' ? 0.08 : 
                        wheel === 'RR' ? 0.05 : 0;
    const camberBase = -2.371 + exponential * 3.071 + wheelOffset;
    
    const multiplier = wheel === 'FR' ? 0.32 : 
                       wheel === 'RL' ? 0.28 : 
                       wheel === 'RR' ? 0.31 : 0.30;
    const decayFactor = Math.pow(multiplier, normalized);
    const steeringDiff = 2.05 + 2.74 * decayFactor;
    
    for (const rearBolt of BOLT_POSITIONS) {
      const rearInfluence = (rearBolt / 6) * 0.15;
      const camber0 = camberBase + rearInfluence;
      const half = steeringDiff / 2;
      const camberNeg20 = camber0 - half;
      const camberPos20 = camber0 + half;
      
      gridData[frontBolt][rearBolt] = {
        neg20: String(+(camberNeg20).toFixed(2)),
        zero:  String(+(camber0).toFixed(2)),
        pos20: String(+(camberPos20).toFixed(2))
      };
    }
  }
  
  return gridData;
}

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 2000 });
    
    // Navigate to input page first
    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'domcontentloaded' });
    
    // Generate grids
    const flGrid = generateGrid('FL');
    const frGrid = generateGrid('FR');
    const rlGrid = generateGrid('RL');
    const rrGrid = generateGrid('RR');
    
    // Store data in localStorage
    await page.evaluate((fl, fr, rl, rr) => {
      localStorage.setItem('mx5-nc1-alignment-FL', JSON.stringify(fl));
      localStorage.setItem('mx5-nc1-alignment-FR', JSON.stringify(fr));
      localStorage.setItem('mx5-nc1-alignment-RL', JSON.stringify(rl));
      localStorage.setItem('mx5-nc1-alignment-RR', JSON.stringify(rr));
    }, flGrid, frGrid, rlGrid, rrGrid);
    
    // Navigate to report
    await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // Get inspector data about headers
    const headerInfo = await page.evaluate(() => {
      const results = [];
      
      // Find all wheel labels
      const labels = document.querySelectorAll('.washer-wheel-label');
      labels.forEach(label => {
        const computedStyle = window.getComputedStyle(label);
        results.push({
          text: label.textContent.trim(),
          color: computedStyle.color,
          className: label.className,
          fontSize: computedStyle.fontSize,
          fontWeight: computedStyle.fontWeight
        });
      });
      
      return results;
    });
    
    console.log('Header Information:');
    console.log(JSON.stringify(headerInfo, null, 2));
    
    // Scroll to washer section
    await page.evaluate(() => {
      const section = document.getElementById('section-washers');
      if (section) {
        section.scrollIntoView();
      }
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/washer_full_screenshot.png', fullPage: true });
    console.log('\nScreenshot saved to /tmp/washer_full_screenshot.png');
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
