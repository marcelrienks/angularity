const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:8080';

describe('Theme Switching', () => {
  let browser;
  let server;

  beforeAll((done) => {
    server = spawn('npx', ['http-server', 'site', '-p', '8080', '-c-1'], {
      cwd: process.cwd(),
    });
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Hit CTRL-C')) {
        setTimeout(done, 500);
      }
    });
  });

  afterAll(async () => {
    if (browser) await browser.close();
    server.kill();
  });

  beforeEach(async () => {
    browser = await puppeteer.launch({ headless: 'new' });
  });

  afterEach(async () => {
    if (browser) await browser.close();
  });

  test('Config menu gear button visible on index page', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    const gear = await page.$('.theme-toggle');
    expect(gear).not.toBeNull();
    const text = await page.evaluate(() => document.querySelector('.theme-toggle').textContent);
    expect(text).toBe('⚙');
  });

  test('Config menu gear button visible on input page', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/input.html`);
    const gear = await page.$('.theme-toggle');
    expect(gear).not.toBeNull();
  });

  test('Config menu gear button visible on report page', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/report.html`);
    const gear = await page.$('.theme-toggle');
    expect(gear).not.toBeNull();
  });

  test('Selecting Light theme applies data-theme="light" to document', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.click('.theme-toggle');
    await page.click('.theme-option:first-of-type');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });

  test('Selecting Dark theme applies data-theme="dark" to document', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.click('.theme-toggle');
    await page.click('.theme-option:last-of-type');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });

  test('Light theme sets correct CSS variable values', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.click('.theme-toggle');
    await page.click('.theme-option:first-of-type');
    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        bg: style.getPropertyValue('--bg').trim(),
        text: style.getPropertyValue('--text').trim(),
        panel: style.getPropertyValue('--panel').trim(),
      };
    });
    expect(vars.bg).toBe('#FFFFFF');
    expect(vars.text).toBe('#000000');
  });

  test('Dark theme sets correct CSS variable values', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.click('.theme-toggle');
    await page.click('.theme-option:last-of-type');
    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        bg: style.getPropertyValue('--bg').trim(),
        text: style.getPropertyValue('--text').trim(),
      };
    });
    expect(vars.bg).toBe('#1E1E1E');
    expect(vars.text).toBe('#D4D4D4');
  });

  test('Theme selection persists in localStorage', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.click('.theme-toggle');
    await page.click('.theme-option:last-of-type');
    const stored = await page.evaluate(() => localStorage.getItem('angularity-theme'));
    expect(stored).toBe('dark');
  });

  test('Theme persists across page navigation', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.click('.theme-toggle');
    await page.click('.theme-option:last-of-type');
    await page.goto(`${BASE_URL}/input.html`);
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });

  test('Theme persists across page reload (FOUC prevention)', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.click('.theme-toggle');
    await page.click('.theme-option:last-of-type');
    await page.reload();
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });

  test('Invalid localStorage value defaults to unthemed (white-label)', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.evaluate(() => localStorage.setItem('angularity-theme', 'invalid'));
    await page.reload();
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBeNull();
  });

  test('Dropdown closes on Light theme selection', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.click('.theme-toggle');
    await page.waitForSelector('.theme-dropdown.visible');
    await page.click('.theme-option:first-of-type');
    const visible = await page.$('.theme-dropdown.visible');
    expect(visible).toBeNull();
  });

  test('Dropdown closes on click outside', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.click('.theme-toggle');
    await page.waitForSelector('.theme-dropdown.visible');
    await page.click('body');
    const visible = await page.$('.theme-dropdown.visible');
    expect(visible).toBeNull();
  });

  test('Functional colors unchanged in light theme', async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`);
    await page.click('.theme-toggle');
    await page.click('.theme-option:first-of-type');
    const colors = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        green: style.getPropertyValue('--green').trim(),
        orange: style.getPropertyValue('--orange').trim(),
        red: style.getPropertyValue('--red').trim(),
        blue: style.getPropertyValue('--blue').trim(),
      };
    });
    expect(colors.green).toBe('#4ec063');
    expect(colors.orange).toBe('#e0a935');
    expect(colors.red).toBe('#fc6e68');
    expect(colors.blue).toBe('#6ab4ff');
  });
});
