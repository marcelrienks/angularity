// Mock localStorage for tests that don't use Puppeteer
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    data: {},
    getItem(key) {
      return this.data[key] || null;
    },
    setItem(key, value) {
      this.data[key] = String(value);
    },
    removeItem(key) {
      delete this.data[key];
    },
    clear() {
      this.data = {};
    },
    key(index) {
      return Object.keys(this.data)[index] || null;
    },
    get length() {
      return Object.keys(this.data).length;
    },
  };
}

// Global test utilities
global.TEST_TOLERANCE = 0.01; // 0.01° tolerance for alignment angles
global.BASE_URL = process.env.TEST_URL || 'http://localhost:8080';

// Cleanup after each test
afterEach(() => {
  if (global.localStorage) {
    global.localStorage.clear();
  }
});
