import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/report.html', { waitUntil: 'networkidle2', timeout: 30000 });

  const elements = await page.evaluate(() => {
    const result = [];
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent.trim();
      if ((text.includes('Front Axle') || text.includes('Rear Axle')) && text.length < 100 && el.children.length < 3) {
        const style = window.getComputedStyle(el);
        result.push({
          tag: el.tagName,
          class: el.className,
          text,
          color: style.color
        });
      }
    });
    return result;
  });

  console.log('Subsection headers with Axle:');
  elements.slice(0, 5).forEach(el => {
    console.log(`  ${el.tag}.${el.class}: "${el.text}"`);
    console.log(`    Color: ${el.color}\n`);
  });

  await browser.close();
})();
