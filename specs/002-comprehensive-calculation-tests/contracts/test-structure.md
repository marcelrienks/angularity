# Test Structure Contracts

Formalizes test patterns, assertions, lifecycle, and data structures for Jest + Puppeteer test suite.

---

## Jest Unit Test Contract

All unit tests follow the Arrange-Act-Assert pattern with standardized Jest syntax.

```javascript
// File: tests/unit/calculation-formulas.test.js
describe('Caster Calculation', () => {
  describe('formula (360CW - 360ACW) / 2', () => {
    
    it('should return 1.0 when 360CW=6.0 and 360ACW=4.0', () => {
      // Arrange: set up test inputs
      const angle360CW = 6.0;
      const angle360ACW = 4.0;
      const expected = 1.0;
      
      // Act: call function under test
      const actual = calculateCaster(angle360CW, angle360ACW);
      
      // Assert: verify output with tolerance
      expect(actual).toBeCloseTo(expected, 2); // 2 decimals = 0.01° tolerance
    });

    it('should return 0 when angles are identical', () => {
      const angle360CW = 5.0;
      const angle360ACW = 5.0;
      const expected = 0.0;
      
      const actual = calculateCaster(angle360CW, angle360ACW);
      
      expect(actual).toBeCloseTo(expected, 2);
    });

    it('should handle negative differences', () => {
      const angle360CW = 3.0;
      const angle360ACW = 6.0;
      const expected = -1.5;
      
      const actual = calculateCaster(angle360CW, angle360ACW);
      
      expect(actual).toBeCloseTo(expected, 2);
    });
  });
});
```

**Pattern Rules**:
1. Describe block: feature name
2. Nested describe: specific scenario
3. Test name: "should [action] when [condition]"
4. Arrange → Act → Assert (clear separation)
5. Assertion: `toBeCloseTo(expected, 2)` for floats (0.01° precision)
6. Assertion: `toBe(expected)` for booleans/exact values
7. Assertion: `toMatch(/pattern/)` for strings
8. No conditional test skipping (.skip, .only) in committed code

---

## Puppeteer Integration Test Contract

All integration tests use browser automation with consistent lifecycle and cleanup.

```javascript
// File: tests/integration/symmetry-locking.test.mjs
import puppeteer from 'puppeteer';

describe('Symmetry & Locking Behavior', () => {
  let browser, page;

  beforeAll(async () => {
    // Start browser once per test suite
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
  });

  afterAll(async () => {
    // Close browser after all tests in suite
    if (browser) await browser.close();
  });

  beforeEach(async () => {
    // Create fresh page for each test
    page = await browser.newPage();
    page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:8080/input.html', {
      waitUntil: 'domcontentloaded'
    });
  });

  afterEach(async () => {
    // Clean up: clear localStorage, close page
    await page.evaluate(() => localStorage.clear());
    if (page) await page.close();
  });

  it('should propagate RL toe change to RR when rear toe locked', async () => {
    // Arrange: enable lock, set initial value
    await page.evaluate(() => {
      localStorage.setItem('alignment_rear_toe_locked', 'true');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Act: change RL toe value
    const rlInput = await page.$('input[name="RL-toe"]');
    await rlInput.type('1.5', { delay: 50 });
    await page.keyboard.press('Tab'); // trigger change event

    // Assert: verify RR toe matches RL
    const rrValue = await page.$eval(
      'input[name="RR-toe"]',
      el => el.value
    );
    
    expect(rrValue).toBe('1.5');
  });

  it('should persist lock state across page reload', async () => {
    // Arrange: set lock
    await page.evaluate(() => {
      localStorage.setItem('alignment_rear_toe_locked', 'true');
    });
    
    // Act: reload page
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Assert: verify lock still enabled
    const lockState = await page.evaluate(() =>
      localStorage.getItem('alignment_rear_toe_locked')
    );
    
    expect(lockState).toBe('true');
  });
});
```

**Pattern Rules**:
1. Use `beforeAll` for browser creation (expensive)
2. Use `beforeEach` for fresh page per test (isolation)
3. Use `afterEach` for cleanup: localStorage.clear(), page.close()
4. Use `afterAll` to close browser
5. All async operations: `await page.xxx()`
6. Wait conditions: `waitUntil: 'domcontentloaded'` or `waitForNavigation()`
7. No implicit waits; use explicit `waitForSelector` if element doesn't appear immediately
8. Extract values with `$eval` (single element) or `$$eval` (multiple)
9. Type text with `type(text, {delay: 50})` for human-like input
10. Trigger events: `press('Tab')`, `click()`, `select(value)`

---

## Performance Test Contract

Performance tests measure duration and memory, comparing against baseline.

```javascript
// File: tests/performance/calculation-speed.test.mjs
import puppeteer from 'puppeteer';
import fs from 'fs';

const BASELINES = JSON.parse(fs.readFileSync('tests/performance/baselines.json'));

describe('Performance: Calculation Speed', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:8080/input.html', {
      waitUntil: 'domcontentloaded'
    });
  });

  afterEach(async () => {
    await page.evaluate(() => localStorage.clear());
    if (page) await page.close();
  });

  it('should calculate 13x13 grid in < 1 second', async () => {
    // Arrange: populate sample data
    await page.click('#btn-sample');
    await page.waitForSelector('#sample-data-modal-confirm', { timeout: 5000 });
    await page.click('#sample-data-modal-confirm');

    // Act: measure calculation time
    const duration = await page.evaluate(() => {
      const start = performance.now();
      // Trigger full recalculation
      window.dispatchEvent(new CustomEvent('recalculate'));
      const end = performance.now();
      return end - start;
    });

    // Assert: duration vs baseline + tolerance
    const baseline = BASELINES['calculation-speed-13x13'];
    const tolerance = baseline.avgDuration * 0.1; // 10% over baseline
    
    expect(duration).toBeLessThan(baseline.avgDuration + tolerance);
  });
});
```

**Pattern Rules**:
1. Load baseline from `tests/performance/baselines.json`
2. Measure with `performance.now()` in browser context
3. Calculate tolerance: 10% of baseline (or explicit value)
4. Assert: `toBeLessThan(baseline + tolerance)`
5. Log actual duration for CI monitoring
6. Tests may be flaky if CPU is busy; disable if needed

---

## Assertion Contracts

### Numerical Assertions (Angles)

```javascript
// 0.01° tolerance (2 decimal places)
expect(actual).toBeCloseTo(expected, 2);

// Range check
expect(value).toBeGreaterThanOrEqual(-10);
expect(value).toBeLessThanOrEqual(10);

// Tolerance-based
const tolerance = 0.01;
expect(Math.abs(actual - expected)).toBeLessThan(tolerance);
```

### Boolean Assertions

```javascript
// Exact match required
expect(flag).toBe(true);
expect(flag).toBe(false);

// Truthy/falsy
expect(value).toBeTruthy();
expect(value).toBeFalsy();
```

### Array/Object Assertions

```javascript
// Deep equality
expect(actual).toEqual(expected);

// Array includes
expect(array).toContain(item);

// Array length
expect(array).toHaveLength(169);

// Object properties
expect(obj).toHaveProperty('camber');
expect(obj.camber).toBeCloseTo(-1.10, 2);
```

### String Assertions

```javascript
// Exact match
expect(text).toBe('expected text');

// Pattern match
expect(text).toMatch(/expected regex/);

// Substring
expect(text).toContain('substring');

// Case-insensitive
expect(text.toLowerCase()).toBe('expected');
```

### Custom Matchers (if needed)

```javascript
// Example: assert array of cells matches expected values
expect(gridCells).toSatisfy(cells =>
  cells.every(cell =>
    Math.abs(cell.expectedCamber - cell.actualCamber) <= 0.01
  )
);
```

---

## Test Fixture Contract

All tests must load data consistently from `tests/fixtures/`.

```javascript
// Load fixture file
const fixture = JSON.parse(
  fs.readFileSync('tests/fixtures/exports/alignment-export-v1.json')
);

// Access wheel data
const flWheel = fixture.wheels.FL;
const cellCount = flWheel.cells.length; // 169 for 13×13

// Compare values
flWheel.cells.forEach(cell => {
  const {
    frontBolt,
    rearBolt,
    measured,
    isInterpolated,
    expectedCamber,
    expectedCaster
  } = cell;

  // Assert cell values
  expect(expectedCamber).toBeCloseTo(
    (cell.angle360ACW + cell.angle0 + cell.angle360CW) / 3,
    2
  );
});
```

---

## Error Handling Contract

All tests must handle failures gracefully.

```javascript
// Invalid fixture
if (!fixture || !fixture.wheels) {
  throw new Error('Invalid fixture format');
}

// Timeout handling
await page.waitForSelector(selector, { timeout: 5000 })
  .catch(() => {
    throw new Error(`Selector not found after 5s: ${selector}`);
  });

// Browser errors captured
page.on('error', err => {
  console.error('Page error:', err);
  throw err;
});

// Assertion errors
expect(actual).toBeCloseTo(expected, 2);
// ^ Jest will show diff if fails
```

---

## Test Output Contract

All tests must produce structured output.

```json
{
  "testName": "should calculate caster formula",
  "suite": "Caster Calculation",
  "status": "PASS",
  "duration": 45,
  "actual": 1.0,
  "expected": 1.0,
  "tolerance": 0.01,
  "message": null
}
```

Failures include:
```json
{
  "testName": "should handle identical angles",
  "suite": "Caster Calculation",
  "status": "FAIL",
  "duration": 52,
  "actual": 0.05,
  "expected": 0.0,
  "tolerance": 0.01,
  "message": "Expected 0 but got 0.05 (outside 0.01° tolerance)"
}
```

---

## Cleanup Contract

Every test **must** leave state clean.

```javascript
// localStorage
await page.evaluate(() => localStorage.clear());

// IndexedDB (if used)
await page.evaluate(() => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase('alignment');
    req.onsuccess = resolve;
    req.onerror = reject;
  });
});

// Page/browser
await page.close();
await browser.close();
```

---

## Summary

| Aspect | Rule |
|--------|------|
| Test names | "should [action] when [condition]" |
| Arrangement | Explicit Arrange → Act → Assert |
| Assertions | Numerical: `toBeCloseTo(_, 2)`, Boolean: `toBe(_)`, String: `toMatch(_)` |
| Tolerance | 0.01° for angles (2 decimal places) |
| Async | Always `await` page operations |
| Cleanup | Clear localStorage + close pages after each test |
| Fixtures | Load from `tests/fixtures/*.json` |
| Baselines | Performance from `tests/performance/baselines.json` |
| Timeout | 5s default; explicit if longer |
