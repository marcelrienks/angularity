import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/report.html', { waitUntil: 'networkidle2', timeout: 30000 });

  const structure = await page.evaluate(() => {
    const allH2 = Array.from(document.querySelectorAll('h2'));
    const axleH2 = allH2.filter(el => el.textContent.includes('Axle'));
    
    return axleH2.map(h2 => {
      const chain = [];
      let el = h2;
      for (let i = 0; i < 6 && el; i++) {
        chain.push({ tag: el.tagName, id: el.id, class: el.className });
        el = el.parentElement;
      }
      return { text: h2.textContent.substring(0, 30), chain };
    });
  });

  console.log('H2 elements containing "Axle":');
  structure.forEach(item => {
    console.log(`\n"${item.text}"`);
    console.log('Parent chain:');
    item.chain.forEach((el, i) => {
      console.log(`  ${i}: <${el.tag}${el.id ? ` id="${el.id}"` : ''}${el.class ? ` class="${el.class}"` : ''}>`);
    });
  });

  await browser.close();
})();
