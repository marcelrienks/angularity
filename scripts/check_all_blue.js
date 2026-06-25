import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/report.html', { waitUntil: 'networkidle2', timeout: 30000 });

  const elements = await page.evaluate(() => {
    const result = [];
    document.querySelectorAll('*').forEach(el => {
      if (!el.textContent) return;
      const text = el.textContent.trim();
      if (!text.match(/Front Axle|Rear Axle/)) return;
      if (text.length > 100 || el.children.length > 2) return;
      
      const style = window.getComputedStyle(el);
      const colorMatch = style.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!colorMatch) return;
      
      const [,r,g,b] = colorMatch.map(Number);
      const isBlue = r > 100 && g > 150 && b > 200;
      if (!isBlue) return;
      
      result.push({
        tag: el.tagName,
        class: el.className,
        text: text.substring(0, 50),
        color: `rgb(${r},${g},${b})`
      });
    });
    return result;
  });

  console.log(`Found ${elements.length} blue elements with Axle text:`);
  elements.forEach(e => {
    console.log(`  <${e.tag}${e.class ? ` class="${e.class}"` : ''}> "${e.text}"`);
  });

  await browser.close();
})();
