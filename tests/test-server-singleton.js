/**
 * test-server-singleton.js — Shared test server for all integration tests
 *
 * Problem: Currently each test spawns its own server (30s startup overhead per test)
 * Solution: Start ONE server before all tests; share it across all test files
 *
 * Usage:
 *   // Before running tests:
 *   import { startSharedTestServer, stopSharedTestServer, getServerPort } 
 *     from './test-server-singleton.js';
 *   
 *   await startSharedTestServer();
 *   
 *   try {
 *     // Run tests - they all connect to same server
 *     const port = getServerPort();
 *     await runTest(..., port);
 *   } finally {
 *     await stopSharedTestServer();
 *   }
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Singleton state
 */
let serverProcess = null;
let serverPort = 8080;
let isStarted = false;
let isStarting = false;
let startPromise = null;

/**
 * Start the shared test server once
 * Returns immediately if already started
 *
 * @param {number} port - Port number (default 8080)
 * @param {number} timeout - Max time to wait for server startup (default 20000ms)
 * @returns {Promise<number>} Port number server is running on
 * @throws {Error} If server fails to start within timeout
 */
export async function startSharedTestServer(port = 8080, timeout = 20000) {
  if (isStarted) {
    console.log(`[test-server] Server already running on port ${serverPort}`);
    return serverPort;
  }

  // If already starting, return the existing promise
  if (isStarting && startPromise) {
    console.log('[test-server] Server startup already in progress, waiting...');
    return startPromise;
  }

  serverPort = port;
  isStarting = true;

  startPromise = new Promise((resolve, reject) => {
    const startTime = Date.now();
    let serverReady = false;

    console.log(`[test-server] Starting server on port ${port}...`);

    // Spawn server process
    serverProcess = spawn('npm', ['run', 'start'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Listen for server ready or error
    const readyTimeout = setTimeout(() => {
      if (!serverReady) {
        stopSharedTestServer();
        isStarting = false;
        startPromise = null;
        reject(new Error(`Server failed to start within ${timeout}ms`));
      }
    }, timeout);

    // Check for success indicators in stdout/stderr
    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[test-server] ${output}`);

      // Check for common server startup messages
      if (output.includes('listening') || 
          output.includes('started') || 
          output.includes('ready') ||
          output.includes(`${port}`)) {
        if (!serverReady) {
          serverReady = true;
          isStarted = true;
          isStarting = false;
          clearTimeout(readyTimeout);
          console.log(`[test-server] ✓ Server ready on port ${port}`);
          resolve(port);
        }
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`[test-server] ${data.toString()}`);
    });

    // Handle process errors
    serverProcess.on('error', (err) => {
      clearTimeout(readyTimeout);
      isStarting = false;
      startPromise = null;
      reject(new Error(`Failed to spawn server process: ${err.message}`));
    });

    // Handle process exit
    serverProcess.on('exit', (code, signal) => {
      clearTimeout(readyTimeout);
      isStarted = false;
      isStarting = false;
      startPromise = null;
      serverProcess = null;
      
      if (!serverReady) {
        reject(new Error(`Server process exited with code ${code} signal ${signal}`));
      }
    });

    // Fallback: assume server started after 2 seconds of output
    setTimeout(() => {
      if (!serverReady && serverProcess) {
        serverReady = true;
        isStarted = true;
        isStarting = false;
        clearTimeout(readyTimeout);
        console.log(`[test-server] ✓ Server ready (timeout-based detection)`);
        resolve(port);
      }
    }, 2000);
  });

  return startPromise;
}

/**
 * Stop the shared test server
 * Safe to call even if not started
 *
 * @returns {Promise<void>}
 */
export async function stopSharedTestServer() {
  if (!serverProcess || !isStarted) {
    return;
  }

  return new Promise((resolve) => {
    console.log('[test-server] Stopping server...');

    const killTimeout = setTimeout(() => {
      console.log('[test-server] Force killing server...');
      serverProcess?.kill('SIGKILL');
      isStarted = false;
      isStarting = false;
      startPromise = null;
      serverProcess = null;
      resolve();
    }, 5000);

    serverProcess.on('exit', () => {
      clearTimeout(killTimeout);
      isStarted = false;
      isStarting = false;
      startPromise = null;
      serverProcess = null;
      console.log('[test-server] ✓ Server stopped');
      resolve();
    });

    // Try graceful shutdown first
    serverProcess.kill('SIGTERM');
  });
}

/**
 * Get the current server port
 * Returns port if server is started or starting, or default port
 *
 * Note: Test runner starts the server before running tests,
 * so tests can safely call this to get the port.
 *
 * @returns {number}
 */
export function getServerPort() {
  return serverPort;
}

/**
 * Get server URL (http://localhost:port)
 *
 * @returns {string|null}
 */
export function getServerUrl() {
  if (!isStarted) return null;
  return `http://localhost:${serverPort}`;
}

/**
 * Check if server is running
 *
 * @returns {boolean}
 */
export function isServerRunning() {
  return isStarted && serverProcess !== null;
}

/**
 * Health check: verify server is responsive
 * Useful before running tests
 *
 * @returns {Promise<boolean>}
 */
export async function healthCheck() {
  if (!isStarted) return false;

  try {
    const response = await fetch(`http://localhost:${serverPort}/index.html`, {
      timeout: 5000,
    });
    return response.ok;
  } catch (err) {
    console.error('[test-server] Health check failed:', err.message);
    return false;
  }
}

/**
 * Restart the server (stop and start)
 * Useful if server becomes unresponsive
 *
 * @returns {Promise<number>}
 */
export async function restartSharedTestServer() {
  console.log('[test-server] Restarting server...');
  await stopSharedTestServer();
  await new Promise(r => setTimeout(r, 1000)); // Brief pause between stop/start
  return startSharedTestServer();
}
