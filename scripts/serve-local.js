/**
 * ==============================================================================
 * AEROTERRA H2 — LOCAL DEVELOPMENT RUNTIME SERVER
 * ==============================================================================
 * Serves static HTML/JS/CSS assets and routes `/api/*` requests to Serverless functions
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  let pathname = urlObj.pathname;

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    let apiModulePath = null;
    if (pathname === '/api/auth/register') apiModulePath = path.join(rootDir, 'api', 'auth', 'register.js');
    else if (pathname === '/api/auth/login') apiModulePath = path.join(rootDir, 'api', 'auth', 'login.js');
    else if (pathname === '/api/auth/me') apiModulePath = path.join(rootDir, 'api', 'auth', 'me.js');
    else if (pathname === '/api/db-health') apiModulePath = path.join(rootDir, 'api', 'db-health.js');
    else if (pathname === '/api/configs/save') apiModulePath = path.join(rootDir, 'api', 'configs', 'save.js');
    else if (pathname === '/api/configs/list') apiModulePath = path.join(rootDir, 'api', 'configs', 'list.js');

    if (apiModulePath && fs.existsSync(apiModulePath)) {
      try {
        let body = {};
        if (req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          const raw = Buffer.concat(buffers).toString();
          if (raw) {
            try { body = JSON.parse(raw); } catch (e) { body = {}; }
          }
        }
        req.body = body;

        // Custom res adapter for Vercel signature
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
          return res;
        };

        const module = await import(`file://${apiModulePath}?t=${Date.now()}`);
        return await module.default(req, res);
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    }
  }

  // Rewrite roots
  if (pathname === '/' || pathname === '/landing') {
    pathname = '/landing.html';
  } else if (pathname === '/hangar' || pathname === '/3d') {
    pathname = '/index.html';
  }

  const filePath = path.join(rootDir, pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    return fs.createReadStream(filePath).pipe(res);
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('404 Not Found: ' + pathname);
});

server.listen(PORT, () => {
  console.log(`\n============================================================`);
  console.log(`🚀 AeroTerra H2 Local Server running at http://localhost:${PORT}`);
  console.log(`   - Лендинг-презентация: http://localhost:${PORT}/`);
  console.log(`   - 3D-Ангар WebGL:      http://localhost:${PORT}/hangar`);
  console.log(`   - API Healthcheck:     http://localhost:${PORT}/api/db-health`);
  console.log(`============================================================\n`);
});
