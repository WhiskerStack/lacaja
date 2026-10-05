// tests/e2e/fixtures/build-switch-server.mjs
// Sirve dos builds estáticos y permite cambiar entre ellos vía GET /__switch?to=b.
// Necesario para probar el ciclo de actualización del SW en el mismo origen.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const [A, B, PORT_RAW] = process.argv.slice(2);
const PORT = Number(PORT_RAW ?? 4322);
let current = A;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

/** Resuelve una ruta al fichero físico correspondiente (index.html, .html suelto…). */
function resolveFile(root, pathname) {
  if (pathname === '/') pathname = '/index.html';
  const tries = [
    join(root, pathname),
    join(root, pathname + '.html'),
    join(root, pathname, 'index.html'),
  ];
  return tries.find((p) => existsSync(p)) ?? null;
}

/** Reproduce los Cache-Control de staticwebapp.config.json. */
function cacheControl(pathname) {
  if (pathname.startsWith('/_astro/') || pathname.startsWith('/icons/')) {
    return 'public, max-age=31536000, immutable';
  }
  if (pathname === '/sw.js' || pathname === '/registerSW.js' || pathname.startsWith('/workbox-')) {
    return 'no-cache, no-store, must-revalidate';
  }
  return 'no-cache, must-revalidate';
}

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/__switch') {
    current = url.searchParams.get('to') === 'b' ? B : A;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(current);
    return;
  }

  const file = resolveFile(current, url.pathname);
  if (!file) {
    const notFound = resolveFile(current, '/404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(notFound ? readFileSync(notFound) : 'Not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': cacheControl(url.pathname),
  });
  res.end(readFileSync(file));
}).listen(PORT, () => {
  console.log(`[test-server] sirviendo ${current} en :${PORT}`);
});