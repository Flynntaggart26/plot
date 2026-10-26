/**
 * Geliştirme için cross-origin isolation proxy'si.
 *
 * `expo start` HTML'i Metro ara katmanından değil, kendi dev sunucusundan
 * verir; bu yüzden metro.config.js'teki COEP/COOP başlıkları belgeye
 * ulaşmaz. expo-sqlite web (wa-sqlite) SharedArrayBuffer için bu başlıkları
 * zorunlu tutar.
 *
 * Kullanım:
 *   node scripts/dev-web-isolated.mjs
 *   -> http://localhost:8082 adresini aç (Metro 8081'de çalışıyor olmalı)
 *
 * Bu yalnızca yerel doğrulama içindir. Üretimde statik dosyaları sunan
 * sunucu aynı başlıkları kendisi göndermelidir.
 */
import http from 'node:http';
import net from 'node:net';

const TARGET_PORT = Number(process.env.PLOT_METRO_PORT ?? 8081);
const LISTEN_PORT = Number(process.env.PLOT_WEB_PORT ?? 8082);

const ISOLATION_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const server = http.createServer((req, res) => {
  const upstream = http.request(
    {
      hostname: '127.0.0.1',
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${TARGET_PORT}` },
    },
    (upstreamRes) => {
      // Metro bazı rota yanıtlarına kendi COEP/COOP başlıklarını ekler.
      // Üzerine yazmazsak Node aynı başlığı iki kez gönderir
      // ("credentialless, credentialless") ve tarayıcı geçersiz sayıp
      // izolasyonu kapatır. Önce temizle, sonra tek değer yaz.
      const headers = { ...upstreamRes.headers };
      delete headers['cross-origin-embedder-policy'];
      delete headers['cross-origin-opener-policy'];

      res.writeHead(upstreamRes.statusCode ?? 502, {
        ...headers,
        ...ISOLATION_HEADERS,
      });
      upstreamRes.pipe(res);
    },
  );

  upstream.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Metro'ya ulaşılamadı: ${error.message}`);
  });

  req.pipe(upstream);
});

// HMR websocket'i de geçir: yeniden yükleme ve hata akışı çalışsın.
server.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(TARGET_PORT, '127.0.0.1', () => {
    const headers = Object.entries(req.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\r\n');
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
    if (head.length > 0) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });

  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(LISTEN_PORT, () => {
  console.log(`Plot web (izole): http://localhost:${LISTEN_PORT} -> Metro ${TARGET_PORT}`);
});
