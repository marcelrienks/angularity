/**
 * jest.config.cjs
 * Root Jest configuration for all test suites
 */

module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '.',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/invariant/**/*.test.js',
    '**/tests/regression/**/*.test.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    'tests/theme/',
    'tests/integration/',
  ],
  testTimeout: 15000,
  verbose: true,
  onlyChanged: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.\\./(fixtures/.*)$': '<rootDir>/tests/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup-global.js'],
  collectCoverage: false,
};
