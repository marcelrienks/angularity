#!/usr/bin/env node
/**
 * server.js — Local development server for the MX5 NC1 alignment site.
 *
 * Serves static files from the site directory and exposes one write endpoint:
 *   POST /save-csv?wheel=FL   — writes data/alignment-FL.csv
 *   POST /save-csv?wheel=FR   — writes data/alignment-FR.csv
 *
 * Usage:  node js/server.js
 *         node js/server.js 8080      (custom port)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT    = parseInt(process.argv[2] || '8080', 10);
const SITE    = path.join(__dirname, '..', 'site'); // Site directory (../site/)
const DATA    = path.join(SITE, 'data');

// Ensure data/ exists
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA);

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.csv':  'text/csv',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  // ── POST /save-csv?wheel=FL|FR ──────────────────────────────────────────
  if (req.method === 'POST' && parsed.pathname === '/save-csv') {
    const wheel = parsed.query.wheel;
    if (wheel !== 'FL' && wheel !== 'FR') {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('wheel must be FL or FR');
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const dest = path.join(DATA, `alignment-${wheel}.csv`);
      fs.writeFile(dest, body, 'utf8', err => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Write failed');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('OK');
        }
      });
    });
    return;
  }

  // ── Static file serving ─────────────────────────────────────────────────
  let filePath;
  const JS_DIR = path.join(__dirname); // /js directory where server.js lives

  // Handle /js/ requests separately (allow serving from root /js/ directory)
  if (parsed.pathname.startsWith('/js/')) {
    filePath = path.join(JS_DIR, parsed.pathname.slice(4)); // Remove /js/ prefix
    if (!filePath.startsWith(JS_DIR + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
  } else {
    // Serve from site directory
    filePath = path.join(SITE, parsed.pathname === '/' ? 'index.html' : parsed.pathname);
    // Prevent path traversal outside SITE directory
    if (!filePath.startsWith(SITE + path.sep) && filePath !== SITE) {
      res.writeHead(403);
      res.end();
      return;
    }
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`MX5 NC1 alignment server running at http://localhost:${PORT}`);
});
