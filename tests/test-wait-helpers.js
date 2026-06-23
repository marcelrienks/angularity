/**
 * test-wait-helpers.js — Event-based wait helpers for Puppeteer tests
 *
 * Replaces hardcoded setTimeout() waits with intelligent event-based waits
 * that complete as soon as the expected condition is met.
 *
 * Benefits:
 *   - Tests run faster (no unnecessary waiting)
 *   - More reliable (wait for actual conditions, not guesses)
 *   - Easier to debug (clear what condition is being waited for)
 *
 * Usage Example:
 *   // OLD: Slow and unreliable
 *   await page.type('input.camber', '1.5');
 *   await page.waitForTimeout(500);
 *   
 *   // NEW: Fast and reliable
 *   await page.type('input.camber', '1.5');
 *   await waitForValue(page, 'input.camber', '1.5');
 */

import http from 'http';

/**
 * Wait for HTTP server to be ready (responds to requests)
 *
 * @param {string} url - Base URL (e.g., http://localhost:8080)
 * @param {number} maxAttempts - Max retry attempts (default 30)
 * @param {number} delayMs - Delay between attempts in ms (default 1000)
 * @returns {Promise<boolean>}
 */
export async function waitForServer(url, maxAttempts = 30, delayMs = 1000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${url}/index.html`, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Server request timeout'));
        });
      });
      return true;
    } catch (e) {
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw new Error(`Server at ${url} failed to start after ${maxAttempts} attempts`);
}

/**
 * Wait for an input field's value to match expected value
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for input element
 * @param {string} expectedValue - Value to wait for
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForValue(page, selector, expectedValue, timeout = 5000) {
  await page.waitForFunction(
    (sel, val) => {
      const elem = document.querySelector(sel);
      return elem && (elem.value === val || elem.textContent === val);
    },
    { timeout },
    selector,
    expectedValue
  );
}

/**
 * Wait for element to become visible (display !== 'none')
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for element
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForVisible(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { visible: true, timeout });
}

/**
 * Wait for element to become hidden (not visible)
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for element
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForHidden(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { hidden: true, timeout });
}

/**
 * Wait for element to contain specific text
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for element
 * @param {string} text - Text to wait for
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForText(page, selector, text, timeout = 5000) {
  await page.waitForFunction(
    (sel, txt) => {
      const elem = document.querySelector(sel);
      return elem && elem.textContent.includes(txt);
    },
    { timeout },
    selector,
    text
  );
}

/**
 * Wait for element to have specific CSS class
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for element
 * @param {string} className - Class name to wait for
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForClass(page, selector, className, timeout = 5000) {
  await page.waitForFunction(
    (sel, cls) => {
      const elem = document.querySelector(sel);
      return elem && elem.classList.contains(cls);
    },
    { timeout },
    selector,
    className
  );
}

/**
 * Wait for element to NOT have specific CSS class
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for element
 * @param {string} className - Class name to wait for removal of
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForClassRemoved(page, selector, className, timeout = 5000) {
  await page.waitForFunction(
    (sel, cls) => {
      const elem = document.querySelector(sel);
      return elem && !elem.classList.contains(cls);
    },
    { timeout },
    selector,
    className
  );
}

/**
 * Wait for specific element count to match expected
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for elements
 * @param {number} expectedCount - Expected number of elements
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForElementCount(page, selector, expectedCount, timeout = 5000) {
  await page.waitForFunction(
    (sel, count) => {
      return document.querySelectorAll(sel).length === count;
    },
    { timeout },
    selector,
    expectedCount
  );
}

/**
 * Wait for element to have minimum child count
 * Useful for waiting for grid/table to render
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for parent element
 * @param {number} minChildren - Minimum child count to wait for
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForChildren(page, selector, minChildren, timeout = 5000) {
  await page.waitForFunction(
    (sel, min) => {
      const elem = document.querySelector(sel);
      return elem && elem.children.length >= min;
    },
    { timeout },
    selector,
    minChildren
  );
}

/**
 * Wait for attribute value to match
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for element
 * @param {string} attrName - Attribute name
 * @param {string} attrValue - Expected attribute value
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForAttribute(page, selector, attrName, attrValue, timeout = 5000) {
  await page.waitForFunction(
    (sel, attr, val) => {
      const elem = document.querySelector(sel);
      return elem && elem.getAttribute(attr) === val;
    },
    { timeout },
    selector,
    attrName,
    attrValue
  );
}

/**
 * Wait for element's computed style property to have specific value
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for element
 * @param {string} styleProp - CSS property name (e.g., 'display', 'opacity')
 * @param {string} expectedValue - Expected computed style value
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForStyle(page, selector, styleProp, expectedValue, timeout = 5000) {
  await page.waitForFunction(
    (sel, prop, val) => {
      const elem = document.querySelector(sel);
      if (!elem) return false;
      const computedStyle = window.getComputedStyle(elem);
      return computedStyle.getPropertyValue(prop).trim() === val;
    },
    { timeout },
    selector,
    styleProp,
    expectedValue
  );
}

/**
 * Wait for DOM mutation (element changed, added, removed, etc.)
 * Useful for custom changes not covered by other helpers
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} containerSelector - CSS selector for element to observe
 * @param {object} options - MutationObserver options
 *   - childList, attributes, subtree, characterData, etc.
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForMutation(
  page,
  containerSelector,
  options = { childList: true, subtree: true },
  timeout = 5000
) {
  await page.waitForFunction(
    (sel, opts) => {
      return new Promise((resolve) => {
        const elem = document.querySelector(sel);
        if (!elem) {
          resolve(false);
          return;
        }

        let resolved = false;
        const observer = new MutationObserver(() => {
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            resolve(true);
          }
        });

        observer.observe(elem, opts);

        // Timeout for mutation check
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            resolve(false);
          }
        }, 100);
      });
    },
    { timeout },
    containerSelector,
    options
  );
}

/**
 * Wait for promise/async operation to complete
 * For detecting when JavaScript async operations finish
 *
 * @param {Page} page - Puppeteer page object
 * @param {Function} asyncCheck - Async function that returns true when ready
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @param {number} pollInterval - Check interval in ms (default 100)
 * @returns {Promise<void>}
 * @throws {Error} If timeout exceeded
 */
export async function waitForAsync(page, asyncCheck, timeout = 5000, pollInterval = 100) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await asyncCheck(page);
      if (result) return;
    } catch (err) {
      // Continue polling
    }
    await page.waitForTimeout(pollInterval);
  }

  throw new Error(`Async check timed out after ${timeout}ms`);
}

/**
 * Helper: Set input value and wait for it to be processed
 * Combines type + wait for value
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for input
 * @param {string} value - Value to type
 * @returns {Promise<void>}
 */
export async function fillInput(page, selector, value) {
  await page.click(selector);
  await page.keyboard.type(value);
  await waitForValue(page, selector, value);
}

/**
 * Helper: Clear input and wait for it to be cleared
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for input
 * @returns {Promise<void>}
 */
export async function clearInput(page, selector) {
  await page.click(selector);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await waitForValue(page, selector, '');
}

/**
 * Helper: Click element and wait for it to become inactive/not focused
 *
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for element to click
 * @returns {Promise<void>}
 */
export async function clickAndWait(page, selector) {
  await page.click(selector);
  await page.waitForTimeout(100); // Brief pause for click to register
}
