import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/report.html', { waitUntil: 'networkidle2', timeout: 30000 });

  const headers = await page.evaluate(() => {
    const result = [];
    document.querySelectorAll('h1, h2, h3, [class*="section-title"], [class*="heading"]').forEach(el => {
      const text = el.textContent.trim().substring(0, 40);
      if (text && (text.includes('Axle') || text.includes('Camber') || text.includes('Front') || text.includes('Rear'))) {
        const style = window.getComputedStyle(el);
        const colorMatch = style.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        const [,r,g,b] = colorMatch ? colorMatch.map(Number) : [0,0,0];
        const isBlue = r > 100 && g > 150 && b > 200;
        
        result.push({
          tag: el.tagName,
          class: el.className,
          text,
          color: `rgb(${r},${g},${b})`,
          isBlue
        });
      }
    });
    return result;
  });

  console.log('All headers mentioning Axle/Camber/Front/Rear:');
  headers.forEach(h => {
    const colorNote = h.isBlue ? ' (BLUE)' : ' (not blue)';
    console.log(`${h.tag}.${h.class}: "${h.text}"${colorNote}`);
  });

  await browser.close();
})();
