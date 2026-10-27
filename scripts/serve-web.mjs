/**
 * Statik web çıktısını (dist/) izole olarak sunar.
 *
 * `expo export --platform web` sonrası üretim çıktısını denemek için:
 *   npm run web:export
 *   npm run web:preview      -> http://localhost:8090
 *
 * expo-sqlite web (wa-sqlite) SharedArrayBuffer kullanır; bu yüzden belge
 * COOP/COEP başlıklarıyla gelmek zorunda. Masaüstü kabuğu (Tauri) aynı
 * başlıkları tauri.conf.json > app.security.headers üzerinden gönderir.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PLOT_WEB_PORT ?? 8090);

const ISOLATION_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded.replace(/^\/+/, '');
  const candidate = path.resolve(ROOT, relative);

  // Kök dizin dışına çıkan istekleri reddet.
  if (candidate !== ROOT && !candidate.startsWith(`${ROOT}${path.sep}`)) {
    return null;
  }

  try {
    const info = await stat(candidate);
    if (info.isFile()) return candidate;
  } catch {
    // Aşağıdaki SPA geri dönüşüne düş.
  }

  // Uzantısız yollar istemci tarafı rotasıdır: index.html'e dön.
  if (!path.extname(relative)) {
    return path.join(ROOT, 'index.html');
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  const file = await resolveFile(req.url ?? '/');

  if (!file) {
    res.writeHead(404, {
      ...ISOLATION_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end('Bulunamadı');
    return;
  }

  res.writeHead(200, {
    ...ISOLATION_HEADERS,
    'Content-Type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Plot web (izole): http://localhost:${PORT}`);
});
