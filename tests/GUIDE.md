# Test Suite Guide

## Running Tests

### All Tests
```bash
npm run test:all-sync          # Full suite (< 60 seconds)
npm run test:coverage          # With coverage report
```

### By Category
```bash
npm run test:calculation-unit           # Unit tests (< 5s)
npm run test:calculation-integration    # Integration tests
npm run test:symmetry-correctness       # Symmetry logic
npm run test:csv-integrity             # Export/import validation
npm run test:regression                # Prior export compatibility
npm run test:determinism               # Determinism checks
npm run test:performance               # Speed benchmarks
```

## Test Structure

```
tests/
├── unit/              (22 tests) - Formula correctness
├── invariant/         (12 tests) - Must-always-be-true properties
├── integration/       (26 tests) - Full workflow tests
├── regression/        (12 tests) - Prior export validation
├── performance/       (12 tests) - Speed & memory benchmarks
├── fixtures/          - Test data & utilities
└── setup.js          - Global test configuration
```

## Common Issues

### Tests timeout
- Increase `testTimeout` in `jest.config.js`
- Dev server must be running on port 8080

### Fixture not found
- Ensure `tests/fixtures/exports/` contains JSON files
- Run `npm run test:all-sync` to generate fixtures

### Memory leak failures
- Close other browser windows
- Run test in isolation: `npm run test:performance -- --testNamePattern="Memory"`

## Adding Tests

1. Create test file in appropriate directory (unit/integration/etc)
2. Import helpers from `tests/fixtures/test-helpers.js`
3. Use 0.01° tolerance for numeric comparisons
4. Tag tests with [P] for parallel execution in tasks.md
5. Run `npm run test:all-sync` to verify
