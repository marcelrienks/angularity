import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/report.html', { waitUntil: 'networkidle2', timeout: 30000 });

  const elements = await page.evaluate(() => {
    const result = [];
    document.querySelectorAll('h1, h2, h3').forEach(el => {
      const style = window.getComputedStyle(el);
      const colorMatch = style.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (colorMatch) {
        const [,r,g,b] = colorMatch.map(Number);
        const isBlue = r > 100 && g > 150;
        if (isBlue) {
          result.push({
            tag: el.tagName,
            text: el.textContent.substring(0, 50),
            color: `rgb(${r},${g},${b})`
          });
        }
      }
    });
    return result;
  });

  console.log('Blue headers on report page:');
  elements.forEach(el => {
    console.log(`  ${el.tag}: "${el.text}"`);
  });

  await browser.close();
})();
