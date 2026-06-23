export default {
  preset: 'jest-puppeteer',
  // Jest-puppeteer configuration is in tests/jest-puppeteer.config.js
  testMatch: ['**/tests/integration/**/*.test.js'],
  testTimeout: 30000,
  verbose: true,

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
    global: {
      lines: 70,
      branches: 65,
      functions: 70,
      statements: 70,
    },
    './js/interpolation.js': {
      lines: 80,
      branches: 75,
      functions: 80,
      statements: 80,
    },
    './js/report-engine.js': {
      lines: 80,
      branches: 75,
      functions: 80,
      statements: 80,
    },
    './js/math-utils.js': {
      lines: 75,
      branches: 70,
      functions: 75,
      statements: 75,
    },
    './js/washer-math.js': {
      lines: 80,
      branches: 75,
      functions: 80,
      statements: 80,
    },
    './js/table-builder.js': {
      lines: 75,
      branches: 70,
      functions: 75,
      statements: 75,
    },
    './js/chart-builder.js': {
      lines: 75,
      branches: 70,
      functions: 75,
      statements: 75,
    },
  },
};
