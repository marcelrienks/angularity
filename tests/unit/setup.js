/**
 * tests/unit/setup.js
 * Jest setup file - runs before all tests
 * Provides browser-like globals for Node.js test environment
 */

// Mock localStorage for Node.js environment
const localStorageMock = {
  getItem: jest.fn((key) => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
