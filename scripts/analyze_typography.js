import puppeteer from 'puppeteer';

async function analyzePageTypography(url, pageName) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`ANALYZING: ${pageName}`);
  console.log('='.repeat(60));

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  const violations = await page.evaluate(() => {
    const issues = [];
    const allElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button, label, legend, [class*="label"], [class*="title"], [class*="heading"], [class*="value"]');

    allElements.forEach((el) => {
      const text = el.textContent.trim();
      if (!text || text.length === 0) return;
      if (el.offsetHeight === 0) return;

      const style = window.getComputedStyle(el);
      const tag = el.tagName.toLowerCase();
      const classes = el.className;

      let expectedStyle = null;
      if (tag === 'h1' || tag === 'h2') expectedStyle = 'HEADER';
      else if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6' || tag === 'button' || tag === 'label' || tag === 'legend' || classes.includes('label') || classes.includes('title') || classes.includes('heading')) expectedStyle = 'SUB-HEADER';
      else if (tag === 'p' || classes.includes('desc')) expectedStyle = 'PARAGRAPH';
      else return;

      const colorMatch = style.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!colorMatch) return;
      const [,r,g,b] = colorMatch.map(Number);

      let violation = null;
      if (expectedStyle === 'HEADER' && (r < 100 || g < 150 || b < 250)) {
        violation = `HEADER not blue (${r},${g},${b})`;
      } else if (expectedStyle === 'SUB-HEADER' && (r > 50 || g > 50 || b > 50) && !(r < 50 && g < 50 && b < 50)) {
        violation = `SUB-HEADER not black (${r},${g},${b})`;
      }

      if (violation) {
        issues.push({ violation, expectedStyle, text: text.substring(0, 30) });
      }
    });
    return issues;
  });

  console.log(violations.length === 0 ? '✓ CLEAN' : `⚠ ${violations.length} violations`);
  if (violations.length > 0) {
    violations.slice(0, 10).forEach(v => console.log(`  - ${v.violation}: "${v.text}"`));
  }

  await browser.close();
  return violations;
}

async function main() {
  const baseUrl = 'http://localhost:8000';
  let total = 0;
  for (const {url, name} of [
    {url: `${baseUrl}/index.html`, name: 'Home'},
    {url: `${baseUrl}/input.html`, name: 'Input'},
    {url: `${baseUrl}/report.html`, name: 'Report'}
  ]) {
    const v = await analyzePageTypography(url, name);
    total += v.length;
  }
  console.log(`\nTOTAL: ${total} violations\n`);
  process.exit(total > 0 ? 1 : 0);
}

main().catch(console.error);
