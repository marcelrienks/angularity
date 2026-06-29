/**
 * tests/setup-global.js
 * Global Jest setup - runs before all tests
 * Provides browser-like globals for Node.js/jsdom test environment
 */

// Mock localStorage for Node.js environment
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: jest.fn((key) => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(() => null),
    length: 0,
  };
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  if (global.localStorage && global.localStorage.clear) {
    global.localStorage.clear();
  }
});
