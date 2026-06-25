import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/report.html', { waitUntil: 'networkidle2', timeout: 30000 });

  const elements = await page.evaluate(() => {
    const result = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.textContent.includes('Front Axle') || el.textContent.includes('Rear Axle')) {
        const style = window.getComputedStyle(el);
        result.push({
          tag: el.tagName,
          class: el.className,
          text: el.textContent.substring(0, 40),
          color: style.color
        });
      }
    });
    return result;
  });

  console.log('Elements matching "Axle":');
  elements.forEach(el => {
    console.log(`  Tag: ${el.tag}, Class: "${el.class}", Color: ${el.color}`);
    console.log(`  Text: "${el.text}"\n`);
  });

  await browser.close();
})();
