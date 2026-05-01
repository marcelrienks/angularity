/**
 * Test utilities for alignment system integration tests
 */

/**
 * Navigate to a page and wait for it to load
 */
export async function navigateTo(page, path) {
  await page.goto(`http://localhost:8080${path}`, { waitUntil: 'networkidle2' });
  await page.waitForTimeout(500); // Give scripts time to initialize
}

/**
 * Set localStorage data for a specific wheel
 */
export async function setWheelData(page, wheel, data) {
  await page.evaluate((wheelId, wheelData) => {
    const key = `mx5-nc1-alignment-${wheelId}`;
    localStorage.setItem(key, JSON.stringify(wheelData));
  }, wheel, data);
}

/**
 * Get localStorage data for a specific wheel
 */
export async function getWheelData(page, wheel) {
  const data = await page.evaluate((wheelId) => {
    const key = `mx5-nc1-alignment-${wheelId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }, wheel);
  return data;
}

/**
 * Clear all localStorage data
 */
export async function clearStorage(page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

/**
 * Get value from an input field by field ID or selector
 */
export async function getInputValue(page, selector) {
  const value = await page.$eval(selector, el => el.value);
  return value ? parseFloat(value) : null;
}

/**
 * Set value in an input field and trigger change event
 */
export async function setInputValue(page, selector, value) {
  await page.$eval(selector, (el, val) => {
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(300); // Wait for auto-save to trigger
}

/**
 * Click a button by selector
 */
export async function clickButton(page, selector) {
  await page.click(selector);
  await page.waitForTimeout(300); // Wait for action to complete
}

/**
 * Wait for visibility of an element
 */
export async function waitForElement(page, selector, visible = true) {
  if (visible) {
    await page.waitForSelector(selector, { visible: true });
  } else {
    await page.waitForSelector(selector);
  }
}

/**
 * Improved server startup with better port availability checking
 * Returns true if server is ready, throws if port is stuck/unavailable
 */
export async function waitForServer(baseUrl = 'http://localhost:8080', maxAttempts = 40) {
  let lastError = null;
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, 3000);
        
        const req = require('http').get(`${baseUrl}/input.html`, (res) => {
          clearTimeout(timeout);
          resolve(res.statusCode === 200);
        });
        
        req.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    } catch (e) {
      lastError = e;
      if (i < maxAttempts - 1) {
        // Exponential backoff: 200ms, 400ms, 600ms, ... up to 2 seconds
        const delay = Math.min(200 * (i + 1), 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Server failed to start after ${maxAttempts} attempts. Last error: ${lastError?.message || 'Unknown'}`);
}

/**
 * Gracefully shutdown server process
 */
export function cleanupServer(serverProcess) {
  if (!serverProcess) return;
  
  try {
    if (process.platform === 'win32') {
      // Windows: use SIGTERM which should cleanly terminate
      serverProcess.kill('SIGTERM');
    } else {
      // Unix: try SIGTERM first, then SIGKILL
      serverProcess.kill('SIGTERM');
    }
    
    // Wait for process to exit
    return new Promise((resolve) => {
      const checkPid = setInterval(() => {
        try {
          // Try to send 0 signal to check if process exists
          process.kill(serverProcess.pid, 0);
        } catch (e) {
          // Process is dead
          clearInterval(checkPid);
          resolve();
        }
      }, 100);
      
      // Force kill after 3 seconds if not dead
      setTimeout(() => {
        clearInterval(checkPid);
        try {
          serverProcess.kill('SIGKILL');
        } catch (e) {
          // Already dead
        }
        resolve();
      }, 3000);
    });
  } catch (e) {
    // Silently ignore if already dead
  }
}

/**
 * Get optimized Puppeteer launch options
 * Enables DOM storage, disables restrictions that block localStorage
 */
export function getPuppeteerLaunchOptions() {
  return {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--disable-web-resources',
      '--disable-features=IsolateOrigins,site-per-process,TranslateUI',
      '--disable-blink-features=AutomationControlled'
    ],
    ignoreDefaultArgs: ['--disable-extensions']
  };
}

/**
 * Get text content of an element
 */
export async function getElementText(page, selector) {
  const text = await page.$eval(selector, el => el.textContent || el.innerText);
  return text?.trim();
}

/**
 * Generate random camber values for testing
 */
export function generateRandomCamberValues() {
  return {
    FL: {
      camber0: -1.15,
      camberPos20: -3.25,
      camberNeg20: 0.08
    },
    FR: {
      camber0: -1.08,
      camberPos20: -3.18,
      camberNeg20: 0.12
    },
    RL: {
      camber0: -1.48,
      camberPos20: null,
      camberNeg20: null
    },
    RR: {
      camber0: -1.52,
      camberPos20: null,
      camberNeg20: null
    }
  };
}

/**
 * Format field name for display (e.g., 'camber0' -> 'Camber (0°)')
 */
export function formatFieldName(fieldName) {
  const names = {
    camber0: '0° Camber',
    camberPos20: '+20° Camber',
    camberNeg20: '-20° Camber'
  };
  return names[fieldName] || fieldName;
}
