/**
 * jest.unit.config.js
 * Jest configuration for unit tests only (no Puppeteer/browser dependencies)
 * Usage: jest --config tests/jest.unit.config.js
 */

export default {
  // Use node environment with ESM support via babel
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: ['**/tests/unit/**/*.test.js'],
  testTimeout: 15000,
  verbose: true,
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.\\./(fixtures/.*)\\.js$': '<rootDir>/tests/unit/$1.js',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.js'],
  // Coverage configuration (unit tests only)
  collectCoverage: true,
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/server.js',           // Server entry point, not unit testable
    '!js/generate-dummy-data.mjs', // CLI tool, not unit testable
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
  ],
  coverageThreshold: {
    './js/washer-math.js': {
      lines: 80,
      branches: 75,
      functions: 80,
      statements: 80,
    },
  },
};
