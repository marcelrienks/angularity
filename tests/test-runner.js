#!/usr/bin/env node

/**
 * Test Runner — single entry point for the full MX5 NC1 test suite.
 *
 * Runs in two phases:
 *   1. Unit tests  (Jest — fast, no browser)
 *   2. Integration tests (Puppeteer — headless browser, requires dev server)
 *
 * Usage: npm test
 *
 * Exit code 0 = all passed. Exit code 1 = one or more failures.
 */

import { spawn, execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { startSharedTestServer, stopSharedTestServer, getServerPort } from './test-server-singleton.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

// All integration tests, in execution order.
const INTEGRATION_TESTS = [
  'test:input-grid',
  'test:input-wheel',
  'test:input-csv',
  'test:required-fields',
  'test:target-values',
  'test:color-coding-ui',
  'test:clear-empty-cycle',
  'test:multi-field-sync',
  'test:report-chart',
  'test:report-target-sync',
  'test:report-symmetry',
  'test:rear-axle-symmetry',
  'test:toe-symmetry',
  'test:report-washer',
  'test:report-oracle',
  'test:report-values-check',
  'test:report-status',
  'test:report-responsive',
  'test:rear-wheel-heatmaps',
  'test:data-to-ui',
  'test:comprehensive',
  'test:e2e-data-integrity',
  'test:report-bugfix',
];

const C = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  dim:    '\x1b[2m',
  bold:   '\x1b[1m',
};

function c(color, text) { return `${color}${text}${C.reset}`; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Port cleanup ─────────────────────────────────────────────────────────

async function freePort(port = 8080) {
  try {
    const { stdout } = await execFileAsync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN']);
    const pids = stdout.split(/\s+/).map(p => p.trim()).filter(Boolean);
    for (const pid of pids) {
      try { process.kill(Number(pid), 'SIGTERM'); } catch (_) {}
    }
    // Give it a moment
    await new Promise(r => setTimeout(r, 500));
  } catch (_) {
    // lsof exits non-zero when no process found — port is free, ignore
  }
}

// ── Unit tests (Jest) ────────────────────────────────────────────────────

async function runUnitTests() {
  console.log(c(C.bold, '\n── Unit Tests ──────────────────────────────────────────────────\n'));

  return new Promise((resolve) => {
    const proc = spawn(
      'npm',
      ['run', 'test:unit'],
      { cwd: path.join(__dirname, '..'), stdio: 'inherit', shell: process.platform === 'win32' }
    );
    proc.on('close', code => resolve(code ?? 1));
  });
}

// ── Integration tests (Puppeteer) ────────────────────────────────────────

async function runIntegrationTest(testName) {
  return new Promise((resolve) => {
    const proc = spawn('npm', ['run', testName], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    proc.on('close', code => resolve(code ?? 1));
  });
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const LINE = '─'.repeat(64);

  console.log(c(C.bold + C.blue, `\n${'═'.repeat(64)}`));
  console.log(c(C.bold + C.blue, '  MX5 NC1 — Full Test Suite'));
  console.log(c(C.bold + C.blue, `${'═'.repeat(64)}\n`));

  let unitsPassed = false;
  let integrationPassed = 0;
  let integrationFailed = 0;
  const failures = [];

  // ── Phase 1: Unit tests ───────────────────────────────────────────────
  const unitCode = await runUnitTests();
  unitsPassed = unitCode === 0;

  console.log('');
  if (unitsPassed) {
    console.log(c(C.green, `✓  Unit tests passed\n`));
  } else {
    console.log(c(C.red, `✗  Unit tests FAILED\n`));
    failures.push('unit tests');
  }

  // ── Phase 2: Integration tests ────────────────────────────────────────
  console.log(c(C.bold, `── Integration Tests (${INTEGRATION_TESTS.length} suites) ${'─'.repeat(64 - 24 - String(INTEGRATION_TESTS.length).length)}\n`));

  console.log(c(C.dim, '  Starting dev server...'));
  await freePort(8080);
  await startSharedTestServer();
  console.log(c(C.dim, `  Server ready on port ${getServerPort()}\n`));

  try {
    for (const test of INTEGRATION_TESTS) {
      const label = test.replace('test:', '');
      const code = await runIntegrationTest(test);
      if (code === 0) {
        console.log(c(C.green, `  ✓  ${label}`));
        integrationPassed++;
      } else {
        console.log(c(C.red, `  ✗  ${label}  ← FAILED`));
        integrationFailed++;
        failures.push(label);
      }
    }
  } finally {
    console.log('');
    console.log(c(C.dim, '  Stopping dev server...'));
    await stopSharedTestServer();
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const totalFailed = (unitsPassed ? 0 : 1) + integrationFailed;
  const totalPassed = (unitsPassed ? 1 : 0) + integrationPassed;
  const allPassed   = totalFailed === 0;

  console.log('');
  console.log(c(C.bold + C.blue, `${'═'.repeat(64)}`));
  console.log(c(C.bold + C.blue, `  Results`));
  console.log(c(C.bold + C.blue, `${'─'.repeat(64)}`));
  console.log(`  Unit tests      ${unitsPassed ? c(C.green, 'PASSED') : c(C.red, 'FAILED')}`);
  console.log(`  Integration     ${c(C.green, `${integrationPassed} passed`)}  ${integrationFailed > 0 ? c(C.red, `${integrationFailed} failed`) : ''}`);
  if (failures.length > 0) {
    console.log('');
    console.log(c(C.red, '  Failed:'));
    failures.forEach(f => console.log(c(C.red, `    • ${f}`)));
  }
  console.log('');
  console.log(allPassed
    ? c(C.bold + C.green, `  ✓  ALL TESTS PASSED`)
    : c(C.bold + C.red,   `  ✗  ${totalFailed} suite(s) FAILED`));
  console.log(c(C.bold + C.blue, `${'═'.repeat(64)}\n`));

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Runner error:', err);
  process.exit(1);
});
