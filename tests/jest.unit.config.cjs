/**
 * jest.unit.config.cjs
 * Jest configuration for unit tests only (no Puppeteer/browser dependencies)
 * Usage: jest --config tests/jest.unit.config.cjs
 */

module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '..',
  testMatch: ['**/tests/unit/**/*.test.js'],
  testTimeout: 15000,
  verbose: true,
  onlyChanged: false,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.\\./(fixtures/.*)$': '<rootDir>/tests/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/server.js',
    '!js/generate-dummy-data.mjs',
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
