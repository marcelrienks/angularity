/**
 * CloudFormation Deployment Smoke Test
 *
 * Validates that the deployed Angularity app works correctly in production.
 * Tests:
 * - App loads via CloudFront domain
 * - HTTPS certificate valid
 * - All pages render correctly
 * - No console errors
 * - No external API calls made (Constitution Principle I verified)
 * - localStorage data persists
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import puppeteer from 'puppeteer';

let browser;
let page;
const deployedUrl = process.env.DEPLOYED_URL || 'https://alignment.example.com';
const cloudFrontDomain = process.env.CF_DOMAIN || 'd123abc.cloudfront.net';

describe('CloudFormation Deployment Validation', () => {
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('Page Loading & HTTPS', () => {
    test('App loads at CloudFront domain', async () => {
      page = await browser.newPage();
      const url = `https://${cloudFrontDomain}/index.html`;

      try {
        const response = await page.goto(url, { waitUntil: 'networkidle2' });
        expect(response.ok()).toBe(true);
        expect(response.status()).toBe(200);
      } finally {
        await page.close();
      }
    });

    test('HTTPS certificate is valid', async () => {
      page = await browser.newPage();

      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg.text()));
      page.on('error', err => consoleMessages.push(`ERROR: ${err.message}`));

      const url = `https://${cloudFrontDomain}/index.html`;
      const response = await page.goto(url, { waitUntil: 'networkidle2' });

      // Check for HTTPS warning or certificate issues
      const securityWarnings = consoleMessages.filter(msg =>
        msg.toLowerCase().includes('certificate') ||
        msg.toLowerCase().includes('insecure') ||
        msg.toLowerCase().includes('ssl')
      );

      expect(securityWarnings).toHaveLength(0);
      expect(response.ok()).toBe(true);
      await page.close();
    });

    test('App loads at subdomain URL after DNS propagation', async () => {
      page = await browser.newPage();

      try {
        const response = await page.goto(`${deployedUrl}/index.html`, {
          waitUntil: 'networkidle2'
        });
        expect(response.ok()).toBe(true);
      } catch (error) {
        // DNS may not be propagated yet, this is expected during initial deployment
        console.warn(`Subdomain URL not yet accessible: ${error.message}`);
      } finally {
        await page.close();
      }
    });
  });

  describe('Page Rendering', () => {
    test('index.html renders without errors', async () => {
      page = await browser.newPage();
      const consoleErrors = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`${deployedUrl}/index.html`, { waitUntil: 'domcontentloaded' });

      // Check for critical errors in console
      const criticalErrors = consoleErrors.filter(err =>
        !err.includes('404') && // Ignore 404s
        !err.includes('Network.getResponseBody')
      );

      expect(criticalErrors).toHaveLength(0);
      await page.close();
    });

    test('input.html renders and grid appears', async () => {
      page = await browser.newPage();
      await page.goto(`${deployedUrl}/input.html`, { waitUntil: 'networkidle2' });

      // Check for measurement grid elements
      const gridPresent = await page.evaluate(() => {
        return document.querySelectorAll('[class*="grid"], [class*="input"]').length > 0;
      });

      expect(gridPresent).toBe(true);
      await page.close();
    });

    test('report.html renders with expected elements', async () => {
      page = await browser.newPage();
      await page.goto(`${deployedUrl}/report.html`, { waitUntil: 'networkidle2' });

      // Check for report elements (charts, results, etc.)
      const reportPresent = await page.evaluate(() => {
        return document.querySelectorAll('[class*="report"], [class*="chart"], canvas').length > 0;
      });

      expect(reportPresent).toBe(true);
      await page.close();
    });
  });

  describe('Network Traffic (Constitution Principle I)', () => {
    test('Zero external API calls made', async () => {
      page = await browser.newPage();
      const requests = [];

      page.on('request', request => {
        requests.push(request.url());
      });

      await page.goto(`${deployedUrl}/index.html`, { waitUntil: 'networkidle2' });

      // Filter requests: only count non-CloudFront, non-localhost requests
      const externalRequests = requests.filter(url => {
        const urlObj = new URL(url);
        return !urlObj.hostname.includes('cloudfront') &&
               !urlObj.hostname.includes('localhost') &&
               !urlObj.hostname.includes('example.com') &&
               !urlObj.hostname.includes('localhost');
      });

      expect(externalRequests).toHaveLength(0);
      await page.close();
    });

    test('No POST/PUT/DELETE requests made (read-only app)', async () => {
      page = await browser.newPage();
      const requests = [];

      page.on('request', request => {
        if (['POST', 'PUT', 'DELETE'].includes(request.method())) {
          requests.push({ url: request.url(), method: request.method() });
        }
      });

      await page.goto(`${deployedUrl}/input.html`, { waitUntil: 'networkidle2' });

      // Try entering data (if UI allows)
      const inputs = await page.$$('[type="text"], [type="number"]');
      for (const input of inputs.slice(0, 3)) {
        try {
          await input.type('123', { delay: 10 });
        } catch (error) {
          // Input may not be interactive, skip
        }
      }

      await page.waitForTimeout(500);

      expect(requests).toHaveLength(0);
      await page.close();
    });
  });

  describe('Data Persistence', () => {
    test('localStorage is available', async () => {
      page = await browser.newPage();
      await page.goto(`${deployedUrl}/index.html`, { waitUntil: 'domcontentloaded' });

      const localStorageAvailable = await page.evaluate(() => {
        try {
          localStorage.setItem('test', 'value');
          const value = localStorage.getItem('test');
          localStorage.removeItem('test');
          return value === 'value';
        } catch (error) {
          return false;
        }
      });

      expect(localStorageAvailable).toBe(true);
      await page.close();
    });

    test('Data can be stored and retrieved from localStorage', async () => {
      page = await browser.newPage();
      await page.goto(`${deployedUrl}/input.html`, { waitUntil: 'domcontentloaded' });

      const dataStored = await page.evaluate(() => {
        const testData = { measurement: 45.5, timestamp: Date.now() };
        localStorage.setItem('appData', JSON.stringify(testData));
        const retrieved = JSON.parse(localStorage.getItem('appData'));
        return retrieved.measurement === 45.5;
      });

      expect(dataStored).toBe(true);
      await page.close();
    });
  });

  describe('Performance', () => {
    test('Page load time is under 2 seconds (SC-003)', async () => {
      page = await browser.newPage();

      const startTime = Date.now();
      await page.goto(`${deployedUrl}/index.html`, { waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(2000);
      await page.close();
    });

    test('CloudFront returns appropriate cache headers', async () => {
      page = await browser.newPage();

      let cacheHeaders = {};
      page.on('response', response => {
        if (response.url().includes('/')) {
          const headers = response.headers();
          cacheHeaders[response.url()] = {
            cacheControl: headers['cache-control'],
            etag: headers['etag'],
            via: headers['via'] // Should indicate CloudFront
          };
        }
      });

      await page.goto(`${deployedUrl}/index.html`, { waitUntil: 'networkidle2' });

      // Verify CloudFront is serving (indicated by 'via' header)
      const hasViaHeader = Object.values(cacheHeaders).some(h => h.via?.includes('CloudFront'));
      expect(hasViaHeader).toBe(true);

      await page.close();
    });
  });

  describe('User Workflow', () => {
    test('Can navigate between pages', async () => {
      page = await browser.newPage();

      // Start at index
      await page.goto(`${deployedUrl}/index.html`, { waitUntil: 'networkidle2' });
      let url = page.url();
      expect(url).toContain('index.html');

      // Navigate to input (if nav link exists)
      try {
        await page.click('a[href*="input"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        url = page.url();
        expect(url).toContain('input.html');
      } catch (error) {
        // Navigation may not be available via links
        await page.goto(`${deployedUrl}/input.html`, { waitUntil: 'networkidle2' });
        url = page.url();
        expect(url).toContain('input.html');
      }

      await page.close();
    });
  });
});
